"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function AnimatedBorderText({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathData, setPathData] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updatePath = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const w = rect.width;
      const h = rect.height;
      const r = 14;
      
      const path = `
        M ${r} 0
        L ${w - r} 0
        Q ${w} 0 ${w} ${r}
        L ${w} ${h - r}
        Q ${w} ${h} ${w - r} ${h}
        L ${r} ${h}
        Q 0 ${h} 0 ${h - r}
        L 0 ${r}
        Q 0 0 ${r} 0
        Z
      `.trim();
      
      setPathData(path);
    };

    updatePath();
    window.addEventListener('resize', updatePath);
    return () => window.removeEventListener('resize', updatePath);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block mt-2">
      <motion.div
        className="absolute inset-0 rounded-[14px] border-2 border-primary pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.4, 0.8, 0.4],
          boxShadow: [
            "0 0 10px rgba(255, 201, 69, 0.3)",
            "0 0 20px rgba(255, 201, 69, 0.6)",
            "0 0 10px rgba(255, 201, 69, 0.3)",
          ],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4
        }}
      />
      
      {pathData && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none" 
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="glowPoint">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            id="borderPath"
            d={pathData}
            fill="none"
            stroke="none"
          />
          <circle
            r="5"
            fill="#FFC945"
            filter="url(#glowPoint)"
          >
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              begin="0.6s"
            >
              <mpath href="#borderPath" />
            </animateMotion>
          </circle>
        </svg>
      )}
      
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
        animate={{ 
          opacity: 1, 
          y: 0,
          backgroundPosition: ["0% 0%", "200% 0%"],
        }}
        transition={{ 
          opacity: { duration: 0.8, delay: 0.4, ease: "easeOut" },
          y: { duration: 0.8, delay: 0.4, ease: "easeOut" },
          backgroundPosition: {
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            delay: 0.6
          }
        }}
      >
        {children}
      </motion.h1>
    </div>
  );
}
