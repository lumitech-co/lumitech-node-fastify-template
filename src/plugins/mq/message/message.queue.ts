import fp from "fastify-plugin";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { configureMessageQueue } from "@/modules/message/mq/message.queue.js";

export default fp(configureMessageQueue, {
    name: FastifyPlugin.MessageQueue,
    dependencies: [FastifyPlugin.BullMq],
});
