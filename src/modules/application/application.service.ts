import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { HEALTH_CHECK_RESPONSE } from "./application.constant.js";
import type { HealthCheckResponse } from "./application.schema.js";

export type ApplicationService = {
    healthChecker: () => Promise<HealthCheckResponse>;
};

export const createService = (): ApplicationService => ({
    healthChecker: () => Promise.resolve(HEALTH_CHECK_RESPONSE),
});

addDIResolverName(createService, "applicationService");
