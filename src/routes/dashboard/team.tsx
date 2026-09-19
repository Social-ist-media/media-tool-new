import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { inviteMember, listInvites, revokeInvite } from "@/lib/nexus/data";
import type { TeamInvite } from "@/lib/nexus/types";

export const Route = createFileRoute("/dashboard/team")({ component: TeamPage });

function TeamPage() {
  const user = useCurrentUser();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "analyst">("member");
  const [busy, setBusy] = useState(false);

  const load = () =>
    listInvites()
      .then(setInvites)
      .catch(() => toast.error("Could not load team."));

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await inviteMember({ data: { email, role } });
      setEmail("");
      toast.success("Invite recorded.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted">
          You are the workspace owner. Invites are stored here; email delivery is not wired on this
          deployment.
        </p>
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Members</h2>
        <div className="flex items-center justify-between rounded-[12px] border border-border px-3 py-3">
          <div>
            <p className="text-sm font-medium">{user?.displayName ?? "You"}</p>
            <p className="text-xs text-muted">{user?.primaryEmail}</p>
          </div>
          <Badge>Owner</Badge>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Invite</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-11 w-full rounded-[12px] border border-border bg-surface px-3.5 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add invite"}
          </Button>
        </form>
        <ul className="mt-6 space-y-2">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between rounded-[12px] border border-border px-3 py-3">
              <span>
                <span className="block text-sm font-medium">{inv.email}</span>
                <span className="text-xs text-muted">
                  {inv.role} · {inv.status}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await revokeInvite({ data: { id: inv.id } });
                  await load();
                }}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
