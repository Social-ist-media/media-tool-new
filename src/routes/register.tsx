import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/nexus/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authFailureMessage, rememberSessionToken } from "@/lib/nexus/bearer";
import { checkUsername, claimUsername, normalizeUsername, usernameError } from "@/lib/nexus/identity";

export const Route = createFileRoute("/register")({ component: Register });

function Register() {
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Skeleton className="h-96 w-full max-w-md" />
      </main>
    );
  }
  if (user) return <Navigate to="/dashboard" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const handleError = usernameError(username);
    if (handleError) {
      setError(handleError);
      return;
    }
    if (name.trim().length < 1) {
      setError("Add a display name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const availability = await checkUsername({ data: { username } });
      if (!availability.available) {
        setError(availability.error ?? "That username is taken.");
        return;
      }
      const { data, error: err } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (err) {
        setError(authFailureMessage(err, "Registration failed. Check the email and password and try again."));
        return;
      }
      rememberSessionToken(data?.token);
      try {
        await claimUsername({ data: { username: normalizeUsername(username), displayName: name.trim() } });
      } catch (claimErr) {
        const message = claimErr instanceof Error ? claimErr.message : "Could not reserve that username.";
        setError(`${message} Your account was created — sign in and pick a username in Settings.`);
        return;
      }
      window.location.assign("/dashboard");
    } catch (err) {
      setError(authFailureMessage(err, err instanceof Error ? err.message : "Registration failed."));
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
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="mt-1 text-sm text-muted">Pick a username, then one feed for twelve networks.</p>

        {authEnabled ? (
          <>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="ada_lane"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-subtle">3–20 characters. Letters, numbers, underscores. You can sign in with it.</p>
              </div>
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
                {loading ? "Creating account…" : "Create account"}
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
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-fg hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
