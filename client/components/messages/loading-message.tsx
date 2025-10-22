"use client";

import { motion } from "framer-motion";
import BananaLoading from "@/components/ui/banana-loading";

export function LoadingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-3 mb-6"
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <span className="text-2xl">🍌</span>
      </div>

      <div className="flex-1 space-y-3">
        <BananaLoading ariaLabel="Generating your images..." />
      </div>
    </motion.div>
  );
}
