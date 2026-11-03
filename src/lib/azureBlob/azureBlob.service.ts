import { dayjs } from "@/lib/dayjs/dayjs.util.js";
import type { EnvConfig } from "@/types/env.type.js";
import { BlobSASPermissions } from "@azure/storage-blob";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import type { BlobServiceClient } from "@azure/storage-blob";
import type {
    DeleteFilePayload,
    DeleteFolderPayload,
    CreateUploadSignedUrlPayload,
    CreateReadSignedUrlPayload,
} from "./azureBlob.type.js";
import {
    BLOB_BATCH_MAX_SIZE,
    BLOB_NOT_FOUND_ERROR_CODE,
    SIGNED_URL_EXPIRES_IN_MINUTES,
    AZURE_STORAGE_CONTAINER_NOT_CONFIGURED,
} from "./azureBlob.constant.js";

export type AzureBlobService = {
    deleteFile: (payload: DeleteFilePayload) => Promise<string>;
    deleteFolder: (payload: DeleteFolderPayload) => Promise<string>;
    /**
     * SAS cannot pin the content type: the client sends `Content-Type` and
     * `x-ms-blob-type: BlockBlob` itself on the PUT.
     */
    createUploadSignedUrl: (
        payload: CreateUploadSignedUrlPayload
    ) => Promise<string>;
    createReadSignedUrl: (
        payload: CreateReadSignedUrlPayload
    ) => Promise<string>;
};

export const createAzureBlobService = (
    azureBlobClient: BlobServiceClient,
    config: EnvConfig
): AzureBlobService => {
    return {
        deleteFile: async ({ key }) => {
            await getContainer()
                .getBlobClient(key)
                .deleteIfExists({ deleteSnapshots: "include" });

            return key;
        },

        deleteFolder: async ({ prefix }) => {
            const container = getContainer();
            const batchClient = container.getBlobBatchClient();

            const pages = container
                .listBlobsFlat({ prefix })
                .byPage({ maxPageSize: BLOB_BATCH_MAX_SIZE });

            for await (const page of pages) {
                const names = page.segment.blobItems.map(({ name }) => name);

                if (names.length === 0) {
                    continue;
                }

                const { subResponses } = await batchClient.deleteBlobs(
                    names.map((name) => container.getBlobClient(name)),
                    { deleteSnapshots: "include" }
                );

                const failedNames = subResponses
                    .map(({ errorCode }, index) => ({
                        errorCode,
                        name: names[index],
                    }))
                    .filter(
                        ({ errorCode }) =>
                            errorCode !== undefined &&
                            errorCode !== BLOB_NOT_FOUND_ERROR_CODE
                    )
                    .map(({ name }) => name);

                if (failedNames.length > 0) {
                    throw new Error(
                        `Failed to delete blobs from Azure container "${container.containerName}": ${failedNames.join(", ")}`
                    );
                }
            }

            return prefix;
        },

        createUploadSignedUrl: async ({ key }) =>
            getContainer()
                .getBlockBlobClient(key)
                .generateSasUrl({
                    permissions: BlobSASPermissions.from({
                        create: true,
                        write: true,
                    }),
                    expiresOn: getExpiresOn(),
                }),

        createReadSignedUrl: async ({ key }) =>
            getContainer()
                .getBlockBlobClient(key)
                .generateSasUrl({
                    permissions: BlobSASPermissions.from({ read: true }),
                    expiresOn: getExpiresOn(),
                }),
    };

    function getContainer() {
        if (!config.AZURE_STORAGE_CONTAINER_NAME) {
            throw new Error(AZURE_STORAGE_CONTAINER_NOT_CONFIGURED);
        }

        return azureBlobClient.getContainerClient(
            config.AZURE_STORAGE_CONTAINER_NAME
        );
    }
};

function getExpiresOn() {
    return dayjs().add(SIGNED_URL_EXPIRES_IN_MINUTES, "minute").toDate();
}

addDIResolverName(createAzureBlobService, "azureBlobService");
