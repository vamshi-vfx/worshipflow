/**
 * WorshipFlow Official Brand Logo Component
 *
 * Uses the official WorshipFlow logo asset: /brand/worshipflow-logo.png
 * The logo is a 1:1 square image containing:
 *   - Glowing W lettermark with gradient (white → blue/purple)
 *   - Cross symbol + dove icon
 *   - Golden orbital ring
 *   - "WORSHIPFLOW" wordmark
 *   - "LYRICS • PRESENT • WORSHIP" tagline
 *
 * Variants:
 *   "full"    — Icon + wordmark + tagline (full portrait asset, cropped to show branding area)
 *   "wordmark"— Shows the W icon + "WORSHIPFLOW" wordmark region  
 *   "icon"    — Just the W icon/symbol area (top portion of asset)
 *
 * IMPORTANT: Do NOT alter, recolor, or replace this asset.
 */

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Controls which portion of the logo is visible */
  variant?: "full" | "wordmark" | "icon";
  /** Wraps the logo in a Next.js Link */
  href?: string;
  /** Additional CSS classes on the root element */
  className?: string;
  /** Prevent click events (e.g. already on home page) */
  asSpan?: boolean;
}

/**
 * The logo asset is a square 1024×1024 image.
 * We use CSS object-position + clip to expose the right region per variant.
 *
 * Regions (approximate % of 1024px height):
 *   Icon circle:    0%  – 65%  (top 665px)
 *   Wordmark:      62%  – 83%  (wordmark "WORSHIPFLOW")
 *   Tagline:       83%  – 94%  (LYRICS • PRESENT • WORSHIP)
 */

export function BrandLogo({
  variant = "wordmark",
  href = "/",
  className,
  asSpan = false,
}: BrandLogoProps) {
  const content = (
    <LogoContent variant={variant} className={className} />
  );

  if (asSpan) {
    return content;
  }

  return (
    <Link href={href} aria-label="WorshipFlow — Home">
      {content}
    </Link>
  );
}

function LogoContent({
  variant,
  className,
}: {
  variant: "full" | "wordmark" | "icon";
  className?: string;
}) {
  if (variant === "icon") {
    // Show only the top icon/symbol portion: W + cross + dove + ring
    // We display the image cropped to top 65%  of height
    return (
      <div
        className={cn("relative flex-shrink-0 overflow-hidden rounded-xl", className)}
        style={{ width: 40, height: 40 }}
        aria-label="WorshipFlow"
      >
        <Image
          src="/brand/worshipflow-logo.png"
          alt="WorshipFlow"
          fill
          sizes="40px"
          className="object-cover object-top"
          priority
          draggable={false}
        />
      </div>
    );
  }

  if (variant === "wordmark") {
    // Show icon (left, sized) + the wordmark text extracted from logo
    // For navbar: small icon on the left, text on right
    return (
      <div
        className={cn("flex items-center gap-2 group select-none", className)}
        aria-label="WorshipFlow"
      >
        {/* Icon portion — cropped top 68% of image */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{ width: 36, height: 36 }}
        >
          <Image
            src="/brand/worshipflow-logo.png"
            alt=""
            fill
            sizes="36px"
            className="object-cover"
            style={{ objectPosition: "50% 10%" }}
            priority
            draggable={false}
          />
        </div>
        {/* Wordmark text — rendered to match logo typography */}
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-[0.12em] text-white group-hover:text-white/90 transition-colors">
            WORSHIP<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4d9fff] to-[#a855f7]">FLOW</span>
          </span>
        </span>
      </div>
    );
  }

  // "full" — Show the complete logo asset (square, good for login/splash pages)
  return (
    <div
      className={cn("relative mx-auto", className)}
      aria-label="WorshipFlow"
      style={{ width: 200, height: 200 }}
    >
      <Image
        src="/brand/worshipflow-logo.png"
        alt="WorshipFlow — Lyrics • Present • Worship"
        fill
        sizes="200px"
        className="object-contain"
        priority
        draggable={false}
      />
    </div>
  );
}

export default BrandLogo;
