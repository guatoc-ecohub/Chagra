#!/usr/bin/env bash
# Auditoria v3 solo-lectura. Trabajo propio = commits de la rama no en dev ni en main (por patch-id).
set -u
REPO=/home/kortux/Workspace/chagra
MAIN=origin/main
DEV=origin/dev
mapfile -t WTS < <(git -C "$REPO" worktree list --porcelain | grep '^worktree ' | cut -d' ' -f2-)
printf 'BRANCH\tWT\tPROPIO_DEV_MAIN\tNOT_DEV\tNOT_MAIN\tTIPDIFF_VS_MAIN\tDIRTY\tLAST\tIN_MAIN\tIN_DEV\n'
for wt in "${WTS[@]}"; do
  ref=$(git -C "$REPO" worktree list --porcelain | awk -v p="$wt" '{if($0=="worktree "p){found=1;next} if(found&&/^branch /){print $2; exit} if(found&&/^detached/){print "detached"; exit}}')
  short=$(echo "$ref" | sed 's#refs/heads/##')
  h=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
  # commits propios: en rama, no en dev, no en main (patch-id)
  a=$(git -C "$wt" log --no-merges --cherry-pick --right-only --format=%H "$DEV...$h" 2>/dev/null)
  b=$(git -C "$wt" log --no-merges --cherry-pick --right-only --format=%H "$MAIN...$h" 2>/dev/null)
  prop=$(comm -12 <(echo "$a" | sort) <(echo "$b" | sort) | grep -c .)
  notdev=$(echo "$a" | grep -c .)
  notmain=$(echo "$b" | grep -c .)
  tipdiff=$(git -C "$wt" diff --name-only "$MAIN" "$h" 2>/dev/null | wc -l)
  dirty=$(git -C "$wt" status --porcelain 2>/dev/null | wc -l)
  last=$(git -C "$wt" log -1 --format='%h %cs %s' "$h" 2>/dev/null)
  inmain=NO; git -C "$wt" merge-base --is-ancestor "$h" "$MAIN" 2>/dev/null && inmain=YES
  indev=NO; git -C "$wt" merge-base --is-ancestor "$h" "$DEV" 2>/dev/null && indev=YES
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$short" "$wt" "$prop" "$notdev" "$notmain" "$tipdiff" "$dirty" "$last" "$inmain" "$indev"
done
