import path from "path";
import fp from "fastify-plugin";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FastifyInstance } from "fastify";
import { asValue, InjectionMode } from "awilix";
import { FastifyPlugin } from "@/lib/fastify/fastify.constant.js";
import { diContainerClassic, fastifyAwilixPlugin } from "@fastify/awilix";
import { resolverOptionsRegister } from "@/lib/awilix/resolver-registration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configureAwilix = async (fastify: FastifyInstance) => {
    await fastify.register(fastifyAwilixPlugin, {
        disposeOnClose: true,
        strictBooleanEnforced: true,
        injectionMode: InjectionMode.CLASSIC,
    });

    fastify.decorate("di", diContainerClassic);

    // Register dependencies from plugins and libraries
    fastify.di.register({
        log: asValue(fastify.log),
        prisma: asValue(fastify.prisma),
        config: asValue(fastify.config),
    });

    // Register dependencies from the application: repositories, services, route handlers
    await fastify.di.loadModules(
        [
            path.join(__dirname, "../modules/**/*.{service,handler}.{js,ts}"),
            path.join(
                __dirname,
                "../database/repositories/{*,**/*}.repository.{js,ts}"
            ),
        ],
        {
            resolverOptions: {
                register: resolverOptionsRegister(fastify.di),
            },
            esModules: true,
        }
    );
};

export default fp(configureAwilix, {
    name: "awilix",
    dependencies: [FastifyPlugin.Prisma, FastifyPlugin.Env],
});
