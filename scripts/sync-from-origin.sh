#!/usr/bin/env bash
# Sync the working tree from Cursor Origin into this GitHub repository.
# Requires a valid Origin session (CURSOR_AUTH_TOKEN or CURSOR_API_KEY on cloud agents).
set -euo pipefail

ORIGIN_REPO="${ORIGIN_REPO:-xzinfinite/haoma-mark-query}"
CLONE_DIR="${CLONE_DIR:-/tmp/haoma-origin-sync}"
TARGET_DIR="${TARGET_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

if ! command -v origin >/dev/null 2>&1; then
  echo "error: origin CLI not found" >&2
  exit 1
fi

if [[ -z "${CURSOR_AUTH_TOKEN:-}" && -z "${CURSOR_API_KEY:-}" ]]; then
  echo "error: set CURSOR_AUTH_TOKEN or CURSOR_API_KEY (Origin user/API credentials)." >&2
  echo "On Cursor Cloud Agents, the host normally injects CURSOR_AUTH_TOKEN when the run is tied to Origin." >&2
  exit 1
fi

origin auth status >/dev/null

rm -rf "${CLONE_DIR}"
origin repo clone "${ORIGIN_REPO}" "${CLONE_DIR}"

shopt -s dotglob
for item in "${CLONE_DIR}"/*; do
  base="$(basename "${item}")"
  case "${base}" in
    .git) continue ;;
  esac
  rm -rf "${TARGET_DIR}/${base}"
  cp -a "${item}" "${TARGET_DIR}/${base}"
done
shopt -u dotglob

echo "Synced Origin ${ORIGIN_REPO} into ${TARGET_DIR}"
echo "Review changes, then commit and push to GitHub."
