"use server";

import { cookies } from "next/headers";

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
}

interface LoginResponse {
  success: boolean;
  status: number;
  message: string;
  user: User;
  token: string;
}

interface RegisterResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

interface ErrorResponse {
  success: false;
  status: number;
  message: string;
  errors?: Array<{ msg: string; param: string }>;
}

export async function loginAction(data: LoginRequest) {
  try {
    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      let errorMessage = result.message || "Login failed";
      
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        errorMessage = result.errors[0].msg || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage,
        errors: result.errors,
      };
    }

    const loginResponse = result as LoginResponse;

    const cookieStore = await cookies();
    cookieStore.set("token", loginResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24, // 7 days or 1 day
    });

    cookieStore.set("user", JSON.stringify(loginResponse.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24,
    });

    return {
      success: true,
      user: loginResponse.user,
      token: loginResponse.token,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function registerAction(data: RegisterRequest) {
  try {
    const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      let errorMessage = result.message || "Registration failed";
      
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        errorMessage = result.errors[0].msg || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage,
        errors: result.errors,
      };
    }

    const registerResponse = result as RegisterResponse;

    const cookieStore = await cookies();
    cookieStore.set("token", registerResponse.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });

    cookieStore.set("user", JSON.stringify(registerResponse.data.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return {
      success: true,
      user: registerResponse.data.user,
      token: registerResponse.data.token,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
  cookieStore.delete("user");

  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    const tokenCookie = cookieStore.get("token");

    if (!userCookie || !tokenCookie) {
      return null;
    }

    const user = JSON.parse(userCookie.value);
    return {
      user,
      token: tokenCookie.value,
    };
  } catch (error) {
    return null;
  }
}
