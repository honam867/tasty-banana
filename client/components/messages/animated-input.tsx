"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}

export function AnimatedInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
  onFocus,
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      <div
        // className={cn(
        //   "relative rounded-xl transition-all duration-300",
        //   isFocused
        //     ? "animate-border-ring"
        //     : "shadow-[0_0_15px_rgba(255,201,69,0.3)]"
        // )}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            " w-full px-4 pr-12 bg-surface-2 border-2 rounded-xl resize-none",
            "focus:outline-none transition-all duration-300",
            "placeholder:text-text-dim text-sm md:text-base",
            disabled && "opacity-50 cursor-not-allowed",
            isFocused
              ? "border-primary"
              : "border-transparent"
          )}
          style={{ height: "48px", lineHeight: "48px", paddingTop: 0, paddingBottom: 0, maxHeight: "120px" }}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "w-9 h-9 rounded-lg flex items-center justify-center",
            "transition-all duration-200",
            value.trim() && !disabled
              ? "bg-primary text-bg hover:bg-primary-600"
              : "bg-surface text-text-dim cursor-not-allowed"
          )}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
