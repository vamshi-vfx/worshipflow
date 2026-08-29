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
  title: {
    default: "WorshipFlow — Smart Church Lyrics & Worship Presentation",
    template: "%s | WorshipFlow",
  },
  description:
    "Professional church worship lyrics and Bible presentation platform for Telugu, English, and Hindi songs. Smart import, dual-screen TV display, and live presentation engine.",
  keywords: ["church lyrics", "worship presentation", "Telugu songs", "Bible presentation", "church software", "worship flow"],
  authors: [{ name: "WorshipFlow" }],
  creator: "WorshipFlow",
  metadataBase: new URL("https://worshipflow.app"),
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/brand/favicon-32.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://worshipflow.app",
    siteName: "WorshipFlow",
    title: "WorshipFlow — Smart Church Lyrics & Worship Presentation",
    description:
      "Professional church worship lyrics and Bible presentation platform. Smart import, dual-screen TV display, and live presentation engine.",
    images: [
      {
        url: "/brand/worshipflow-logo.png",
        width: 1024,
        height: 1024,
        alt: "WorshipFlow — Lyrics • Present • Worship",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "WorshipFlow",
    description: "Professional church worship lyrics and Bible presentation platform.",
    images: ["/brand/worshipflow-logo.png"],
  },
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
