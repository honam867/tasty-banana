export const HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  GEN_UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_TEMPORARILY_OVERLOADED: 502,
  SERVICE_UNAVAILABLE: 503,
  CONFLICT: 409,
  TOO_MANY_REQUEST: 429,
};

export const ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MOD: "mod",
  WAREHOUSE: "warehouse",
  USER: "user",
};

export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const TOKEN_USAGE = {
  DEFAULT: 1000,
};

export const DATE = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
};

export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELED: "canceled",
};

export const JOB_TYPE = {
  TEXT2IMG: "text2img",
  IMG2IMG: "img2img",
  INPAINT: "inpaint",
  UPSCALE: "upscale",
  VARIATION: "variation",
};

// Terminal states - job status cannot be changed from these states
export const TERMINAL_JOB_STATUSES = [
  JOB_STATUS.SUCCEEDED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELED,
];

// Valid job statuses array (for validation)
export const VALID_JOB_STATUSES = Object.values(JOB_STATUS);

// Valid job types array (for validation)
export const VALID_JOB_TYPES = Object.values(JOB_TYPE);

// Job Error Codes
export const JOB_ERROR_CODE = {
  // Validation errors
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_JOB_TYPE: "INVALID_JOB_TYPE",
  INVALID_STATUS: "INVALID_STATUS",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  
  // Database errors
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  JOB_ALREADY_EXISTS: "JOB_ALREADY_EXISTS",
  DATABASE_ERROR: "DATABASE_ERROR",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  
  // Processing errors
  GENERATION_FAILED: "GENERATION_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  MESSAGE_UPDATE_FAILED: "MESSAGE_UPDATE_FAILED",
  
  // Resource errors
  NO_IMAGES_GENERATED: "NO_IMAGES_GENERATED",
  PARTIAL_STORAGE_FAILURE: "PARTIAL_STORAGE_FAILURE",
  ORPHANED_RESOURCE: "ORPHANED_RESOURCE",
  
  // System errors
  TIMEOUT: "TIMEOUT",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

// Job operation timeouts (in milliseconds)
export const JOB_TIMEOUT = {
  GENERATION: 120000, // 2 minutes
  STORAGE: 60000, // 1 minute
  STATUS_UPDATE: 5000, // 5 seconds
};

// Retry configuration for transient failures
export const JOB_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2,
};

export const setResetPassEmailContent = (username, newPassword) => {
  return `Your new password for user ${username} in Ecomx system is: \n ${newPassword} \n If you did not request to reset your password, it is safe to disregard this message. You can learn more about why you may have received this email here.\n
  Best regards, \n
  The Ecomx Team`;
};

export const randomPassword = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

// Image generation default parameters
export const IMAGE_GENERATION_DEFAULTS = {
  // User-customizable parameters
  numberOfImages: 1,
  aspectRatio: "1:1",
  seed: null,
  
  // Fixed defaults (not user-customizable)
  personGeneration: "allow_all",
  enablePromptRewriting: true,
};

// Valid values for image generation parameters
export const IMAGE_GENERATION_CONSTRAINTS = {
  numberOfImages: {
    min: 1,
    max: 4,
  },
  aspectRatios: ["1:1", "9:16", "16:9", "4:3", "3:4"],
  personGeneration: ["dont_allow", "allow_adult", "allow_all"],
};

// Message roles
export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
};

// Message statuses
export const MESSAGE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
};