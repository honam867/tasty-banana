"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowRight, Sparkles, Image as ImageIcon, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <span className="text-2xl font-bold text-white">Tasty Banana</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-slate-700">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center space-y-8">
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 w-fit mx-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Image Generation
          </Badge>

          <div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
              Generate Stunning Images
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                With AI Magic
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Create beautiful, unique images instantly. Just describe what you
              want and let our AI bring your imagination to life. Perfect for
              creators, designers, and dreamers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white text-lg px-8 py-6">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-white border-slate-600 hover:bg-slate-700"
            >
              View Examples
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-gradient-to-b from-transparent to-slate-800/50">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-800/50 border-slate-700 p-8 hover:border-amber-500/50 transition-colors">
            <div className="bg-amber-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ImageIcon className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Instant Generation
            </h3>
            <p className="text-slate-400">
              Generate high-quality images in seconds. No complicated workflows,
              just pure creativity.
            </p>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-8 hover:border-amber-500/50 transition-colors">
            <div className="bg-amber-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Powerful AI
            </h3>
            <p className="text-slate-400">
              Powered by cutting-edge AI models. From photorealistic to artistic,
              your style your way.
            </p>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 p-8 hover:border-amber-500/50 transition-colors">
            <div className="bg-amber-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Easy to Use
            </h3>
            <p className="text-slate-400">
              Simple, intuitive interface. Perfect for beginners and professionals
              alike.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to create?
          </h2>
          <p className="text-slate-300 mb-8">
            Join thousands of creators and generate your first image today.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white">
              Start Creating Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400">
          <p>&copy; 2024 Tasty Banana. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
