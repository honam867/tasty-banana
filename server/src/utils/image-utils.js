import lodash from "lodash";
const { get, isEmpty } = lodash;
import { IMAGE_UPLOAD_CONSTRAINTS } from "./constant.js";
import { getR2Client, getR2Bucket } from "../config/r2.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Validate image file metadata
 * @param {Object} params - Validation parameters
 * @param {string} params.mimeType - File MIME type
 * @param {number} params.sizeBytes - File size in bytes
 * @returns {Object} Validation result { isValid, error }
 */
export const validateImageFile = ({ mimeType, sizeBytes }) => {
  // Check MIME type
  if (!IMAGE_UPLOAD_CONSTRAINTS.allowedMimeTypes.includes(mimeType)) {
    return {
      isValid: false,
      error: `Invalid image type. Allowed types: ${IMAGE_UPLOAD_CONSTRAINTS.allowedMimeTypes.join(", ")}`,
    };
  }

  // Check file size
  if (sizeBytes > IMAGE_UPLOAD_CONSTRAINTS.maxSizeBytes) {
    const maxSizeMB = IMAGE_UPLOAD_CONSTRAINTS.maxSizeBytes / (1024 * 1024);
    return {
      isValid: false,
      error: `Image size exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { isValid: true, error: null };
};

/**
 * Download image from R2 storage
 * @param {string} storageKey - Storage key of the image
 * @returns {Promise<Buffer>} Image buffer
 * @throws {Error} If download fails
 */
export const downloadImageFromR2 = async (storageKey) => {
  try {
    const client = getR2Client();
    const bucket = getR2Bucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });

    const response = await client.send(command);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return buffer;
  } catch (error) {
    console.error(`Failed to download image from R2: ${storageKey}`, get(error, "message"));
    throw new Error(`Failed to download reference image: ${get(error, "message")}`);
  }
};

/**
 * Convert image buffer to base64 string
 * @param {Buffer} buffer - Image buffer
 * @returns {string} Base64 encoded string
 */
export const bufferToBase64 = (buffer) => {
  return buffer.toString("base64");
};

/**
 * Prepare reference image for API call
 * Downloads image from R2 and converts to base64
 * @param {string} storageKey - Storage key of the reference image
 * @returns {Promise<string>} Base64 encoded image
 * @throws {Error} If preparation fails
 */
export const prepareReferenceImage = async (storageKey) => {
  if (isEmpty(storageKey)) {
    throw new Error("Storage key is required for reference image");
  }

  try {
    console.log(`   Preparing reference image: ${storageKey}`);
    const imageBuffer = await downloadImageFromR2(storageKey);
    const base64Image = bufferToBase64(imageBuffer);
    console.log(`   ✅ Reference image prepared (${imageBuffer.length} bytes)`);
    return base64Image;
  } catch (error) {
    console.error(`Failed to prepare reference image:`, get(error, "message"));
    throw error;
  }
};

/**
 * Extract file extension from MIME type
 * @param {string} mimeType - MIME type (e.g., 'image/png')
 * @returns {string} File extension (e.g., '.png')
 */
export const getExtensionFromMimeType = (mimeType) => {
  const mimeToExtension = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return mimeToExtension[mimeType] || ".png";
};

export default {
  validateImageFile,
  downloadImageFromR2,
  bufferToBase64,
  prepareReferenceImage,
  getExtensionFromMimeType,
};
