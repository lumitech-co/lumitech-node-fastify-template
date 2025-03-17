import { FastifyInstance } from "fastify";

export const autoPrefix = "/api";

export default async function (fastify: FastifyInstance) {
    fastify.get(
        "/ping",
        {
            schema: {
                tags: ["application"],
                summary: "Check application health status",
            },
        },
        async (_request, reply) => {
            return reply.status(200).send("pong");
        }
    );
}
