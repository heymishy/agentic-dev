#!/usr/bin/env bash
# =============================================================================
# bootstrap-new-repo.sh — Bootstrap a new repo with the skills pipeline
# =============================================================================
# A thin wrapper around install.sh. Clones the skills repo to a temp directory,
# runs the installer against your target repo, then cleans up.
#
# Usage (run from inside your already-cloned repo):
#   bash <(curl -fsSL https://raw.githubusercontent.com/heymishy/skills-repo/master/scripts/bootstrap-new-repo.sh)
#
# Or download and run:
#   curl -fsSL https://raw.githubusercontent.com/heymishy/skills-repo/master/scripts/bootstrap-new-repo.sh -o bootstrap-new-repo.sh
#   bash bootstrap-new-repo.sh [options]
#
# Options:
#   --target <path>             Target repo root (default: current directory)
#   --profile personal|work     Context profile (default: personal)
#   --upstream-strategy <mode>  none | remote | fork (default: none)
#                                 none   — one-time install, no sync remote
#                                 remote — add heymishy/skills-repo as skills-upstream
#                                 fork   — add org fork as skills-upstream (requires --upstream-url)
#   --upstream-url <url>        Required when --upstream-strategy fork
#   --overwrite                 Overwrite existing files
#
# Examples:
#   # Simplest — personal project, run from inside your repo:
#   bash <(curl -fsSL https://raw.githubusercontent.com/heymishy/skills-repo/master/scripts/bootstrap-new-repo.sh) \
#     --upstream-strategy remote
#
#   # Enterprise with org fork:
#   bash bootstrap-new-repo.sh --profile work \
#     --upstream-strategy fork \
#     --upstream-url "https://bitbucket.org/your-org/sdlc-skills.git"
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
TARGET_DIR="$(pwd)"
PROFILE="personal"
UPSTREAM_STRATEGY="none"
UPSTREAM_URL=""
OVERWRITE=""

# ── Colour helpers ────────────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[bootstrap]${RESET} $*"; }
success() { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*" >&2; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)            TARGET_DIR="$2"; shift 2 ;;
    --profile)           PROFILE="$2"; shift 2 ;;
    --upstream-strategy) UPSTREAM_STRATEGY="$2"; shift 2 ;;
    --upstream-url)      UPSTREAM_URL="$2"; shift 2 ;;
    --overwrite)         OVERWRITE="--overwrite"; shift ;;
    *) error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Clone skills repo to temp ─────────────────────────────────────────────────
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

info "Cloning heymishy/skills-repo to $TEMP_DIR ..."
git clone --depth 1 --quiet https://github.com/heymishy/skills-repo.git "$TEMP_DIR"
success "Cloned."

# ── Run installer ─────────────────────────────────────────────────────────────
info "Running installer (profile: $PROFILE, upstream: $UPSTREAM_STRATEGY) ..."

INSTALL_ARGS=(
  --target "$TARGET_DIR"
  --profile "$PROFILE"
  --upstream-strategy "$UPSTREAM_STRATEGY"
)
[[ -n "$UPSTREAM_URL" ]] && INSTALL_ARGS+=(--upstream-url "$UPSTREAM_URL")
[[ -n "$OVERWRITE"    ]] && INSTALL_ARGS+=("$OVERWRITE")

bash "$TEMP_DIR/scripts/install.sh" "${INSTALL_ARGS[@]}"

# trap handles cleanup
