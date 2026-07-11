import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { HEALTH_CHECK_RESPONSE } from "./application.constant.js";
import { HealthCheckResponse } from "@/lib/validation/application/application.schema.js";

export type ApplicationService = {
    healthChecker: () => Promise<HealthCheckResponse>;
};

export const createService = (): ApplicationService => ({
    healthChecker: async () => {
        return HEALTH_CHECK_RESPONSE;
    },
});

addDIResolverName(createService, "applicationService");
