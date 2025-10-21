import express from "express";
import { uploadFile, getUserUploads, removeUpload } from "../controllers/uploads.controller.js";
import { verifyToken } from "../middlewares/tokenHandler.js";
import upload, { requireFile, handleMulterError } from "../config/multer.js";

const router = express.Router();

// GET /api/uploads - Get all uploads for authenticated user
router.get("/", verifyToken, getUserUploads);

// DELETE /api/uploads/:uploadId - Remove an upload for authenticated user
router.delete("/:uploadId", verifyToken, removeUpload);

// POST /api/uploads - Upload a file to R2
// Middleware chain:
// 1. verifyToken - Authenticate user via JWT
// 2. upload.single('file') - Parse multipart form data and validate file
// 3. handleMulterError - Handle multer-specific errors
// 4. requireFile - Ensure file was uploaded
// 5. uploadFile - Controller to handle the upload logic
router.post(
  "/",
  verifyToken,
  upload.single("file"),
  handleMulterError,
  requireFile("file"),
  uploadFile
);

export default router;


