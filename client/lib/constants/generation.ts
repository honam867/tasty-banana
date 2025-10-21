export const IMAGE_GENERATION_CONSTRAINTS = {
  numberOfImages: {
    min: 1,
    max: 4,
    default: 1,
  },
  aspectRatios: ["1:1", "9:16", "16:9", "4:3", "3:4"] as const,
  defaultAspectRatio: "1:1" as const,
};

export const GENERATION_MODES = {
  TEXT2IMG: "text2img",
  STYLE_TRANSFER: "style_transfer",
  VARIATION: "variation",
  EDIT: "edit",
  UPSCALE: "upscale",
} as const;

export const GENERATION_MODE_LABELS = {
  [GENERATION_MODES.TEXT2IMG]: "Text to Image",
  [GENERATION_MODES.STYLE_TRANSFER]: "Style Transfer",
  [GENERATION_MODES.VARIATION]: "Create Variations",
  [GENERATION_MODES.EDIT]: "Edit Image",
  [GENERATION_MODES.UPSCALE]: "Upscale Image",
} as const;

export const GENERATION_MODE_DESCRIPTIONS = {
  [GENERATION_MODES.TEXT2IMG]: "Generate images from text prompt",
  [GENERATION_MODES.STYLE_TRANSFER]: "Apply reference image style to your prompt",
  [GENERATION_MODES.VARIATION]: "Generate variations of the reference image",
  [GENERATION_MODES.EDIT]: "Edit the reference image with your prompt",
  [GENERATION_MODES.UPSCALE]: "Enhance the resolution of the reference image",
} as const;

export type AspectRatio = typeof IMAGE_GENERATION_CONSTRAINTS.aspectRatios[number];
export type GenerationMode = typeof GENERATION_MODES[keyof typeof GENERATION_MODES];

export interface GenerationParams {
  numberOfImages?: number;
  aspectRatio?: AspectRatio;
}

export interface EnhancedGenerationParams extends GenerationParams {
  generationMode?: GenerationMode;
  referenceImageId?: string;
  upscaleFactor?: 2 | 4; // Only for upscale mode
}
