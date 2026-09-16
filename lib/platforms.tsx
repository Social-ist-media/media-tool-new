import type { PlatformId } from "./types";

export const PLATFORM_META: Record<
  PlatformId,
  { name: string; color: string; charLimit: number; authLabel: string }
> = {
  twitter: { name: "Twitter / X", color: "#1d9bf0", charLimit: 280, authLabel: "OAuth 2.0" },
  threads: { name: "Threads", color: "#000000", charLimit: 500, authLabel: "Instagram OAuth" },
  bluesky: { name: "Bluesky", color: "#0085ff", charLimit: 300, authLabel: "App password" },
  mastodon: { name: "Mastodon", color: "#6364ff", charLimit: 500, authLabel: "OAuth 2.0" },
  instagram: { name: "Instagram", color: "#E4405F", charLimit: 2200, authLabel: "Meta OAuth" },
};

export const PLATFORM_ORDER: PlatformId[] = ["twitter", "threads", "bluesky", "mastodon", "instagram"];

export function PlatformIcon({ platform, className = "" }: { platform: PlatformId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function PlatformGlyph({ platform, className = "" }: { platform: PlatformId; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-black/5 ${className}`}
      style={{ backgroundColor: platform === "threads" ? "#1a1a1a" : PLATFORM_META[platform].color }}
      title={PLATFORM_META[platform].name}
    >
      <PlatformIcon platform={platform} className="h-[55%] w-[55%]" />
    </span>
  );
}
