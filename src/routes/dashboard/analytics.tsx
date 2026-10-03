import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { exportCsv, getAnalytics, getBestTimes } from "@/lib/nexus/data";
import { PlatformGlyph } from "@/lib/nexus/platforms";
import type { AnalyticsRow, BestTimeCell } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/analytics")({ component: AnalyticsPage });

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AnalyticsPage() {
  const [data, setData] = useState<{
    perPlatform: AnalyticsRow[];
    feedVolume: Array<{ date: string; count: number }>;
  } | null>(null);
  const [times, setTimes] = useState<{ cells: BestTimeCell[]; top: BestTimeCell[] } | null>(null);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(() => toast.error("Could not load analytics."));
    getBestTimes()
      .then(setTimes)
      .catch(() => setTimes(null));
  }, []);

  if (!data) {
    return <Skeleton className="h-64" />;
  }

  const attempted = data.perPlatform.filter((p) => p.attempts > 0);
  const idle = data.perPlatform.filter((p) => p.attempts === 0);
  const maxScore = Math.max(1, ...(times?.cells.map((c) => c.score) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Cross-post success, latency, volume, and best hours.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/reports">
            <Button variant="secondary">Open reports</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await exportCsv({ data: { kind: "analytics" } });
              const blob = new Blob([res.csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.filename;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Cross-post performance</h2>
        {attempted.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-border py-10 text-center text-sm text-muted">
            Publish a post to see per-network success rate and latency.
          </p>
        ) : (
          <div className="space-y-4">
            {attempted.map((p) => (
              <div key={p.platform} className="rounded-[16px] border border-border p-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <PlatformGlyph platform={p.platform} className="h-8 w-8" />
                    {p.name}
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    {p.successCount}/{p.attempts} · {p.avgLatencyMs}ms
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${p.successRate}%` }} />
                </div>
                <div className="mt-1.5 text-right text-xs font-semibold tabular-nums text-muted">{p.successRate}%</div>
              </div>
            ))}
          </div>
        )}
        {idle.length > 0 && <p className="mt-4 text-xs text-subtle">Idle: {idle.map((p) => p.name).join(", ")}.</p>}
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Feed volume — 14 days</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.feedVolume}>
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                stroke="var(--color-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  color: "var(--color-fg)",
                }}
              />
              <Bar dataKey="count" fill="var(--color-teal)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {times && (
        <Card>
          <h2 className="mb-2 font-semibold">Best times (engagement heat)</h2>
          <p className="mb-4 text-sm text-muted">
            {times.top[0] && times.top[0].score > 0
              ? `Peak: ${DAYS[times.top[0].weekday]} ${String(times.top[0].hour).padStart(2, "0")}:00`
              : "Connect a network so the heat map has real engagement to score."}
          </p>
          <div className="overflow-x-auto">
            <div className="inline-grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5">
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="w-4 text-center text-[9px] text-subtle">
                  {h % 6 === 0 ? h : ""}
                </span>
              ))}
              {DAYS.map((label, wd) => (
                <div key={label} className="contents">
                  <span className="pr-2 text-[10px] text-subtle">{label}</span>
                  {Array.from({ length: 24 }, (_, hr) => {
                    const cell = times.cells.find((c) => c.weekday === wd && c.hour === hr);
                    const t = (cell?.score ?? 0) / maxScore;
                    return (
                      <span
                        key={`${wd}-${hr}`}
                        title={`${label} ${hr}:00 · ${cell?.score ?? 0}`}
                        className={cn("h-4 w-4 rounded-[3px]", t === 0 ? "bg-surface-2" : "bg-teal")}
                        style={{ opacity: t === 0 ? 1 : 0.25 + t * 0.75 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
