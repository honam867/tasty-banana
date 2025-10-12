ALTER TABLE "uploads" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "mime_type" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "size_bytes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "storage_provider" varchar(50) DEFAULT 'r2' NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "storage_bucket" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "storage_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "public_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_uploads_user" ON "uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_thread" ON "uploads" USING btree ("thread_id");--> statement-breakpoint
ALTER TABLE "uploads" DROP COLUMN "url";--> statement-breakpoint
ALTER TABLE "uploads" DROP COLUMN "metadata";