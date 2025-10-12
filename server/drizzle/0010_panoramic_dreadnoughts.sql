CREATE TABLE "job_inputs_uploads" (
	"job_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	CONSTRAINT "job_inputs_uploads_job_id_upload_id_pk" PRIMARY KEY("job_id","upload_id")
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"message_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	CONSTRAINT "message_attachments_message_id_upload_id_pk" PRIMARY KEY("message_id","upload_id")
);
--> statement-breakpoint
ALTER TABLE "job_inputs_uploads" ADD CONSTRAINT "job_inputs_uploads_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_inputs_uploads" ADD CONSTRAINT "job_inputs_uploads_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;