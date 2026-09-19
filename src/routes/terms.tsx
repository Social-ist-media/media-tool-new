import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/nexus/logo";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link to="/">
        <Logo />
      </Link>
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          NEXUS is a social command center. You are responsible for content you publish to connected
          networks and for complying with each network's terms.
        </p>
        <p>
          Demo connectors simulate publish and ingest. Live OAuth connectors, when enabled, act on
          your behalf with the scopes you grant.
        </p>
        <p>The service is provided as-is. Do not post unlawful content.</p>
      </div>
    </main>
  );
}
