# Cómo agregar un módulo nuevo a Chagra

## Paso a paso

1. **Leer el DR consolidado** en `/tmp/DR-<TEMA>-consolidado.md`. Solo datos con fuente.
2. **Crear archivo de datos** `src/data/<modulo>.json`:
   - Cada entrada sustantiva debe tener `fuente`.
   - Seguir el patrón de `soil-diagnostics.json` o `water-diagnostics.json`.
3. **Crear servicio** `src/services/<modulo>Diagnostic.js`:
   - `diagnosticar<Modulo>(descripcion)` — árbol de decisión puro
   - `formatearGrounding<Modulo>(diagnostico)` — texto para el agente
   - Guardas de seguridad en `advertencias` del retorno
   - Degradación: `sin_datos: true` si no hay match
4. **Crear tests** `src/services/__tests__/<modulo>Diagnostic.test.js`:
   - Señal de voz → diagnóstico correcto
   - Guardas activas se disparan
   - Sin datos → no inventa
5. **Wirear al agente** en 2 archivos:
   - `src/services/knowledgeIntentRouter.js`: agregar `has<Modulo>DiagnosticIntent()` con regex
   - `src/components/AgentScreen/AgentScreen.jsx`: agregar bloque en el ciclo de diagnóstico (carga dinámica)
6. **Registrar en docs**:
   - `docs/MODULOS.md`: agregar a la tabla
   - `docs/GUARDAS.md`: documentar las guardas del módulo

## Patrón de datos

```json
{
  "fuente": "DR-XXX-1 (validacion 3/3 LLMs, fecha)",
  "referencias": ["fuente1", "fuente2"],
  "datos": [...]
}
```

## Check anti-fabricación

`src/data/__tests__/dataSchema.fuente.test.js` verifica que cada JSON tenga `fuente` no vacía.
Si el test falla → el PR no mergea.
