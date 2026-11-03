import { describe, expect, it } from "vitest";
import { summarizeJobData } from "@/lib/bullmq/bullmq.util.js";

describe("summarizeJobData", () => {
    it("keeps top-level scalars and drops nested payloads", () => {
        expect(
            summarizeJobData({
                id: "msg-1",
                attempt: 2,
                urgent: false,
                parentId: null,
                payload: { text: "private user content" },
                tags: ["a"],
                missing: undefined,
            })
        ).toEqual({ id: "msg-1", attempt: 2, urgent: false, parentId: null });
    });

    it.each([undefined, null, "text", 42])(
        "returns null for the non-object %j",
        (data) => {
            expect(summarizeJobData(data)).toBeNull();
        }
    );
});
