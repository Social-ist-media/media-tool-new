import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { audit, ensureProfile } from "./data";

export const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function usernameError(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!username) return "Choose a username.";
  if (!USERNAME_RE.test(username)) {
    return "Usernames are 3–20 characters, start with a letter, and use only letters, numbers, or underscores.";
  }
  return null;
}

export const checkUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ username: z.string().max(40) }).parse(input))
  .handler(async ({ data }) => {
    const reason = usernameError(data.username);
    const username = normalizeUsername(data.username);
    if (reason) return { available: false, username, error: reason };
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`
      select user_id from profiles where username = ${username} limit 1
    `;
    if (rows[0]) return { available: false, username, error: "That username is taken." };
    return { available: true, username, error: null as string | null };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        username: z.string().max(40),
        displayName: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const reason = usernameError(data.username);
    if (reason) throw new Error(reason);
    const username = normalizeUsername(data.username);
    await ensureProfile(context.userId);
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from profiles
      where username = ${username} and user_id <> ${context.userId}
      limit 1
    `;
    if (taken[0]) throw new Error("That username is taken.");
    const displayName = data.displayName?.trim() ?? "";
    try {
      if (displayName) {
        await sql`
          update profiles
          set username = ${username},
              display_name = ${displayName},
              updated_at = now()
          where user_id = ${context.userId}
        `;
      } else {
        await sql`
          update profiles
          set username = ${username}, updated_at = now()
          where user_id = ${context.userId}
        `;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/unique|duplicate/i.test(message)) throw new Error("That username is taken.");
      throw err;
    }
    await audit(context.userId, "profile.username", username);
    return { username };
  });

export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ identifier: z.string().min(1).max(160) }).parse(input))
  .handler(async ({ data }) => {
    const identifier = data.identifier.trim();
    if (identifier.includes("@")) {
      return { email: identifier.toLowerCase(), error: null as string | null };
    }
    const reason = usernameError(identifier);
    if (reason) return { email: null as string | null, error: "Enter an email, or a username like ada_lane." };
    const username = normalizeUsername(identifier);
    const sql = await getSql();
    const rows = await sql<{ email: string }>`
      select u.email as email
      from profiles p
      join "user" u on u.id = p.user_id
      where p.username = ${username}
      limit 1
    `;
    if (!rows[0]?.email) return { email: null, error: "No account uses that username." };
    return { email: rows[0].email, error: null };
  });
