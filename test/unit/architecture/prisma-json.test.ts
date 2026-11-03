/**
 * Rule 8: every PrismaJson type is the exact z.infer of the Zod schema that
 * validates the column. The assertions run in `npm run tsc-check`, so a field
 * added to one side only fails CI.
 */
import type { z } from "zod";
import { describe, expectTypeOf, it } from "vitest";
import type { messageMetaSchema } from "@/modules/message/message.schema.js";

describe("Rule 8: PrismaJson types match their Zod schemas", () => {
    it("PrismaJson.MessageMeta equals z.infer<typeof messageMetaSchema>", () => {
        expectTypeOf<PrismaJson.MessageMeta>().toEqualTypeOf<
            z.infer<typeof messageMetaSchema>
        >();
    });
});
