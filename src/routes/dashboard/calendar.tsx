import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cancelScheduled, listHistory, releaseScheduled } from "@/lib/nexus/data";
import { PLATFORM_META, PlatformGlyph } from "@/lib/nexus/platforms";
import { useComposer } from "@/lib/nexus/store";
import type { PublishHistoryItem } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInGrid(anchor: Date): Date[] {
  const start = startOfMonth(anchor);
  const first = new Date(start);
  first.setDate(1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(first);
    x.setDate(first.getDate() + i);
    return x;
  });
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const [jobs, setJobs] = useState<PublishHistoryItem[] | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const openWith = useComposer((s) => s.openWith);

  const load = () =>
    listHistory()
      .then(setJobs)
      .catch(() => toast.error("Could not load calendar."));

  useEffect(() => {
    void load();
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, PublishHistoryItem[]>();
    for (const job of jobs ?? []) {
      const at = job.scheduledAt ?? job.createdAt;
      const key = ymd(new Date(at));
      const list = map.get(key) ?? [];
      list.push(job);
      map.set(key, list);
    }
    return map;
  }, [jobs]);

  if (!jobs) return <Skeleton className="h-48" />;

  const days = daysInGrid(cursor);
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const scheduled = jobs.filter((j) => j.scheduledAt || j.targets.some((t) => t.status === "pending"));
  const upcoming = scheduled.filter((j) => !j.scheduledAt || new Date(j.scheduledAt).getTime() >= Date.now() - 60_000);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted">Month view of published and scheduled work.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            Prev
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            Next
          </Button>
          <Button
            onClick={() => {
              const local = new Date();
              local.setMinutes(local.getMinutes() + 60);
              openWith({ scheduledAt: local.toISOString() });
            }}
          >
            Schedule a post
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-3 sm:p-4">
        <div className="grid min-w-[640px] grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = ymd(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const items = byDay.get(key) ?? [];
            const isToday = key === ymd(new Date());
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const dt = new Date(day);
                  dt.setHours(10, 0, 0, 0);
                  openWith({ scheduledAt: dt.toISOString() });
                }}
                className={cn(
                  "min-h-24 rounded-[12px] border p-2 text-left align-top",
                  inMonth ? "border-border bg-bg/40" : "border-transparent text-subtle",
                  isToday && "border-border-strong",
                )}
              >
                <span className="text-xs tabular-nums">{day.getDate()}</span>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((job) => (
                    <span key={job.id} className="block truncate rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[10px]">
                      {job.content || "Post"}
                    </span>
                  ))}
                  {items.length > 3 && <span className="text-[10px] text-subtle">+{items.length - 3}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Queued</h2>
        {upcoming.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold">Nothing queued</p>
            <p className="mt-1 text-sm text-muted">Compose a post and pick a time to place it here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((job) => (
              <Card key={job.id} className="p-5">
                <p className="text-sm leading-relaxed">{job.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {job.scheduledAt && (
                    <span className="text-xs tabular-nums text-muted">{new Date(job.scheduledAt).toLocaleString()}</span>
                  )}
                  {job.targets.map((t) => (
                    <Badge key={t.platform} tone={t.status === "pending" ? "warn" : t.status === "success" ? "ok" : "danger"}>
                      <PlatformGlyph platform={t.platform} className="h-3.5 w-3.5" />
                      {PLATFORM_META[t.platform].name}
                    </Badge>
                  ))}
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={async () => {
                      await releaseScheduled({ data: { id: job.id } });
                      toast.success("Published now.");
                      await load();
                    }}
                  >
                    Publish now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await cancelScheduled({ data: { id: job.id } });
                      toast.success("Cancelled.");
                      await load();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
