import Link from "next/link";
import { PLATFORM_META, PLATFORM_ORDER, PlatformGlyph } from "@/lib/platforms";

function joinPlatformNames(): string {
  const names = PLATFORM_ORDER.map((p) => PLATFORM_META[p].name);
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">NEXUS</div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/register" className="btn-primary">Get started</Link>
        </nav>
      </header>
      <section className="relative mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center -space-x-2">
            {PLATFORM_ORDER.map((p) => (
              <PlatformGlyph key={p} platform={p} className="h-11 w-11 ring-4 ring-white" />
            ))}
          </div>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
          All your social media,<br />
          <span className="text-gradient-brand">one feed.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
          Connect {joinPlatformNames()}. Read a single unified timeline and cross-post to every network at once.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="btn-primary px-7 py-3 text-base">Create your account</Link>
          <Link href="/login" className="btn-outline px-7 py-3 text-base">Try the live demo</Link>
        </div>
      </section>
    </main>
  );
}
