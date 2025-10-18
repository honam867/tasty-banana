"use client";

import { useParams } from "next/navigation";
import { Bot, Menu } from "lucide-react";

export default function ThreadPage() {
  const params = useParams();
  const threadId = params.id as string;

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b border-border flex items-center px-6 gap-3">
        <button
          onClick={() => {
            const event = new CustomEvent("toggleSidebar");
            window.dispatchEvent(event);
          }}
          className="md:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold">AI Media Generation</h1>
          <p className="text-xs text-text-dim">Thread: {threadId}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-text-dim">
              This is where the chat interface will be implemented.
            </p>
            <p className="text-text-dim mt-2 text-sm">
              Messages and media generation will appear here.
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-surface-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-3 bg-primary text-bg rounded-lg font-medium hover:bg-primary-600 transition-colors">
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
