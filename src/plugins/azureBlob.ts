import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    BlobServiceClient,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";

const configureAzureBlob = async (fastify: FastifyInstance) => {
    const {
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY,
        AZURE_STORAGE_BLOB_ENDPOINT,
    } = fastify.config;

    const blobServiceClient = new BlobServiceClient(
        AZURE_STORAGE_BLOB_ENDPOINT ??
            `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY
            ? new StorageSharedKeyCredential(
                  AZURE_STORAGE_ACCOUNT_NAME,
                  AZURE_STORAGE_ACCOUNT_KEY
              )
            : undefined
    );

    fastify.decorate("azureBlobClient", blobServiceClient);
};

export default fp(configureAzureBlob, {
    name: FastifyPlugin.AzureBlob,
    dependencies: [FastifyPlugin.Env],
});
