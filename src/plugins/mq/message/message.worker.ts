import fp from "fastify-plugin";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { configureMessageWorker } from "@/modules/message/mq/message.worker.js";

export default fp(configureMessageWorker, {
    dependencies: [FastifyPlugin.Awilix, FastifyPlugin.BullMq],
});
