# Módulo AGUA — diagnóstico + calculadora de captación

> Fuente: DR-AGUA-1 (3/3 DeepSeek+Gemini+Meta, 2026-06-11). IDEAM, AGROSAVIA, CIPAV, FAO, SENA, Cenicafe, CORPOICA, CIAT.

## Datos

`src/data/water-diagnostics.json`: 4 fuentes de agua, 6 sistemas de captación con Ce, 5 regiones IDEAM, 5 sistemas de riego con eficiencia, 6 prácticas de conservación, 7 cultivos con Kc, acciones ENSO, 3 MITOS excluidos (lunar, radiestesia, hidrogel), 9 señales de voz.

## Servicio

`src/services/waterDiagnostic.js`:
- `calcularCaptacion(area, lluvia, ce, eta=0.85)` → Vc = A × lluvia × Ce × η
- `diagnosticarAgua(descripcion, opts)` → árbol: señal voz→captación→riego→conservación→ENSO
- `formatearGroundingAgua(d)` → bloque para el agente

## Guardas

- Marchitez de mediodía ≠ necesita riego (prueba del puñado)
- Regar en la mañana/madrugada
- Primer-flush (1L/m²) + tapa anti-zancudo

## Wire al agente

`knowledgeIntentRouter.hasWaterDiagnosticIntent()` → AgentScreen inyecta al grounding.
