import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bookmark, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PostCard } from "@/components/nexus/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listFeed } from "@/lib/nexus/data";
import { PLATFORM_META, PLATFORM_ORDER, PlatformIcon } from "@/lib/nexus/platforms";
import type { FeedPost, PlatformId } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/feed")({ component: FeedPage });

function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [platform, setPlatform] = useState<"all" | PlatformId>("all");
  const [search, setSearch] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFeed({
        data: { platform, search: search || undefined, bookmarked },
      });
      setPosts(res.posts);
    } catch {
      toast.error("Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }, [platform, search, bookmarked]);

  useEffect(() => {
    const t = setTimeout(load, search ? 280 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Unified feed</h1>
        <p className="mt-1 text-sm text-muted">Every connected network, chronological.</p>
      </div>
      <div className="sticky top-2 z-10 space-y-3 rounded-[20px] border border-border bg-surface/95 p-3 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            className="pl-10"
            placeholder="Search your feed…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={platform === "all"} onClick={() => setPlatform("all")}>
            All
          </FilterChip>
          {PLATFORM_ORDER.map((p) => (
            <FilterChip key={p} active={platform === p} onClick={() => setPlatform(p)}>
              <PlatformIcon platform={p} className="h-3.5 w-3.5" />
              {PLATFORM_META[p].name}
            </FilterChip>
          ))}
          <button
            type="button"
            onClick={() => setBookmarked((b) => !b)}
            className={cn(
              "ml-auto flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
              bookmarked ? "bg-teal text-accent-fg" : "bg-surface-2 text-muted",
            )}
          >
            <Bookmark className="h-3.5 w-3.5" fill={bookmarked ? "currentColor" : "none"} />
            Bookmarks
          </button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[24px] border border-border bg-surface p-12 text-center">
          <p className="font-semibold">No posts found</p>
          <p className="mt-1 text-sm text-muted">Connect a network or loosen the filters.</p>
          <Link to="/dashboard/connections" className="mt-4 inline-block">
            <Button variant="secondary">Open connections</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
        active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
