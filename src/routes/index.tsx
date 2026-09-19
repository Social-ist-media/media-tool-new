import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Layers3, PenLine, Shield } from "lucide-react";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/nexus/logo";
import { Button } from "@/components/ui/button";
import { joinPlatformNames, PLATFORM_ORDER, PlatformGlyph } from "@/lib/nexus/platforms";

export const Route = createFileRoute("/")({ component: Home });

const FEATURES = [
  {
    title: "Unified feed",
    desc: "Every network, one chronological timeline. Search, filter, bookmark.",
    icon: Layers3,
  },
  {
    title: "Write once",
    desc: "Compose, attach media, and ship to every connected network with per-platform limits.",
    icon: PenLine,
  },
  {
    title: "Measure",
    desc: "Success rate, latency, and volume per network. No vanity graphs.",
    icon: BarChart3,
  },
  {
    title: "Owned by you",
    desc: "Real accounts, scoped data, audit trail. Credentials never leave your workspace.",
    icon: Shield,
  },
];

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-11 w-28 animate-pulse rounded-[12px] bg-surface-2" />;
  if (user) {
    return (
      <Link to="/dashboard">
        <Button>Open console</Button>
      </Link>
    );
  }
  return (
    <>
      <Link to="/login" className="hidden sm:inline-flex">
        <Button variant="ghost">Sign in</Button>
      </Link>
      <Link to="/register">
        <Button>Get started</Button>
      </Link>
    </>
  );
}

function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-bg">
      <div className="nx-grid pointer-events-none absolute inset-x-0 top-0 h-[560px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <AuthSlot />
        </nav>
      </header>

      <section className="relative mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pt-24">
        <div className="mb-8 flex flex-wrap items-center justify-center -space-x-2">
          {PLATFORM_ORDER.map((p) => (
            <PlatformGlyph key={p} platform={p} className="h-10 w-10 ring-4 ring-bg sm:h-11 sm:w-11" />
          ))}
        </div>
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Twelve networks, one command center
        </p>
        <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl md:text-7xl">
          All your social media,
          <br />
          one feed.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Connect {joinPlatformNames()}. Read a single timeline, engage in one inbox, and cross-post
          without tab-hopping.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <SignedOut>
            <Link to="/register">
              <Button size="lg">Create your account</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button size="lg">Continue to console</Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <article key={f.title} className="rounded-[24px] border border-border bg-surface p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-surface-2 text-fg">
              <f.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-base font-semibold tracking-tight">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo className="text-sm" />
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <Link to="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-fg">
              Terms
            </Link>
            <span className="text-subtle">Demo connectors. No third-party keys required.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
