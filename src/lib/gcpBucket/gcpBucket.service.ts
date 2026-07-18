import { Storage } from "@google-cloud/storage";
import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { SIGNED_URL_EXPIRES_IN_MS } from "./gcpBucket.constant.js";

export type DeleteFilePayload = {
    key: string;
};

export type DeleteFolderPayload = {
    prefix: string;
};

export type CreateUploadSignedUrlPayload = {
    key: string;
    contentType: string;
};

export type CreateReadSignedUrlPayload = {
    key: string;
};

export type GcpBucketService = {
    deleteFile: (payload: DeleteFilePayload) => Promise<void>;
    deleteFolder: (payload: DeleteFolderPayload) => Promise<void>;
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
    const bucket = gcpStorageClient.bucket(config.GCP_BUCKET_NAME);

    return {
        deleteFile: async ({ key }) => {
            await bucket.file(key).delete();
        },

        deleteFolder: async ({ prefix }) => {
            await bucket.deleteFiles({ prefix });
        },

        createUploadSignedUrl: async ({ key, contentType }) => {
            const [url] = await bucket.file(key).getSignedUrl({
                version: "v4",
                action: "write",
                expires: Date.now() + SIGNED_URL_EXPIRES_IN_MS,
                contentType,
            });

            return url;
        },

        createReadSignedUrl: async ({ key }) => {
            const [url] = await bucket.file(key).getSignedUrl({
                version: "v4",
                action: "read",
                expires: Date.now() + SIGNED_URL_EXPIRES_IN_MS,
            });

            return url;
        },
    };
};

addDIResolverName(createGcpBucketService, "gcpBucketService");
