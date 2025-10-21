"use client";

import { useParams } from "next/navigation";
import { Bot, Menu } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { getMessages, sendMessage } from "@/lib/actions/messages";
import { uploadImage, type Upload } from "@/lib/actions/uploads";
import { MessageBubble } from "@/components/messages/message-bubble";
import { AssistantMessage } from "@/components/messages/assistant-message";
import { LoadingMessage } from "@/components/messages/loading-message";
import { AnimatedInput } from "@/components/messages/animated-input";
import { ImagePreview } from "@/components/media/image-preview";
import { ReferenceImageModal } from "@/components/media/reference-image-modal";
import { GenerationModeSelector } from "@/components/messages/generation-mode-selector";
import { NumberOfImagesSelector } from "@/components/messages/number-of-images-selector";
import { AspectRatioSelector } from "@/components/messages/aspect-ratio-selector";
import { GENERATION_MODES, GENERATION_MODE_LABELS, type GenerationParams, type GenerationMode, type AspectRatio } from "@/lib/constants/generation";
import { X } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [generationConfig, setGenerationConfig] = useState<GenerationParams>({
    numberOfImages: 1,
    aspectRatio: "16:9"
  });
  
  // Reference image state
  const [referenceImage, setReferenceImage] = useState<Upload | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GENERATION_MODES.TEXT2IMG);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingReferenceImage, setViewingReferenceImage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Reset state immediately for instant transition
    setMessages([]);
    setInputValue("");
    setIsSending(false);
    setShouldAnimate(false);

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
        } else {
          setIsSending(false);
        }
      }

      setIsLoading(false);
    };

    fetchMessages();

    // Enable animations after content loads
    const timer = setTimeout(() => setShouldAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [threadId]);

  // WebSocket: Join/leave thread room
  useEffect(() => {
    if (isConnected && threadId) {
      joinThread(threadId);
      return () => {
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

    return () => {
      socket.off("message:update", handleMessageUpdate);
      socket.off("job:update", handleJobUpdate);
    };
  }, [socket, threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-switch mode when reference image changes
  useEffect(() => {
    if (referenceImage && generationMode === GENERATION_MODES.TEXT2IMG) {
      setGenerationMode(GENERATION_MODES.STYLE_TRANSFER);
    } else if (!referenceImage && generationMode !== GENERATION_MODES.TEXT2IMG) {
      setGenerationMode(GENERATION_MODES.TEXT2IMG);
    }
  }, [referenceImage]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload JPEG, PNG, or WebP images.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "reference");
    formData.append("threadId", threadId);

    const result = await uploadImage(formData);
    
    if (result.success && result.data) {
      setReferenceImage(result.data);
    } else {
      alert(result.error || "Failed to upload image");
    }

    setIsUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLibraryClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleSelectFromLibrary = (image: Upload) => {
    setReferenceImage(image);
  };

  const handleRemoveReference = () => {
    setReferenceImage(null);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || isProcessing) return;

    // Validate reference image requirement
    if (generationMode !== GENERATION_MODES.TEXT2IMG && !referenceImage) {
      alert("Please select a reference image for this generation mode.");
      return;
    }

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

    const result = await sendMessage(
      threadId,
      userMessage.content,
      params,
      referenceImage?.id,
      generationMode
    );

    if (result.success && result.data) {
      // Clear reference image after successful send
      setReferenceImage(null);
      
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
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
      <header className="flex-shrink-0 h-16 border-b border-border flex items-center px-6 gap-3">
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
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" } as React.CSSProperties}
      >
        <div className="max-w-4xl mx-auto">
          {isLoading && messages.length === 0 ? (
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
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <MessageBubble
                    key={message.id}
                    content={message.content}
                    isUser={true}
                    status={message.status}
                    disableAnimation={!shouldAnimate}
                  />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    content={message.content}
                    images={message.images}
                    status={message.status}
                    disableAnimation={!shouldAnimate}
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

      <footer className="flex-shrink-0 border-t border-border p-6 flex items-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Image Preview */}
          {referenceImage && (
            <ImagePreview
              image={referenceImage}
              generationMode={generationMode}
              onRemove={handleRemoveReference}
              onView={() => setViewingReferenceImage(true)}
              className="mb-3"
            />
          )}

          {/* Upload Indicator */}
          {isUploading && (
            <div className="mb-3 p-3 bg-primary/10 border border-primary rounded-lg text-sm text-primary">
              Uploading image...
            </div>
          )}

          <AnimatedInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            disabled={isSending || isProcessing || isUploading}
            placeholder="Describe the image you want to generate..."
            onUploadClick={handleUploadClick}
            onLibraryClick={handleLibraryClick}
          />

          {/* Generation Tools - Directly under input */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {/* Generation Mode Selector */}
            <GenerationModeSelector
              value={generationMode}
              onChange={setGenerationMode}
              hasReferenceImage={!!referenceImage}
            />

            {/* Generation Mode Chip */}
            {generationMode !== GENERATION_MODES.TEXT2IMG && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs">
                <span>{GENERATION_MODE_LABELS[generationMode]}</span>
                <button
                  onClick={() => setGenerationMode(GENERATION_MODES.TEXT2IMG)}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Number of Images Selector */}
            <NumberOfImagesSelector
              value={generationConfig.numberOfImages}
              onChange={(num) => setGenerationConfig({ ...generationConfig, numberOfImages: num })}
            />

            {/* Aspect Ratio Selector */}
            <AspectRatioSelector
              value={generationConfig.aspectRatio}
              onChange={(ratio) => setGenerationConfig({ ...generationConfig, aspectRatio: ratio })}
            />
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </footer>

      {/* Reference Image Library Modal */}
      <ReferenceImageModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSelect={handleSelectFromLibrary}
        threadId={threadId}
      />

      {/* Reference Image Viewer */}
      {viewingReferenceImage && referenceImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4"
          onClick={() => setViewingReferenceImage(false)}
        >
          <button
            onClick={() => setViewingReferenceImage(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          <img
            src={referenceImage.publicUrl}
            alt={referenceImage.title || "Reference"}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
