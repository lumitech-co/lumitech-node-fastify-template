import { addDIResolverName } from "@/lib/awilix/awilix.js";

export type ApplicationService = {
    healthChecker: () => Promise<string>;
};

export const createApplicationService = (): ApplicationService => ({
    healthChecker: async () => {
        return "pong";
    },
});

addDIResolverName(createApplicationService, "applicationService");
