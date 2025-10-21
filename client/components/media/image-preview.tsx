"use client";

import { X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENERATION_MODE_LABELS } from "@/lib/constants/generation";
import type { Upload } from "@/lib/actions/uploads";
import type { GenerationMode } from "@/lib/constants/generation";

interface ImagePreviewProps {
  image: Upload;
  generationMode?: GenerationMode;
  onRemove: () => void;
  onView?: () => void;
  className?: string;
}

export function ImagePreview({ image, generationMode, onRemove, onView, className }: ImagePreviewProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-surface-2 border border-border rounded-lg",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      {/* Thumbnail */}
      <div 
        className={cn(
          "relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-surface",
          onView && "cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        )}
        onClick={onView}
      >
        {image.publicUrl ? (
          <img
            src={image.publicUrl}
            alt={image.title || "Reference image"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={24} className="text-text-dim" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {image.title || "Reference Image"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {generationMode && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
              {GENERATION_MODE_LABELS[generationMode]}
            </span>
          )}
          <span className="text-xs text-text-dim">
            {(image.sizeBytes / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 hover:bg-surface rounded-lg transition-colors group"
        title="Remove reference image"
      >
        <X size={18} className="text-text-dim group-hover:text-danger transition-colors" />
      </button>
    </div>
  );
}
