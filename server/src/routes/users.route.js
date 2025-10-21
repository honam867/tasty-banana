import express from "express";
import { verifyToken } from "../middlewares/tokenHandler.js";
import { getUserReferenceImages } from "../controllers/reference-images.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/users/reference-images - Get reference images for authenticated user
router.get("/reference-images", getUserReferenceImages);

export default router;
