import fp from "fastify-plugin";
import { hashing } from "@/lib/hashing/hashing.js";
import { UnauthorizedError } from "@/lib/errors/errors.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    CRON_AUTHORIZATION_SCHEME,
    CRON_UNAUTHORIZED_ERROR,
} from "@/lib/constants/cron.constant.js";

/**
 * `onRequest: [fastify.authenticateCron]` on a scheduler-only route: expects
 * `Authorization: Bearer <CRON_SECRET>`. Fails closed while CRON_SECRET is unset.
 */
const configureAuthenticateCron = async (fastify: FastifyInstance) => {
    const cronSecret = fastify.config.CRON_SECRET;

    fastify.decorate("authenticateCron", async (request: FastifyRequest) => {
        const header = request.headers.authorization ?? "";

        const valid =
            cronSecret !== undefined &&
            cronSecret !== "" &&
            hashing.compareSecret({
                secret: header,
                expected: `${CRON_AUTHORIZATION_SCHEME}${cronSecret}`,
            });

        if (!valid) {
            throw new UnauthorizedError(CRON_UNAUTHORIZED_ERROR);
        }
    });
};

export default fp(configureAuthenticateCron, {
    dependencies: [FastifyPlugin.Env],
});
