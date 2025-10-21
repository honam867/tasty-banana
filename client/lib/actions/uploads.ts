"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Upload {
  id: string;
  userId: string;
  threadId: string | null;
  title: string | null;
  purpose: "reference" | "attachment" | "init" | "mask";
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageBucket: string;
  storageKey: string;
  publicUrl: string;
  createdAt: string;
}

async function getAuthToken() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  return tokenCookie?.value;
}

/**
 * Upload an image file
 * @param formData - FormData containing the file and metadata
 * @returns Upload object or error
 */
export async function uploadImage(formData: FormData) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to upload image",
      };
    }

    return {
      success: true,
      data: result.data as Upload,
    };
  } catch (error) {
    console.error("Upload image error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get user's uploaded files
 * @param purpose - Optional filter by purpose (reference, attachment, etc.)
 * @param limit - Number of results (default: 50)
 * @returns Array of uploads
 */
export async function getUserUploads(purpose?: string, limit: number = 50) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const params = new URLSearchParams({ limit: limit.toString() });
    if (purpose) {
      params.append("purpose", purpose);
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/uploads?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to fetch uploads",
      };
    }

    return {
      success: true,
      data: result.data.uploads as Upload[],
      count: result.data.count,
    };
  } catch (error) {
    console.error("Get uploads error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get reference images for authenticated user
 * @param limit - Number of results (default: 50)
 * @returns Array of reference image uploads
 */
export async function getUserReferenceImages(limit: number = 50) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const params = new URLSearchParams({ limit: limit.toString() });

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/users/reference-images?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to fetch reference images",
      };
    }

    return {
      success: true,
      data: result.data.items as Upload[],
      count: result.data.count,
    };
  } catch (error) {
    console.error("Get reference images error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete an uploaded file
 * @param uploadId - Upload ID to delete
 * @returns Success status
 */
export async function deleteUpload(uploadId: string) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/uploads/${uploadId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to delete upload",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Delete upload error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
