import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/nexus/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authFailureMessage, rememberSessionToken } from "@/lib/nexus/bearer";
import { resolveLoginIdentifier } from "@/lib/nexus/identity";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Skeleton className="h-80 w-full max-w-md" />
      </main>
    );
  }
  if (user) return <Navigate to="/dashboard" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resolved = await resolveLoginIdentifier({ data: { identifier } });
      if (!resolved.email) {
        setError(resolved.error ?? "Enter an email or username.");
        return;
      }
      const { data, error: err } = await authClient.signIn.email({ email: resolved.email, password });
      if (err) {
        setError(authFailureMessage(err, "Invalid email, username, or password."));
        return;
      }
      rememberSessionToken(data?.token);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(authFailureMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-12">
      <div className="nx-grid pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md rounded-[24px] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <Link to="/" className="mb-8 inline-flex">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to your command center.</p>

        {authEnabled ? (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="identifier">Email or username</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  placeholder="you@studio.com or ada_lane"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-muted hover:text-fg">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="rounded-[12px] bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="h-px bg-border" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface px-3 text-[11px] uppercase tracking-wider text-subtle">
                or
              </span>
            </div>

            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/dashboard" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          No account?{" "}
          <Link to="/register" className="font-medium text-fg hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
