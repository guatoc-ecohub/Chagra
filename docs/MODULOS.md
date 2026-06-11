# Arquitectura de módulos DR (suelo/agua/animal/restauración)

## Patrón

Cada módulo sigue el mismo patrón de 3 capas:

```
src/data/<modulo>.json     →  Datos curados del DR (fuente verificable)
src/services/<modulo>Diagnostic.js → Servicio de diagnóstico (funciones puras)
src/services/__tests__/<modulo>Diagnostic.test.js → Tests unitarios
```

Y se conecta al agente via:

```
src/services/knowledgeIntentRouter.js → hasSoilDiagnosticIntent(), etc.
src/components/AgentScreen/AgentScreen.jsx → inyección al grounding
```

## Cómo agregar un módulo nuevo

1. **Datos**: crear `src/data/<modulo>.json` con los datos del DR. Cada entrada debe tener `fuente`.
2. **Servicio**: crear `src/services/<modulo>Diagnostic.js` con:
   - `diagnosticar<Modulo>(descripcion)` — árbol de decisión
   - `formatearGrounding<Modulo>(diagnostico)` — texto para el agente
   - Guardas de seguridad en el retorno
3. **Tests**: TDD con vitest. Cubrir: señales de voz→diagnóstico, guardas activas, sin datos→no inventa.
4. **Wire al agente**: 
   - Agregar regex en `knowledgeIntentRouter.js`
   - Agregar bloque en `AgentScreen.jsx` (carga dinámica del módulo)
5. Degradación: `sin_datos: true` → no inyectar al grounding. try/catch → seguir.

## Dónde van las guardas

- **En el JSON de datos**: como campo `guarda` o `precaucion` en cada entrada
- **En el servicio**: como parte del retorno del diagnóstico (`advertencias`)
- **En el grounding**: `formatearGrounding` las incluye bajo `**GUARDAS:**`

NUNCA se deben silenciar. El agente DEBE advertir sobre mitos y riesgos.

## Módulos existentes

| Módulo | Data file | Service | Intent |
|---|---|---|---|
| Suelo | soil-diagnostics.json | soilDiagnostic.js | hasSoilDiagnosticIntent |
| Agua | water-diagnostics.json | waterDiagnostic.js | hasWaterDiagnosticIntent |
| Animal | animal-diagnostics.json | animalDiagnostic.js | hasAnimalDiagnosticIntent |
| Restauración | restauracion.json | restauracionDiagnostic.js | hasRestauracionDiagnosticIntent |

## Fuentes

Todos los datos provienen de los DR consolidados (3/3 LLMs, 2026-06-11):
- DR-SUELOS-1: IGAC, AGROSAVIA, CIPAV, FAO, USDA-NRCS, CENICAFÉ
- DR-AGUA-1: IDEAM, AGROSAVIA, CIPAV, FAO, SENA
- DR-ANIMAL-1: ICA, AGROSAVIA/Corpoica, CIPAV, FEDEGÁN, Fenavi
- DR-RESTAURACION-1: IAvH, MinAmbiente, Ley 1930/2018, UICN

CERO invención: cada dato tiene fuente verificable en el consolidado.
