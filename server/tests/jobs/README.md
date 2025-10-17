# Jobs Service Integration Tests

## Overview

Comprehensive end-to-end integration tests for the Jobs Service Layer (Task 5). These tests validate the complete job lifecycle from creation through image generation, storage, and message updates.

## Test Coverage

### 1. Job Creation Flow
- ✅ Create job with valid parameters
- ✅ Validate required fields (messageId, providerId, jobType)
- ✅ Reject invalid job types
- ✅ Prevent duplicate jobs for same message
- ✅ Verify proper JobError handling

### 2. Job Status Updates
- ✅ Update status: queued → processing
- ✅ Update status: processing → succeeded
- ✅ Reject invalid status transitions
- ✅ Prevent updates to terminal states (succeeded, failed, canceled)
- ✅ Handle non-existent job updates

### 3. Job Retrieval
- ✅ Get job by ID
- ✅ Return null for non-existent jobs
- ✅ Validate input parameters
- ✅ Handle database errors

### 4. Complete Job Processing (E2E)
- ✅ Full job lifecycle: create → process → store → update message
- ✅ Image generation via Gemini API
- ✅ Image storage to R2 (Cloudflare)
- ✅ Message updates with results
- ✅ Error handling for failed generations
- ✅ Graceful degradation
- ✅ Timeout protection
- ✅ Retry logic verification

### 5. Error Handling
- ✅ JobError class instantiation
- ✅ Error code mapping
- ✅ HTTP status code mapping
- ✅ Context preservation
- ✅ toJSON() and toObject() methods
- ✅ Edge cases and validation

## Prerequisites

### 1. Environment Variables
Create a `.env` file in the server directory with:

```bash
# Google Cloud / Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket-url

# Database (if not using default test DB)
DATABASE_URL=postgresql://...
```

### 2. GCP Setup
- Enable Vertex AI API in your GCP project
- Create a service account with "Vertex AI User" role
- Download service account JSON key
- Set `GOOGLE_APPLICATION_CREDENTIALS` to the JSON file path

### 3. Cloudflare R2 Setup
- Create an R2 bucket
- Generate API tokens with read/write permissions
- Configure public URL for the bucket
- Set R2 environment variables

### 4. Database
- PostgreSQL database running
- Migrations applied
- Test database configured

## Running the Tests

### Run All Job Tests
```bash
npm test tests/jobs/jobs.integration.spec.js
```

### Run with Verbose Output
```bash
npm test tests/jobs/jobs.integration.spec.js -- --verbose
```

### Run Specific Test Suite
```bash
npm test tests/jobs/jobs.integration.spec.js -- -t "Job Creation Flow"
```

### Run E2E Tests Only
```bash
npm test tests/jobs/jobs.integration.spec.js -- -t "Complete Job Processing Flow"
```

### Watch Mode
```bash
npm test tests/jobs/jobs.integration.spec.js -- --watch
```

## Test Structure

```
tests/jobs/
├── README.md                      # This file
└── jobs.integration.spec.js       # Main integration tests
```

## Test Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Job Processing Flow                   │
└─────────────────────────────────────────────────────────────┘

1. Job Creation
   ├─ Validate input parameters
   ├─ Check for duplicate jobs
   └─ Create job with status: queued
          ↓
2. Job Processing (processJob)
   ├─ Update status: queued → processing
   ├─ Extract parameters (prompt, numberOfImages, etc.)
   ├─ Call Gemini API for image generation
   │  ├─ Timeout protection (2 minutes)
   │  ├─ Retry logic for transient failures
   │  └─ Error handling
   └─ On success → continue
          ↓
3. Image Storage
   ├─ Convert base64 to Buffer
   ├─ Generate unique storage keys (ULID)
   ├─ Upload to R2 (Cloudflare)
   │  ├─ Timeout protection (1 minute)
   │  ├─ Retry logic for uploads
   │  └─ Get public URLs
   ├─ Create database records
   │  └─ On failure → cleanup orphaned R2 images
   └─ On success → continue
          ↓
4. Message Update
   ├─ Build message content with image URLs
   ├─ Update message status to succeeded
   └─ Non-blocking (failures don't affect job)
          ↓
5. Final Status Update
   ├─ Update job status: processing → succeeded
   └─ Return complete result
          ↓
6. Verification
   ├─ Retrieve job by ID
   ├─ Verify status is succeeded
   ├─ Retrieve images by job ID
   └─ Verify all images stored with URLs
```

## Error Scenarios Tested

### 1. Validation Errors (400)
- Missing required fields
- Invalid job types
- Invalid status values
- Empty parameters

### 2. Conflict Errors (409)
- Duplicate job for same message

### 3. Not Found Errors (404)
- Non-existent job ID
- Job not in database

### 4. Processing Errors (500)
- Image generation failures
- Storage failures
- Database errors
- Message update failures

### 5. Timeout Errors (504)
- Image generation timeout (>2 min)
- Storage timeout (>1 min)
- Status update timeout (>5 sec)

## Expected Test Output

```
🔐 Testing Gemini authentication...
✅ Gemini authentication successful!

Jobs Service - End-to-End Integration Tests
  Job Creation Flow
    ✓ should create a job with valid parameters (123ms)
    ✓ should reject job creation with missing required fields (45ms)
    ✓ should reject job creation with invalid job type (38ms)
    ✓ should reject duplicate job for same message (89ms)
    
  Job Status Updates
    ✓ should update job status from queued to processing (56ms)
    ✓ should update job status from processing to succeeded (67ms)
    ✓ should reject invalid status transitions (42ms)
    ✓ should reject update for non-existent job (34ms)
    
  Job Retrieval
    ✓ should get job by ID (45ms)
    ✓ should return null for non-existent job (28ms)
    ✓ should reject getJobById with missing jobId (12ms)
    
  Complete Job Processing Flow (E2E)
    🚀 Starting E2E Job Processing Test
    ============================================================
    1️⃣  Creating job...
       ✅ Job created: abc123...
    2️⃣  Processing job (this may take 30-60 seconds)...
       ✅ Job status: succeeded
       ✅ Generated 1 image(s)
       ✅ Stored 1 image(s) to R2
       📸 Image URL: https://...
    3️⃣  Retrieving stored images...
       ✅ Retrieved 1 image(s)
    4️⃣  Verifying final job state...
       ✅ Final job status: succeeded
    ============================================================
    🎉 E2E Test Completed Successfully!
    ============================================================
    ✓ should process a complete job lifecycle successfully (45678ms)
    ✓ should handle job processing failure gracefully (1234ms)
    
  Error Handling Edge Cases
    ✓ should handle processJob with non-existent job (34ms)
    ✓ should handle getImagesByJobId with invalid jobId (23ms)
    ✓ should return empty array for job with no images (45ms)
    
  JobError Class Functionality
    ✓ should create JobError with all properties (5ms)
    ✓ should convert JobError to JSON (3ms)
    ✓ should convert JobError to object (2ms)

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
Time:        48.234s
```

## Troubleshooting

### Authentication Errors
```
❌ Gemini authentication failed!
```
**Solution**: Check `GOOGLE_APPLICATION_CREDENTIALS` and `GOOGLE_CLOUD_PROJECT` in `.env`

### Storage Errors
```
❌ Failed to upload to R2
```
**Solution**: Verify R2 credentials and bucket configuration

### Timeout Errors
```
❌ Image generation timed out after 120000ms
```
**Solution**: This is normal for slow API responses. The test has a 2-minute timeout.

### Database Errors
```
❌ Database connection failed
```
**Solution**: Ensure PostgreSQL is running and migrations are applied

## Notes

- **E2E Test Duration**: The complete E2E test takes 30-60 seconds due to actual image generation
- **Rate Limits**: Be aware of Gemini API rate limits when running tests repeatedly
- **Cleanup**: Tests create real jobs in the database. Consider using a test database
- **R2 Storage**: Tests upload real images to R2. Monitor your storage usage
- **Costs**: Running these tests incurs small costs for Gemini API and R2 storage

## Coverage Goals

- [x] Unit tests for all core functions
- [x] Integration tests for database operations
- [x] E2E tests for complete job lifecycle
- [x] Error handling validation
- [x] JobError class functionality
- [ ] Performance/load testing (future)
- [ ] Concurrent job processing (future)
- [ ] Retry logic stress tests (future)

## Related Documentation

- [Jobs Service](../../src/services/jobs.service.js)
- [JobError Class](../../src/utils/JobError.js)
- [Error Constants](../../src/utils/constant.js)
- [Test Image Generation Script](../../scripts/test-image-generation.js)


