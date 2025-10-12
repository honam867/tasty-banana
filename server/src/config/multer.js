import dotenv from "dotenv";
dotenv.config();

import multer from "multer";
import lodash from "lodash";
const { get, toNumber, includes } = lodash;

import { HTTP_STATUS } from "../utils/constant.js";

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
];

// Get max file size from environment (in MB, convert to bytes)
const getMaxFileSize = () => {
  const maxSizeMB = toNumber(get(process.env, "UPLOAD_MAX_SIZE_MB", 10));
  return maxSizeMB * 1024 * 1024; // Convert MB to bytes
};

/**
 * File filter function for multer
 * Only accepts allowed image MIME types
 */
const fileFilter = (req, file, cb) => {
  const mimeType = get(file, "mimetype", "");
  
  if (includes(ALLOWED_MIME_TYPES, mimeType)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file with custom error
    const error = new Error("Unsupported file type. Only PNG, JPEG, WebP, and GIF images are allowed.");
    error.code = "UNSUPPORTED_FILE_TYPE";
    error.statusCode = HTTP_STATUS.GEN_UNPROCESSABLE_ENTITY;
    cb(error, false);
  }
};

/**
 * Multer configuration with memory storage
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getMaxFileSize()
  },
  fileFilter: fileFilter
});

/**
 * Middleware to handle multer errors
 * Transforms multer errors into appropriate HTTP responses
 */
export const handleMulterError = (err, req, res, next) => {
  // Check if error is from multer (either instanceof or has multer-specific codes)
  const isMulterError = err instanceof multer.MulterError || 
                        (err && (err.code === "LIMIT_FILE_SIZE" || 
                                err.code === "LIMIT_UNEXPECTED_FILE" ||
                                err.name === "MulterError"));
  
  if (isMulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSizeMB = get(process.env, "UPLOAD_MAX_SIZE_MB", 10);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`
      });
    }
    
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: "Unexpected file field"
      });
    }
    
    // Other multer errors
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      status: HTTP_STATUS.BAD_REQUEST,
      message: err.message || "File upload error"
    });
  }
  
  // Custom file filter errors
  if (err && err.code === "UNSUPPORTED_FILE_TYPE") {
    return res.status(HTTP_STATUS.GEN_UNPROCESSABLE_ENTITY).json({
      success: false,
      status: HTTP_STATUS.GEN_UNPROCESSABLE_ENTITY,
      message: err.message
    });
  }
  
  // Pass other errors to next error handler
  if (err) {
    next(err);
  } else {
    next();
  }
};

/**
 * Middleware to validate that a file was uploaded
 */
export const requireFile = (fieldName = "file") => {
  return (req, res, next) => {
    const file = get(req, "file");
    const files = get(req, "files");
    
    if (!file && (!files || files.length === 0)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        status: HTTP_STATUS.BAD_REQUEST,
        message: `No file uploaded. Please provide a file in the '${fieldName}' field.`
      });
    }
    
    next();
  };
};

/**
 * Export configured multer instance
 */
export default upload;

/**
 * Export helper for getting allowed MIME types (useful for documentation/tests)
 */
export const getAllowedMimeTypes = () => ALLOWED_MIME_TYPES;

