# Resultado Caso 1(a)

Se añadió `src/services/agentComplexIngest.js`, un descompositor puro y determinista para el mensaje complejo del Caso 1. Reconoce el surco 12, 10 matas de tomate cherry, la fecha de siembra retroactiva de tres meses, tres cosechas, abono cada 15 días y los problemas trozador (plaga) y gota (enfermedad). Emite ocho operaciones ordenadas, todas marcadas para confirmación, la pregunta de tratamiento pendiente y un hook asíncrono para la sugerencia agroecológica.

También se añadió `src/services/__tests__/agentComplexIngest.test.js` con cobertura del Caso 1 completo, la no activación ante una intención simple, el orden de envío al executor y el hook de sugerencia.

Pruebas ejecutadas:

- `npm run test:unit -- agentComplexIngest` : 1 archivo, 4 pruebas en verde.
- `npx eslint --max-warnings=0 src/services/agentComplexIngest.js src/services/__tests__/agentComplexIngest.test.js` : en verde.

Pendiente de cablear en `AgentScreen`: consultar `decomposeComplexIngest()` antes de iniciar el sidecar, mostrar la confirmación de las operaciones y pasar `executeComplexIngest()` el adaptador de `actionExecutor` con los resolutores de lote y siembra. La sugerencia agroecológica queda intencionalmente fuera de esa ingesta, mediante `scheduleAgroecologicalSuggestion()`, para que un grafo o LLM la atienda en segundo plano sin bloquear el registro.
