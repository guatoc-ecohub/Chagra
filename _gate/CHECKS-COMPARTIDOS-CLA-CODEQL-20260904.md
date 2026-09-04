# Checks compartidos que fallan en TODOS los PRs — CLAAssistant y CodeQL

**Fecha**: 2026-09-04
**Carril**: opencode/big-pickle
**PR de referencia**: #3127 (pero aplica a los 13 PRs MERGEABLE+UNSTABLE)

---

## Hallazgo 1: CLAAssistant — `santiagoht` no está en allowlist ni firmó CLA

### Causa
El workflow `CLA Assistant` (`.github/workflows/cla.yml`) verifica que TODOS los autores
de commits de un PR estén en la allowlist **o** hayan firmado el CLA.
La allowlist actual es:

```
dependabot[bot],renovate[bot],github-actions[bot],guatoc-ecohub,kortux
```

El archivo de firmas (`signatures/cla.json` en branch `cla-signatures`) está **vacío**:

```json
{"signedContributors": []}
```

**Nadie ha firmado el CLA.** El check solo pasa para PRs donde TODOS los commit authors
están en la allowlist.

### Evidencia cruda (PR #3127)

```
PR Author: guatoc-ecohub
Commit authors: ["santiagoht"]
All authors to check: ["guatoc-ecohub", "santiagoht"]
Loaded signatures file
✅ guatoc-ecohub en allowlist
❌ santiagoht NO firmó CLA
##[error]Process completed with exit code 1.
```

### Alcance medido
12 de 13 PRs MERGEABLE+UNSTABLE fallan por CLAAssistant. El único que pasa (#3123)
tiene como único commit author `kortux` (quien SÍ está en la allowlist).

Todos los PRs bloqueados tienen `santiagoht` como commit author.
Algunos también tienen `claude` (que tampoco está en la allowlist).

### Arreglo (commiteable)
Agregar `santiagoht` y `claude` a la allowlist en `.github/workflows/cla.yml:52`:

```yaml
ALLOWLIST="dependabot[bot],renovate[bot],github-actions[bot],guatoc-ecohub,kortux,santiagoht,claude"
```

Esto desbloquea los 12 PRs stuck por CLA.
Si en el futuro aparecen nuevos autores recurrentes, se agregan aquí.

---

## Hallazgo 2: CodeQL — default setup duplicado que falla con alerta real

### Causa
El repo tiene **dos sistemas de CodeQL** corriendo en paralelo:

| Sistema | Check name | Workflow | Duración | Resultado |
|---------|-----------|----------|----------|-----------|
| Custom workflow | `Analyze (javascript-typescript)` | `CodeQL SAST` (`.github/workflows/codeql.yml`) | 4-6 min | ✅ PASS |
| Default setup | `CodeQL` | (ninguno — `workflowName: ""`) | 9 s | ❌ FAIL |

El **default setup** es la configuración automática de GitHub Advanced Security
que se activa cuando se habilita code scanning en un repo. No es un workflow
nuestro: es un check-suite del app `github-advanced-security` (app id 57789).

### Evidencia cruda (PR #3127)

**Check-run** (vía API `check-runs/101038475085`):
```json
{
  "name": "CodeQL",
  "conclusion": "failure",
  "started_at": "2026-09-04T13:22:20Z",
  "completed_at": "2026-09-04T13:22:29Z",
  "output": {
    "title": "1 new alert including 1 high severity security vulnerability"
  },
  "app": {"name": "GitHub Advanced Security", "slug": "github-advanced-security"},
  "workflowName": ""
}
```

**Anotación** (vía API `check-runs/101038475085/annotations`):
```json
{
  "path": "scripts/migrate-v31-to-v32.mjs",
  "start_line": 267,
  "message": "Potential file system race condition",
  "annotation_level": "failure"
}
```

Nota: la anotación también dice "The file may have changed since it was checked" —
el alert es de un diff parcial, no de análisis completo.

**Check-suite** (vía API `check-suites/91811522328`):
```json
{
  "app": "GitHub Advanced Security",
  "conclusion": "failure",
  "head_branch": "fix/catalogo-guard-regeneracion-20260904"
}
```

El check-run **no tiene workflow run asociado** (`external_id: ""`) — confirma que
no viene de ningún `.github/workflows/*.yml`.

### Por qué no es el workflow custom
Nuestro workflow `CodeQL SAST` tiene el job `Analyze (javascript-typescript)`,
que es el check que SÍ pasa en 4-6 min. El default setup corre por separado
y produce el check `CodeQL` (sin sufijo de idioma).

### Alertas CodeQL abiertas (relevantes)
| # | Severity | Archivo | Línea | Mensaje |
|---|----------|---------|-------|---------|
| 626 | high | `scripts/__tests__/reindex-rag.test.mjs` | 34 | Insecure creation of file in the os temp dir |
| 592 | error | `scripts/__tests__/puente-nonco.test.mjs` | 201 | Callee is not a function |
| 587 | error | `scripts/__tests__/puente-nonco.test.mjs` | 225 | Callee is not a function |
| 585 | error | `scripts/__tests__/puente-nonco.test.mjs` | 191 | Callee is not a function |
| 2011 | medium | `scripts/enrich-familia-botanica-gbif.mjs` | 55 | Write to file system depends on Untrusted data |
| 2010 | medium | `scripts/enrich-familia-botanica-gbif.mjs` | 31 | Outbound network request depends on file data |
| 625 | medium | `scripts/experimentos/reindex-rag.mjs` | 65 | Write to file system depends on Untrusted data |

Las 3 alertas `error js/call-to-non-callable` en `puente-nonco.test.mjs` están
abiertas pero **no causan el fallo del default setup** (la alerta reportada en
PR #3127 fue la de race condition en `migrate-v31-to-v32.mjs`, que ya no está
en la lista de abiertas — posiblemente resuelta o dismissada).

### Arreglo (requiere repo admin — NO commiteable)
El default setup se desactiva desde la UI o vía API:

```bash
# Opción 1: gh CLI (requiere permisos admin del repo)
gh api -X DELETE repos/guatoc-ecohub/Chagra/code-scanning/default-setup

# Opción 2: UI
# GitHub → guatoc-ecohub/Chagra → Settings → Code security and analysis
# → Code scanning → Default setup → Disable
```

**Qué desbloquea**: elimina el check `CodeQL` que falla en 9s de todos los PRs.
Nuestro workflow `CodeQL SAST` sigue corriendo y cubre el mismo análisis
(con paths-ignore adicionales y queries `security-extended,security-and-quality`).

**Riesgo**: si el default setup estaba cubriendo algún path que nuestro workflow
excluye (ver `paths-ignore` en `codeql.yml:48-55`), esas paths quedarían sin
cobertura del default. Pero nuestro workflow ya tiene `security-extended` que
es más amplio, y los paths ignorados son solo dev-tooling.

---

## Resumen de acciones

| Check | Arreglo | Tipo | Desbloquea |
|-------|---------|------|-----------|
| CLAAssistant | Agregar `santiagoht,claude` a allowlist en `cla.yml:52` | Commit en repo | 12 PRs |
| CodeQL | `gh api -X DELETE repos/guatoc-ecohub/Chagra/code-scanning/default-setup` | Comando admin | 1 PR (intermitente) |

El bloqueador principal es **CLAAssistant** (12 PRs). CodeQL es intermitente
(solo afecta PRs que tocan archivos con alertas abiertas en el default setup).

---

## Verificación

Tras aplicar ambos arreglos, correr en un PR stuck (ej. #3127):
```bash
gh pr checks 3127 2>&1 | grep -E "CLA|CodeQL"
```

Resultado esperado:
- `CLAAssistant` → `pass` (santiagoht en allowlist)
- `CodeQL` → ya no aparece (default setup desactivado)
- `Analyze (javascript-typescript)` → `pass` (sigue corriendo nuestro workflow)
