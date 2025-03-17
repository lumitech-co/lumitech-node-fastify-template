import path from "path";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/fastify";
import { asValue, InjectionMode } from "awilix";
import { resolverOptionsRegister } from "@/lib/awilix";
import { diContainerClassic, fastifyAwilixPlugin } from "@fastify/awilix";

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
    fastify.di.loadModules(
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
        }
    );
};

export default fp(configureAwilix, {
    name: "awilix",
    dependencies: [FastifyPlugin.Prisma, FastifyPlugin.Env],
});
