import { useState } from "react";
import { Bookmark, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { replyToPost, toggleBookmark, toggleLike } from "@/lib/nexus/data";
import { PlatformGlyph } from "@/lib/nexus/platforms";
import type { FeedPost } from "@/lib/nexus/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function MediaGrid({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  const shown = urls.slice(0, 4);
  if (shown.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-[12px] border border-border">
        <img src={shown[0]} alt="" className="max-h-80 w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn("mt-3 grid gap-1 overflow-hidden rounded-[12px]", shown.length === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-2")}>
      {shown.map((url, i) => (
        <div key={url + i} className={cn("aspect-square overflow-hidden", shown.length === 3 && i === 0 && "row-span-2 aspect-auto")}>
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const [state, setState] = useState(post);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");

  const onLike = async () => {
    setBusy(true);
    setState((s) => ({ ...s, liked: !s.liked, likeCount: s.likeCount + (s.liked ? -1 : 1) }));
    try {
      setState(await toggleLike({ data: { id: state.id } }));
    } catch {
      setState((s) => ({ ...s, liked: !s.liked, likeCount: s.likeCount + (s.liked ? -1 : 1) }));
      toast.error("Could not update like.");
    } finally {
      setBusy(false);
    }
  };

  const onBookmark = async () => {
    setState((s) => ({ ...s, bookmarked: !s.bookmarked }));
    try {
      setState(await toggleBookmark({ data: { id: state.id } }));
    } catch {
      setState((s) => ({ ...s, bookmarked: !s.bookmarked }));
      toast.error("Could not update bookmark.");
    }
  };

  const onReply = async () => {
    if (!reply.trim()) return;
    try {
      const next = await replyToPost({ data: { id: state.id, content: reply.trim() } });
      setState(next);
      setReply("");
      setReplyOpen(false);
      toast.success("Reply posted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reply failed");
    }
  };

  return (
    <article className="rounded-[24px] border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {state.authorAvatar ? (
            <img src={state.authorAvatar} alt="" className="h-11 w-11 rounded-full" />
          ) : (
            <PlatformGlyph platform={state.platform} className="h-11 w-11" />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface">
            <PlatformGlyph platform={state.platform} className="h-[18px] w-[18px]" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate font-semibold">{state.authorName}</span>
            <span className="truncate text-muted">{state.authorHandle}</span>
            <span className="text-subtle">·</span>
            <span className="shrink-0 tabular-nums text-subtle">{timeAgo(state.postedAt)}</span>
            {state.isOwn && (
              <Badge className="ml-auto" tone="neutral">
                You
              </Badge>
            )}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-fg/90">{state.content}</p>
          <MediaGrid urls={state.mediaUrls} />
          <div className="mt-3 flex items-center gap-1 text-sm text-muted">
            <button
              type="button"
              onClick={onLike}
              disabled={busy}
              aria-label="Like"
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-danger/10 hover:text-danger",
                state.liked && "text-danger",
              )}
            >
              <Heart className="h-4 w-4" fill={state.liked ? "currentColor" : "none"} />
              <span className="tabular-nums">{state.likeCount.toLocaleString()}</span>
            </button>
            <span className="inline-flex min-h-11 items-center gap-1.5 px-2.5">
              <Repeat2 className="h-4 w-4" />
              <span className="tabular-nums">{state.repostCount.toLocaleString()}</span>
            </span>
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              aria-label="Reply"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 hover:bg-surface-2"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{state.replyCount.toLocaleString()}</span>
            </button>
            <button
              type="button"
              onClick={onBookmark}
              aria-label="Bookmark"
              className={cn(
                "ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-surface-2",
                state.bookmarked && "text-teal",
              )}
            >
              <Bookmark className="h-4 w-4" fill={state.bookmarked ? "currentColor" : "none"} />
            </button>
          </div>
          {replyOpen && (
            <div className="mt-2 flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as you…" />
              <Button size="sm" onClick={onReply} disabled={!reply.trim()}>
                Send
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
