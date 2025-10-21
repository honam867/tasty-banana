"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Palette, Image, Shuffle, Edit, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { GENERATION_MODES, GENERATION_MODE_LABELS, GENERATION_MODE_DESCRIPTIONS, type GenerationMode } from "@/lib/constants/generation";

interface GenerationModeSelectorProps {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  hasReferenceImage?: boolean;
}

const modeIcons: Record<GenerationMode, React.ReactNode> = {
  [GENERATION_MODES.TEXT2IMG]: <Image size={16} />,
  [GENERATION_MODES.STYLE_TRANSFER]: <Palette size={16} />,
  [GENERATION_MODES.VARIATION]: <Shuffle size={16} />,
  [GENERATION_MODES.EDIT]: <Edit size={16} />,
  [GENERATION_MODES.UPSCALE]: <ZoomIn size={16} />,
};

export function GenerationModeSelector({ value, onChange, hasReferenceImage = false }: GenerationModeSelectorProps) {
  const requiresReference = value !== GENERATION_MODES.TEXT2IMG;
  const isDisabled = requiresReference && !hasReferenceImage;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
            value !== GENERATION_MODES.TEXT2IMG
              ? "bg-primary/10 text-primary"
              : "bg-surface-2 text-text-dim hover:bg-surface hover:text-text"
          )}
          title={GENERATION_MODE_LABELS[value]}
        >
          {modeIcons[value]}
          <span className="hidden sm:inline">Mode</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[240px] bg-surface-2 border border-border rounded-lg shadow-xl",
            "p-2 z-50",
            "animate-in fade-in-0 slide-in-from-top-2 duration-200"
          )}
          sideOffset={8}
          align="start"
        >
          <div className="text-xs font-medium text-text-dim mb-2 px-2">
            Generation Mode
          </div>

          {Object.values(GENERATION_MODES).map((mode) => {
            const needsRef = mode !== GENERATION_MODES.TEXT2IMG;
            const disabled = needsRef && !hasReferenceImage;

            return (
              <DropdownMenu.Item
                key={mode}
                onSelect={() => !disabled && onChange(mode)}
                disabled={disabled}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer outline-none",
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-surface",
                  value === mode && "bg-primary/10"
                )}
              >
                <div className={cn("mt-0.5", value === mode ? "text-primary" : "text-text-dim")}>
                  {modeIcons[mode]}
                </div>
                <div className="flex-1">
                  <div className={cn("text-sm font-medium", value === mode && "text-primary")}>
                    {GENERATION_MODE_LABELS[mode]}
                  </div>
                  <div className="text-xs text-text-dim mt-0.5">
                    {GENERATION_MODE_DESCRIPTIONS[mode]}
                  </div>
                  {disabled && (
                    <div className="text-xs text-danger mt-1">
                      Requires reference image
                    </div>
                  )}
                </div>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
