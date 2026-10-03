#!/usr/bin/env bash
# One-time production setup. Log in once; this sets the three env vars,
# creates the Neon database, and redeploys.
set -euo pipefail

URL="${BETTER_AUTH_URL:-https://nexus-console-eta.vercel.app}"
PROJECT="${VERCEL_PROJECT:-nexus-console}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Installing the Vercel CLI..."
  npm install -g vercel
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "A browser window will open so you can log in once."
  vercel login
fi

echo "Linking ${PROJECT}..."
if ! vercel link --yes --project "$PROJECT"; then
  echo "No project named ${PROJECT}. These are yours:"
  vercel project ls
  echo "Re-run: VERCEL_PROJECT=that-name bash scripts/setup-production.sh"
  exit 1
fi

add_env() {
  local name="$1" value="$2" env="$3"
  vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" "$env" --yes
}

SECRET="$(openssl rand -base64 32)"
for env in production preview; do
  add_env BETTER_AUTH_SECRET "$SECRET" "$env"
  add_env BETTER_AUTH_URL "$URL" "$env"
done
unset SECRET
echo "Set the auth secret and ${URL}."

echo "Creating Neon Postgres. If Vercel asks you to accept terms, that is the only extra click."
vercel integration add neon --name nexus \
  --environment production \
  --environment preview \
  --environment development

# Build-time migrations need a direct connection. The Vercel Neon integration
# often puts the pooler in DATABASE_URL and the direct URL in DATABASE_URL_UNPOOLED.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
vercel env pull "$tmp/prod.env" --environment production --yes >/dev/null
python3 - "$tmp/prod.env" "$tmp/direct.txt" << 'PY'
import sys
from pathlib import Path
vals = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    vals[key] = value.strip().strip('"').strip("'")
url = vals.get("DATABASE_URL", "")
direct = vals.get("DATABASE_URL_UNPOOLED") or vals.get("POSTGRES_URL_NON_POOLING") or ""
Path(sys.argv[2]).write_text(("swap\n" + direct) if ("-pooler" in url and direct) else "keep\n")
PY
mode="$(head -n 1 "$tmp/direct.txt")"
if [ "$mode" = "swap" ]; then
  echo "Using the direct database URL so migrations succeed."
  direct="$(tail -n +2 "$tmp/direct.txt")"
  for env in production preview development; do
    add_env DATABASE_URL "$direct" "$env"
  done
fi

echo "Redeploying..."
vercel deploy --prod --yes
echo "Done. ${URL}"
