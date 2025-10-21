"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedBorderText({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative inline-block mt-2">
      <motion.div
        className="absolute inset-0 rounded-[14px] border-2 border-primary pointer-events-none"
        initial={{ opacity: 0 }}
        animate={prefersReducedMotion
          ? { opacity: 0.6, boxShadow: "0 0 12px rgba(255, 201, 69, 0.35)" }
          : {
              opacity: [0.4, 0.8, 0.4],
              boxShadow: [
                "0 0 10px rgba(255, 201, 69, 0.3)",
                "0 0 20px rgba(255, 201, 69, 0.6)",
                "0 0 10px rgba(255, 201, 69, 0.3)",
              ],
            }}
        transition={prefersReducedMotion
          ? { duration: 0.3, ease: "easeOut" }
          : { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      
      <motion.h1
        className="relative z-10 text-5xl md:text-7xl font-heading font-extrabold leading-tight tracking-tight px-6 py-2"
        style={{
          background: "linear-gradient(90deg, #FFC945 0%, #FFE896 25%, #FFC945 50%, #FFE896 75%, #FFC945 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
        initial={{ opacity: 0, y: 20, backgroundPosition: "0% 0%" }}
        animate={prefersReducedMotion
          ? { opacity: 1, y: 0, backgroundPosition: "0% 0%" }
          : { opacity: 1, y: 0, backgroundPosition: ["0% 0%", "200% 0%"] }}
        transition={prefersReducedMotion
          ? {
              opacity: { duration: 0.8, delay: 0.4, ease: "easeOut" },
              y: { duration: 0.8, delay: 0.4, ease: "easeOut" },
            }
          : {
              opacity: { duration: 0.8, delay: 0.4, ease: "easeOut" },
              y: { duration: 0.8, delay: 0.4, ease: "easeOut" },
              backgroundPosition: {
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: 0.6,
              },
            }}
      >
        {children}
      </motion.h1>
    </div>
  );
}
