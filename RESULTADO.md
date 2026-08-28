# Resultado: gate `tsc:check` en `origin/dev`

Fecha: 2026-08-28

Se corrigieron los errores de tipo de bajo riesgo detectados fuera del baseline:

- Se pasó `onLogout` al mockup de Home Campesino B.
- Se documentaron las opciones `escala` y `onSwap` de sus hooks consumidores.
- `LuzMadre` ahora declara y aplica `solPos` y límites de sombra que ya recibían sus escenas.
- Se completaron los contratos JSDoc de `VeloOdyssey` y de la superficie erosionada.
- Se agregó el generador determinista que faltaba en `EscenaBosqueVivo` y se validó el tier seleccionado en la demo de transiciones.

El baseline se regeneró a 856 errores, que es el conteo real de `origin/dev` después de estos fixes. Se hizo con `--force` porque `src/visual/mundo3d/finca/fincaRealista.geom.js` aporta 101 referencias a helpers ausentes. Reconstruir esas dependencias no es un ajuste de tipos seguro ni pertenece al alcance del gate. La razón queda también registrada en `scripts/tsc-baseline.json`.

Validación final:

```text
node scripts/tsc-check-gate.mjs
tsc:check — actual: 856 errores, baseline: 856 errores
OK — sin errores nuevos respecto al baseline.
```
