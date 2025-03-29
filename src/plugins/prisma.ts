import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { FastifyPlugin } from "@/lib/fastify/fastify.constant.js";

const configurePrisma = async (fastify: FastifyInstance) => {
    const prisma = new PrismaClient();
    await prisma.$connect();

    fastify.decorate("prisma", prisma);

    fastify.addHook("onClose", async (fastify) => {
        await fastify.prisma.$disconnect();
    });
};

export default fp(configurePrisma, {
    name: FastifyPlugin.Prisma,
});
