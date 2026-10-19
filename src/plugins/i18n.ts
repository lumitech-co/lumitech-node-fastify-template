import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { resolveLocale, translateMessage } from "@/lib/i18n/i18n.util.js";
import {
    ACCEPT_LANGUAGE_HEADER,
    CONTENT_LANGUAGE_HEADER,
    DEFAULT_LOCALE,
} from "@/lib/i18n/i18n.constant.js";

const configureI18n = async (fastify: FastifyInstance) => {
    fastify.decorateRequest("locale", DEFAULT_LOCALE);

    fastify.addHook("onRequest", async (request, reply) => {
        request.locale = resolveLocale(request.headers[ACCEPT_LANGUAGE_HEADER]);

        reply.header(CONTENT_LANGUAGE_HEADER, request.locale);
    });

    fastify.addHook("preSerialization", async (request, _reply, payload) => {
        if (
            typeof payload !== "object" ||
            payload === null ||
            !("message" in payload) ||
            typeof payload.message !== "string"
        ) {
            return payload;
        }

        return {
            ...payload,
            message: translateMessage({
                text: payload.message,
                locale: request.locale,
            }),
        };
    });
};

export default fp(configureI18n, {});
