#!/usr/bin/env bash
set -o pipefail
/home/kortux/Workspace/chagra/node_modules/.bin/vitest run > .gate-local/vitest-full.log 2>&1
status=$?
printf '%s\n' "$status" > .gate-local/vitest-full.status
exit "$status"
