"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Plus, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimatedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onUploadClick?: () => void;
  onLibraryClick?: () => void;
  showImageOptions?: boolean;
}

export function AnimatedInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your message...",
  onFocus,
  onUploadClick,
  onLibraryClick,
  showImageOptions = true,
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MAX_TEXTAREA_HEIGHT = 200;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.minHeight = "48px";
    textarea.style.maxHeight = `${MAX_TEXTAREA_HEIGHT}px`;
    const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleFocus = () => {
    setIsFocused(true);
    adjustTextareaHeight();
    setShowMenu(false); // Close menu when focusing input
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value.trim()) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "48px";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleUploadClick = () => {
    setShowMenu(false);
    onUploadClick?.();
  };

  const handleLibraryClick = () => {
    setShowMenu(false);
    onLibraryClick?.();
  };

  return (
    <div className="relative">
      <div className="relative flex items-end gap-2">
        {/* Plus Button with Menu */}
        {showImageOptions && (
          <div ref={menuRef} className="relative flex-shrink-0 self-end mb-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={disabled}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                "transition-all duration-200",
                disabled
                  ? "bg-surface text-text-dim cursor-not-allowed"
                  : "bg-surface-2 text-text-dim hover:bg-primary hover:text-bg"
              )}
            >
              <Plus size={20} />
            </button>

            {/* Popup Menu */}
            {showMenu && (
              <div
                className={cn(
                  "absolute bottom-full left-0 mb-2 w-56",
                  "bg-surface-2 border border-border rounded-lg shadow-xl",
                  "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
                  "z-10"
                )}
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={handleUploadClick}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors text-left"
                  >
                    <Upload size={18} className="text-text-dim" />
                    <div>
                      <p className="text-sm font-medium">Upload from Device</p>
                      <p className="text-xs text-text-dim">
                        Choose a file from your computer
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={handleLibraryClick}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors text-left"
                  >
                    <ImageIcon size={18} className="text-text-dim" />
                    <div>
                      <p className="text-sm font-medium">Choose from Library</p>
                      <p className="text-xs text-text-dim">
                        Select from uploaded images
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Textarea Container */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={cn(
              "w-full px-4 pr-12 bg-surface-2 border-2 rounded-xl resize-none overflow-y-auto",
              "focus:outline-none transition-all duration-300",
              "placeholder:text-text-dim text-base leading-6",
              disabled && "opacity-50 cursor-not-allowed",
              isFocused ? "border-primary" : "border-transparent"
            )}
            style={{
              height: "48px",
              maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
              paddingTop: "14px",
              paddingBottom: "14px",
              fontSize: "16px",
            }}
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
    </div>
  );
}
