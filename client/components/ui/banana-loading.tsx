"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type BananaLoadingProps = {
  count?: number;
  size?: number;
  speed?: number;
  gap?: number;
  className?: string;
  height?: number;
  fill?: boolean;
  ariaLabel?: string;
};

/**
 * BananaLoading — animated conveyor of bananas with more dynamic expansion effects.
 */
export default function BananaLoading({
  count = 5,
  size = 24,
  speed = 1.0,
  gap = 16,
  className = "",
  height,
  fill = true,
  ariaLabel = "Loading",
}: BananaLoadingProps) {
  const prefersReducedMotion = useReducedMotion();
  const trackHeight = height ?? Math.max(32, Math.round(size * 2));

  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const rowRef = React.useRef<HTMLDivElement | null>(null);

  const [distance, setDistance] = React.useState(0);
  const [autoCount, setAutoCount] = React.useState(count);

  const bananas = React.useMemo(
    () =>
      Array.from(
        { length: Math.max(1, fill ? autoCount : count) },
        (_, i) => i
      ),
    [fill, autoCount, count]
  );

  React.useLayoutEffect(() => {
    const update = () => {
      const trackEl = trackRef.current;
      const rowEl = rowRef.current;
      if (!trackEl) return;

      if (fill) {
        const cell = Math.max(1, size + gap);
        const needed = Math.max(1, Math.ceil(trackEl.clientWidth / cell) + 1);
        setAutoCount(needed);
      }
      requestAnimationFrame(() => {
        const newRowEl = rowRef.current;
        if (newRowEl) setDistance(newRowEl.scrollWidth);
      });
    };

    update();
    const ro = new ResizeObserver(update);
    if (trackRef.current) ro.observe(trackRef.current);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [size, gap, fill]);

  const pulseVariants = {
    start: { scale: 1, opacity: 0.8, rotate: 0 },
    bounce: { scale: 1.4, opacity: 1, rotate: 20 },
    end: { scale: 1, opacity: 0.9, rotate: 0 },
  };

  return (
    <>
      <div
        ref={trackRef}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 dark:from-primary/30 dark:bg-primary/20 dark:via-primary/10 dark:to-primary/20 shadow-inner ${className}`}
        style={{ height: trackHeight }}
        role={ariaLabel ? "status" : undefined}
        aria-label={ariaLabel || undefined}
      >
        {/* Shimmer effect background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />

        {prefersReducedMotion ? (
          <div
            className="h-full w-full flex items-center justify-center"
            aria-hidden={!!ariaLabel}
          >
            <div className="flex items-center" style={{ gap }}>
              {bananas.map((i) => (
                <motion.span
                  key={i}
                  style={{ fontSize: size }}
                  variants={pulseVariants}
                  animate={["start", "bounce", "end"]}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                >
                  🍌
                </motion.span>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            key={distance}
            className="absolute left-0 top-1/2 flex -translate-y-1/2 will-change-transform"
            style={{ gap }}
            animate={{ x: [0, -distance] }}
            transition={{
              duration: Math.max(0.2, speed),
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div ref={rowRef} className="flex items-center" style={{ gap }}>
              {bananas.map((i) => (
                <motion.span
                  key={`a-${i}`}
                  style={{ fontSize: size }}
                  variants={pulseVariants}
                  animate={["start", "bounce", "end"]}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                >
                  🍌
                </motion.span>
              ))}
            </div>
            <div className="flex items-center" style={{ gap }} aria-hidden>
              {bananas.map((i) => (
                <motion.span
                  key={`b-${i}`}
                  style={{ fontSize: size }}
                  variants={pulseVariants}
                  animate={["start", "bounce", "end"]}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2 + 0.3,
                    ease: "easeInOut",
                  }}
                >
                  🍌
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <span>Loading...</span>
    </>
  );
}
