"use client";

import { motion } from "framer-motion";
import { useState, memo } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

interface Image {
  id: string;
  url: string;
  metadata: any;
  createdAt: string;
}

interface AssistantMessageProps {
  content: string;
  images?: Image[];
  status?: string;
  disableAnimation?: boolean;
}

export const AssistantMessage = memo(function AssistantMessage({ content, images, status, disableAnimation = false }: AssistantMessageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  
  const isFailed = status === "failed";

  const slides = images?.map((img) => ({ src: img.url })) || [];

  return (
    <motion.div
      initial={disableAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex gap-3 mb-6"
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
        <span className="text-2xl">🍌</span>
      </div>

      <div className="flex-1 space-y-3">
        {content && (
          <div className={`px-4 py-3 rounded-2xl rounded-tl-none ${
            isFailed 
              ? "bg-danger/10 border border-danger/30" 
              : "bg-surface-2"
          }`}>
            <p className={`text-sm whitespace-pre-wrap break-words ${
              isFailed ? "text-danger" : "text-text"
            }`}>
              {content}
            </p>
          </div>
        )}

        {images && images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => {
                  setPhotoIndex(index);
                  setLightboxOpen(true);
                }}
              >
                <img
                  src={image.url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={slides}
          index={photoIndex}
          on={{
            view: ({ index }) => setPhotoIndex(index),
          }}
        />
      )}
    </motion.div>
  );
});
