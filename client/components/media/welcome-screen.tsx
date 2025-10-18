"use client";

import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onCreateThread: () => void;
}

export function WelcomeScreen({ onCreateThread }: WelcomeScreenProps) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={48} className="text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-accent-orchid/20 blur-xl" />
          <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-accent-mint/20 blur-xl" />
        </div>

        <h1 className="text-3xl font-heading font-bold mb-3">
          Welcome to Media Generation
        </h1>
        <p className="text-text-dim mb-8">
          Start by creating your first thread. Each thread is a conversation
          where you can generate amazing AI-powered media content.
        </p>

        <Button onClick={onCreateThread} size="lg" className="gap-2">
          <Plus size={20} />
          Create Your First Thread
        </Button>
      </div>
    </div>
  );
}
