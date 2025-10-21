"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Square, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMAGE_GENERATION_CONSTRAINTS, type AspectRatio } from "@/lib/constants/generation";

interface AspectRatioSelectorProps {
  value?: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
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

export function AspectRatioSelector({ value = "16:9", onChange }: AspectRatioSelectorProps) {
  // Get the icon for the current value
  const currentIcon = aspectRatioIcons[value]?.icon || aspectRatioIcons["16:9"].icon;

  return (
    <DropdownMenu.Root>
      {/* Chip is the trigger - no separate icon button */}
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors cursor-pointer">
          <span className="flex items-center" style={{ fontSize: '14px' }}>
            {currentIcon}
          </span>
          <span>{value}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[280px] bg-surface-2 border border-border rounded-lg shadow-xl",
            "p-3 z-50",
            "animate-in fade-in-0 slide-in-from-top-2 duration-200"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="text-xs font-medium text-text-dim mb-3 px-1">
            Aspect Ratio
          </div>
          <div className="grid grid-cols-5 gap-2">
            {IMAGE_GENERATION_CONSTRAINTS.aspectRatios.map((ratio) => (
              <DropdownMenu.Item
                key={ratio}
                onSelect={() => onChange(ratio)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg transition-all cursor-pointer outline-none",
                  value === ratio
                    ? "bg-primary text-bg"
                    : "bg-surface hover:bg-surface text-text-dim hover:text-text"
                )}
                title={aspectRatioIcons[ratio].label}
              >
                {aspectRatioIcons[ratio].icon}
                <span className="text-xs">{ratio}</span>
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
