import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { IpBannedError, NotFoundError } from "@/lib/errors/errors.js";
import { extractPathname, isAllowedPath } from "@/lib/ipBan/ipBan.util.js";
import {
    IP_BAN_MESSAGE,
    ROUTE_NOT_FOUND_MESSAGE,
} from "@/lib/ipBan/ipBan.constant.js";

const configureIpBan = async (fastify: FastifyInstance) => {
    const ipBanService = fastify.di.resolve("ipBanService");

    fastify.addHook("onRequest", async (request) => {
        const banned = await ipBanService.isBanned({ ip: request.ip });

        if (banned) {
            throw new IpBannedError(IP_BAN_MESSAGE);
        }
    });

    fastify.setNotFoundHandler(async (request) => {
        const path = extractPathname({ url: request.url });

        if (isAllowedPath({ path })) {
            throw new NotFoundError(ROUTE_NOT_FOUND_MESSAGE);
        }

        const banned = await ipBanService.registerAttempt({ ip: request.ip });

        if (banned) {
            request.log.warn(
                { ip: request.ip, path },
                "Ip banned for probing unknown routes"
            );

            throw new IpBannedError(IP_BAN_MESSAGE);
        }

        throw new NotFoundError(ROUTE_NOT_FOUND_MESSAGE);
    });
};

export default fp(configureIpBan, {
    name: FastifyPlugin.IpBan,
    dependencies: [FastifyPlugin.Awilix, FastifyPlugin.Redis],
});
