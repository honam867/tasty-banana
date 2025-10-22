"use client";

import React from "react";
import { motion } from "framer-motion";

export type BananaLoadingProps = {
  className?: string;
  ariaLabel?: string;
};

export default function BananaLoading({
  className = "",
  ariaLabel = "Loading",
}: BananaLoadingProps) {
  return (
    <div
      className={`relative inline-block ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <motion.span
        className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-primary"
        style={{
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "200% 50%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        Loading
      </motion.span>
    </div>
  );
}
