# Inventario de guardas de seguridad

> Política: toda guarda DEBE tener un test que verifique que se dispara con su input. Una guarda sin test = guarda muerta.

## Módulo SUELO

| Guarda | Dónde | Test |
|---|---|---|
| Vinagre/bicarbonato = MITO | soilDiagnostic.js:advertencias | guardasSeguridad.integrator.test.js |
| Cal solo si pH<5.5 confirmado | soilDiagnostic.js:advertencias | guardasSeguridad.integrator.test.js |
| NO sobre-encalar (pH>7 bloquea Fe/Zn) | soilDiagnostic.js:advertencias | guardasSeguridad.integrator.test.js |
| Ceniza JAMÁS en suelo alcalino | soil-diagnostics.json:enmiendas | soilDiagnostic.test.js |
| Aguacate + mal drenaje = ALERTA CRÍTICA | soilDiagnostic.js | soilDiagnostic.test.js |

## Módulo AGUA

| Guarda | Dónde | Test |
|---|---|---|
| Marchitez mediodía ≠ necesita riego | waterDiagnostic.js:advertencias | waterDiagnostic.test.js |
| Regar en la mañana/madrugada | waterDiagnostic.js:advertencias | waterDiagnostic.test.js |
| Lunar = MITO | waterDiagnostic.js:advertencias | guardasSeguridad.integrator.test.js |
| Hidrogel sintético = NO AGROECOLÓGICO | waterDiagnostic.js:advertencias | guardasSeguridad.integrator.test.js |
| Primer-flush (1L/m²) + tapa anti-zancudo | waterDiagnostic.js:advertencias | waterDiagnostic.test.js |

## Módulo ANIMAL

| Guarda | Dónde | Test |
|---|---|---|
| Leucaena PROHIBIDA a monogástricos (cerdo/conejo/ave) | animalDiagnostic.js:getGuardas | guardasSeguridad.integrator.test.js |
| Leucaena PROHIBIDA a EQUINOS | animalDiagnostic.js:getGuardas | guardasSeguridad.integrator.test.js |
| Apis vs meliponas: pillaje → aislamiento | animalDiagnostic.js:getGuardas | animalDiagnostic.test.js |
| Estrés térmico mortal en aves/cerdos (>32°C) | animalDiagnostic.js:getGuardas | animalDiagnostic.test.js |
| Salvia/albahaca/granado ABORTIVOS en gestación | animal-diagnostics.json:guardas | animalDiagnostic.test.js |

## Módulo RESTAURACIÓN

| Guarda | Dónde | Test |
|---|---|---|
| Pino/eucalipto NO es restauración | restauracionDiagnostic.js:guardas | guardasSeguridad.integrator.test.js |
| Alerta BONOS DE CARBONO (trampa) | restauracionDiagnostic.js:alertas | guardasSeguridad.integrator.test.js |
| Páramo → restauración PASIVA + Ley 1930 | restauracionDiagnostic.js:alertas | guardasSeguridad.integrator.test.js |
| Retamo NO quemar (rebrota) | restauracionDiagnostic.js:alertas | restauracionDiagnostic.test.js |
| Densidad excesiva es MITO | restauracionDiagnostic.js:guardas | restauracionDiagnostic.test.js |

## Tests

`src/services/__tests__/guardasSeguridad.integrator.test.js` — 278 líneas, cada fila de GUARD_MATRIX afirma que una guarda SE DISPARA con su input y NO se dispara sin él.
