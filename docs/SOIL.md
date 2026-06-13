# Módulo SUELO — diagnóstico sin laboratorio

> Fuente: DR-SUELOS-1 (3/3 DeepSeek+Gemini+Meta, 2026-06-11). IGAC, AGROSAVIA, CIPAV, FAO, USDA-NRCS, CENICAFÉ.

## Datos

`src/data/soil-diagnostics.json`: 10 pruebas caseras con confiabilidad (alta→mito), 10 bio-indicadores, 3 MITOS marcados, 6 tipos de suelo colombiano, 8 enmiendas con guarda, 21 señales de voz, 6 cultivos con rangos pH+textura+drenaje.

## Servicio

`src/services/soilDiagnostic.js`:
- `diagnosticarSuelo(descripcion)` → árbol: escuchar→voz→bio-indicadores→prueba→enmienda
- `formatearGroundingSuelo(diagnostico)` → bloque de texto para el agente
- Degradación: `sin_datos: true` si no hay match

## Guardas

- Vinagre/bicarbonato = MITO (no sirve para decidir dosis de cal)
- Cal solo si pH<5.5 confirmado (tiras o helecho marranero)
- NO sobre-encalar (pH>7 bloquea Fe/Zn)
- Ceniza JAMÁS en suelo alcalino
- Aguacate + mal drenaje = ALERTA CRÍTICA Phytophthora

## Wire al agente

`knowledgeIntentRouter.hasSoilDiagnosticIntent()` detecta con regex descripciones de terreno.
AgentScreen inyecta el diagnóstico al grounding cuando se detecta la intención.

## Tests

`src/services/__tests__/soilDiagnostic.test.js` — 24 tests: síntoma→diagnóstico, guardas activas, MITOS advertidos, aguacate crítico, degradación sin datos.
