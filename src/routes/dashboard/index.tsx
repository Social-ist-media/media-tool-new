import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Rss, Send } from "lucide-react";
import { toast } from "sonner";
import { getDashboard, listHistory } from "@/lib/nexus/data";
import { PLATFORM_META, PlatformGlyph } from "@/lib/nexus/platforms";
import { useComposer } from "@/lib/nexus/store";
import type { DashboardData, PublishHistoryItem } from "@/lib/nexus/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/")({ component: Overview });

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Link2;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface-2">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-0.5 text-sm text-muted">{label}</div>
      </div>
    </Card>
  );
}

function Overview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const openComposer = useComposer((s) => s.openWith);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [dash, jobs] = await Promise.all([getDashboard(), listHistory()]);
        if (cancelled) return;
        setData(dash);
        setHistory(jobs);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load overview");
          toast.error("Could not load overview.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium">Overview unavailable</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const engagement = [
    { label: "Likes", value: data.stats.totalLikes },
    { label: "Reposts", value: data.stats.totalReposts },
    { label: "Replies", value: data.stats.totalReplies },
  ];
  const engagementMax = Math.max(1, ...engagement.map((e) => e.value));
  const onboarding = data.stats.connectionsCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">Activity across every connected network.</p>
      </div>
      {onboarding && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Start in three moves</h2>
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">1</span>
              <span>
                <Link to="/dashboard/connections" className="font-medium text-fg underline">
                  Connect a network
                </Link>
                <span className="text-muted"> — imports a realistic timeline and inbox.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">2</span>
              <span>
                <button type="button" className="font-medium text-fg underline" onClick={() => openComposer()}>
                  Write the first post
                </button>
                <span className="text-muted"> — or save a draft / send for approval.</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">3</span>
              <span>
                <Link to="/dashboard/inbox" className="font-medium text-fg underline">
                  Reply from the inbox
                </Link>
                <span className="text-muted"> — mentions, DMs, and saved replies.</span>
              </span>
            </li>
          </ol>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Link2} label="Connected networks" value={data.stats.connectionsCount} />
        <Stat icon={Rss} label="Posts in feed" value={data.stats.totalFeedPosts} />
        <Stat icon={Send} label="Cross-posts sent" value={data.stats.crossPosts} />
        <Stat icon={CheckCircle2} label="Success rate" value={`${data.stats.crossPostSuccessRate}%`} />
      </div>
      {(data.stats.pendingApprovals > 0 || data.stats.draftCount > 0) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {data.stats.pendingApprovals > 0 && (
            <Link to="/dashboard/approvals" className="rounded-[12px] border border-border px-3 py-2">
              {data.stats.pendingApprovals} waiting on approval
            </Link>
          )}
          {data.stats.draftCount > 0 && (
            <button type="button" onClick={() => openComposer()} className="rounded-[12px] border border-border px-3 py-2">
              {data.stats.draftCount} draft{data.stats.draftCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Networks</h2>
          <div className="space-y-2">
            {data.platforms.map((p) => (
              <div key={p.platform} className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2.5">
                <span className="flex items-center gap-3 text-sm font-medium">
                  <PlatformGlyph platform={p.platform} className="h-8 w-8" />
                  <span>
                    {p.name}
                    <span className="block text-xs font-normal text-subtle">{p.charLimit} char limit</span>
                  </span>
                </span>
                {p.connected ? (
                  <Badge tone="ok">Active</Badge>
                ) : (
                  <Link to="/dashboard/connections" className="text-xs font-semibold text-muted hover:text-fg">
                    Connect
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Engagement totals</h2>
          <div className="space-y-4">
            {engagement.map((e) => (
              <div key={e.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm text-muted">{e.label}</span>
                  <span className="text-lg font-semibold tabular-nums">{e.value.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-teal/80"
                    style={{ width: `${Math.round((e.value / engagementMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted">
            Authored <span className="font-medium text-fg">{data.stats.ownPosts}</span> posts via cross-posting.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openComposer()}>
              New post
            </Button>
            <Link to="/dashboard/reports">
              <Button size="sm" variant="secondary">
                Reports
              </Button>
            </Link>
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Publishing history</h2>
        {history.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-border py-10 text-center text-sm text-muted">
            No posts yet. Hit the compose button in the sidebar to ship the first one.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((job) => (
              <div key={job.id} className="rounded-[16px] border border-border p-4">
                <p className="text-sm leading-relaxed">{job.content}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                  {job.scheduledAt && <span>Scheduled {new Date(job.scheduledAt).toLocaleString()}</span>}
                  {job.targets.map((t) => (
                    <Badge
                      key={t.platform}
                      tone={t.status === "success" ? "ok" : t.status === "pending" ? "warn" : "danger"}
                    >
                      <PlatformGlyph platform={t.platform} className="h-3.5 w-3.5" />
                      {PLATFORM_META[t.platform].name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
