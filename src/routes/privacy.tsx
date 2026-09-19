import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/nexus/logo";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/">
        <Logo />
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Privacy</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          NEXUS stores your account, connected handles, feed cache, publish history, inbox, and
          audit events in this application's database. Data is scoped to your signed-in user
          id. We do not sell personal data.
        </p>
        <p>
          Demo connectors generate sample timelines locally. They do not contact Twitter, Meta, or
          other upstream APIs unless you later configure live credentials.
        </p>
        <p>
          To request deletion of your workspace data, sign in and disconnect every network, then
          contact the operator. A full account-deletion control is tracked for the next release.
        </p>
      </div>
    </main>
  );
}
