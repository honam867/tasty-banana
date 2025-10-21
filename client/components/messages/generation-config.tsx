"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Square, RectangleHorizontal, RectangleVertical, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMAGE_GENERATION_CONSTRAINTS, GENERATION_MODES, type AspectRatio, type GenerationParams, type GenerationMode } from "@/lib/constants/generation";
import { GenerationModeSelector } from "./generation-mode-selector";

interface GenerationConfigProps {
  value: GenerationParams;
  onChange: (config: GenerationParams) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  generationMode?: GenerationMode;
  onGenerationModeChange?: (mode: GenerationMode) => void;
  hasReferenceImage?: boolean;
}

const aspectRatioIcons: Record<AspectRatio, { icon: React.ReactNode; label: string }> = {
  "1:1": {
    icon: <Square size={20} />,
    label: "Square (1:1)",
  },
  "16:9": {
    icon: <RectangleHorizontal size={20} />,
    label: "Landscape (16:9)",
  },
  "9:16": {
    icon: <RectangleVertical size={20} />,
    label: "Portrait (9:16)",
  },
  "4:3": {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    label: "4:3",
  },
  "3:4": {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="8" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    label: "3:4",
  },
};

export function GenerationConfig({ 
  value, 
  onChange, 
  isOpen, 
  setIsOpen,
  generationMode = GENERATION_MODES.TEXT2IMG,
  onGenerationModeChange,
  hasReferenceImage = false,
}: GenerationConfigProps) {
  const handleAspectRatioChange = (ratio: AspectRatio) => {
    onChange({ ...value, aspectRatio: ratio });
  };

  const handleNumberOfImagesChange = (num: number) => {
    onChange({ ...value, numberOfImages: num });
  };

  const removeAspectRatio = () => {
    const newValue = { ...value };
    delete newValue.aspectRatio;
    onChange(newValue);
  };

  const removeNumberOfImages = () => {
    const newValue = { ...value };
    delete newValue.numberOfImages;
    onChange(newValue);
  };

  const hasConfig = value.aspectRatio || value.numberOfImages || hasReferenceImage;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Settings Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
            isOpen || (value.aspectRatio || value.numberOfImages)
              ? "bg-primary/10 text-primary"
              : "bg-surface-2 text-text-dim hover:bg-surface hover:text-text"
          )}
        >
          <Settings size={16} />
          <span>Settings</span>
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200", isOpen && "rotate-180")}
          />
        </button>

        {value.aspectRatio && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs">
            <span>{value.aspectRatio}</span>
            <button
              onClick={removeAspectRatio}
              className="hover:bg-primary/20 rounded p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {value.numberOfImages && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs">
            <span>{value.numberOfImages} {value.numberOfImages === 1 ? 'image' : 'images'}</span>
            <button
              onClick={removeNumberOfImages}
              className="hover:bg-primary/20 rounded p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[400px] opacity-100 mt-3" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 bg-surface-2 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Images
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberOfImagesChange(num)}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                    value.numberOfImages === num
                      ? "bg-primary text-bg"
                      : "bg-surface hover:bg-surface-2 text-text-dim hover:text-text"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-5 gap-2">
              {IMAGE_GENERATION_CONSTRAINTS.aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => handleAspectRatioChange(ratio)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg transition-all",
                    value.aspectRatio === ratio
                      ? "bg-primary text-bg"
                      : "bg-surface hover:bg-surface-2 text-text-dim hover:text-text"
                  )}
                  title={aspectRatioIcons[ratio].label}
                >
                  {aspectRatioIcons[ratio].icon}
                  <span className="text-xs">{ratio}</span>
                </button>
              ))}
            </div>
          </div>

          {hasConfig && (
            <button
              onClick={() => onChange({})}
              className="w-full py-2 text-sm text-text-dim hover:text-text transition-colors"
            >
              Clear All Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
