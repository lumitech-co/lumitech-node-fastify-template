import { z } from "zod";

const cachedResponseSchema = z.object({
    payload: z.string(),
    headers: z.record(z.string(), z.string()),
});

type CachedResponse = z.infer<typeof cachedResponseSchema>;

export { cachedResponseSchema };

export type { CachedResponse };
