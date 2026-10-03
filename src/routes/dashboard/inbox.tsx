import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listCannedReplies, listInbox, markInboxRead, replyInbox } from "@/lib/nexus/data";
import { PLATFORM_META, PLATFORM_ORDER, PlatformGlyph } from "@/lib/nexus/platforms";
import type { CannedReply, InboxItem, InboxKind, PlatformId } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/inbox")({ component: InboxPage });

const KINDS: Array<InboxKind | "all"> = ["all", "mention", "reply", "dm", "like"];

function InboxPage() {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [kind, setKind] = useState<InboxKind | "all">("all");
  const [platform, setPlatform] = useState<"all" | PlatformId>("all");
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [inbox, saved] = await Promise.all([listInbox(), listCannedReplies().catch(() => [])]);
      setItems(inbox);
      setCanned(saved);
    } catch {
      toast.error("Could not load inbox.");
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return (items ?? []).filter((i) => (kind === "all" || i.kind === kind) && (platform === "all" || i.platform === platform));
  }, [items, kind, platform]);

  if (!items) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const unread = items.filter((i) => !i.read).length;
  const selected = items.find((i) => i.id === active) ?? null;

  const send = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await replyInbox({ data: { id: selected.id, content: reply.trim() } });
      setReply("");
      toast.success("Reply sent.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted">Mentions, replies, and messages across networks.</p>
        </div>
        {unread > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await markInboxRead({ data: { all: true } });
              await load();
            }}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "min-h-11 rounded-full px-3 text-sm font-medium capitalize",
              kind === k ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
            )}
          >
            {k}
          </button>
        ))}
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as typeof platform)}
          className="ml-auto h-11 rounded-[12px] border border-border bg-surface px-3 text-sm"
        >
          <option value="all">All networks</option>
          {PLATFORM_ORDER.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_META[p].name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-semibold">Inbox is quiet</p>
          <p className="mt-1 text-sm text-muted">Connect a network to start receiving activity.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-2">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  setActive(item.id);
                  if (!item.read) {
                    await markInboxRead({ data: { id: item.id } });
                    await load();
                  }
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[20px] border bg-surface p-4 text-left",
                  active === item.id ? "border-border-strong" : "border-border",
                )}
              >
                {item.fromAvatar ? (
                  <img src={item.fromAvatar} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <PlatformGlyph platform={item.platform} className="h-10 w-10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{item.fromName}</span>
                    <span className="text-subtle">{item.fromHandle}</span>
                    <Badge tone="neutral">{item.kind}</Badge>
                    {!item.read && <span className="ml-auto h-2 w-2 rounded-full bg-teal" />}
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.content}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {PLATFORM_META[item.platform].name} · {new Date(item.createdAt).toLocaleString()}
                    {item.replies.length > 0 ? ` · ${item.replies.length} reply` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <Card className="h-fit lg:sticky lg:top-4">
            {selected ? (
              <div className="space-y-3">
                <h2 className="font-semibold">Reply to {selected.fromName}</h2>
                {selected.replies.map((r) => (
                  <div key={r.id} className="rounded-[12px] border border-border bg-bg/40 px-3 py-2 text-sm">
                    <p>{r.content}</p>
                    <p className="mt-1 text-[11px] text-subtle">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {canned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {canned.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setReply(c.content)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-fg"
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
                <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                <Button className="w-full" disabled={busy || !reply.trim()} onClick={send}>
                  {busy ? "Sending…" : "Send reply"}
                </Button>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted">Select a conversation to reply.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
