import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border bg-surface/50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🍌</span>
              <span className="text-xl font-heading font-bold">Tasty Banana</span>
            </div>
            <p className="text-text-dim text-sm max-w-sm">
              AI-powered creativity that feels playful yet premium. Generate stunning images with the magic of AI.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-text-dim text-sm">
              <li><Link href="#" className="hover:text-text transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">API</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-text-dim text-sm">
              <li><Link href="#" className="hover:text-text transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-text transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center text-text-dim text-sm">
          <p>© 2025 Tasty Banana. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
