#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: scripts/chagra-shot-branch.sh <rama> <screen1> [screen2 ...]" >&2
  exit 2
fi

BRANCH="$1"
shift

ROOT="$(git rev-parse --show-toplevel)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/chagra-shot-branch-XXXXXX")"
OUT_ROOT="$ROOT/screenshots/chagra-shot/$(printf '%s' "$BRANCH" | tr '/ ' '__' | tr -cd '[:alnum:]_.-')"
MAIN_WORKTREE="$TMP_ROOT/main"
BRANCH_WORKTREE="$TMP_ROOT/branch"

cleanup() {
  if [ -L "$MAIN_WORKTREE/node_modules" ]; then rm "$MAIN_WORKTREE/node_modules"; fi
  if [ -L "$BRANCH_WORKTREE/node_modules" ]; then rm "$BRANCH_WORKTREE/node_modules"; fi
  git -C "$ROOT" worktree remove "$MAIN_WORKTREE" >/dev/null 2>&1 || rm -rf "$MAIN_WORKTREE"
  git -C "$ROOT" worktree remove "$BRANCH_WORKTREE" >/dev/null 2>&1 || rm -rf "$BRANCH_WORKTREE"
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

mkdir -p "$OUT_ROOT/before" "$OUT_ROOT/after"

git -C "$ROOT" fetch origin --prune
git -C "$ROOT" worktree add "$MAIN_WORKTREE" origin/main >/dev/null
BRANCH_REF="$(git -C "$ROOT" rev-parse --verify "$BRANCH" 2>/dev/null || true)"
if [ -z "$BRANCH_REF" ]; then
  git -C "$ROOT" fetch origin "$BRANCH:refs/remotes/origin/$BRANCH" >/dev/null
  BRANCH_REF="$(git -C "$ROOT" rev-parse --verify "origin/$BRANCH")"
fi
git -C "$ROOT" worktree add --detach "$BRANCH_WORKTREE" "$BRANCH_REF" >/dev/null

ln -s "$ROOT/node_modules" "$MAIN_WORKTREE/node_modules"
ln -s "$ROOT/node_modules" "$BRANCH_WORKTREE/node_modules"

join_screens=()
for item in "$@"; do
  IFS=',' read -r -a parts <<< "$item"
  for part in "${parts[@]}"; do
    if [ -n "$part" ]; then
      join_screens+=("$part")
    fi
  done
done

for screen in "${join_screens[@]}"; do
  before_out="$OUT_ROOT/before/$screen.png"
  after_out="$OUT_ROOT/after/$screen.png"

  (cd "$MAIN_WORKTREE" && node "$ROOT/scripts/chagra-shot.mjs" --branch main --screen "$screen" --out "$before_out")
  (cd "$BRANCH_WORKTREE" && node "$ROOT/scripts/chagra-shot.mjs" --branch "$BRANCH" --screen "$screen" --out "$after_out")
done

echo "Capturas listas en: $OUT_ROOT"
