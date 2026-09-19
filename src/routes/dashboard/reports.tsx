import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { exportCsv, getAnalytics, getDashboard } from "@/lib/nexus/data";
import type { AnalyticsRow, DashboardData } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/reports")({ component: ReportsPage });

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [per, setPer] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [d, a] = await Promise.all([getDashboard(), getAnalytics()]);
        setDash(d);
        setPer(a.perPlatform);
      } catch {
        toast.error("Could not load reports.");
      }
    })();
  }, []);

  if (!dash) return <Skeleton className="h-64" />;

  const pull = async (kind: "history" | "inbox" | "analytics" | "audit") => {
    const res = await exportCsv({ data: { kind } });
    download(res.filename, res.csv);
    toast.success(`Exported ${kind}.`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">Workspace snapshot and CSV exports.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Networks</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{dash.stats.connectionsCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Success rate</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{dash.stats.crossPostSuccessRate}%</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unread inbox</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{dash.stats.unreadInbox}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Drafts</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{dash.stats.draftCount}</p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Per-network publish</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="py-2">Network</th>
              <th>Attempts</th>
              <th>Success</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {per
              .filter((p) => p.attempts > 0)
              .map((p) => (
                <tr key={p.platform} className="border-t border-border">
                  <td className="py-2">{p.name}</td>
                  <td className="tabular-nums">{p.attempts}</td>
                  <td className="tabular-nums">{p.successCount}</td>
                  <td className="tabular-nums">{p.successRate}%</td>
                </tr>
              ))}
          </tbody>
        </table>
        {per.every((p) => p.attempts === 0) && <p className="text-sm text-muted">No publishes yet.</p>}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Export</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => pull("history")}>
            Publishing CSV
          </Button>
          <Button variant="secondary" onClick={() => pull("inbox")}>
            Inbox CSV
          </Button>
          <Button variant="secondary" onClick={() => pull("analytics")}>
            Analytics CSV
          </Button>
          <Button variant="secondary" onClick={() => pull("audit")}>
            Audit CSV
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted">
          Live charts live in{" "}
          <Link to="/dashboard/analytics" className="font-medium text-fg underline">
            Analytics
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
