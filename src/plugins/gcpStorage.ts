import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Storage } from "@google-cloud/storage";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";

const configureGcpStorage = async (fastify: FastifyInstance) => {
    const {
        GCP_PROJECT_ID,
        GCP_CLIENT_EMAIL,
        GCP_PRIVATE_KEY,
        GCP_STORAGE_API_ENDPOINT,
    } = fastify.config;

    const storage = new Storage({
        projectId: GCP_PROJECT_ID,
        ...(GCP_STORAGE_API_ENDPOINT && {
            apiEndpoint: GCP_STORAGE_API_ENDPOINT,
        }),
        ...(GCP_CLIENT_EMAIL &&
            GCP_PRIVATE_KEY && {
            credentials: {
                client_email: GCP_CLIENT_EMAIL,
                private_key: GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
            },
        }),
    });

    fastify.decorate("gcpStorageClient", storage);
};

export default fp(configureGcpStorage, {
    name: FastifyPlugin.GcpStorage,
    dependencies: [FastifyPlugin.Env],
});
