/** Same key Better Auth's preview client reads. Do not rename. */
const BEARER_KEY = "grok-auth.bearer-token";

export function rememberSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined" || !token) return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function authFailureMessage(err: unknown, fallback: string): string {
  const bag = err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const message = typeof bag.message === "string" ? bag.message : "";
  const code = typeof bag.code === "string" ? bag.code : "";
  const statusText = typeof bag.statusText === "string" ? bag.statusText : "";
  const text = `${code} ${message} ${statusText}`.trim();
  if (/USER_ALREADY_EXISTS|already exists|already registered/i.test(text)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (/PASSWORD_TOO_SHORT|too short/i.test(text)) {
    return "Password must be at least 8 characters.";
  }
  if (/INVALID_EMAIL|invalid email/i.test(text)) return "Enter a valid email address.";
  if (/INVALID_ORIGIN|invalid origin/i.test(text)) {
    return "This page origin was rejected. Refresh and try again.";
  }
  if (/not enabled|SIGN_UP_DISABLED/i.test(text)) return "Email sign-up is turned off.";
  if (/FAILED_TO_CREATE_USER|FAILED_TO_CREATE_SESSION/i.test(text)) {
    return "The account could not be saved. Try again in a moment.";
  }
  if (/INVALID_EMAIL_OR_PASSWORD|invalid email or password|invalid credentials/i.test(text)) {
    return "Invalid email, username, or password.";
  }
  if (message) return message;
  return fallback;
}
