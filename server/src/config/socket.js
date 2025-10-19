import { Server } from "socket.io";

let io = null;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} httpServer - HTTP server instance
 * @returns {import('socket.io').Server} Socket.IO server instance
 */
export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join thread room
    socket.on("join-thread", (threadId) => {
      socket.join(`thread:${threadId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined thread: ${threadId}`);
    });

    // Leave thread room
    socket.on("leave-thread", (threadId) => {
      socket.leave(`thread:${threadId}`);
      console.log(`[Socket.IO] Client ${socket.id} left thread: ${threadId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get Socket.IO server instance
 * @returns {import('socket.io').Server|null} Socket.IO server instance
 */
export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
}

/**
 * Emit message status update to thread room
 * @param {string} threadId - Thread ID
 * @param {object} message - Message data
 */
export function emitMessageUpdate(threadId, message) {
  if (!io) {
    console.warn("[Socket.IO] Socket not initialized, skipping emit");
    return;
  }

  io.to(`thread:${threadId}`).emit("message:update", {
    messageId: message.id,
    status: message.status,
    content: message.content,
    role: message.role,
    updatedAt: message.updatedAt,
    job: message.job || null,
    images: message.images || [],
  });

  console.log(
    `[Socket.IO] Emitted message:update for thread ${threadId}, message ${message.id}`
  );
}

/**
 * Emit job status update to thread room
 * @param {string} threadId - Thread ID
 * @param {string} messageId - Message ID
 * @param {object} job - Job data
 */
export function emitJobUpdate(threadId, messageId, job) {
  if (!io) {
    console.warn("[Socket.IO] Socket not initialized, skipping emit");
    return;
  }

  io.to(`thread:${threadId}`).emit("job:update", {
    messageId,
    jobId: job.id,
    status: job.status,
    parameters: job.parameters,
    updatedAt: job.updatedAt,
  });

  console.log(
    `[Socket.IO] Emitted job:update for thread ${threadId}, job ${job.id}`
  );
}

export default {
  initializeSocket,
  getIO,
  emitMessageUpdate,
  emitJobUpdate,
};
