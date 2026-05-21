# AI Review Gates

Cadena defense-in-depth para PRs en Chagra. Múltiples gates de validación
automática + humana. Documentación canónica del proceso.

---

## Gate 1 — CodeQL SAST (Required)

`.github/workflows/codeql.yml` — Security-focused static analysis. **Bloquea merge** si falla.

## Gate 2 — Playwright E2E (Required)

`.github/workflows/playwright.yml` — Tests offline-first contract en `tests/offline.spec.js`. **Bloquea merge** si falla.

## Gate 3 — Lefthook pre-commit (local)

`lefthook.yml` — Secret scan + infra-refs scan + strategic-content scan + ESLint + auto-bump-version + cycle-content validator + (nuevo) catalog-validator. Local dev.

## Gate 4 — Catalog Validate (Required cuando aplique)

`.github/workflows/catalog-validate.yml` — Corre `scripts/validate-catalog.mjs --lenient-schema --seed-mode` sobre PRs que tocan `catalog/`. AMB-05/10/11/13/14/15/16/17/18 checks. Bug PR #728 fue el trigger original.

## Gate 5 — LLM local review (**No bloqueante**)

`.github/workflows/llm-local-review.yml` — Review LLM on-host en alpha (self-hosted runner + Ollama qwen3-coder:7b). Diff NO sale del host. Comentario `🤖 Local LLM review` en el PR.

**Por qué no bloquea**:
- LLMs generan falsos positivos (~20-30%).
- Bloquear introduciría fricción de operador "ignorar" en cada PR.
- Mejor patrón: revisa, comenta, operador decide.

**Cómo silenciar un falso positivo**:
1. Operador lee el comentario.
2. Si el hallazgo es claramente FP, agregar label `llm-review-ignore` al PR (no implementado aún — manual decision por ahora).

**Cómo correr el equivalente local**:
```bash
git diff main..HEAD -- ':(exclude)*.lock' > /tmp/pr.diff
cat /tmp/pr.diff | ollama run qwen3-coder:7b "Revisa este diff contra ADR-019 + ADR-020"
```

**Soft-fail**: si Ollama caído o timeout 8min, job falla silencioso → merge sigue. Un healthcheck declarativo (config NixOS privado) avisa Telegram si Ollama down >10min.

## Gate 6 — OpenCode QA (planeado 2026-05-30)

Cuando se valide el SDK contract de OpenCode.

---

## Filosofía

> "Defense in depth" no significa "más gates"; significa **diversidad de
> failure modes**. CodeQL (regex-based SAST) ≠ Playwright (runtime) ≠
> LLM review (semantic). Cada gate atrapa lo que los otros no.

ADRs de referencia:
- `Chagra-strategy/deepresearch/operations/defense-in-depth-validation-chain.md`
- `Chagra-strategy/deepresearch/data-model/adr-019-asset-log-3-reglas-inviolables.md`
- `Chagra-strategy/deepresearch/architecture/ADR-020-anti-leak-content-boundary.md`
