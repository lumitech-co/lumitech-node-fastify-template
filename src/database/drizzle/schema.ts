import { MessageMeta } from "@/lib/validation/message/message.schema.js";
import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { precision: 3, mode: "date" })
        .notNull()
        .defaultNow(),
    text: text("text").notNull(),
    meta: jsonb("meta").$type<MessageMeta>(),
});
