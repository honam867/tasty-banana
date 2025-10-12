import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import lodash from 'lodash';
const { get } = lodash;

// Import R2 functions without mocking for integration tests
import {
  uploadToR2,
  generatePublicUrl,
  testR2Connection,
  getR2Bucket
} from '../../src/config/r2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hard-coded test file path
const TEST_IMAGE_PATH = join(__dirname, 'test-upload.png');

describe('R2 Integration Tests (Actual Uploads)', () => {
  let testFileBuffer;
  let uploadedKeys = [];

  beforeAll(() => {
    // Load the test image file
    try {
      testFileBuffer = readFileSync(TEST_IMAGE_PATH);
      console.log(`✅ Test image loaded: ${TEST_IMAGE_PATH} (${testFileBuffer.length} bytes)`);
    } catch (error) {
      const errorMessage = get(error, 'message', 'Unknown error');
      throw new Error(`Failed to load test image: ${errorMessage}`);
    }
  });

  afterAll(() => {
    if (uploadedKeys.length > 0) {
      console.log('\n📋 Uploaded files (please delete manually if needed):');
      uploadedKeys.forEach((key) => {
        console.log(`   - ${key}`);
        console.log(`     URL: ${generatePublicUrl(key)}`);
      });
    }
  });

  describe('R2 Connection', () => {
    it('should successfully connect to R2 bucket', async () => {
      const isConnected = await testR2Connection();
      
      expect(isConnected).toBe(true);
      console.log(`✅ Connected to bucket: ${getR2Bucket()}`);
    });
  });

  describe('Actual File Upload', () => {
    it('should upload test-upload.png to R2 successfully', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/test-upload-${timestamp}.png`;

      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'image/png',
        metadata: {
          uploadedBy: 'integration-test',
          timestamp: timestamp.toString(),
          originalName: 'test-upload.png'
        }
      });

      // Track uploaded file for cleanup reference
      uploadedKeys.push(key);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('key', key);
      expect(result).toHaveProperty('publicUrl');
      expect(result).toHaveProperty('etag');
      expect(result.publicUrl).toContain(key);

      console.log(`✅ Upload successful!`);
      console.log(`   Key: ${result.key}`);
      console.log(`   Public URL: ${result.publicUrl}`);
      console.log(`   ETag: ${result.etag}`);
    }, 30000); // 30 second timeout for actual upload

    it('should upload file with different name format', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/integration-test-${timestamp}.png`;

      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'image/png'
      });

      uploadedKeys.push(key);

      expect(result.success).toBe(true);
      expect(result.key).toBe(key);
      expect(result.publicUrl).toBe(generatePublicUrl(key));

      console.log(`✅ Upload successful with key: ${key}`);
    }, 30000);

    it('should handle upload with subdirectory structure', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/integration/nested/test-${timestamp}.png`;

      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'image/png',
        metadata: {
          testType: 'nested-structure'
        }
      });

      uploadedKeys.push(key);

      expect(result.success).toBe(true);
      expect(result.key).toBe(key);
      
      console.log(`✅ Nested upload successful: ${key}`);
    }, 30000);
  });

  describe('Public URL Generation', () => {
    it('should generate accessible public URLs', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/url-test-${timestamp}.png`;

      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'image/png'
      });

      uploadedKeys.push(key);

      const generatedUrl = generatePublicUrl(key);
      
      expect(generatedUrl).toBe(result.publicUrl);
      expect(generatedUrl).toMatch(/^https?:\/\/.+/);
      expect(generatedUrl).toContain(key);

      console.log(`✅ Public URL generated: ${generatedUrl}`);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid content type gracefully', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/invalid-type-${timestamp}.png`;

      // Should still upload even with unusual content type
      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'application/octet-stream'
      });

      uploadedKeys.push(key);

      expect(result.success).toBe(true);
      console.log(`✅ Upload with different content type successful`);
    }, 30000);

    it('should accept empty buffer (R2 allows empty files)', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/empty-${timestamp}.png`;

      const result = await uploadToR2({
        buffer: Buffer.from(''),
        key,
        contentType: 'image/png'
      });

      uploadedKeys.push(key);

      // R2 accepts empty files, so this should succeed
      expect(result.success).toBe(true);
      expect(result.key).toBe(key);
      console.log(`✅ Empty file upload successful: ${key}`);
    }, 30000);
  });

  describe('Metadata Handling', () => {
    it('should upload with custom metadata', async () => {
      const timestamp = Date.now();
      const key = `test-uploads/metadata-test-${timestamp}.png`;

      const customMetadata = {
        userId: 'test-user-123',
        uploadSource: 'integration-test',
        environment: 'test',
        timestamp: timestamp.toString()
      };

      const result = await uploadToR2({
        buffer: testFileBuffer,
        key,
        contentType: 'image/png',
        metadata: customMetadata
      });

      uploadedKeys.push(key);

      expect(result.success).toBe(true);
      console.log(`✅ Upload with metadata successful`);
      console.log(`   Metadata:`, customMetadata);
    }, 30000);
  });
});

