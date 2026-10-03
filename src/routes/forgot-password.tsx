import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/nexus/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({ component: Forgot });

function Forgot() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-surface p-8">
        <Link to="/" className="mb-8 inline-flex">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Email recovery is not enabled on this deployment. Sign in with Google or X, or create a new
          account with a password you control.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" className="w-full">
              Create a new account
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
