export const IMAGE_GENERATION_CONSTRAINTS = {
  numberOfImages: {
    min: 1,
    max: 4,
    default: 1,
  },
  aspectRatios: ["1:1", "9:16", "16:9", "4:3", "3:4"] as const,
  defaultAspectRatio: "1:1" as const,
};

export type AspectRatio = typeof IMAGE_GENERATION_CONSTRAINTS.aspectRatios[number];

export interface GenerationParams {
  numberOfImages?: number;
  aspectRatio?: AspectRatio;
}
