"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { AlertCircle } from "lucide-react";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  status?: string;
  disableAnimation?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ content, isUser, status, disableAnimation = false }: MessageBubbleProps) {
  const isFailed = status === "failed";
  
  return (
    <motion.div
      initial={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className="flex items-start gap-2">
        {isFailed && isUser && (
          <div className="flex-shrink-0 mt-1">
            <AlertCircle size={20} className="text-danger" />
          </div>
        )}
        <div
          className={` px-4 py-3 rounded-2xl ${
            isUser
              ? isFailed 
                ? "bg-danger/10 text-danger border border-danger/30"
                : "bg-primary text-bg"
              : "bg-surface-2 text-text"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    </motion.div>
  );
});
