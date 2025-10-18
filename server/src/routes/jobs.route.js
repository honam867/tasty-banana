import express from "express";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { getJob } from "../controllers/jobs.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/jobs/:jobId - Get a specific job with images
router.get("/:jobId", getJob);

export default router;

