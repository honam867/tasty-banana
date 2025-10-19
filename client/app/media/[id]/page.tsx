"use client";

import { useParams } from "next/navigation";
import { Bot, Menu } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { getMessages, sendMessage } from "@/lib/actions/messages";
import { MessageBubble } from "@/components/messages/message-bubble";
import { AssistantMessage } from "@/components/messages/assistant-message";
import { LoadingMessage } from "@/components/messages/loading-message";
import { AnimatedInput } from "@/components/messages/animated-input";
import { GenerationConfig } from "@/components/messages/generation-config";
import type { GenerationParams } from "@/lib/constants/generation";
import { useSocket } from "@/components/providers/socket-provider";
import { joinThread, leaveThread } from "@/lib/socket";
import BananaLoading from "@/components/ui/banana-loading";

interface Image {
  id: string;
  url: string;
  metadata: any;
  createdAt: string;
}

interface Message {
  id: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  job?: any;
  images?: Image[];
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.id as string;
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<GenerationParams>(
    {}
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages[messages.length - 1];
  const isProcessing =
    (lastMessage?.role === "user" &&
      (lastMessage?.status === "pending" ||
        lastMessage?.status === "processing")) ||
    (lastMessage?.role === "assistant" &&
      (lastMessage?.status === "pending" ||
        lastMessage?.status === "processing" ||
        lastMessage?.status === "queued"));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      const result = await getMessages(threadId);
      if (result.success && result.data) {
        const fetchedMessages = result.data.items.reverse();
        setMessages(fetchedMessages);

        // Check if the last message is still processing
        const lastMsg = fetchedMessages[fetchedMessages.length - 1];
        const isStillProcessing =
          (lastMsg?.role === "user" &&
            (lastMsg?.status === "pending" ||
              lastMsg?.status === "processing")) ||
          (lastMsg?.role === "assistant" &&
            (lastMsg?.status === "pending" ||
              lastMsg?.status === "processing" ||
              lastMsg?.status === "queued"));

        if (isStillProcessing) {
          setIsSending(true);
        }
      }
      setIsLoading(false);
    };

    fetchMessages();
  }, [threadId]);

  // WebSocket: Join/leave thread room
  useEffect(() => {
    if (isConnected && threadId) {
      console.log("[Thread] Socket connected, joining thread:", threadId);
      joinThread(threadId);
      return () => {
        console.log("[Thread] Leaving thread:", threadId);
        leaveThread(threadId);
      };
    } else {
      console.log(
        "[Thread] Socket not connected yet. isConnected:",
        isConnected,
        "threadId:",
        threadId
      );
    }
  }, [isConnected, threadId]);

  // WebSocket: Listen for message updates
  useEffect(() => {
    if (!socket) {
      console.log("[Thread] No socket available for listeners");
      return;
    }

    console.log("[Thread] Setting up socket event listeners");

    let isFetching = false;
    let pendingFetch = false;

    const fetchMessagesDebounced = async () => {
      if (isFetching) {
        pendingFetch = true;
        return;
      }

      isFetching = true;
      const result = await getMessages(threadId);
      if (result.success && result.data) {
        setMessages(result.data.items.reverse());
      }
      isFetching = false;

      if (pendingFetch) {
        pendingFetch = false;
        setTimeout(() => fetchMessagesDebounced(), 100);
      }
    };

    const handleMessageUpdate = async (data: any) => {
      console.log("[Socket] ✅ Received message:update event:", data);

      // If message succeeded or failed, stop sending state
      if (data.status === "succeeded" || data.status === "failed") {
        console.log("[Socket] Message completed, stopping sending state");
        setIsSending(false);
      }

      // Only fetch on final status to avoid flickering
      if (data.status === "succeeded" || data.status === "failed") {
        await fetchMessagesDebounced();
      }
    };

    const handleJobUpdate = async (data: any) => {
      console.log("[Socket] ✅ Received job:update event:", data);

      // If job succeeded or failed, stop sending state and refresh messages
      if (data.status === "succeeded" || data.status === "failed") {
        console.log("[Socket] Job completed, stopping sending state");
        setIsSending(false);
        await fetchMessagesDebounced();
      }
    };

    socket.on("message:update", handleMessageUpdate);
    socket.on("job:update", handleJobUpdate);

    console.log("[Thread] Event listeners registered");

    return () => {
      console.log("[Thread] Removing event listeners");
      socket.off("message:update", handleMessageUpdate);
      socket.off("job:update", handleJobUpdate);
    };
  }, [socket, threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || isProcessing) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      threadId,
      role: "user",
      content: inputValue.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    const params =
      generationConfig.numberOfImages || generationConfig.aspectRatio
        ? generationConfig
        : undefined;

    const result = await sendMessage(threadId, userMessage.content, params);

    if (result.success && result.data) {
      // Fetch updated messages WITHOUT removing temp message first
      // This prevents flickering - the fetch will replace the entire list smoothly
      const messagesResult = await getMessages(threadId);
      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data.items.reverse());
      }
      // WebSocket will handle updates automatically, no need to poll
    } else {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: "failed" } : msg
        )
      );
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b border-border flex items-center px-6 gap-3">
        <button
          onClick={() => {
            const event = new CustomEvent("toggleSidebar");
            window.dispatchEvent(event);
          }}
          className="md:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold">AI Media Generation</h1>
          <p className="text-xs text-text-dim">
            Generate stunning images with AI
          </p>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 custom-scrollbar"
      >
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <BananaLoading speed={4} />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">
                Start Creating
              </h3>
              <p className="text-text-dim">
                Type a prompt below to generate your first AI image
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) =>
                message.role === "user" ? (
                  <MessageBubble
                    key={message.id}
                    content={message.content}
                    isUser={true}
                  />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    content={message.content}
                    images={message.images}
                  />
                )
              )}
              {(isSending || isProcessing) && (
                <div className="flex gap-3 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                    <span className="text-2xl">🍌</span>
                  </div>
                  <div className="bg-surface-2 px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-border p-6">
        <div className="max-w-4xl mx-auto">
          <GenerationConfig
            value={generationConfig}
            onChange={setGenerationConfig}
            isOpen={isConfigOpen}
            setIsOpen={setIsConfigOpen}
          />
          <AnimatedInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            onFocus={() => setIsConfigOpen(false)}
            disabled={isSending || isProcessing}
            placeholder="Describe the image you want to generate..."
          />
        </div>
      </footer>
    </div>
  );
}
