const DI_RESOLVERS = {
    messageHandler: "messageHandler",
    messageService: "messageService",
    messageRepository: "messageRepository",
} as const;

export type DIResolversKeys = keyof typeof DI_RESOLVERS;
export type DIResolversValues = (typeof DI_RESOLVERS)[DIResolversKeys];
