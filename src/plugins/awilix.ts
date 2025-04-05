import path from "path";
import fp from "fastify-plugin";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";
import { asValue, createContainer, InjectionMode } from "awilix";
import { FastifyPlugin } from "@/lib/fastify/fastify.constant.js";
import { resolverOptionsRegister } from "@/lib/awilix/resolver-registration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configureAwilix = async (fastify: FastifyInstance) => {
    const container = createContainer({
        injectionMode: InjectionMode.CLASSIC,
        strict: true,
    });

    fastify.decorate("di", container);

    // Register dependencies from plugins and libraries
    fastify.di.register({
        log: asValue(fastify.log),
        prisma: asValue(fastify.prisma),
        config: asValue(fastify.config),
    });

    // Register dependencies from the application: repositories, services, route handlers
    await container.loadModules(
        [
            path.join(__dirname, "../modules/**/*.{service,handler}.{js,ts}"),
            path.join(
                __dirname,
                "../database/repositories/{*,**/*}.repository.{js,ts}"
            ),
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
    dependencies: [FastifyPlugin.Prisma, FastifyPlugin.Env],
});
