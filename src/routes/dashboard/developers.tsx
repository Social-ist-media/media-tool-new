import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createApiKey, deleteWebhook, listApiKeys, listWebhooks, revokeApiKey, saveWebhook, testWebhook } from "@/lib/nexus/data";
import type { ApiKeyRow, WebhookRow } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/developers")({ component: DevelopersPage });

function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [name, setName] = useState("Production");
  const [fresh, setFresh] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [hookSecret, setHookSecret] = useState<string | null>(null);

  const load = async () => {
    try {
      setKeys(await listApiKeys());
      setHooks(await listWebhooks());
    } catch {
      toast.error("Could not load developer tools.");
      setKeys([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (!keys) return <Skeleton className="h-48" />;

  const mint = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await createApiKey({ data: { name } });
      setFresh(res.token);
      setName("Production");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create key");
    }
  };

  const addHook = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveWebhook({ data: { url, events: ["post.publish", "post.schedule"] } });
      setHookSecret(res.secret);
      setUrl("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save webhook");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
        <p className="mt-1 text-sm text-muted">API keys and outbound webhooks for this workspace.</p>
      </div>
      <Card>
        <h2 className="mb-2 font-semibold">REST API</h2>
        <p className="text-sm text-muted">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">POST /api/v1/posts</code> with{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">Authorization: Bearer nxk_…</code>
        </p>
        <pre className="mt-3 overflow-x-auto rounded-[12px] bg-bg p-4 text-xs text-muted">{`{
  "content": "Shipping from the API.",
  "platforms": ["twitter", "linkedin"]
}`}</pre>
        <p className="mt-2 text-xs text-subtle">Health: GET /api/v1/health</p>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">API keys</h2>
        <form onSubmit={mint} className="mb-4 flex flex-wrap gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="max-w-xs" />
          <Button type="submit">Create key</Button>
        </form>
        {fresh && (
          <p className="mb-4 rounded-[12px] border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
            Copy now — it will not be shown again: <code className="break-all font-medium">{fresh}</code>
          </p>
        )}
        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between rounded-[12px] border border-border px-3 py-3">
              <span>
                <span className="block text-sm font-medium">{k.name}</span>
                <span className="text-xs text-muted">
                  {k.prefix}… {k.lastUsedAt ? `· last used ${new Date(k.lastUsedAt).toLocaleString()}` : "· unused"}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await revokeApiKey({ data: { id: k.id } });
                  await load();
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Webhooks</h2>
        <form onSubmit={addHook} className="mb-4 flex flex-wrap gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hooks/nexus"
            required
            className="min-w-60 flex-1"
          />
          <Button type="submit">Add https endpoint</Button>
        </form>
        {hookSecret && (
          <p className="mb-4 rounded-[12px] border border-warn/30 bg-warn/10 px-3 py-2 text-sm">
            Signing secret: <code className="break-all">{hookSecret}</code>
          </p>
        )}
        <ul className="space-y-2">
          {hooks.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{h.url}</span>
                <span className="text-xs text-muted">{h.events.join(", ")}</span>
                {h.lastStatus > 0 && (
                  <Badge className="ml-2" tone={h.lastStatus < 400 ? "ok" : "danger"}>
                    {h.lastStatus}
                  </Badge>
                )}
              </span>
              <span className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const res = await testWebhook({ data: { id: h.id } });
                    toast.message(`Webhook responded ${res.status || "with no HTTP status"}`);
                    await load();
                  }}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await deleteWebhook({ data: { id: h.id } });
                    await load();
                  }}
                >
                  Remove
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
