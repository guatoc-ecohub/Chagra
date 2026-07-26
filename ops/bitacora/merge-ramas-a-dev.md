# Bitácora — consolidación de ramas terminadas en `dev`

**Fecha**: 2026-07-26
**Operador**: "dale merge a todo lo que puedas ya"
**Destino**: `dev` (🔴 **NO** `main` — hay otro agente corriendo `dev`→`main`)
**Worktree de trabajo**: `/home/kortux/Workspace/wt-merge-a-dev`
**Rama de integración**: `integra/merge-a-dev-2026-07-26` (nace de `origin/dev` @ `3ef4954d`)
**Host**: `stg` (GPU real Vega 10 — requisito del gate visual)

---

## Paso 0 — Reconocimiento (hecho)

### Estado del repo al arrancar
- `/home/kortux/Workspace/chagra` estaba en `feat/compai-fuente-unica` @ `315e497d`.
- **WIP del operador**: el árbol principal estaba LIMPIO salvo un untracked:
  - `ops/DIAGNOSTICO-brecha-dev-main.md` (untracked, ajeno)
- `lugares.js` en `demos-src`: **no existe** bajo `/home/kortux/Workspace` — no hay riesgo de colarlo.
  Aun así: **rutas explícitas siempre, nunca `git add -A`**.
- 28 stashes preexistentes, 40+ worktrees, 1446 refs de rama. **No se borra nada.**

### Divergencia importante
`dev` local estaba **23 commits detrás** de `origin/dev`. Se trabaja sobre `origin/dev` @ `3ef4954d`,
no sobre el `dev` local rancio.

### Otro agente en curso (no tocar)
- `/home/kortux/Workspace/wt-integra-dev-main` → rama `integra/dev-a-main-2026-07-26` @ `389123d2`.
- Ya contiene **todo** `origin/dev` (0 commits detrás) y **37 adelante**.
- ⚠️ Consecuencia: lo que yo meta a `dev` **llega después** de que ese agente hiciera su fusión.
  **Tendrá que re-mergear `dev` para llevárselo.** Queda avisado en el reporte.

---

## Las ramas candidatas

| Rama | HEAD | Base | Commits sobre `origin/dev` |
|---|---|---|---|
| `feat/compai-fuente-unica` | `315e497d` | `4f146f42` (atrás de dev) | 6 |
| `fable/compai-gestos-entrada` | `63a0ba1f` | `3ef4954d` (= dev HEAD) | 2 |

### Solapamiento real entre las dos ramas
Solo **2 archivos**:
- `src/visual/agente/angelita-agente.css`
- `src/visual/agente/angelitaEstados.js`

Ahí vive la colisión del guiño ya declarada por el operador.

### Resolución de la colisión — decidida de antemano
🔴 **Gana el guiño de Fable** (ojo grande + ladeo cómplice; el `last-of-type` de la otra rama
usa el ojo lejano, que no se lee contra la cabeza oscura).
Y los **12 gestos de Fable deben quedar en el núcleo portable** `src/compai/nucleo/gestos.js`,
porque el refactor de fuente única es lo que corresponde conservar.

---

## Orden de merge elegido

1. `fable/compai-gestos-entrada` primero — nace exactamente de `dev` HEAD, entra limpio y
   deja el guiño BUENO como base establecida.
2. `feat/compai-fuente-unica` después — así cualquier conflicto en los 2 archivos compartidos
   se resuelve **a favor de lo que ya está** (Fable), que es justo lo que se quiere.
3. Portar los gestos de Fable al núcleo portable.

## Gates por merge
- `npx vitest run` verde
- `npx vite build` verde
- eslint **NO se corre** (~18 min) → `--no-verify`, `LEFTHOOK_EXCLUDE=eslint`
- Gate visual en **GPU real de stg**, nunca SwiftShader

---

## Registro de ejecución

_(se va llenando abajo)_

### [en curso] Paso 0 cerrado — bitácora commiteada antes de tocar nada
