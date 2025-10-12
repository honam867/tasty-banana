import dotenv from "dotenv";
dotenv.config();

import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import lodash from "lodash";
const { get, isEmpty } = lodash;

/**
 * Get R2 configuration from environment variables
 * @returns {Object} R2 configuration object
 */
const getR2Config = () => {
  const accountId = get(process.env, "R2_ACCOUNT_ID", "");
  const accessKeyId = get(process.env, "R2_ACCESS_KEY_ID", "");
  const secretAccessKey = get(process.env, "R2_SECRET_ACCESS_KEY", "");
  const bucketEnv = get(process.env, "R2_BUCKET", "");
  const bucket = isEmpty(bucketEnv) ? "imggen-uploads" : bucketEnv;
  const publicBaseUrl = get(process.env, "R2_PUBLIC_BASE_URL", "");

  if (isEmpty(accountId)) {
    throw new Error("R2_ACCOUNT_ID is not configured in environment variables");
  }

  if (isEmpty(accessKeyId)) {
    throw new Error("R2_ACCESS_KEY_ID is not configured in environment variables");
  }

  if (isEmpty(secretAccessKey)) {
    throw new Error("R2_SECRET_ACCESS_KEY is not configured in environment variables");
  }

  if (isEmpty(publicBaseUrl)) {
    throw new Error("R2_PUBLIC_BASE_URL is not configured in environment variables");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`
  };
};

/**
 * Create and configure S3Client for Cloudflare R2
 * @returns {S3Client} Configured S3Client instance
 */
const createR2Client = () => {
  const config = getR2Config();

  const s3Client = new S3Client({
    region: "auto", // Cloudflare R2 uses 'auto' for region
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return s3Client;
};

// Create singleton instance
let r2Client = null;

/**
 * Get R2 client instance (singleton)
 * @returns {S3Client} R2 client instance
 */
export const getR2Client = () => {
  if (!r2Client) {
    r2Client = createR2Client();
  }
  return r2Client;
};

/**
 * Reset R2 client instance (for testing purposes)
 */
export const resetR2Client = () => {
  r2Client = null;
};

/**
 * Get R2 bucket name from environment
 * @returns {string} Bucket name
 */
export const getR2Bucket = () => {
  const config = getR2Config();
  return config.bucket;
};

/**
 * Get R2 public base URL from environment
 * @returns {string} Public base URL
 */
export const getR2PublicBaseUrl = () => {
  const config = getR2Config();
  return config.publicBaseUrl;
};

/**
 * Generate public URL for an uploaded file
 * @param {string} key - The object key/path in R2
 * @returns {string} Full public URL
 */
export const generatePublicUrl = (key) => {
  const baseUrl = getR2PublicBaseUrl();
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  // Remove leading slash from key if present
  const cleanKey = key.startsWith("/") ? key.slice(1) : key;
  return `${cleanBaseUrl}/${cleanKey}`;
};

/**
 * Upload file buffer to R2
 * @param {Object} params - Upload parameters
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.key - Object key/path in R2
 * @param {string} params.contentType - File MIME type
 * @param {Object} params.metadata - Optional metadata
 * @returns {Promise<Object>} Upload result with URL
 */
export const uploadToR2 = async ({ buffer, key, contentType, metadata = {} }) => {
  const client = getR2Client();
  const bucket = getR2Bucket();

  try {
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata
      }
    });

    // Execute the upload
    const result = await upload.done();

    // Generate public URL
    const publicUrl = generatePublicUrl(key);

    return {
      success: true,
      key,
      publicUrl,
      etag: result.ETag,
      location: result.Location
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Test R2 connection by attempting to list buckets
 * This is useful for verifying credentials and configuration
 * @returns {Promise<boolean>} True if connection successful
 */
export const testR2Connection = async () => {
  try {
    const client = getR2Client();
    const bucket = getR2Bucket();
    
    // Try to head the bucket to verify access
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    
    console.log(`✅ R2 connection successful. Bucket '${bucket}' is accessible.`);
    return true;
  } catch (error) {
    console.error("❌ R2 connection failed:", error.message);
    return false;
  }
};

export default {
  getR2Client,
  getR2Bucket,
  getR2PublicBaseUrl,
  generatePublicUrl,
  uploadToR2,
  testR2Connection
};

