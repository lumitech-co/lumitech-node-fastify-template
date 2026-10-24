import fp from "fastify-plugin";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import type { Cradle } from "@/types/di-container.type.js";
import { asValue, createContainer, InjectionMode } from "awilix";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { resolverOptionsRegister } from "@/lib/awilix/resolver-registration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configureAwilix = async (fastify: FastifyInstance) => {
    const container = createContainer<Cradle>({
        injectionMode: InjectionMode.CLASSIC,
        strict: true,
    });

    fastify.decorate("di", container);

    // Register dependencies from plugins and libraries
    fastify.di.register({
        log: asValue(fastify.log),
        prisma: asValue(fastify.prisma),
        config: asValue(fastify.config),
        gcpStorageClient: asValue(fastify.gcpStorageClient),
        awsS3Client: asValue(fastify.awsS3Client),
        redis: asValue(fastify.redis),
        bullmqConnection: asValue(fastify.bullmqConnection),
        messageQueue: asValue(fastify.messageQueue),
    });

    // Register dependencies from the application: repositories, services, route handlers
    await container.loadModules(
        [
            path.join(
                __dirname,
                "../modules/**/*.{service,handler,repository}.{js,ts}"
            ),
            path.join(__dirname, "../lib/**/*.service.{js,ts}"),
        ],
        {
            resolverOptions: {
                register: resolverOptionsRegister(container),
            },
            esModules: true,
        }
    );
};

export default fp(configureAwilix, {
    name: FastifyPlugin.Awilix,
    dependencies: [
        FastifyPlugin.Prisma,
        FastifyPlugin.Env,
        FastifyPlugin.GcpStorage,
        FastifyPlugin.AwsS3,
        FastifyPlugin.Redis,
        FastifyPlugin.BullMq,
        FastifyPlugin.MessageQueue,
    ],
});
