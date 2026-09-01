import { z } from "zod";

const cachedResponseSchema = z.object({
    payload: z.string(),
    contentType: z.string(),
});

type CachedResponse = z.infer<typeof cachedResponseSchema>;

export { cachedResponseSchema };

export type { CachedResponse };
