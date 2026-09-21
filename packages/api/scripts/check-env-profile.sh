#!/usr/bin/env sh
# Report which vendor integrations are live vs stubbed on this box.
# Read-only. Prints flag VALUES (booleans, safe) and only SET/UNSET for secrets.
# Usage on the VPS:  sh packages/api/scripts/check-env-profile.sh
# Or from a laptop:  ssh <user>@<host> 'cd /opt/easecab && sh packages/api/scripts/check-env-profile.sh'

ENV_FILE="${1:-packages/api/.env}"
[ -f "$ENV_FILE" ] || { echo "no env file at $ENV_FILE"; exit 1; }

get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

echo "env file: $ENV_FILE"
echo
echo "--- profile ---"
for v in NODE_ENV COOKIE_SECURE; do
  printf '%-18s %s\n' "$v" "$(get "$v" || echo '(unset)')"
done

echo
echo "--- stub flags (true = FAKE, not talking to the vendor) ---"
for v in CASHFREE_STUB SUREPASS_STUB R2_STUB; do
  val=$(get "$v")
  [ -z "$val" ] && val='(unset -> false)'
  printf '%-18s %s\n' "$v" "$val"
done

echo
echo "--- credentials present? (value never printed) ---"
for v in CASHFREE_ENV CASHFREE_APP_ID CASHFREE_SECRET_KEY \
         SUREPASS_TOKEN R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY \
         FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY; do
  val=$(get "$v")
  if [ -z "$val" ]; then
    printf '%-26s UNSET\n' "$v"
  else
    printf '%-26s set (%s chars)\n' "$v" "$(printf '%s' "$val" | wc -c | tr -d ' ')"
  fi
done

echo
echo "--- running processes ---"
pm2 list 2>/dev/null | grep -E 'name|easecab|api|web|admin|cron|bot' || echo '(pm2 not on PATH)'
