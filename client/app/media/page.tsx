"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/media/welcome-screen";
import { getThreads, createThread } from "@/lib/actions/threads";
import BananaLoading from "@/components/ui/banana-loading";

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
      // Dispatch event to refresh sidebar threads
      const event = new CustomEvent("refreshThreads");
      window.dispatchEvent(event);

      router.push(`/media/${result.data.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <BananaLoading speed={4}/>
        </div>
      </div>
    );
  }

  if (hasThreads) {
    return null;
  }

  return <WelcomeScreen onCreateThread={handleCreateThread} />;
}
