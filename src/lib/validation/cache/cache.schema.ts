import { z } from "zod";

const cachedResponseSchema = z.object({
    payload: z.string(),
    headers: z.record(z.string(), z.string()),
});

export { cachedResponseSchema };
