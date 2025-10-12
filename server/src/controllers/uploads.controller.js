import lodash from "lodash";
const { get, isEmpty, toNumber } = lodash;

import { uploadToR2 } from "../config/r2.js";
import { generateStorageKey } from "../utils/storageKey.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendError } from "../utils/response.js";
import { createUpload } from "../services/uploads.service.js";

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
        message: "No file uploaded"
      });
    }
    
    // Get authenticated user from verifyToken middleware
    const user = get(req, "user");
    const userId = get(user, "id");
    
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: "User not authenticated"
      });
    }
    
    // Get optional metadata from request body
    const purpose = get(req.body, "purpose", "attachment");
    const title = get(req.body, "title");
    const threadId = get(req.body, "thread_id") || get(req.body, "threadId");
    
    // Validate purpose enum
    const validPurposes = ["init", "mask", "reference", "attachment"];
    if (!validPurposes.includes(purpose)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: `Invalid purpose. Must be one of: ${validPurposes.join(", ")}`
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
        purpose
      }
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
      publicUrl: get(uploadResult, "publicUrl")
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
      data: {
        id: get(uploadRecord, "id"),
        userId: get(uploadRecord, "userId"),
        threadId: get(uploadRecord, "threadId"),
        title: get(uploadRecord, "title"),
        purpose: get(uploadRecord, "purpose"),
        mimeType: get(uploadRecord, "mimeType"),
        sizeBytes: get(uploadRecord, "sizeBytes"),
        storageProvider: get(uploadRecord, "storageProvider"),
        storageBucket: get(uploadRecord, "storageBucket"),
        storageKey: get(uploadRecord, "storageKey"),
        publicUrl: get(uploadRecord, "publicUrl"),
        createdAt: get(uploadRecord, "createdAt")
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    sendError(res, error);
  }
};

