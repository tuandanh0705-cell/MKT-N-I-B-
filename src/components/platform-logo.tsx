"use client";

import { normalizePlatformKind, type PlatformKind } from "@/lib/platform-meta";

interface PlatformLogoProps {
  platform?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PlatformLogoProps["size"]>, string> = {
  xs: "w-4 h-4",
  sm: "w-[18px] h-[18px]",
  md: "w-6 h-6",
  lg: "w-9 h-9",
};

function renderSvgByKind(kind: PlatformKind) {
  switch (kind) {
    case "TIKTOK":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#0F0F12" />
          {/* Cyan shadow layer */}
          <path
            d="M15.1 6.2c.6 1 1.6 1.7 2.8 1.9v2.3c-1.1 0-2.1-.3-2.9-.9v4.7a4.1 4.1 0 1 1-3.5-4v2.3a1.9 1.9 0 1 0 1.3 1.8V5.9h2.3v.3z"
            fill="#25F4EE"
            transform="translate(-0.55 -0.35)"
          />
          {/* Pink shadow layer */}
          <path
            d="M15.1 6.2c.6 1 1.6 1.7 2.8 1.9v2.3c-1.1 0-2.1-.3-2.9-.9v4.7a4.1 4.1 0 1 1-3.5-4v2.3a1.9 1.9 0 1 0 1.3 1.8V5.9h2.3v.3z"
            fill="#FE2C55"
            transform="translate(0.55 0.35)"
          />
          {/* White main TikTok note */}
          <path
            d="M15.1 6.2c.6 1 1.6 1.7 2.8 1.9v2.3c-1.1 0-2.1-.3-2.9-.9v4.7a4.1 4.1 0 1 1-3.5-4v2.3a1.9 1.9 0 1 0 1.3 1.8V5.9h2.3v.3z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "WEB":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#4F46E5" />
          <circle
            cx="12"
            cy="12"
            r="6.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.65"
          />
          <ellipse
            cx="12"
            cy="12"
            rx="3.2"
            ry="6.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.45"
          />
          <line
            x1="5.4"
            y1="12"
            x2="18.6"
            y2="12"
            stroke="#FFFFFF"
            strokeWidth="1.45"
          />
          <path
            d="M6.6 8.8h10.8M6.6 15.2h10.8"
            stroke="#C7D2FE"
            strokeWidth="1.15"
            fill="none"
          />
        </svg>
      );
    case "GROUP":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#0E7490" />
          <circle cx="12" cy="9.2" r="2.2" fill="#FFFFFF" />
          <path
            d="M8.3 16.4c0-2 1.6-3.3 3.7-3.3s3.7 1.3 3.7 3.3"
            fill="#FFFFFF"
          />
          <circle cx="7.2" cy="10.4" r="1.5" fill="#A5F3FC" />
          <circle cx="16.8" cy="10.4" r="1.5" fill="#A5F3FC" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="igGradLogo" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="100%" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="24" height="24" rx="7" fill="url(#igGradLogo)" />
          <rect
            x="5.5"
            y="5.5"
            width="13"
            height="13"
            rx="3.8"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.7"
          />
          <circle cx="15.8" cy="8.2" r="1" fill="#FFFFFF" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <rect x="0" y="2.5" width="24" height="19" rx="6" fill="#FF0000" />
          <polygon points="10,8.2 16.5,12 10,15.8" fill="#FFFFFF" />
        </svg>
      );
    case "THREADS":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#111111" />
          <path
            d="M15.6 11.4c-.2-2.2-1.5-3.4-3.7-3.4-1.7 0-3 .9-3.4 2.2l1.6.5c.3-.7.9-1.1 1.8-1.1 1.1 0 1.8.6 1.9 1.6-.6-.2-1.3-.3-2.1-.3-2.1 0-3.4 1.1-3.4 2.7 0 1.6 1.2 2.7 3 2.7 1.3 0 2.3-.5 2.8-1.3v1.1h1.7v-4.2c.6.4 1 .9 1 1.7 0 2.2-1.8 3.9-4.5 3.9-3 0-5.1-2-5.1-5.1s2.1-5.1 5.1-5.1c1.7 0 3 .6 3.9 1.7"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "ZALO":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <rect x="0" y="0" width="24" height="24" rx="7" fill="#0068FF" />
          <path
            d="M6.8 8.2h10.2l-9.2 7.6h9.6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "SHOPEE":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <rect x="0" y="0" width="24" height="24" rx="7" fill="#EE4D2D" />
          <path
            d="M9 8.5a3 3 0 0 1 6 0M7 9.5h10l-.8 9.2a1.2 1.2 0 0 1-1.2 1.1H9a1.2 1.2 0 0 1-1.2-1.1L7 9.5z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.65"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "ADS":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#1D4ED8" />
          <path
            d="M7 13.2v-2.4l8-3.6v9.6l-8-3.6zm8-.2h1.6c1 0 1.7-.5 1.7-1s-.7-1-1.7-1H15"
            fill="#FFFFFF"
          />
        </svg>
      );
    case "OTHER":
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#0D9488" />
          <path
            d="M7.5 12h9M12 7.5v9"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle
            cx="12"
            cy="12"
            r="6.2"
            fill="none"
            stroke="#CCFBF1"
            strokeWidth="1.4"
          />
        </svg>
      );
    default:
      // Facebook / Fanpage official style f mark
      return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path
            d="M13.5 20.5v-7h2.3l.4-2.8h-2.7V9c0-.8.2-1.4 1.4-1.4h1.4V5.1c-.2 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.1H8.4v2.8h2.3v7h2.8z"
            fill="#FFFFFF"
          />
        </svg>
      );
  }
}

export function PlatformLogo({
  platform,
  size = "sm",
  className = "",
}: PlatformLogoProps) {
  const kind = normalizePlatformKind(platform);
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-2xs ${SIZE_CLASSES[size]} ${className}`}
      title={platform || "Fanpage"}
    >
      {renderSvgByKind(kind)}
    </span>
  );
}
