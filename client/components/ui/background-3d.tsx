"use client";

import { useEffect, useRef, useState } from "react";

export function Background3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bananaRef = useRef<HTMLDivElement>(null);
  const [bananaPos, setBananaPos] = useState({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 1, y: 1 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xPercent = (clientX / innerWidth - 0.5) * 2;
      const yPercent = (clientY / innerHeight - 0.5) * 2;

      const orbs = container.querySelectorAll('.parallax-orb');
      const grid = container.querySelector('.parallax-grid');
      
      orbs.forEach((orb, index) => {
        const depth = (index + 1) * 10;
        const xMove = xPercent * depth;
        const yMove = yPercent * depth;
        (orb as HTMLElement).style.transform = `translate(${xMove}px, ${yMove}px)`;
      });

      if (grid) {
        (grid as HTMLElement).style.transform = `
          perspective(1000px) 
          rotateX(${yPercent * 2}deg) 
          rotateY(${xPercent * 2}deg)
        `;
      }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const banana = bananaRef.current;
    if (!banana) return;

    const speed = 0.5;
    let x = Math.random() * (window.innerWidth - 200);
    let y = Math.random() * (window.innerHeight - 200);
    let vx = speed;
    let vy = speed;

    const animate = () => {
      x += vx;
      y += vy;

      if (x <= 0 || x >= window.innerWidth - 200) {
        vx = -vx;
        x = Math.max(0, Math.min(x, window.innerWidth - 200));
      }

      if (y <= 0 || y >= window.innerHeight - 200) {
        vy = -vy;
        y = Math.max(0, Math.min(y, window.innerHeight - 200));
      }

      setBananaPos({ x, y });
      velocityRef.current = { x: vx, y: vy };

      requestAnimationFrame(animate);
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    let animationId: number;
    if (!prefersReducedMotion) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1020] via-[#1a0f2e] to-[#0e1428]" />
      
      <div className="parallax-grid absolute inset-0 opacity-20 transition-transform duration-700 ease-out">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="parallax-orb absolute top-[20%] left-[15%] w-96 h-96 rounded-full bg-accent-mint/10 blur-[120px] transition-transform duration-700 ease-out" />
      <div className="parallax-orb absolute top-[60%] right-[20%] w-80 h-80 rounded-full bg-accent-sky/10 blur-[100px] transition-transform duration-700 ease-out" />
      <div className="parallax-orb absolute bottom-[10%] left-[40%] w-72 h-72 rounded-full bg-accent-orchid/10 blur-[90px] transition-transform duration-700 ease-out" />

      <div 
        ref={bananaRef}
        className="absolute text-[200px] opacity-[0.02] select-none pointer-events-none"
        style={{ 
          fontFamily: 'var(--font-plus-jakarta)',
          left: `${bananaPos.x}px`,
          top: `${bananaPos.y}px`,
          transition: 'none',
        }}
      >
        🍌
      </div>
    </div>
  );
}
