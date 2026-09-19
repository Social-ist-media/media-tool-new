import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteAccountData, exportCsv, getProfile, listAudit, updateProfile } from "@/lib/nexus/data";
import type { AuditEvent, Profile } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

const ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];

function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio);
        setTheme(p.theme);
        setTimezone(p.timezone);
        setAudit(await listAudit());
      } catch {
        toast.error("Could not load settings.");
      }
    })();
  }, []);

  if (!profile) return <Skeleton className="h-64" />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await updateProfile({ data: { displayName, bio, theme, timezone } });
      setProfile(next);
      document.documentElement.classList.toggle("dark", next.theme !== "light");
      document.documentElement.classList.toggle("light", next.theme === "light");
      toast.success("Profile updated.");
      setAudit(await listAudit());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Workspace identity, theme, export, and audit trail.</p>
      </div>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <select
              id="tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-sm"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Theme</Label>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`min-h-11 rounded-[12px] border px-4 text-sm capitalize ${
                    theme === t ? "border-border-strong bg-surface-2" : "border-border"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Workspace</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/developers">
            <Button variant="secondary">API keys & webhooks</Button>
          </Link>
          <Link to="/dashboard/reports">
            <Button variant="secondary">Reports</Button>
          </Link>
          <Link to="/dashboard/help">
            <Button variant="secondary">Help</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await exportCsv({ data: { kind: "audit" } });
              const blob = new Blob([res.csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = res.filename;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export audit CSV
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Audit log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted">No privileged actions yet.</p>
        ) : (
          <ul className="space-y-2">
            {audit.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-2.5">
                <span>
                  <Badge className="mr-2">{ev.action}</Badge>
                  <span className="text-sm text-muted">{ev.detail}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-subtle">{new Date(ev.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Delete workspace data</h2>
        <p className="mb-3 text-sm text-muted">
          Removes posts, connections, inbox, keys, and audit events for this account. Type DELETE to confirm.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="max-w-40" />
          <Button
            variant="danger"
            disabled={confirm !== "DELETE"}
            onClick={async () => {
              await deleteAccountData({ data: { confirm: "DELETE" } });
              toast.success("Workspace data cleared. Refresh to start over.");
              window.location.assign("/dashboard");
            }}
          >
            Delete data
          </Button>
        </div>
      </Card>
    </div>
  );
}
