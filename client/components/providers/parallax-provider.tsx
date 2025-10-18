"use client";

import { ParallaxProvider as ScrollParallaxProvider } from "react-scroll-parallax";

export function ParallaxProvider({ children }: { children: React.ReactNode }) {
  return <ScrollParallaxProvider>{children}</ScrollParallaxProvider>;
}
