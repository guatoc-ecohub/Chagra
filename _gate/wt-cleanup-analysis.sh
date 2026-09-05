#!/usr/bin/env bash
# Analisis read-only del inventario de worktrees para limpieza. v2
set -u
REPO=/home/kortux/Workspace/chagra
DEV=origin/dev
MAIN=origin/main
printf 'PATH\tREF\tREMOTE\tIN_DEV\tIN_MAIN\tDIRTY\tAGE_DAYS\tHEAD_ABBREV\tSUBJ\n'
mapfile -t WTS < <(git -C "$REPO" worktree list --porcelain | grep '^worktree ' | cut -d' ' -f2-)
for wt in "${WTS[@]}"; do
  ref=$(git -C "$REPO" worktree list --porcelain | awk -v p="$wt" '{if($0=="worktree "p){found=1;next} if(found&&/^branch /){print $2; exit} if(found&&/^detached/){print "detached"; exit}}')
  short=$(echo "$ref" | sed 's#refs/heads/##')
  h=$(git -C "$wt" rev-parse HEAD 2>/dev/null || true)
  if [ -z "$h" ]; then
    printf '%s\t%s\tERR\tERR\tERR\tERR\tERR\tERR\tERR\n' "$wt" "$short"
    continue
  fi
  if [ "$ref" = "detached" ]; then
    remote="DETACHED"
  elif git -C "$REPO" show-ref --verify --quiet "refs/remotes/origin/$short"; then
    remote="yes"
  else
    remote="NO"
  fi
  indev=NO; git -C "$REPO" merge-base --is-ancestor "$h" "$DEV" 2>/dev/null && indev=YES
  inmain=NO; git -C "$REPO" merge-base --is-ancestor "$h" "$MAIN" 2>/dev/null && inmain=YES
  dirty=$(git -C "$wt" status --porcelain 2>/dev/null | wc -l)
  cdate=$(git -C "$wt" show -s --format=%cs HEAD 2>/dev/null)
  agedays=$(( ( $(date +%s) - $(date -d "${cdate:-1970-01-01}" +%s) ) / 86400 ))
  abbrev=$(git -C "$wt" rev-parse --short HEAD 2>/dev/null)
  subj=$(git -C "$wt" log -1 --format='%s' 2>/dev/null | cut -c1-58)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$wt" "$short" "$remote" "$indev" "$inmain" "$dirty" "$agedays" "$abbrev" "$subj"
done
