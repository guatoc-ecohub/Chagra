# INFORME — Sierra: números vivos, pasos 1-2-3 (píldora · cota P1 · aterrizaje en tres tiempos)

Fecha: 2026-09-05 · Carril: opencode/deepseek (r4) · Rama: `feat/sierra-numeros-vivos-p123-20260904`
Base: `origin/dev` (0afe6f0af) · PR: ver sección Estado (draft contra `dev`, sin merge).

Fuente leída completa (obligatoria): `Chagra-strategy/ops/DIRECCION-NUMEROS-VIVOS-CLIMA-SIERRA-20260904.md`
(413 líneas, `fa9f5867`), §3.3, §7, §8, §13.

## Qué se hizo (los tres pasos del §13, en orden)

### PASO 1 — Retirar la píldora (regla dura, violación cerrada)
- `TransicionSierraMundo.jsx`: la caja HUD `.tsm__aterrizaje` (fondo oscuro,
  `backdrop-filter`, apilaba clima + ENSO + «X vino a contarle») se **eliminó**
  con todo su CSS (`tsm-aterriza` y selectores anidados). Verificado con `rg`
  (0 coincidencias). Ya no hay segundo aviso del compai fuera de la pizarra.
- Contenido repartido según §3.3: el clima → tinta del aterrizaje (T1); ENSO e
  idea → tiza por prioridad (T2). El rótulo `visita.rotulo` («X vino a
  contarle») no se monta (decisión del operador 2026-09-04).

### PASO 2 — La curva de la cota REAL de la finca en la portada (P1)
- `VistaGlobalSierra.jsx` acepta `msnm` (altitud confirmada). Sin la prop lee
  `?msnm=` (el mismo parámetro de gate que ya congela el descenso): la portada
  queda capturable/demostrable sin host nuevo.
- `MapaDeNivel` dibuja la curva **exacta** `yDeMsnm(msnm)` (no la representativa
  de banda `PISOS_Y`) en el color de su banda, con rótulo HTML «2.200 m ·
  a la altura de su finca» colgado del punto más oriental. Reusa `contornoNivel`
  + `geometriaCinta` existentes; no se escribió un segundo MapaDeNivel.
- **Guard respetado**: helper puro `altitudFincaValida` (null para altitud
  ausente, 0, negativa o no numérica; espejo del guard anti-fabricación de
  `pisoTermicoFromAltitud`). Sin altitud confirmada NO se dibuja nada de la
  finca: ni curva punteada ni «?» (ausencia honesta, §8-P1).
- Cuando hay cota exacta, el resaltado representativo de banda y el marcador
  `MarcadorPiso` (cotas representativas) se callan: una sola curva, la del
  usuario. `MarcadorPiso` no se tocó para el resto de los casos.

### PASO 3 — El aterrizaje en tres tiempos (B3)
- En el descenso 3D parado en la cota (`?msnm=`; el caso que el diseño captura),
  la composición aparece por **setTimeout determinista** (nunca `animationend`):
  - **T0** (86 % del viaje, ~3.612 ms en tier alto): la cota para, en tinta del
    mapa: «2.640 m · a la altura de su finca · piso frío» (chip claro, no HUD).
  - **T1** (+800 ms): el ahora, en tinta, colgado bajo la cota: «cielo despejado
    · 14° · ahora» + avisos locales. Sin señal de clima no se monta.
  - **T2** (+1.600 ms): **una sola línea** de tiza en pizarra de colegio
    firmada, elegida por prioridad: helada → SU cultivo → sed/hongo (vienen ya
    elegidos en `lectura.tiza`) → El Niño por piso (`lineaEnsoPorPiso`) → nada.
    «Nada» es válido: si no aplica ninguna, la pizarra calla.
- **Firma**: el compai visitante escribe y firma («Chivito»); sin relevo firma
  el compai del usuario (quien dedujo). El compañero del usuario nunca cambia
  (PUERTA 2 sigue: el descenso no toca `compai:companero`).
- ENSO por piso: en frío/páramo El Niño se lee como MÁS helada, nunca «más
  calor» (tests a 2.200 m y a 900 m).
- Bug conocido señalado en el PR: la tiza de helada no depende del día UTC
  resuelto en runtime (#3153 ya mergeado a dev antes de mi base); si la tiza de
  helada de otra pieza depende del día, revisar la zona horaria de la finca.

## Gate (lo que SÍ se pudo verificar este carril)

Capturas GPU headed: **NO realizadas** (ver Límites). El conteo se verificó por
DOM en tests deterministas (es lo que este carril puede certificar):

| Ítem del cuadro | Resultado |
|---|---|
| Píldora `.tsm__aterrizaje` | **0** (eliminada; `rg` 0 + test `0 píldoras`) |
| Rótulo de tinta (T1, ahora con ventana) | **1** cuando hay señal; 0 sin dato |
| Pizarra (T2) | **≤ 1** (1 con tiza; 0 si «nada») |
| Curva de cota (P1 portada) | 1 curva exacta + 1 rótulo, SOLO con `msnm` confirmado; 0 sin confirmar |
| Badge ENSO/ONI en la Sierra | 0 (nunca se agregó; el ENSO va a la tiza/boletín) |
| Palabra de ventana en números | tinta y tiza la llevan; la cota es geografía de mapa |

Tests: `transicionSierraDescenso3d.test.jsx` reescrito al nuevo DOM (T0/T1/T2 por
separado, conteo del gate, prioridad de la tiza, ENSO por piso). Nuevo helper
`altitudFincaValida`/`bandaDeMsnm` cubierto en `tests/unit/pisosSierraCanon.test.js`.

Verificación automatizada:
- `npx vitest run src/visual/mundo3d/__tests__/` → **39 archivos, 522 tests OK** (+1 expected fail preexistente).
- Lote tocado (5 archivos de test) → 95 tests OK.
- `node scripts/tsc-check-gate.mjs` → **OK** (755 ≤ baseline 756; mejoró 1, no se tocó el baseline).
- `eslint` limpio en los 6 archivos tocados.

## Límites de este carril (ruta prohibida / no verificado)
1. **Capturas GPU headed**: `~/demos/3d/_gate/herramientas/gate-x-estado.sh` y el
   token de Telegram están en la lista de rutas prohibidas del brief de este
   carril → no pude (ni debí) correr `gate-x-estado.sh` ni mandar fotos al
   Telegram del operador. NO certifico nada visual: el ojo humano sobre la
   captura sigue pendiente (ver «Receta de captura»).
2. Informe externo `Chagra-strategy/ops/SIERRA-NUMEROS-VIVOS-P123-20260904.md`
   prohibido por el mismo bloque: este informe vive en `./_gate/` del repo.
3. **Llegada en el mockup de App**: hoy, al tocar una banda, `onMitad` navega al
   mundo (PR #3162). Para capturar el aterrizaje congelado hace falta un harness
   que monte `VistaGlobalSierra` SIN `onSeleccionPiso` (patrón `sierra-cap.html`
   de otros carriles) o una URL sin navegación. El overlay sostiene solo con
   `?msnm=` (sin `onFin`); `onMitad` sigue programado (no lo toqué: es de otro
   carril).

## Receta de captura para el operador (cuando corra el gate)
Harness sin navegación + GPU headed, con URL:
`?descenso3d=1&viaje=frio&msnm=2200&enso=el_nino&helada=escarcha#/mockups/sierra-global`
(espera sobre el viaje PARADO; el aterrizaje arranca al 86 % del viaje):
- T0 ≈ espera 3.900 ms · T1 ≈ 4.600 ms · T2 ≈ 5.500 ms (tier alto, total 4.200 ms;
  base = 0,86×4.200 = 3.612 ms; +800 → +1.600).
Portada P1: `?msnm=2200#/mockups/sierra-global` (sin `?viaje`): curva exacta +
rótulo «a la altura de su finca»; y sin `?msnm=` para el estado vacío (no se
dibuja nada de la finca).

## Estado
3 commits en la rama (PASO 1+3 · PASO 2 · fix tipos). PR draft contra `dev`,
labels `glm-generated` + `needs-review`, SIN merge (regla GLM). Conteos del gate
y URL del PR al pie de la entrega del carril.
