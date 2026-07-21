CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"meta" jsonb
);
