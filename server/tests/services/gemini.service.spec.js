import lodash from "lodash";
const { get } = lodash;

// Set up environment variables for tests BEFORE importing anything else
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
process.env.GOOGLE_CLOUD_PROJECT = "test-project";
process.env.VERTEX_AI_LOCATION = "us-central1";
process.env.IMAGE_GEN_MODEL = "imagen-3.0-generate-001";

// Import the service functions - we'll mock at a different level
import {
  buildGenerateRequest,
  parseImageResponse,
  mapGeminiError
} from "../../src/services/gemini.service.js";

// For integration-style tests, we'll test the pure functions
// The functions that require actual API calls will be tested separately

describe("Gemini Service - Unit Tests", () => {
  // Note: Tests for initGeminiClient, getAuthenticatedClient, and generateImage
  // are complex to mock in Jest with ES modules. Those functions are tested
  // indirectly through integration tests and the config tests.

  describe("buildGenerateRequest", () => {
    it("should build valid request with minimal parameters", () => {
      const params = {
        prompt: "A beautiful sunset over mountains"
      };

      const request = buildGenerateRequest(params);

      expect(get(request, "instances[0].prompt")).toBe(params.prompt);
      expect(get(request, "parameters.sampleCount")).toBe(1);
      expect(get(request, "parameters.aspectRatio")).toBe("1:1");
      expect(get(request, "parameters.language")).toBe("auto");
      expect(get(request, "parameters.addWatermark")).toBe(true);
    });

    it("should build valid request with all parameters", () => {
      const params = {
        prompt: "A serene lake",
        numberOfImages: 4,
        aspectRatio: "16:9",
        seed: 12345,
        language: "en",
        addWatermark: false
      };

      const request = buildGenerateRequest(params);

      expect(get(request, "instances[0].prompt")).toBe(params.prompt);
      expect(get(request, "instances[0].seed")).toBe(12345);
      expect(get(request, "parameters.sampleCount")).toBe(4);
      expect(get(request, "parameters.aspectRatio")).toBe("16:9");
      expect(get(request, "parameters.language")).toBe("en");
      expect(get(request, "parameters.addWatermark")).toBe(false);
    });

    it("should throw error when prompt is missing", () => {
      expect(() => buildGenerateRequest({})).toThrow("Prompt is required");
    });

    it("should throw error when prompt is empty string", () => {
      expect(() => buildGenerateRequest({ prompt: "" })).toThrow("Prompt is required");
    });

    it("should throw error for invalid numberOfImages", () => {
      expect(() => buildGenerateRequest({
        prompt: "test",
        numberOfImages: 0
      })).toThrow("numberOfImages must be between 1 and 8");

      expect(() => buildGenerateRequest({
        prompt: "test",
        numberOfImages: 9
      })).toThrow("numberOfImages must be between 1 and 8");
    });

    it("should throw error for invalid aspectRatio", () => {
      expect(() => buildGenerateRequest({
        prompt: "test",
        aspectRatio: "invalid"
      })).toThrow("aspectRatio must be one of");
    });

    it("should handle all valid aspect ratios", () => {
      const validRatios = ["1:1", "9:16", "16:9", "4:3", "3:4"];
      
      validRatios.forEach(ratio => {
        const request = buildGenerateRequest({
          prompt: "test",
          aspectRatio: ratio
        });
        expect(get(request, "parameters.aspectRatio")).toBe(ratio);
      });
    });

    it("should not include seed if not provided", () => {
      const request = buildGenerateRequest({ prompt: "test" });
      expect(get(request, "instances[0].seed")).toBeUndefined();
    });

    it("should convert seed to integer", () => {
      const request = buildGenerateRequest({
        prompt: "test",
        seed: "12345"
      });
      expect(get(request, "instances[0].seed")).toBe(12345);
      expect(typeof get(request, "instances[0].seed")).toBe("number");
    });
  });

  describe("parseImageResponse", () => {
    it("should parse valid response with single image", () => {
      const mockResponse = [
        {
          predictions: [
            {
              bytesBase64Encoded: "base64ImageData1",
              mimeType: "image/png"
            }
          ]
        }
      ];

      const result = parseImageResponse(mockResponse);

      expect(get(result, "count")).toBe(1);
      expect(get(result, "images")).toHaveLength(1);
      expect(get(result, "images[0].imageData")).toBe("base64ImageData1");
      expect(get(result, "images[0].mimeType")).toBe("image/png");
      expect(get(result, "images[0].index")).toBe(0);
    });

    it("should parse valid response with multiple images", () => {
      const mockResponse = [
        {
          predictions: [
            {
              bytesBase64Encoded: "base64ImageData1",
              mimeType: "image/png"
            },
            {
              bytesBase64Encoded: "base64ImageData2",
              mimeType: "image/jpeg"
            },
            {
              bytesBase64Encoded: "base64ImageData3",
              mimeType: "image/png"
            }
          ]
        }
      ];

      const result = parseImageResponse(mockResponse);

      expect(get(result, "count")).toBe(3);
      expect(get(result, "images")).toHaveLength(3);
      expect(get(result, "images[0].imageData")).toBe("base64ImageData1");
      expect(get(result, "images[1].imageData")).toBe("base64ImageData2");
      expect(get(result, "images[2].imageData")).toBe("base64ImageData3");
    });

    it("should use default mimeType if not provided", () => {
      const mockResponse = [
        {
          predictions: [
            {
              bytesBase64Encoded: "base64ImageData1"
            }
          ]
        }
      ];

      const result = parseImageResponse(mockResponse);

      expect(get(result, "images[0].mimeType")).toBe("image/png");
    });

    it("should throw error for empty response", () => {
      expect(() => parseImageResponse(null)).toThrow("Empty response received");
      expect(() => parseImageResponse(undefined)).toThrow("Empty response received");
      expect(() => parseImageResponse([])).toThrow("Empty response received");
    });

    it("should throw error when predictions are missing", () => {
      const mockResponse = [{}];
      expect(() => parseImageResponse(mockResponse)).toThrow("No predictions found");
    });

    it("should throw error when predictions array is empty", () => {
      const mockResponse = [{ predictions: [] }];
      expect(() => parseImageResponse(mockResponse)).toThrow("No predictions found");
    });

    it("should filter out predictions with missing image data", () => {
      const mockResponse = [
        {
          predictions: [
            {
              bytesBase64Encoded: "base64ImageData1",
              mimeType: "image/png"
            },
            {
              mimeType: "image/png"
              // Missing bytesBase64Encoded
            },
            {
              bytesBase64Encoded: "base64ImageData3",
              mimeType: "image/png"
            }
          ]
        }
      ];

      const result = parseImageResponse(mockResponse);

      expect(get(result, "count")).toBe(2);
      expect(get(result, "images")).toHaveLength(2);
      expect(get(result, "images[0].imageData")).toBe("base64ImageData1");
      expect(get(result, "images[1].imageData")).toBe("base64ImageData3");
    });

    it("should throw error if all predictions are invalid", () => {
      const mockResponse = [
        {
          predictions: [
            { mimeType: "image/png" },
            { mimeType: "image/png" }
          ]
        }
      ];

      expect(() => parseImageResponse(mockResponse)).toThrow("No valid images found");
    });
  });

  describe("mapGeminiError", () => {
    it("should map rate limit error (status 429)", () => {
      const error = {
        status: 429,
        message: "Rate limit exceeded"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("RATE_LIMIT_EXCEEDED");
      expect(get(mapped, "status")).toBe(429);
      expect(get(mapped, "message")).toContain("rate limit");
    });

    it("should map rate limit error (code 8)", () => {
      const error = {
        code: 8,
        message: "Quota exceeded"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("RATE_LIMIT_EXCEEDED");
      expect(get(mapped, "status")).toBe(429);
    });

    it("should map rate limit error by message content", () => {
      const error = {
        message: "quota exceeded for project"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("RATE_LIMIT_EXCEEDED");
      expect(get(mapped, "status")).toBe(429);
    });

    it("should map bad request error (status 400)", () => {
      const error = {
        status: 400,
        message: "Invalid request parameters"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("INVALID_REQUEST");
      expect(get(mapped, "status")).toBe(400);
      expect(get(mapped, "message")).toContain("Invalid");
    });

    it("should map bad request error (code 3)", () => {
      const error = {
        code: 3,
        message: "Invalid argument"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("INVALID_REQUEST");
      expect(get(mapped, "status")).toBe(400);
    });

    it("should map authentication errors (401)", () => {
      const error = {
        status: 401,
        message: "Unauthorized"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("AUTHENTICATION_FAILED");
      expect(get(mapped, "status")).toBe(401);
    });

    it("should map authentication errors (403)", () => {
      const error = {
        status: 403,
        message: "Forbidden"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("AUTHENTICATION_FAILED");
      expect(get(mapped, "status")).toBe(401);
    });

    it("should map authentication errors (code 7 - permission denied)", () => {
      const error = {
        code: 7,
        message: "Permission denied"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("AUTHENTICATION_FAILED");
      expect(get(mapped, "status")).toBe(401);
    });

    it("should map generic errors", () => {
      const error = {
        message: "Something went wrong"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("GENERATION_FAILED");
      expect(get(mapped, "status")).toBe(500);
      expect(get(mapped, "message")).toContain("internal error");
    });

    it("should handle errors with no message", () => {
      const error = {};

      const mapped = mapGeminiError(error);

      expect(get(mapped, "code")).toBe("GENERATION_FAILED");
      expect(get(mapped, "originalError")).toBe("Unknown error");
    });

    it("should preserve original error message", () => {
      const error = {
        message: "Specific error details"
      };

      const mapped = mapGeminiError(error);

      expect(get(mapped, "originalError")).toBe("Specific error details");
    });
  });

});

