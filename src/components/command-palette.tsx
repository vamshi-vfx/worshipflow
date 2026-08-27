"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Music, Calendar, BookOpen, Megaphone, Palette, Settings, Plus, Play, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommandAction = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  action?: () => void;
  keywords?: string[];
};

const DEFAULT_ACTIONS: CommandAction[] = [
  {
    id: "dashboard",
    label: "Go to Dashboard",
    description: "Return to the main dashboard",
    icon: <Home className="w-4 h-4" />,
    href: "/dashboard",
    keywords: ["home", "main"],
  },
  {
    id: "new-song",
    label: "Create New Song",
    description: "Add a new worship song",
    icon: <Music className="w-4 h-4" />,
    href: "/songs/new",
    keywords: ["song", "create", "add", "import"],
  },
  {
    id: "songs",
    label: "Open Song Library",
    description: "Browse and manage songs",
    icon: <Music className="w-4 h-4" />,
    href: "/songs",
    keywords: ["library", "browse", "search"],
  },
  {
    id: "import-lyrics",
    label: "Import Lyrics",
    description: "Smart lyrics import and slide generation",
    icon: <Plus className="w-4 h-4" />,
    href: "/smart-import",
    keywords: ["import", "lyrics", "paste", "analyze"],
  },
  {
    id: "new-service",
    label: "Create New Service",
    description: "Plan a new church service",
    icon: <Calendar className="w-4 h-4" />,
    href: "/services/new",
    keywords: ["service", "plan", "create", "event"],
  },
  {
    id: "services",
    label: "Open Services",
    description: "View and manage services",
    icon: <Calendar className="w-4 h-4" />,
    href: "/services",
    keywords: ["services", "list", "schedule"],
  },
  {
    id: "presentation",
    label: "Start Presentation",
    description: "Begin live presentation",
    icon: <Play className="w-4 h-4" />,
    href: "/presentation",
    keywords: ["present", "live", "tv", "display"],
  },
  {
    id: "bible",
    label: "Open Bible",
    description: "Browse Bible presentations",
    icon: <BookOpen className="w-4 h-4" />,
    href: "/bible",
    keywords: ["bible", "scripture", "verse"],
  },
  {
    id: "new-bible",
    label: "Create Bible Presentation",
    description: "Add a new Bible reading",
    icon: <BookOpen className="w-4 h-4" />,
    href: "/bible/new",
    keywords: ["bible", "create", "add"],
  },
  {
    id: "announcements",
    label: "Open Announcements",
    description: "Manage announcements",
    icon: <Megaphone className="w-4 h-4" />,
    href: "/announcements",
    keywords: ["announcements", "news", "updates"],
  },
  {
    id: "new-announcement",
    label: "Create Announcement",
    description: "Add a new announcement",
    icon: <Megaphone className="w-4 h-4" />,
    href: "/announcements/new",
    keywords: ["announcement", "create", "add"],
  },
  {
    id: "themes",
    label: "Open Themes",
    description: "Manage presentation themes",
    icon: <Palette className="w-4 h-4" />,
    href: "/themes",
    keywords: ["themes", "styles", "appearance"],
  },
  {
    id: "settings",
    label: "Open Settings",
    description: "Configure application settings",
    icon: <Settings className="w-4 h-4" />,
    href: "/settings",
    keywords: ["settings", "preferences", "config"],
  },
];

interface CommandPaletteProps {
  actions?: CommandAction[];
}

export function CommandPalette({ actions = DEFAULT_ACTIONS }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredActions = actions.filter((action) => {
    const searchText = query.toLowerCase();
    return (
      action.label.toLowerCase().includes(searchText) ||
      (action.description?.toLowerCase().includes(searchText) ?? false) ||
      action.keywords?.some((kw) => kw.toLowerCase().includes(searchText))
    );
  });

  const handleSelect = (action: CommandAction) => {
    setIsOpen(false);
    setQuery("");
    if (action.action) {
      action.action();
    } else if (action.href) {
      router.push(action.href);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
      >
        <Search className="w-3 h-3" />
        <span>Search...</span>
        <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/60">⌘K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-xl mx-4 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="px-2 py-1 bg-white/5 rounded text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredActions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results found for &quot;{query}&quot;
                </div>
              ) : (
                filteredActions.map((action, idx) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelect(action)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      idx === selectedIndex
                        ? "bg-brand-gold/10 text-brand-gold"
                        : "text-white hover:bg-white/5"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0",
                      idx === selectedIndex ? "text-brand-gold" : "text-muted-foreground"
                    )}>
                      {action.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{action.label}</p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-white/5 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/5 rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/5 rounded">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white/5 rounded">ESC</kbd> Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
