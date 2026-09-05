#!/usr/bin/env bash
set -eu

CHANGED_FILES="${1:-.}"

if [ "$CHANGED_FILES" = "." ]; then
  find src -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.tsx" -o -name "*.ts" \) 2>/dev/null | head -20 > /tmp/files.txt
  CHANGED_FILES="/tmp/files.txt"
fi

echo "=== ESLint ===" >&2
had_error=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ -f "$f" ] && [[ "$f" =~ \.(jsx?|tsx?)$ ]] && [[ ! "$f" =~ \.d\.ts$ ]]; then
    echo "  $f" >&2
    npx eslint "$f" || had_error=1
  fi
done < "$CHANGED_FILES"
[ $had_error -eq 0 ] || exit 1

echo "=== vitest ===" >&2
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if [ -f "$f" ] && [[ "$f" =~ \.(jsx?|tsx?)$ ]]; then
    dir=$(dirname "$f")
    test_dir="$dir/__tests__"
    if [ -d "$test_dir" ]; then
      echo "  $test_dir" >&2
      npx vitest run "$test_dir" --reporter=verbose || exit 1
    fi
  fi
done < "$CHANGED_FILES"

exit 0
