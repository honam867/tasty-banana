"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Bot,
  Plus,
  Trash2,
  History,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getThreads, createThread, deleteThread } from "@/lib/actions/threads";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

interface Thread {
  id: string;
  ownerId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

interface MediaSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function MediaSidebar({ isCollapsed, setIsCollapsed }: MediaSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentThreadId = pathname.split("/media/")[1] || null;

  const fetchThreads = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    const result = await getThreads(20, cursor);

    if (result.success && result.data) {
      if (cursor) {
        setThreads((prev) => [...prev, ...result.data.items]);
      } else {
        setThreads(result.data.items);
      }
      setNextCursor(result.data.nextCursor);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    const handleRefreshThreads = () => {
      fetchThreads();
    };

    window.addEventListener("refreshThreads", handleRefreshThreads);
    return () => {
      window.removeEventListener("refreshThreads", handleRefreshThreads);
    };
  }, [fetchThreads]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !nextCursor || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      fetchThreads(nextCursor);
    }
  }, [nextCursor, isLoadingMore, fetchThreads]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const handleCreateThread = async () => {
    const result = await createThread();
    if (result.success && result.data) {
      setThreads((prev) => [result.data, ...prev]);
      router.push(`/media/${result.data.id}`);
    }
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await deleteThread(threadId);
    if (result.success) {
      const updatedThreads = threads.filter((t) => t.id !== threadId);
      setThreads(updatedThreads);

      if (currentThreadId === threadId) {
        if (updatedThreads.length > 0) {
          router.push(`/media/${updatedThreads[0].id}`);
        } else {
          router.push("/media");
        }
      }
    }
  };

  const getThreadName = (thread: Thread) => {
    if (thread.name) {
      return thread.name;
    }
    return dayjs(thread.createdAt).format("DD-MM-YYYY HH:mm");
  };

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-surface border-r border-border flex flex-col transition-all duration-300 z-40",
          isCollapsed ? "w-16 -translate-x-full md:translate-x-0" : "w-64"
        )}
      >
        <div className="h-16 border-b border-border flex items-center justify-center px-4">
          <Link href="/" className={cn(
            "flex items-center gap-2 group",
            isCollapsed && "justify-center"
          )}>
            <span className={cn("animate-zoom-pulse", isCollapsed ? "text-2xl" : "text-3xl")}>🍌</span>
            {!isCollapsed && <span className="text-xl font-heading font-bold">Tasty Banana</span>}
          </Link>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-3">
            <Button
              onClick={handleCreateThread}
              variant="default"
              size="sm"
              className={cn("w-full", isCollapsed && "px-2")}
            >
              <Plus size={18} />
              {!isCollapsed && <span className="ml-2">New Thread</span>}
            </Button>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-2 pr-1 custom-scrollbar"
          >
            {isLoading ? (
              <div className="text-center text-text-dim py-4">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="text-center text-text-dim py-4 px-2 text-sm">
                {isCollapsed ? "No threads" : "No threads yet"}
              </div>
            ) : (
              <div className="space-y-1">
                {threads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/media/${thread.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group relative",
                      currentThreadId === thread.id &&
                        "bg-primary/10 hover:bg-primary/15"
                    )}
                  >
                    <Bot
                      size={20}
                      className={cn(
                        "flex-shrink-0",
                        currentThreadId === thread.id
                          ? "text-primary"
                          : "text-text-dim"
                      )}
                    />
                    {!isCollapsed && (
                      <>
                        <span
                          className={cn(
                            "flex-1 text-sm truncate",
                            currentThreadId === thread.id
                              ? "text-primary font-medium"
                              : "text-text-dim"
                          )}
                        >
                          {getThreadName(thread)}
                        </span>
                        <button
                          onClick={(e) => handleDeleteThread(thread.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/20 rounded transition-all"
                        >
                          <Trash2 size={16} className="text-danger" />
                        </button>
                      </>
                    )}
                  </Link>
                ))}
                {isLoadingMore && (
                  <div className="text-center text-text-dim py-2 text-sm">
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border">
          <button
            onClick={() => setShowHistoryPopup(true)}
            className={cn(
              "w-full flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors",
              isCollapsed && "justify-center"
            )}
          >
            <History size={20} className="text-text-dim flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm text-text-dim">History</span>
            )}
          </button>

          <div
            className={cn(
              "flex items-center gap-3 p-4 border-t border-border",
              isCollapsed && "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-primary" />
            </div>
            {!isCollapsed && user && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-text-dim truncate">{user.email}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "w-full flex items-center gap-3 p-4 border-t border-border hover:bg-surface-2 transition-colors",
              isCollapsed && "justify-center"
            )}
          >
            {isCollapsed ? (
              <ChevronRight size={20} className="text-text-dim flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft size={20} className="text-text-dim flex-shrink-0" />
                <span className="text-sm text-text-dim">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {showHistoryPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowHistoryPopup(false)}
        >
          <div
            className="bg-surface rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-heading font-bold mb-4">History</h3>
            <p className="text-text-dim mb-6">Building...</p>
            <Button onClick={() => setShowHistoryPopup(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
