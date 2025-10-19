import { db } from "../db/drizzle.js";
import { jobs, messages } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { JOB_STATUS, MESSAGE_STATUS } from "../utils/constant.js";

/**
 * Recover stuck jobs and messages from previous server instance
 * Marks all stuck jobs and messages as "failed" since the server crashed
 * Handles two scenarios:
 * 1. Jobs stuck in "processing" (server crashed mid-processing)
 * 2. Jobs stuck in "queued" with messages stuck in "pending" (server crashed before processing started)
 * 
 * @returns {Promise<Object>} Object containing arrays of failed jobs and messages
 */
export const recoverStuckJobs = async () => {
  console.log("🔄 Checking for stuck jobs from previous server instance...");
  
  try {
    // Find all stuck jobs WITH their linked user messages
    // Scenario 1: Jobs stuck in "processing" (server crashed during processing)
    // Scenario 2: Jobs stuck in "queued" (server crashed before processing started)
    const stuckJobsWithMessages = await db
      .select({
        jobId: jobs.id,
        jobStatus: jobs.status,
        messageId: messages.id,
        messageStatus: messages.status,
        threadId: messages.threadId,
        jobCreatedAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(messages, eq(jobs.messageId, messages.id))
      .where(eq(jobs.status, JOB_STATUS.PROCESSING));

    // Also find jobs that are "queued" but never started (pending for too long)
    // These are jobs created but processJob never ran (server crashed right after job creation)
    const queuedJobsWithMessages = await db
      .select({
        jobId: jobs.id,
        jobStatus: jobs.status,
        messageId: messages.id,
        messageStatus: messages.status,
        threadId: messages.threadId,
        jobCreatedAt: jobs.createdAt,
      })
      .from(jobs)
      .innerJoin(messages, eq(jobs.messageId, messages.id))
      .where(eq(jobs.status, JOB_STATUS.QUEUED));

    const allStuckJobs = [...stuckJobsWithMessages, ...queuedJobsWithMessages];

    if (allStuckJobs.length === 0) {
      console.log("✅ No stuck jobs found");
      return { jobs: [], messages: [] };
    }

    console.log(`Found ${allStuckJobs.length} stuck job(s) with linked messages`);
    console.log(`   - ${stuckJobsWithMessages.length} in "processing" state`);
    console.log(`   - ${queuedJobsWithMessages.length} in "queued" state`);
    console.log(`   Marking all as failed due to server restart...`);

    // Mark each stuck job and its linked message as "failed"
    const failedJobs = [];
    const failedMessages = [];

    for (const stuck of allStuckJobs) {
      // Mark job as "failed"
      const [failedJob] = await db
        .update(jobs)
        .set({ 
          status: JOB_STATUS.FAILED,
          updatedAt: new Date() 
        })
        .where(eq(jobs.id, stuck.jobId))
        .returning();
      
      failedJobs.push(failedJob);

      // Mark linked user message as "failed"
      const [failedMessage] = await db
        .update(messages)
        .set({ 
          status: MESSAGE_STATUS.FAILED,
          updatedAt: new Date() 
        })
        .where(eq(messages.id, stuck.messageId))
        .returning();
      
      failedMessages.push(failedMessage);

      console.log(`   ❌ Marked as failed: job ${stuck.jobId} (was ${stuck.jobStatus}) → message ${stuck.messageId} (was ${stuck.messageStatus})`);
    }

    console.log(`✅ Successfully marked ${failedJobs.length} job(s) and ${failedMessages.length} message(s) as failed`);

    return { 
      jobs: failedJobs, 
      messages: failedMessages 
    };
  } catch (error) {
    console.error("❌ Failed to recover stuck jobs:", error.message);
    throw error;
  }
};

export default {
  recoverStuckJobs,
};
