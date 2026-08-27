import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-darker flex items-center justify-center">
      <div className="glass rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Page not found. The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
