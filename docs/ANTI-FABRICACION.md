# Política anti-fabricación

## Regla de oro
**Dato con fuente verificable, o no va.** Todo dato en `src/data/*.json` DEBE tener una `fuente` que lo respalde. Los DRs consolidados (triple-validación 3 LLMs) son la fuente primaria para los módulos.

## Schema-check mecánico
`src/data/__tests__/dataSchema.fuente.test.js` verifica que cada entrada sustantiva en los JSON de datos tenga campo `fuente` no vacío. Si un dato no tiene fuente → el test falla → el PR no mergea.

## Qué hacer si un dato no tiene fuente
1. Buscar en el DR consolidado correspondiente
2. Si no está en el DR: buscar en AGROSAVIA, CIPAV, FAO, IDEAM
3. Si no está en ninguna fuente verificable: NO ingerirlo. Dejar un placeholder con nota "[sin fuente confiable]"
4. NUNCA inventar una fuente ni un dato

## Por qué existe
El riesgo de recomendar dosis inventadas o validar un mito (ej. vinagre para medir pH) es DAÑO REAL al campesino. Un modelo de IA puede alucinar datos con total confianza. La política anti-fabricación es el cortafuegos.
