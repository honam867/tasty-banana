import express from "express";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { createNewThread, listThreads, getThread } from "../controllers/threads.controller.js";
import { createThreadMessage, listThreadMessages } from "../controllers/messages.controller.js";
import { ROUTES } from "../utils/routes.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// POST /api/threads - Create a new thread
router.post("/", createNewThread);

// GET /api/threads - Get all threads for authenticated user
router.get("/", listThreads);

// GET /api/threads/:threadId - Get a specific thread
router.get("/:threadId", getThread);

// PUT /api/threads/:threadId - Update a thread
router.put("/:threadId", (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Endpoint not implemented yet" 
  });
});

// DELETE /api/threads/:threadId - Delete a thread
router.delete("/:threadId", (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: "Endpoint not implemented yet" 
  });
});

// POST /api/threads/:threadId/messages - Create a new message in a thread
router.post(ROUTES.THREAD_MESSAGES, createThreadMessage);

// GET /api/threads/:threadId/messages - Get all messages in a thread
router.get(ROUTES.THREAD_MESSAGES, listThreadMessages);

export default router;

