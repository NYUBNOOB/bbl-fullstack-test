#!/usr/bin/env bash
#
# verify-privacy.sh — proves the core privacy invariant from CLAUDE.md §1:
#
#   "User A MUST NOT be able to view, edit, or even acknowledge the existence
#    of User B's data under any circumstances."
#
# It runs the adversarial half of backend/test/security.e2e-spec.ts, in which
# an authenticated User A actively attempts to read, mutate, delete and link
# to User B's records over real HTTP against the real AppModule.
#
# WHY THIS SCRIPT EXISTS RATHER THAN `npm run test:e2e`:
#
#   1. A green test run is NOT proof if the adversarial tests silently stopped
#      existing. A rename, a stray `.skip`, or a bad merge would make the suite
#      pass while proving nothing. This script fails when fewer than
#      MIN_ADVERSARIAL adversarial assertions actually EXECUTED.
#   2. The e2e suite writes to whatever DATABASE_URL points at, and the repo
#      default is the checked-in prisma/dev.db. This script redirects it to a
#      throwaway database so verification never mutates working data.
#
# USAGE
#   ./.agent/verify-privacy.sh            # adversarial verification (default)
#   ./.agent/verify-privacy.sh --full     # every test in the security suite
#   ./.agent/verify-privacy.sh --keep-db  # leave the scratch DB for inspection
#
# EXIT CODES
#   0  invariant holds — every adversarial attempt was rejected
#   1  invariant VIOLATED, or too few adversarial tests ran to prove anything
#   2  environment problem (missing deps, Prisma client not generated, …)

set -euo pipefail

# ── Locate the repo regardless of where the script was invoked from ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

# ── Options ────────────────────────────────────────────────────────────────
FULL_SUITE=0
KEEP_DB=0
for arg in "$@"; do
  case "$arg" in
    --full)    FULL_SUITE=1 ;;
    --keep-db) KEEP_DB=1 ;;
    -h|--help) sed -n '2,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# The number of adversarial assertions that MUST run. Raise this when you add
# more; never lower it to make a red build go green — a drop means coverage of
# the invariant was removed.
MIN_ADVERSARIAL="${MIN_ADVERSARIAL:-13}"

# ── Pretty output (degrades to plain text when not a TTY, e.g. in CI) ───────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; DIM=""; OFF=""
fi

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$OFF"; }
fail()    { printf '%s✗ %s%s\n' "$RED" "$1" "$OFF" >&2; }
ok()      { printf '%s✓ %s%s\n' "$GREEN" "$1" "$OFF"; }
warn()    { printf '%s! %s%s\n' "$YELLOW" "$1" "$OFF"; }

section "🔒 Privacy invariant verification"
printf '%srepo: %s%s\n' "$DIM" "$REPO_ROOT" "$OFF"

# ── Preflight ──────────────────────────────────────────────────────────────
section "1/4  Preflight"

command -v node >/dev/null 2>&1 || { fail "node is not on PATH"; exit 2; }
[ -d "$BACKEND_DIR" ] || { fail "backend/ not found at ${BACKEND_DIR}"; exit 2; }

cd "$BACKEND_DIR"

if [ ! -d node_modules ]; then
  fail "backend/node_modules missing — run 'npm ci' in backend/ first"
  exit 2
fi

if [ ! -d node_modules/.prisma/client ]; then
  warn "Prisma client not generated — running prisma generate"
  npx prisma generate >/dev/null || { fail "prisma generate failed"; exit 2; }
fi

ok "node $(node --version), backend deps present"

# ── Isolated database ──────────────────────────────────────────────────────
# Relative to prisma/schema.prisma, which is how Prisma resolves `file:` URLs.
# Keeping it relative (not absolute) avoids the Git-Bash-vs-Windows path
# translation problem on this platform.
section "2/4  Provisioning a throwaway database"

SCRATCH_DB_REL="./verify-privacy.tmp.db"
SCRATCH_DB_ABS="${BACKEND_DIR}/prisma/verify-privacy.tmp.db"

cleanup() {
  if [ "$KEEP_DB" -eq 0 ]; then
    rm -f "$SCRATCH_DB_ABS" "${SCRATCH_DB_ABS}-journal" "$JSON_OUT" 2>/dev/null || true
  else
    printf '%skept: %s%s\n' "$DIM" "$SCRATCH_DB_ABS" "$OFF"
  fi
}
JSON_OUT="$(mktemp -t verify-privacy-XXXXXX.json)"
trap cleanup EXIT

rm -f "$SCRATCH_DB_ABS"

# Exported env beats values in .env — dotenv never overwrites what is already
# set — so this reliably redirects the suite away from the committed dev.db.
export DATABASE_URL="file:${SCRATCH_DB_REL}"

# The guard's config loader fails closed when these are absent. The security
# suite overrides AUTH_CONFIG with a local test tenant anyway, so any
# syntactically valid values work; these defaults just let the script run on a
# CI box that has no .env at all.
export AUTH0_ISSUER_URL="${AUTH0_ISSUER_URL:-https://verify-privacy.us.auth0.com/}"
export AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-https://verify-privacy/api}"

npx prisma db push --skip-generate --accept-data-loss >/dev/null 2>&1 \
  || { fail "could not create the scratch database"; exit 2; }

ok "empty schema pushed to prisma/${SCRATCH_DB_REL#./}"

# ── Run the suite ──────────────────────────────────────────────────────────
section "3/4  Running adversarial tests"

JEST_ARGS=(
  --config ./test/jest-e2e.json
  --runTestsByPath test/security.e2e-spec.ts
  --json --outputFile "$JSON_OUT"
)

if [ "$FULL_SUITE" -eq 0 ]; then
  # Restricts execution to the two "Adversarial Security Tests" describe
  # blocks. The count assertion below is what makes this safe: if the filter
  # ever stops matching, we fail rather than report a vacuous pass.
  JEST_ARGS+=(--testNamePattern "Adversarial")
fi

set +e
npx jest "${JEST_ARGS[@]}"
JEST_EXIT=$?
set -e

# ── Verdict ────────────────────────────────────────────────────────────────
section "4/4  Verdict"

if [ ! -s "$JSON_OUT" ]; then
  fail "jest produced no machine-readable report — cannot verify anything"
  exit 1
fi

# Deliberately a separate assertion pass rather than trusting jest's exit
# code: exit 0 also means "ran nothing", which must NOT count as proof.
node -e '
const fs = require("fs");
const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const minAdversarial = Number(process.argv[2]);
// Only meaningful on a --full run. Under --testNamePattern every test outside
// the filter is reported as pending too, which is expected, not a red flag.
const strictSkip = process.argv[3] === "1";

const all = [];
for (const suite of report.testResults || []) {
  for (const t of suite.assertionResults || []) all.push(t);
}

const executed = all.filter((t) => t.status === "passed" || t.status === "failed");
const adversarial = executed.filter((t) => /adversarial/i.test(t.fullName));
const failed = all.filter((t) => t.status === "failed");
const skipped = all.filter((t) => t.status === "pending" || t.status === "todo");

for (const t of adversarial) {
  const mark = t.status === "passed" ? "  ok  " : "  FAIL";
  console.log(mark + "  " + t.title);
}

console.log("");
console.log("adversarial attempts rejected : " + adversarial.filter((t) => t.status === "passed").length + "/" + adversarial.length);
console.log("total assertions executed     : " + executed.length);
if (skipped.length) {
  const label = strictSkip ? "skipped" : "filtered out by name pattern";
  console.log(label.padEnd(30) + ": " + skipped.length);
}

let problems = 0;

if (failed.length) {
  console.error("");
  console.error("PRIVACY INVARIANT VIOLATED — " + failed.length + " test(s) failed:");
  for (const t of failed) console.error("  - " + t.fullName);
  problems++;
}

if (adversarial.length < minAdversarial) {
  console.error("");
  console.error("INCONCLUSIVE — only " + adversarial.length + " adversarial test(s) ran, expected at least " + minAdversarial + ".");
  console.error("A pass here would prove nothing. Someone removed, renamed or skipped coverage of the invariant.");
  problems++;
}

if (strictSkip && skipped.length) {
  console.error("");
  console.error("INCONCLUSIVE — " + skipped.length + " test(s) were skipped. Remove .skip before trusting this run.");
  problems++;
}

process.exit(problems ? 1 : 0);
' "$JSON_OUT" "$MIN_ADVERSARIAL" "$FULL_SUITE"
NODE_EXIT=$?

if [ "$NODE_EXIT" -ne 0 ] || [ "$JEST_EXIT" -ne 0 ]; then
  printf '\n%s%s✗ PRIVACY INVARIANT NOT PROVEN%s\n' "$BOLD" "$RED" "$OFF"
  exit 1
fi

printf '\n%s%s✓ PRIVACY INVARIANT HOLDS%s\n' "$BOLD" "$GREEN" "$OFF"
printf '%sUser A was denied read, update, delete and cross-owner linking against User B on every attempt.%s\n' "$DIM" "$OFF"
exit 0
