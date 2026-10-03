import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/help")({ component: HelpPage });

const FAQS = [
  {
    q: "Why is login required?",
    a: "Every feed post, connection, and inbox row is scoped to your signed-in user id. There is no shared demo tenant.",
  },
  {
    q: "Are these live Twitter / Meta APIs?",
    a: "Connectors in this build import a realistic local timeline so the product is usable without developer app keys. Live OAuth can be wired later without changing the rest of the console.",
  },
  {
    q: "How do I schedule?",
    a: "Open Compose, pick networks, set a time, then Schedule. The calendar month view shows the queue. Publish now or cancel from there.",
  },
  {
    q: "How do approvals work?",
    a: "Send for approval from Compose. An owner or admin publishes from the Approvals queue. Approved copy is published with an idempotency key so it cannot double-fire.",
  },
  {
    q: "Where is the API?",
    a: "Create a key under Developers. POST /api/v1/posts with a Bearer token. GET /api/v1/health is unauthenticated.",
  },
];

function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
        <p className="mt-1 text-sm text-muted">Shortcuts, answers, and where to go next.</p>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Keyboard</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Command palette</span>
            <kbd className="rounded-[6px] border border-border px-2 py-0.5 text-xs">⌘K</kbd>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">Close dialogs</span>
            <kbd className="rounded-[6px] border border-border px-2 py-0.5 text-xs">esc</kbd>
          </li>
        </ul>
      </Card>
      {FAQS.map((f) => (
        <Card key={f.q}>
          <h2 className="font-semibold">{f.q}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
        </Card>
      ))}
      <p className="text-sm text-muted">
        Legal:{" "}
        <Link to="/privacy" className="text-fg underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link to="/terms" className="text-fg underline">
          Terms
        </Link>
        . Developers:{" "}
        <Link to="/dashboard/developers" className="text-fg underline">
          API keys
        </Link>
        .
      </p>
    </div>
  );
}
