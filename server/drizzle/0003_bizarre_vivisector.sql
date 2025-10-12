CREATE TYPE "public"."file_purpose" AS ENUM('init', 'mask', 'reference', 'attachment');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('text2img', 'img2img', 'inpaint', 'upscale', 'variation');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'tool', 'system');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'processing', 'succeeded', 'failed', 'canceled');