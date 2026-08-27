"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { CommandPalette } from "@/components/command-palette";
import {
  Home,
  Music,
  FolderOpen,
  Star,
  Calendar,
  Play,
  BookOpen,
  Megaphone,
  Settings,
  HelpCircle,
  UploadCloud,
  Palette,
  Image,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const primaryNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Songs", href: "/songs", icon: Music },
  { label: "Categories", href: "/categories", icon: FolderOpen },
  { label: "Favorites", href: "/favorites", icon: Star },
  { label: "Services", href: "/services", icon: Calendar },
  { label: "Present", href: "/presentation", icon: Play },
  { label: "Bible", href: "/bible", icon: BookOpen },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
];

const secondaryNav = [
  { label: "Import Lyrics", href: "/smart-import", icon: Sparkles },
  { label: "Bulk Content Import", href: "/admin/import", icon: UploadCloud },
  { label: "Themes", href: "/themes", icon: Palette },
  { label: "Media Library", href: "/media", icon: Image },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & Shortcuts", href: "/help", icon: HelpCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Check if current route is a standalone full presentation window
  const isPresentationDisplayRoute = pathname === "/presentation/display";
  if (isPresentationDisplayRoute) {
    return <main className="min-h-screen bg-black">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-brand-darker">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-brand-darker/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold to-brand-goldLight flex items-center justify-center shadow-lg shadow-brand-gold/20 group-hover:scale-105 transition-transform">
                <Music className="w-4 h-4 text-brand-darker stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-base font-extrabold tracking-wider text-white">
                  WORSHIP<span className="text-brand-gold font-sans font-light">FLOW</span>
                </span>
              </div>
            </Link>

            {/* Desktop Primary Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {primaryNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-brand-gold/15 text-brand-gold font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2.5">
            <CommandPalette />

            <Link
              href="/smart-import"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Import
            </Link>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="User Menu"
              >
                <div className="w-7 h-7 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden md:block text-xs font-medium text-white max-w-[100px] truncate">
                  {user?.name || "Account"}
                </span>
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 top-11 z-50 w-56 bg-brand-surface border border-white/10 rounded-xl shadow-2xl py-1.5 backdrop-blur-xl">
                    <div className="px-4 py-2.5 border-b border-white/5">
                      <p className="text-xs font-semibold text-white truncate">{user?.name || "Guest Operator"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user?.email || "WorshipFlow Active"}</p>
                    </div>

                    <div className="py-1">
                      {secondaryNav.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="pt-1 border-t border-white/5">
                      {user ? (
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          onClick={() => setIsProfileOpen(false)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-brand-gold hover:bg-brand-gold/10 transition-colors"
                        >
                          <User className="w-3.5 h-3.5" />
                          Sign In / Register
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)} />
          <div className="absolute left-0 top-16 bottom-0 w-72 bg-brand-darker border-r border-white/10 overflow-y-auto p-4 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Navigation</p>
              {primaryNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-gold/15 text-brand-gold font-bold"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-white/5 space-y-1">
                <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tools & Admin</p>
                {secondaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
