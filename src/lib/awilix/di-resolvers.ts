export const DI_RESOLVERS = {
    messageHandler: "messageHandler",
    messageService: "messageService",
} as const;

export type DiResolversKeys = keyof typeof DI_RESOLVERS;
export type DiResolversValues = (typeof DI_RESOLVERS)[DiResolversKeys];
