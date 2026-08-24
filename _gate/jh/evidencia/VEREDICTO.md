# VEREDICTO — jaguar Humboldt vectorial (4 gates de cierre)

> 2026-08-21 · rama `fable/jaguar-humboldt-vector` (base `fable/marcha-zancada-cuphead`)
> Captura GPU-headed (chromium local, X `VIVO :0`), fases congeladas con Web Animations API
> (pause + currentTime — preserva delays entre patas). Juez VL = `judge-vl` qwen3-vl:8b local.
> Harness determinista: `jaguar-humboldt-gate.html` (`?pose=camina|celebra`, `?acecha=1`, mirausted simulado con el contrato DOM del hook).

## 1 · CAMINA — ✅
- Animaciones esperadas corriendo: `jaguar-paso-lado`, `jaguar-tronco-lado`, `jaguar-hombro-lado`, `jaguar-cola-lado`, `jaguar-cabeza-lado` (faltan: ninguna).
- Pata testigo `.jaguar-lado-dc` cambia entre fases congeladas: `rotate(-7.9°)` → `rotate(+8.4°) translateY(-30.4)`.
- Diff de píxeles fase A ↔ B (sharp, canal a canal, d>20): **7.9%**.
- Juez: **SI** — «se ve una pata levantada del suelo a mitad de paso» (`camina-fase-b.png`).

## 2 · LA CABEZA ROTA SIN CORTARSE — ✅ (instrumento objetivo)
- mirausted mueve la TESTA entera: `.jaguar-cabeza-mira` `none` → `matrix(1,0,0,1,0.935,-0.23)` (wrapper aditivo, patrón cabezaMira; acecho intacto debajo).
- **Conectividad cabeza↔cuerpo medida con sharp** (flood-fill 4-conexo figura-vs-fondo, umbral 140 — `conectividad.mjs`):
  - `cabeza-mira.png` → **CONECTADA**
  - `cabeza-acecha.png` (testa abajo, fase 50%) → **CONECTADA**
  - `cabeza-control-decapitada-dura.png` (translate 12,-9 forzado) → **SEPARADA** ✅ control del instrumento válido en la misma corrida.
- ⚠️ El juez VL se DESCARTÓ para este gate: falló su control positivo dos veces (dijo «unida/PEGADA» a la decapitación evidente, con dos encuadres distintos). Doctrina de la casa: la geometría se prueba con sharp, no con el juez.

## 3 · HUMBOLDT — ✅ (juez en 4 frentes binarios, recortes ≥4x)
- Anatomía (lámina completa): **SI** — felino cuadrúpedo completo de perfil.
- Rosetas (flanco 4x): **SI** — manchas oscuras alrededor de centro ocre con puntos adentro.
- Volumen (anca 4x): **VOLUMEN** — gradaciones que modelan el cuerpo. (A cuadro completo el juez lava los gradientes y dice «plano»: se juzga en recorte, doctrina del recorte ≥4x.)
- Detalle de cabeza (4x): **SI** — ojo con iris y pupila, nariz, bigotes, oreja y manchas.

## 4 · CUPHEAD / rubber-hose vivo — ✅
- Juez sobre `celebra` congelado en pleno brinco: **SI** — «caricatura clásica con ojos grandes brillantes, gesto alegre y brazos alzados».
- Squash&stretch SE LEE: diff entre dos fases congeladas del boil = **20.8%** (más antics/travieso intactos).

## Técnica
- 0 page errors / 0 request failures en todas las capturas.
- 26/26 tests de contrato del jaguar en verde (frugalidad intacta: `feDisplacementMap` solo con `lineBoil`; el grano de pelaje es feTurbulence compuesto en la silueta, sin displacement). Los 2 fallos de la suite creatures (Borugo/vidaEstados) son PREEXISTENTES en la base — verificado corriendo la misma suite en `fable-marcha-rubberhose` sin mis cambios.
- eslint --max-warnings=0 OK · `npm run build` OK.
- Gotcha documentado: el screenshot del ELEMENTO svg mocha bigotes/trufa (desbordan el viewBox con overflow visible) → clip de página inflado en `shot.mjs`/`gate-4.mjs`.
