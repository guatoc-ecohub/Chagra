# Informe Fase 1, compai elegido en 2D

Fecha: 2026-08-11
Rama: `feat/compai-fase1-2d-20260811`
Commit: `73a5a0ce9 fix(compai): use selected companion as sole 2d presence`
PR: https://github.com/guatoc-ecohub/Chagra/pull/2880

## Entregado

- `AgentFab` queda como única presencia global. `CompaiOverlay` ya no se monta junto a él.
- Transiciones, `GemeloValle2D` y la calma 2D usan `ChagraAgentAvatar`, que resuelve `useCompaiElegido()`.
- Las transiciones nombran al compai elegido en el texto visible.
- No se modificó fauna ambiental ni protagonistas de juegos.

## Medición visual autenticada

Se seleccionó `maiz` por las llaves canónica y heredada, se inició sesión con el fixture local y se navegó al calendario.

- Home: `HOME_MAIZ=1`, `HOME_OVERLAY=0`.
- Calendario: `CAL_MAIZ=1`, `CAL_FAB=1`, `CAL_OVERLAY=0`.
- La inspección visual lee la presencia como planta de maíz, no como abeja ni como adorno.
- Gate gráfico: `VIVO :0 /tmp/xauth_erqmAJ`.
- Chromium previo a captura: `0`.

Capturas:

- `home-maiz-autenticado.png`
- `calendario-maiz-autenticado.png`

## Verificación de código

```text
npx eslint [6 archivos modificados]              PASS
npx vite build                                   PASS
npx vitest run [suite dirigida]                  53 PASS, 1 fallo preexistente
npm run build                                    BLOQUEADO por better-sqlite3 nativo
```

El fallo preexistente es `navegacion.test.jsx`, donde el catálogo térmico esperaba `templado` y recibió `-`.
El build completo no llegó a Vite porque `better-sqlite3` falla con `undefined symbol` bajo Node 22.

Las herramientas `_gate` exigidas no estaban presentes en este worktree. Para no afirmar un verde inventado se usaron temporalmente las equivalentes existentes en `demos/3d/_gate`, con la pantalla viva y sin Chromium ajeno antes de capturar.

## Git

```text
73a5a0ce9 fix(compai): use selected companion as sole 2d presence
```

```text
 src/App.jsx                                 | 26 ++++++++++++--------------
 src/visual/agente/AgentePlanoTransicion.jsx | 20 +++++++++++++++++---
 src/visual/mundo3d/GemeloValle2D.jsx        |  6 ++++--
 src/visual/mundo3d/TransicionMundo.jsx      | 17 ++++++++++++++---
 src/visual/mundo3d/TransicionNewDonk.jsx    | 19 +++++++++++++++----
 src/visual/mundo3d/ValleEnCalma.jsx         | 11 +++++++++--
 6 files changed, 71 insertions(+), 28 deletions(-)
```

```text
(sin eliminaciones)
```
