# Google Cloud / Vertex AI Setup Guide

This guide explains how to set up Google Cloud authentication for the Gemini 2.5 Flash Image Generation API via Vertex AI.

## Prerequisites

- A Google Cloud account
- Billing enabled on your Google Cloud project
- Node.js and npm installed

## Step 1: Enable Vertex AI API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Vertex AI API"
5. Click **Enable**

## Step 2: Create a Service Account

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Provide a name (e.g., "imagen-api-service")
4. Click **Create and Continue**
5. Grant the **Vertex AI User** role
6. Click **Continue**, then **Done**

## Step 3: Generate and Download Service Account Key

1. Find your newly created service account in the list
2. Click on the service account name
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create**
7. The JSON key file will download automatically

## Step 4: Configure Environment Variables

1. **Move the downloaded JSON key** to your server directory:
   ```bash
   # Rename it to google-service-account.json (or your preferred name)
   mv ~/Downloads/your-project-xyz-abc123.json ./server/google-service-account.json
   ```

2. **Create a `.env` file** in the `server` directory if it doesn't exist:
   ```bash
   cd server
   touch .env
   ```

3. **Add the following environment variables** to your `.env` file:
   ```bash
   # Google Cloud / Vertex AI Configuration
   GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
   GOOGLE_CLOUD_PROJECT=your-project-id-here
   VERTEX_AI_LOCATION=us-central1
   IMAGE_GEN_MODEL=imagen-3.0-generate-001
   IMAGE_GEN_MAX_RPM=60
   ```

4. **Replace placeholders** with your actual values:
   - `GOOGLE_CLOUD_PROJECT`: Your Google Cloud project ID (found in the Cloud Console)
   - `VERTEX_AI_LOCATION`: The region for Vertex AI (default: `us-central1`)
   - `IMAGE_GEN_MODEL`: The model name (default: `imagen-3.0-generate-001`)

## Step 5: Secure Your Credentials

**⚠️ IMPORTANT: Never commit your service account JSON to version control!**

The `.gitignore` file already includes:
```
# Service account credentials
google-service-account.json
*.json
```

Verify this by running:
```bash
git status
# google-service-account.json should NOT appear in untracked files
```

## Step 6: Install Dependencies

Install the required Google Cloud packages:
```bash
cd server
npm install google-auth-library @google-cloud/aiplatform
```

## Step 7: Test Authentication

Run the authentication test:
```bash
npm test -- tests/config/gemini.spec.js
```

Or test it programmatically in your application:
```javascript
import { testGeminiAuth } from './src/config/gemini.js';

const result = await testGeminiAuth();
if (result.success) {
  console.log('✅ Authentication successful!');
  console.log('Project ID:', result.projectId);
  console.log('Location:', result.location);
  console.log('Model:', result.model);
} else {
  console.error('❌ Authentication failed:', result.error);
}
```

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | - | Path to service account JSON key file |
| `GOOGLE_CLOUD_PROJECT` | Yes | - | Your Google Cloud project ID |
| `VERTEX_AI_LOCATION` | No | `us-central1` | Vertex AI region/location |
| `IMAGE_GEN_MODEL` | No | `imagen-3.0-generate-001` | Image generation model name |
| `IMAGE_GEN_MAX_RPM` | No | `60` | Max requests per minute (rate limiting) |

### Available Locations

Common Vertex AI locations:
- `us-central1` (Iowa)
- `us-east1` (South Carolina)
- `us-west1` (Oregon)
- `europe-west4` (Netherlands)
- `asia-southeast1` (Singapore)

Check [Vertex AI locations](https://cloud.google.com/vertex-ai/docs/general/locations) for the full list.

### Available Models

- `imagen-3.0-generate-001` - Imagen 3.0 (latest)
- `imagen-3.0-fast-generate-001` - Imagen 3.0 Fast
- `imagegeneration@006` - Imagen 2.0

## Troubleshooting

### "GOOGLE_APPLICATION_CREDENTIALS is not configured"
- Ensure the `.env` file exists in the `server` directory
- Verify the environment variable is set correctly
- Check that the file path is correct (relative to the server directory)

### "GOOGLE_CLOUD_PROJECT is not configured"
- Add your project ID to the `.env` file
- You can find your project ID in the Cloud Console

### "Failed to obtain access token"
- Verify the service account has the **Vertex AI User** role
- Check that the JSON key file is valid and not corrupted
- Ensure the Vertex AI API is enabled in your project

### "Permission denied" or "403 Forbidden"
- Verify the service account has sufficient permissions
- Grant the **Vertex AI User** role if not already assigned
- Check billing is enabled on your project

## Security Best Practices

1. **Never commit credentials** - Keep service account JSON out of version control
2. **Rotate keys regularly** - Delete old keys and create new ones periodically
3. **Use least privilege** - Only grant necessary permissions to service accounts
4. **Monitor usage** - Set up billing alerts and monitor API usage
5. **Use different keys** - Use separate service accounts for dev/staging/production

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen API Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Google Cloud Authentication](https://cloud.google.com/docs/authentication)

