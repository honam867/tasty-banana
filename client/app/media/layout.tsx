"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { MediaSidebar } from "@/components/media/media-sidebar";
import { cn } from "@/lib/utils";

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarCollapsed((prev) => !prev);
    };

    window.addEventListener("toggleSidebar", handleToggleSidebar);
    return () => {
      window.removeEventListener("toggleSidebar", handleToggleSidebar);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-text-dim">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex">
      <MediaSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          isSidebarCollapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"
        )}
      >
        {children}
      </main>
    </div>
  );
}
