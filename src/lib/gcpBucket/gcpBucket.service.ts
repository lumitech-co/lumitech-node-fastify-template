import { Storage } from "@google-cloud/storage";
import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import {
    GCP_BUCKET_NOT_CONFIGURED,
    SIGNED_URL_EXPIRES_IN_MS,
} from "./gcpBucket.constant.js";
import {
    DeleteFilePayload,
    DeleteFolderPayload,
    CreateUploadSignedUrlPayload,
    CreateReadSignedUrlPayload,
} from "./gcpBucket.type.js";

export type GcpBucketService = {
    deleteFile: (payload: DeleteFilePayload) => Promise<string>;
    deleteFolder: (payload: DeleteFolderPayload) => Promise<string>;
    createUploadSignedUrl: (
        payload: CreateUploadSignedUrlPayload
    ) => Promise<string>;
    createReadSignedUrl: (
        payload: CreateReadSignedUrlPayload
    ) => Promise<string>;
};

export const createGcpBucketService = (
    gcpStorageClient: Storage,
    config: EnvConfig
): GcpBucketService => {
    const getBucket = () => {
        if (!config.GCP_BUCKET_NAME) {
            throw new Error(GCP_BUCKET_NOT_CONFIGURED);
        }

        return gcpStorageClient.bucket(config.GCP_BUCKET_NAME);
    };

    return {
        deleteFile: async ({ key }) => {
            await getBucket().file(key).delete({ ignoreNotFound: true });

            return key;
        },

        deleteFolder: async ({ prefix }) => {
            await getBucket().deleteFiles({ prefix });

            return prefix;
        },

        createUploadSignedUrl: async ({ key, contentType }) => {
            const [url] = await getBucket()
                .file(key)
                .getSignedUrl({
                    version: "v4",
                    action: "write",
                    expires: Date.now() + SIGNED_URL_EXPIRES_IN_MS,
                    contentType,
                });

            return url;
        },

        createReadSignedUrl: async ({ key }) => {
            const [url] = await getBucket()
                .file(key)
                .getSignedUrl({
                    version: "v4",
                    action: "read",
                    expires: Date.now() + SIGNED_URL_EXPIRES_IN_MS,
                });

            return url;
        },
    };
};

addDIResolverName(createGcpBucketService, "gcpBucketService");
