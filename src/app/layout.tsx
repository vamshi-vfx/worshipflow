import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Providers } from "./providers";
import { ToastProvider } from "@/components/toast";
import { CommandPalette } from "@/components/command-palette";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorshipFlow - Smart Church Lyrics & Worship Presentation Platform",
  description: "Professional church worship lyrics and live presentation platform for Telugu, English, and Hindi songs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-brand-darker text-white min-h-screen`}
      >
        <ToastProvider>
          <Providers>
            <AppShell>
              {children}
            </AppShell>
          </Providers>
        </ToastProvider>
        <CommandPalette />
      </body>
    </html>
  );
}
