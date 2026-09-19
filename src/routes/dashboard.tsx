import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Link2,
  PenLine,
  Rss,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CommandPalette } from "@/components/nexus/command-palette";
import { Composer } from "@/components/nexus/composer";
import { Logo } from "@/components/nexus/logo";
import { NotificationBell } from "@/components/nexus/notifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard, getProfile } from "@/lib/nexus/data";
import { useComposer } from "@/lib/nexus/store";
import type { Connection } from "@/lib/nexus/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({ component: DashboardShell });

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/dashboard/feed", label: "Feed", icon: Rss },
  { to: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarClock },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/library", label: "Library", icon: FolderOpen },
  { to: "/dashboard/approvals", label: "Approvals", icon: Shield },
  { to: "/dashboard/connections", label: "Connections", icon: Link2 },
  { to: "/dashboard/team", label: "Team", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function DashboardShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setOpen = useComposer((s) => s.setOpen);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [unread, setUnread] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const profile = await getProfile();
        document.documentElement.classList.toggle("dark", profile.theme !== "light");
        document.documentElement.classList.toggle("light", profile.theme === "light");
        const dash = await getDashboard();
        if (cancelled) return;
        setConnections(dash.connections);
        setUnread(dash.stats.unreadInbox);
        setPendingApprovals(dash.stats.pendingApprovals);
      } catch {
        /* layout still renders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Skeleton className="h-24 w-48" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
          <Link to="/dashboard" className="mb-8 px-2">
            <Logo />
          </Link>
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">Menu</p>
          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const exact = "exact" in item && item.exact;
              const active = exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-colors",
                    active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg",
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                  {item.to === "/dashboard/inbox" && unread > 0 && (
                    <span className="ml-auto tabular-nums text-[11px] text-teal">{unread}</span>
                  )}
                  {item.to === "/dashboard/approvals" && pendingApprovals > 0 && (
                    <span className="ml-auto tabular-nums text-[11px] text-warn">{pendingApprovals}</span>
                  )}
                  {active && item.to !== "/dashboard/inbox" && item.to !== "/dashboard/approvals" && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal" />
                  )}
                </Link>
              );
            })}
          </nav>
          <Button className="mb-3 w-full" onClick={() => setOpen(true)}>
            <PenLine className="h-4 w-4" />
            New post
          </Button>
          <p className="mb-3 px-1 text-center text-[10px] text-subtle">⌘K to jump anywhere</p>
          <div className="flex items-center gap-1 rounded-[16px] border border-border bg-bg/40 px-1 py-1">
            <NotificationBell />
            <div className="min-w-0 flex-1">
              <UserButton />
            </div>
          </div>
        </aside>

        <main className="min-h-dvh min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8 md:pb-8">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Link to="/dashboard">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Button size="sm" onClick={() => setOpen(true)}>
                <PenLine className="h-4 w-4" />
                Post
              </Button>
            </div>
          </div>
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 px-2 py-1 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const exact = "exact" in item && item.exact;
          const active = exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-fg" : "text-subtle",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Composer connections={connections} />
      <CommandPalette />
    </div>
  );
}
