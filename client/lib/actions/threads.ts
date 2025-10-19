"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Thread {
  id: string;
  ownerId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

interface ThreadsResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    items: Thread[];
    nextCursor: string | null;
  };
}

interface CreateThreadResponse {
  success: boolean;
  status: number;
  message: string;
  data: Thread;
}

async function getAuthToken() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  return tokenCookie?.value;
}

export async function getThreads(limit: number = 20, cursor?: string) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/threads?${params.toString()}`,
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
        error: result.message || "Failed to fetch threads",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Get threads error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function createThread() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to create thread",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Create thread error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function deleteThread(threadId: string) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/threads/${threadId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const result = await response.json();
      console.log("❤️ ~ deleteThread ~ result:", result)
      return {
        success: false,
        error: result.message || "Failed to delete thread",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete thread error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
