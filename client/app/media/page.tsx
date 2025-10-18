"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/media/welcome-screen";
import { getThreads, createThread } from "@/lib/actions/threads";

export default function MediaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasThreads, setHasThreads] = useState(false);

  useEffect(() => {
    const checkThreads = async () => {
      const result = await getThreads(1);
      if (result.success && result.data) {
        if (result.data.items.length > 0) {
          setHasThreads(true);
          router.push(`/media/${result.data.items[0].id}`);
        } else {
          setHasThreads(false);
        }
      }
      setIsLoading(false);
    };

    checkThreads();
  }, [router]);

  const handleCreateThread = async () => {
    const result = await createThread();
    if (result.success && result.data) {
      router.push(`/media/${result.data.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-text-dim">Loading...</p>
      </div>
    );
  }

  if (hasThreads) {
    return null;
  }

  return <WelcomeScreen onCreateThread={handleCreateThread} />;
}
