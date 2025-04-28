import { FastifyInstance } from "fastify";
import { resolveDI } from "@/lib/awilix/awilix.js";
import { MessageHandler } from "./message.handler.js";
import { createMessageRoutes } from "./message.route.js";

// Define the endpoint prefix by providing autoPrefix module property.
export const autoPrefix = "/api/messages";

export default async function (fastify: FastifyInstance) {
    const messageHandler = resolveDI<MessageHandler>(fastify, "messageHandler");
    createMessageRoutes(fastify, messageHandler);
}
