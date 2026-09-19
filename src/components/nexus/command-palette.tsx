import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BarChart3, CalendarClock, FolderOpen, Inbox, LayoutGrid, Link2, PenLine, Rss, Search, Settings, Shield, Users } from "lucide-react";
import { searchWorkspace } from "@/lib/nexus/data";
import { useComposer } from "@/lib/nexus/store";
import { cn } from "@/lib/utils";

const PAGES = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid },
  { to: "/dashboard/feed", label: "Feed", icon: Rss },
  { to: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarClock },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/library", label: "Library", icon: FolderOpen },
  { to: "/dashboard/connections", label: "Connections", icon: Link2 },
  { to: "/dashboard/approvals", label: "Approvals", icon: Shield },
  { to: "/dashboard/team", label: "Team", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
  { to: "/dashboard/developers", label: "Developers", icon: Shield },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchWorkspace>> | null>(null);
  const navigate = useNavigate();
  const openComposer = useComposer((s) => s.openWith);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits(null);
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      void searchWorkspace({ data: { q: q.trim() } })
        .then(setHits)
        .catch(() => setHits(null));
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const pages = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return PAGES;
    return PAGES.filter((p) => p.label.toLowerCase().includes(needle));
  }, [q]);

  if (!open) return null;

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-bg/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[20px] border border-border bg-surface shadow-[var(--shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump, search, or compose…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          <kbd className="hidden rounded-[6px] border border-border px-1.5 text-[10px] text-subtle sm:inline">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openComposer();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-sm hover:bg-surface-2"
          >
            <PenLine className="h-4 w-4" />
            New post
          </button>
          {pages.map((p) => (
            <button
              key={p.to}
              type="button"
              onClick={() => go(p.to)}
              className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 text-sm hover:bg-surface-2"
            >
              <p.icon className="h-4 w-4" />
              {p.label}
            </button>
          ))}
          {hits && (
            <>
              {hits.posts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go("/dashboard/feed")}
                  className={cn("flex min-h-11 w-full flex-col items-start rounded-[12px] px-3 py-2 text-left text-sm hover:bg-surface-2")}
                >
                  <span className="text-[11px] uppercase tracking-wider text-subtle">Feed</span>
                  <span className="line-clamp-1 text-muted">{p.content}</span>
                </button>
              ))}
              {hits.inbox.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => go("/dashboard/inbox")}
                  className="flex min-h-11 w-full flex-col items-start rounded-[12px] px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="text-[11px] uppercase tracking-wider text-subtle">Inbox · {p.from}</span>
                  <span className="line-clamp-1 text-muted">{p.content}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
