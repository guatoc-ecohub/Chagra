#!/bin/bash
# Análisis rápido de PRs para encontrar issues triviales

echo "🔍 Análisis rápido de PRs con checks fallidos..."
echo ""

# Buscar PRs que fallen checks específicos
count=0

for pr in $(gh pr list --limit 50 --json number,mergeable --jq '.[] | select(.mergeable == "MERGEABLE") | .number'); do
  # Obtener checks que fallen
  failed_checks=$(gh pr checks $pr --json name,state --jq '.[] | select(.state == "FAILURE") | .name' 2>/dev/null)
  
  if [ -n "$failed_checks" ]; then
    title=$(gh pr view $pr --json title --jq '.title')
    
    # Verificar si hay checks triviales
    if echo "$failed_checks" | grep -qiE "eslint|lint|prettier|format"; then
      count=$((count + 1))
      echo "🎯 PR #$pr: $title"
      echo "   Branch: $(gh pr view $pr --json headRefName --jq '.headRefName')"
      echo "   Checks triviales:"
      echo "$failed_checks" | grep -iE "eslint|lint|prettier|format" | sed 's/^/     - /'
      echo ""
    fi
  fi
done

echo "📊 Total encontrados: $count PRs con checks triviales"

if [ $count -eq 0 ]; then
  echo ""
  echo "💡 No se encontraron PRs con fallos triviales de lint/formato."
  echo "   Los PRs actuales probablemente tienen fallos más sustantivos."
fi

exit $([ $count -gt 0 ] && echo 0 || echo 1)
