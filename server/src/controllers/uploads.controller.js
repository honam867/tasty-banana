import lodash from "lodash";
const { get, isEmpty, toNumber } = lodash;

import { uploadToR2, deleteFromR2 } from "../config/r2.js";
import { generateStorageKey } from "../utils/storageKey.js";
import { HTTP_STATUS, FILE_PURPOSE, VALID_FILE_PURPOSES } from "../utils/constant.js";
import { sendError } from "../utils/response.js";
import {
  createUpload,
  findUploadsByUserId,
  findUploadById,
  deleteUpload,
  isUploadOwnedByUser,
} from "../services/uploads.service.js";

/**
 * Upload file to R2 and save metadata to database
 * POST /api/uploads
 */
export const uploadFile = async (req, res) => {
  try {
    // Get file from multer (already validated by middleware)
    const file = get(req, "file");

    if (!file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: "No file uploaded",
      });
    }

    // Get authenticated user from verifyToken middleware
    const user = get(req, "user");
    const userId = get(user, "id");

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: "User not authenticated",
      });
    }

    // Get optional metadata from request body
    const purpose = get(req.body, "purpose", FILE_PURPOSE.ATTACHMENT);
    const title = get(req.body, "title");
    const threadId = get(req.body, "thread_id") || get(req.body, "threadId");

    // Validate purpose enum
    if (!VALID_FILE_PURPOSES.includes(purpose)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: `Invalid purpose. Must be one of: ${VALID_FILE_PURPOSES.join(", ")}`,
      });
    }

    // Extract file information
    const buffer = get(file, "buffer");
    const originalName = get(file, "originalname", "unnamed");
    const mimeType = get(file, "mimetype");
    const sizeBytes = toNumber(get(file, "size", 0));

    // Generate storage key using utility from task 6
    const storageKey = generateStorageKey(userId, originalName);

    // Get R2 configuration from environment
    const storageBucket = process.env.R2_BUCKET || "imggen-uploads";
    const storageProvider = "r2";

    // Upload to R2
    const uploadResult = await uploadToR2({
      buffer,
      key: storageKey,
      contentType: mimeType,
      metadata: {
        originalName,
        userId,
        purpose,
      },
    });

    // Prepare all required fields for database
    const insertData = {
      userId,
      purpose,
      mimeType,
      sizeBytes,
      storageProvider,
      storageBucket,
      storageKey,
      publicUrl: get(uploadResult, "publicUrl"),
    };

    // Add optional fields if provided
    if (!isEmpty(title)) {
      insertData.title = title;
    }

    if (!isEmpty(threadId)) {
      insertData.threadId = threadId;
    }

    const uploadRecord = await createUpload(insertData);

    // Return success response with all fields
    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: HTTP_STATUS.SUCCESS,
      message: "File uploaded successfully",
      data: uploadRecord,
    });
  } catch (error) {
    console.error("Upload error:", error);
    sendError(res, error);
  }
};

/**
 * Get all uploads for the authenticated user
 * GET /api/uploads
 */
export const getUserUploads = async (req, res) => {
  try {
    // Get authenticated user from verifyToken middleware
    const user = get(req, "user");
    const userId = get(user, "id");

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: "User not authenticated",
      });
    }

    // Get query parameters
    const limit = toNumber(get(req.query, "limit", 50));
    const purpose = get(req.query, "purpose");

    // Validate limit
    if (limit < 1 || limit > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: "Limit must be between 1 and 100",
      });
    }

    // Validate purpose if provided
    if (purpose && !VALID_FILE_PURPOSES.includes(purpose)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: `Invalid purpose. Must be one of: ${VALID_FILE_PURPOSES.join(
          ", "
        )}`,
      });
    }

    // Get uploads from service with database-level filtering
    const uploads = await findUploadsByUserId(userId, limit, purpose);

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: HTTP_STATUS.SUCCESS,
      message: "User uploads retrieved successfully",
      data: {
        uploads,
        count: uploads.length,
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Get user uploads error:", error);
    sendError(res, error);
  }
};

/**
 * Remove an upload for the authenticated user
 * DELETE /api/uploads/:uploadId
 */
export const removeUpload = async (req, res) => {
  try {
    // Get authenticated user from verifyToken middleware
    const user = get(req, "user");
    const userId = get(user, "id");

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: "User not authenticated",
      });
    }

    // Get upload ID from URL parameters
    const uploadId = get(req.params, "uploadId");

    if (!uploadId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: "Upload ID is required",
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uploadId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: "Invalid upload ID format",
      });
    }

    // Check if upload exists and belongs to user
    const upload = await findUploadById(uploadId);

    if (!upload) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        status: HTTP_STATUS.NOT_FOUND,
        message: "Upload not found",
      });
    }

    // Verify ownership
    const isOwned = await isUploadOwnedByUser(uploadId, userId);
    if (!isOwned) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: "You don't have permission to delete this upload",
      });
    }

    // Delete file from R2 storage
    const storageKey = get(upload, "storageKey");
    if (storageKey) {
      const deleteResult = await deleteFromR2({ key: storageKey });
      
      if (!get(deleteResult, "success")) {
        console.warn(`Failed to delete file from R2: ${get(deleteResult, "error")}`);
        // Continue with database deletion even if R2 deletion fails
      }
    }

    // Delete upload record from database
    const deletedUpload = await deleteUpload(uploadId);

    if (!deletedUpload) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: "Failed to delete upload record",
      });
    }

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: HTTP_STATUS.SUCCESS,
      message: "Upload deleted successfully",
      data: {
        id: get(deletedUpload, "id"),
        title: get(deletedUpload, "title"),
        purpose: get(deletedUpload, "purpose"),
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Remove upload error:", error);
    sendError(res, error);
  }
};
