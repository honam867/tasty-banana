"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberOfImagesSelectorProps {
  value?: number;
  onChange: (num: number) => void;
}

export function NumberOfImagesSelector({ value = 1, onChange }: NumberOfImagesSelectorProps) {
  return (
    <DropdownMenu.Root>
      {/* Chip is the trigger - no separate icon button */}
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors cursor-pointer">
          <Images size={14} />
          <span>{value} {value === 1 ? 'image' : 'images'}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[200px] bg-surface-2 border border-border rounded-lg shadow-xl",
            "p-3 z-50",
            "animate-in fade-in-0 slide-in-from-top-2 duration-200"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="text-xs font-medium text-text-dim mb-3 px-1">
            Number of Images
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <DropdownMenu.Item
                key={num}
                onSelect={() => onChange(num)}
                className={cn(
                  "py-2 px-3 rounded-lg font-medium transition-all text-sm cursor-pointer outline-none",
                  "flex items-center justify-center",
                  value === num
                    ? "bg-primary text-bg"
                    : "bg-surface hover:bg-surface text-text-dim hover:text-text"
                )}
              >
                {num}
              </DropdownMenu.Item>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
