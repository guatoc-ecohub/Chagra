# Politica de bench/history

## Decision

Los archivos JSON en `bench/history/` **se versionan como evidencia** (parte del repositorio), no como artefactos locales.

## Justificacion

1. **Auditabilidad**: Cada bench run deja trazabilidad de que modelo se uso, con que config, y que resultados produjo. Sin esto, un reclamo de regresion no tiene linea base.
2. **CI gate**: El validador `scripts/validate-bench-history.mjs` corre en CI y falla si detecta inconsistencias (model/config mismatch).
3. **Tamaño controlado**: Cada archivo de history es <500B JSON. 50 runs = ~25KB. No es carga significativa para el repo.

## Exclusiones

- `bench/history/` SI se versiona (incluido en git)
- `bench/results/`, `bench/traces/`, `bench/models/` NO se versionan (artefactos grandes, >1MB)
- `node_modules/`, `dist/` NO se versionan (ya en gitignore)

## Formato esperado

Cada archivo en `bench/history/` debe seguir el patron:
```
{suite}__{model}__{ISO8601}.json
```
Ej: `borde-alucinacion__granite3.3-8b__2026-06-14T08-00-00-000Z.json`

Contenido minimo:
```json
{
  "suite": "borde-alucinacion",
  "model": "granite3.3:8b",
  "config": { "temperature": 0.3 },
  "timestamp": "2026-06-14T08:00:00.000Z",
  "summary": { "total": 25, "passed": 22, "score": 0.88 }
}
```

## Validacion

```bash
node scripts/validate-bench-history.mjs
```
