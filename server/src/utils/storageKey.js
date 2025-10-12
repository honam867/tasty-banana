import { ulid } from 'ulid';
import lodash from 'lodash';
const { trim, toLower, replace, truncate } = lodash;

/**
 * Slugify a filename by converting it to lowercase, 
 * removing non-alphanumeric characters (except dashes),
 * and limiting its length.
 * 
 * @param {string} filename - Original filename
 * @param {number} maxLength - Maximum length for the slugified name (default: 60)
 * @returns {string} Slugified filename
 */
export const slugifyFilename = (filename, maxLength = 60) => {
  // Remove file extension
  const nameWithoutExt = replace(filename, /\.[^.]+$/, '');
  
  // Convert to lowercase and replace non-alphanumeric chars with dashes
  let slug = toLower(trim(nameWithoutExt));
  slug = replace(slug, /[^a-z0-9]+/g, '-');
  
  // Remove leading/trailing dashes
  slug = replace(slug, /^-+|-+$/g, '');
  
  // Truncate to max length
  if (slug.length > maxLength) {
    slug = truncate(slug, {
      length: maxLength,
      omission: ''
    });
    // Remove trailing dash after truncation
    slug = replace(slug, /-+$/, '');
  }
  
  // Fallback if slug becomes empty
  if (!slug || slug.length === 0) {
    slug = 'unnamed';
  }
  
  return slug;
};

/**
 * Generate a storage key for uploaded files following the pattern:
 * u/{user_id}/{yyyy}/{mm}/{dd}/{ulid}_{slugifiedOriginalName}
 * 
 * @param {string} userId - User ID (UUID format expected)
 * @param {string} originalFilename - Original filename of the uploaded file
 * @param {Date} date - Date to use for path components (defaults to current UTC)
 * @returns {string} Generated storage key
 */
export const generateStorageKey = (userId, originalFilename, date = new Date()) => {
  // Validate inputs
  if (!userId) {
    throw new Error('userId is required for storage key generation');
  }
  
  if (!originalFilename) {
    throw new Error('originalFilename is required for storage key generation');
  }
  
  // Generate ULID for uniqueness
  const uniqueId = ulid();
  
  // Get UTC date components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  // Slugify the original filename
  const slug = slugifyFilename(originalFilename);
  
  // Construct the storage key
  const storageKey = `u/${userId}/${year}/${month}/${day}/${uniqueId}_${slug}`;
  
  return storageKey;
};

/**
 * Extract the filename slug from a storage key
 * 
 * @param {string} storageKey - The storage key
 * @returns {string|null} The filename slug or null if not found
 */
export const extractSlugFromKey = (storageKey) => {
  const match = storageKey.match(/[^/]+_([^/]+)$/);
  return match ? match[1] : null;
};

export default {
  generateStorageKey,
  extractSlugFromKey,
  slugifyFilename
};

