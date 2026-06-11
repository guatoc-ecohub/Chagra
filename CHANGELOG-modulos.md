# CHANGELOG — Módulos DR (junio 2026)

## 2026-06-11 — Lote inicial
- **Suelo**: soil-diagnostics.json + soilDiagnostic.js (DR-SUELOS-1, 3/3)
- **Agua**: water-diagnostics.json + waterDiagnostic.js + calculadora captación (DR-AGUA-1, 3/3)
- **Animal**: animal-diagnostics.json + animalDiagnostic.js + guardas Leucaena (DR-ANIMAL-1, 3/3)
- **Restauración**: restauracion.json + restauracionDiagnostic.js + especies (DR-RESTAURACION-1, 2/3)
- **Glosario**: 15 términos agroecológicos
- **PSA**: 4 modalidades + Decretos
- **Carbono**: 6 alertas de trampa
- **Biodiversidad**: 4 indicadores simples
- **IoT**: 5 data files + cost calculator + vale-la-pena
- **Social**: 4 data files + pre-filtro
- **Clima**: piso térmico + ENSO modulación
- **Sinónimos**: diccionario campesino 7 categorías
- **Especies restauración**: matriz 4 pisos × 3 roles

## Wire al agente
- 4 intenciones de diagnóstico (suelo/agua/animal/restauración) via knowledgeIntentRouter
- Guardas anti-mito afloran en respuesta del agente

## Fixes
- flattenDoc species_slug (#1431)
- describePhase campesino (bug 7)
- ENSO sin jerga técnica (bug 8)

## Docs
- MODULOS.md, GUARDAS.md, DRS.md, AGE-SCHEMA.md, CLIMA.md, IOT.md, RED-SOCIAL.md, ANTI-FABRICACION.md, COMO-AGREGAR-MODULO.md
