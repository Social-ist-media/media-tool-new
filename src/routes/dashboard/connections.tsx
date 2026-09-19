import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { connectPlatform, disconnectPlatform, listConnections } from "@/lib/nexus/data";
import { PLATFORM_META, PLATFORM_ORDER, PlatformGlyph } from "@/lib/nexus/platforms";
import type { Connection, PlatformId } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/connections")({ component: ConnectionsPage });

function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [platform, setPlatform] = useState<PlatformId>("twitter");
  const [handle, setHandle] = useState("");
  const [instance, setInstance] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listConnections()
      .then(setConnections)
      .catch(() => toast.error("Could not load connections."));

  useEffect(() => {
    void load();
  }, []);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!handle.trim()) return setError("Enter a handle.");
    setBusy(true);
    try {
      const res = await connectPlatform({
        data: {
          platform,
          handle: handle.trim(),
          instance: platform === "mastodon" ? instance : undefined,
        },
      });
      setMessage(`Connected ${PLATFORM_META[platform].name}. Imported ${res.importedPosts} posts.`);
      setHandle("");
      setInstance("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  };

  const connectedIds = new Set(connections.map((c) => c.platform));
  const meta = PLATFORM_META[platform];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-muted">
          Demo connectors import a realistic timeline. No third-party developer keys required.
        </p>
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Connect a network</h2>
        <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {PLATFORM_ORDER.map((p) => {
            const active = platform === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[16px] border p-3 text-center",
                  active ? "border-border-strong bg-surface-2" : "border-border hover:bg-surface-2/50",
                )}
              >
                {connectedIds.has(p) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-ok" />
                )}
                <PlatformGlyph platform={p} className="h-8 w-8" />
                <span className="text-[11px] font-semibold leading-tight">{PLATFORM_META[p].name}</span>
              </button>
            );
          })}
        </div>
        <form onSubmit={connect} className="space-y-4">
          <div>
            <Label htmlFor="handle">{platform === "bluesky" ? "Handle (you.bsky.social)" : "Handle"}</Label>
            <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@you" />
          </div>
          {platform === "mastodon" && (
            <div>
              <Label htmlFor="instance">Instance</Label>
              <Input
                id="instance"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                placeholder="mastodon.social"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge>Auth: {meta.authLabel}</Badge>
            <Badge>{meta.charLimit} character limit</Badge>
          </div>
          {error && <p className="rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {message && <p className="rounded-[12px] bg-ok/10 px-3 py-2 text-sm text-ok">{message}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Connecting…" : `Connect ${meta.name}`}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Active accounts</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-muted">None yet. Connect a network above.</p>
        ) : (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <PlatformGlyph platform={c.platform} className="h-9 w-9" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {PLATFORM_META[c.platform].name}
                    </span>
                    <span className="block truncate text-xs text-muted">@{c.handle}</span>
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await disconnectPlatform({ data: { id: c.id } });
                    await load();
                  }}
                >
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
