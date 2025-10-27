import { FastifyInstance } from "fastify";
import { createApplicationRoutes } from "./application.route.js";

// Define the endpoint prefix by providing autoPrefix module property.
export const autoPrefix = "/api";

export default async function (fastify: FastifyInstance) {
    const applicationHandler = fastify.di.resolve("applicationHandler");
    createApplicationRoutes(fastify, applicationHandler);
}
