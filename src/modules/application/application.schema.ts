import { z } from "zod";

const healthCheckResponseSchema = z.string();

type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

export { healthCheckResponseSchema };

export type { HealthCheckResponse };
