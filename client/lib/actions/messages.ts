"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Image {
  id: string;
  url: string;
  metadata: {
    etag: string;
    index: number;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    generationParams?: {
      aspectRatio: string;
      numberOfImages: number;
    };
  };
  createdAt: string;
}

interface Job {
  status: string;
  parameters: {
    seed: string | null;
    prompt: string;
    aspectRatio: string;
    numberOfImages: number;
    personGeneration: string;
    enablePromptRewriting: boolean;
  };
}

interface Message {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  job?: Job | null;
  images?: Image[];
}

interface MessagesResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    items: Message[];
    nextCursor: string | null;
  };
}

interface SendMessageResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    userMessage: Message;
    job: {
      id: string;
      status: string;
      parameters: any;
    };
    provider: {
      id: string;
      name: string;
    };
  };
}

async function getAuthToken() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");
  return tokenCookie?.value;
}

export async function getMessages(threadId: string, limit: number = 50, cursor?: string) {
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
      `${NEXT_PUBLIC_API_BASE_URL}/threads/${threadId}/messages?${params.toString()}`,
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
        error: result.message || "Failed to fetch messages",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Get messages error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

interface GenerationParams {
  numberOfImages?: number;
  aspectRatio?: string;
}

export async function sendMessage(
  threadId: string,
  content: string,
  generationParams?: GenerationParams
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const body: any = {
      role: "user",
      content,
    };

    if (generationParams && (generationParams.numberOfImages || generationParams.aspectRatio)) {
      body.generationParams = generationParams;
    }

    const response = await fetch(
      `${NEXT_PUBLIC_API_BASE_URL}/threads/${threadId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || "Failed to send message",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Send message error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
