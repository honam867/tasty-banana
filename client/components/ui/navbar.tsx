"use client";

import { Button } from "./button";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-border h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl animate-zoom-pulse">🍌</span>
          <span className="text-xl font-heading font-bold">Tasty Banana</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-text-dim hover:text-text transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-text-dim hover:text-text transition-colors">
            Pricing
          </Link>
          <Link href="#about" className="text-text-dim hover:text-text transition-colors">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
