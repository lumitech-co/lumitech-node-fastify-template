import { FastifyInstance } from "fastify";
import { createMessageRoutes } from "./message.route.js";

// Define the endpoint prefix by providing autoPrefix module property.
export const autoPrefix = "/api/messages";

export default async function (fastify: FastifyInstance) {
    const messageHandler = fastify.di.resolve("messageHandler");
    createMessageRoutes(fastify, messageHandler);
}
