import lodash from "lodash";
const { get } = lodash;

import fs from "fs";
import path from "path";

import {
  generateImage,
  resetGeminiClient
} from "../../src/services/gemini.service.js";

import { testGeminiAuth } from "../../src/config/gemini.js";

/**
 * Integration Tests for Gemini Image Generation
 * 
 * These tests make REAL API calls to Google Vertex AI Imagen
 * and generate actual images that are saved to disk.
 * 
 * Prerequisites:
 * 1. GOOGLE_APPLICATION_CREDENTIALS must point to valid service account JSON
 * 2. GOOGLE_CLOUD_PROJECT must be set to your GCP project ID
 * 3. Vertex AI API must be enabled in your GCP project
 * 4. Service account must have Vertex AI User role
 * 
 * To run ONLY these integration tests:
 * npm test -- tests/services/gemini.integration.spec.js
 * 
 * To skip these tests in regular test runs:
 * npm test -- --testPathIgnorePatterns=integration
 */

describe("Gemini Service - Integration Tests (Real API)", () => {
  const outputDir = path.join(process.cwd(), "tests", "output", "images");
  
  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  beforeEach(() => {
    resetGeminiClient();
  });

  describe("Authentication Test", () => {
    it("should successfully authenticate with Google Cloud", async () => {
      const result = await testGeminiAuth();
      
      expect(get(result, "success")).toBe(true);
      expect(get(result, "projectId")).toBeDefined();
      expect(get(result, "hasToken")).toBe(true);
      
      console.log("\n✅ Authentication successful!");
      console.log(`   Project: ${get(result, "projectId")}`);
      console.log(`   Location: ${get(result, "location")}`);
      console.log(`   Model: ${get(result, "model")}`);
    }, 30000); // 30 second timeout for auth
  });

  describe("Single Image Generation", () => {
    it("should generate a single image and save it to disk", async () => {
      const prompt = "A serene mountain landscape at sunset with a calm lake in the foreground";
      
      console.log("\n🎨 Generating image...");
      console.log(`   Prompt: ${prompt}`);

      const result = await generateImage({
        prompt,
        numberOfImages: 1,
        aspectRatio: "16:9"
      });

      // Verify result structure
      expect(get(result, "count")).toBe(1);
      expect(get(result, "images")).toHaveLength(1);
      
      const image = get(result, "images[0]");
      expect(get(image, "imageData")).toBeDefined();
      expect(get(image, "mimeType")).toBeDefined();

      // Save image to disk
      const imageBuffer = Buffer.from(get(image, "imageData"), "base64");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `generated-single-${timestamp}.png`;
      const filepath = path.join(outputDir, filename);
      
      fs.writeFileSync(filepath, imageBuffer);
      
      console.log("\n✅ Image generated successfully!");
      console.log(`   File saved to: ${filepath}`);
      console.log(`   File size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   MIME type: ${get(image, "mimeType")}`);
      
      // Verify file was created
      expect(fs.existsSync(filepath)).toBe(true);
      expect(fs.statSync(filepath).size).toBeGreaterThan(0);
    }, 60000); // 60 second timeout for image generation
  });

  describe("Multiple Image Generation", () => {
    it("should generate multiple images with different prompts", async () => {
      const prompts = [
        "A futuristic city with flying cars at night",
        "A peaceful zen garden with cherry blossoms"
      ];
      
      for (const prompt of prompts) {
        console.log(`\n🎨 Generating image for: ${prompt.substring(0, 50)}...`);

        const result = await generateImage({
          prompt,
          numberOfImages: 1,
          aspectRatio: "1:1"
        });

        expect(get(result, "count")).toBe(1);
        
        const image = get(result, "images[0]");
        const imageBuffer = Buffer.from(get(image, "imageData"), "base64");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `generated-multi-${timestamp}.png`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        console.log(`   ✅ Saved to: ${filepath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      }
    }, 120000); // 120 second timeout for multiple generations
  });

  describe("Different Aspect Ratios", () => {
    it("should generate images with different aspect ratios", async () => {
      const aspectRatios = ["1:1", "16:9", "9:16"];
      const prompt = "A beautiful sunset over the ocean";
      
      for (const aspectRatio of aspectRatios) {
        console.log(`\n🎨 Generating ${aspectRatio} image...`);

        const result = await generateImage({
          prompt,
          numberOfImages: 1,
          aspectRatio
        });

        expect(get(result, "count")).toBe(1);
        
        const image = get(result, "images[0]");
        const imageBuffer = Buffer.from(get(image, "imageData"), "base64");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `generated-ratio-${aspectRatio.replace(":", "x")}-${timestamp}.png`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        console.log(`   ✅ Saved ${aspectRatio} image to: ${filepath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      }
    }, 180000); // 3 minute timeout for multiple aspect ratios
  });

  describe("Batch Image Generation", () => {
    it("should generate multiple variations in a single request", async () => {
      const prompt = "A cute robot playing with a kitten";
      const numberOfImages = 2;
      
      console.log(`\n🎨 Generating ${numberOfImages} variations...`);
      console.log(`   Prompt: ${prompt}`);

      const result = await generateImage({
        prompt,
        numberOfImages,
        aspectRatio: "1:1"
      });

      expect(get(result, "count")).toBe(numberOfImages);
      expect(get(result, "images")).toHaveLength(numberOfImages);

      console.log(`\n✅ Generated ${numberOfImages} images successfully!`);
      
      // Save each image
      const images = get(result, "images", []);
      images.forEach((image, index) => {
        const imageBuffer = Buffer.from(get(image, "imageData"), "base64");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `generated-batch-${index + 1}-${timestamp}.png`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, imageBuffer);
        
        console.log(`   Image ${index + 1} saved to: ${filepath}`);
        console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      });
    }, 90000); // 90 second timeout for batch generation
  });

  describe("Error Handling", () => {
    it("should handle invalid prompt gracefully", async () => {
      await expect(generateImage({
        prompt: "" // Empty prompt
      })).rejects.toThrow("Prompt is required");
    });

    it("should handle invalid parameters gracefully", async () => {
      await expect(generateImage({
        prompt: "test",
        numberOfImages: 10 // Too many images
      })).rejects.toThrow("numberOfImages must be between 1 and 8");
    });
  });
});


