"use client";

import { Button } from "./button";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { User, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useRouter, usePathname } from "next/navigation";

export function Navbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleInPageNav = (event: ReactMouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    setShowDropdown(false);

    if (pathname !== "/") {
      router.push(`/#${targetId}`);
      return;
    }

    if (typeof window === "undefined") return;

    const element = document.getElementById(targetId);
    if (!element) return;

    const navHeight = 72;
    const offset = element.getBoundingClientRect().top + window.scrollY - navHeight;

    window.scrollTo({
      top: offset > 0 ? offset : 0,
      behavior: "smooth",
    });

    window.history.replaceState(null, "", `/#${targetId}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-border h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl animate-zoom-pulse">🍌</span>
          <span className="text-xl font-heading font-bold">Tasty Banana</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#features"
            className="text-text-dim hover:text-text transition-colors"
            onClick={(event) => handleInPageNav(event, "features")}
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="text-text-dim hover:text-text transition-colors"
            onClick={(event) => handleInPageNav(event, "pricing")}
          >
            Pricing
          </Link>
          <Link
            href="/#about"
            className="text-text-dim hover:text-text transition-colors"
            onClick={(event) => handleInPageNav(event, "about")}
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User size={16} className="text-primary" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs text-text-dim">{user.email}</span>
                </div>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-2">
                  <Link
                    href="/media"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User size={16} />
                    <span className="text-sm">Media Studio</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors text-danger"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
