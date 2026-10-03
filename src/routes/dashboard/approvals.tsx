import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { decideApproval, listApprovals, publishPost } from "@/lib/nexus/data";
import { PLATFORM_META, PlatformGlyph } from "@/lib/nexus/platforms";
import type { ApprovalItem } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[] | null>(null);

  const load = () =>
    listApprovals()
      .then(setItems)
      .catch(() => toast.error("Could not load approvals."));

  useEffect(() => {
    void load();
  }, []);

  if (!items) return <Skeleton className="h-48" />;

  const pending = items.filter((i) => i.status === "pending");
  const decided = items.filter((i) => i.status !== "pending");

  const decide = async (item: ApprovalItem, status: "approved" | "rejected") => {
    try {
      await decideApproval({ data: { id: item.id, status } });
      if (status === "approved") {
        await publishPost({
          data: {
            content: item.content,
            platforms: item.platforms,
            mediaUrls: item.mediaUrls,
            scheduledAt: item.scheduledAt,
            idempotencyKey: `approval-${item.id}`,
          },
        });
        toast.success("Approved and published.");
      } else {
        toast.success("Rejected.");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decide");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-muted">Review queued copy before it goes live.</p>
      </div>
      {pending.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-semibold">Queue is clear</p>
          <p className="mt-1 text-sm text-muted">Use “Send for approval” in the composer to add work here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <Card key={item.id} className="p-5">
              <p className="text-sm leading-relaxed">{item.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.platforms.map((p) => (
                  <Badge key={p}>
                    <PlatformGlyph platform={p} className="h-3.5 w-3.5" />
                    {PLATFORM_META[p].name}
                  </Badge>
                ))}
                {item.scheduledAt && (
                  <span className="text-xs text-muted">{new Date(item.scheduledAt).toLocaleString()}</span>
                )}
                <Button size="sm" className="ml-auto" onClick={() => decide(item, "approved")}>
                  Approve & publish
                </Button>
                <Button size="sm" variant="ghost" onClick={() => decide(item, "rejected")}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {decided.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">History</h2>
          <ul className="space-y-2">
            {decided.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-[12px] border border-border px-3 py-3">
                <p className="line-clamp-2 text-sm text-muted">{item.content}</p>
                <Badge tone={item.status === "approved" ? "ok" : "danger"}>{item.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
