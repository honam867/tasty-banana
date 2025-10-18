"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loginAction, registerAction, logoutAction, getCurrentUser } from "@/lib/actions/auth";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
}

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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<{ success: boolean; error?: string; errors?: any[] }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string; errors?: any[] }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const login = async (data: LoginRequest) => {
    const result = await loginAction(data);
    
    if (result.success && result.user) {
      setUser(result.user);
      router.push("/");
      router.refresh();
      return { success: true };
    }
    
    return {
      success: false,
      error: result.error,
      errors: result.errors,
    };
  };

  const register = async (data: RegisterRequest) => {
    const result = await registerAction(data);
    
    if (result.success && result.user) {
      setUser(result.user);
      router.push("/");
      router.refresh();
      return { success: true };
    }
    
    return {
      success: false,
      error: result.error,
      errors: result.errors,
    };
  };

  const logout = async () => {
    await logoutAction();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
