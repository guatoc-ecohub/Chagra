# POC Apache AGE — KG sobre el catálogo Chagra

**Estado**: prueba de concepto documental (worktree `feat/apache-age-poc-2026-05-20`).
**Branch**: `feat/apache-age-poc-2026-05-20`.
**NO operacional** — ningún script de este POC ha corrido contra `postgres-farm` ni contra `farmOS` en producción.

---

## TL;DR

El catálogo Chagra (488 species + 19 biopreparados + 66 sources) tiene topología natural de grafo (compañerismo, antagonismo, biopreparados por etapa, sources por species). Las queries multi-hop sobre esta topología son donde **BM25 puro degrada y un grafo brilla**.

Este POC propone:

1. Migrar el container `postgres-farm` de la imagen oficial PG-15 alpine a `apache/age:PG15_latest` (que es PG15 con la extension AGE pre-compilada).
2. Crear una DB separada `chagra_kg` dentro del mismo cluster — el backend de farmOS sigue intacto en la DB `farmos`.
3. Cargar el corpus al grafo vía script importer determinista (`scripts/catalog-to-age.mjs`).
4. Exponer queries pre-compiladas a la PWA vía wrapper REST (`/api/graph/*`) con whitelist (NO Cypher arbitrario).

---

## Archivos del POC

| Archivo | Propósito |
|---|---|
| `scripts/catalog-to-age.mjs` | Importer Node ESM. Lee el seed JSON y emite SQL idempotente (`MERGE` Cypher envuelto en `cypher('chagra_kg', $$ ... $$)`). |
| `scripts/__tests__/catalog-to-age.test.mjs` | 42 assertions vitest. Verifica helpers + comportamiento end-to-end sobre fixture sintético y subset (10 species) del seed real. |
| `scripts/age-queries-example.sql` | 5 queries Cypher comentadas (single-hop, multi-hop simple, multi-hop complejo, cross-query SQL+Cypher, agregación). |
| `vitest.config.js` | Patch mínimo: incluye `scripts/__tests__/**/*.test.{js,mjs}` además de las rutas existentes. |
| `docs/POC_APACHE_AGE.md` | Este archivo. |

### Artefactos fuera del repo (vivos en `/tmp/` del nodo alpha, listos para que el operador los mueva donde quiera)

| Path | Propósito |
|---|---|
| `/tmp/postgres-farm-age-migration.nix` | Diff propuesto sobre `guatoc-nixos/modules/agriculture/postgres-farm.nix` para cambiar la imagen a `apache/age:PG15_latest`. Incluye nueva opción `enableAge` + hooks `ExecStartPost` para `CREATE DATABASE chagra_kg` + `CREATE EXTENSION age`. |
| `/tmp/age-kg-schema-2026-05-20.md` | Diseño detallado de nodos + relaciones del KG con cardinalidades esperadas + decisiones de modelado. |
| `/tmp/age-rest-wrapper-design-2026-05-20.md` | Diseño del wrapper REST `/api/graph/*` con whitelist de queries, validación de input, caching, rate limiting. Postergada implementación a fase 2. |

---

## Quickstart (en un entorno de prueba aislado, NO en postgres-farm real)

```bash
# 1. Validar el importer offline (sin tocar postgres).
node scripts/catalog-to-age.mjs --limit 10 --output /tmp/chagra-kg-test10.sql

# 2. Inspeccionar el SQL generado.
head -50 /tmp/chagra-kg-test10.sql

# 3. Correr los tests del importer.
npm run test:unit -- scripts/__tests__/catalog-to-age.test.mjs

# 4. (Solo cuando el operador autorice) — aplicar contra una DB con AGE:
psql -h localhost -p 5432 -U farmos -d chagra_kg -f /tmp/chagra-kg-test10.sql
```

---

## Hipótesis de impacto en tokens del LLM

| Tipo de query | BM25 actual (`ragRetriever.js`) | AGE Cypher esperado | Ahorro tokens LLM |
|---|---|---|---|
| Single-hop ("especies del templado") | 2.7 ms p95 — bien | ~3-5 ms — parecido | ~0% (BM25 ya gana) |
| Multi-hop simple ("templado + compatible") | El LLM tiene que razonar sobre top-k chunks de RAG → varios pases CoT | <30 ms — query directa | **~70-85%** |
| Multi-hop complejo ("triples guild design") | Casi imposible expresar — el LLM termina alucinando o pidiendo más context | <50 ms — pattern match nativo | **~85-95%** |
| Agregación ("top 10 hubs") | No-go en BM25 puro — el LLM tiene que contar manualmente | <40 ms — COUNT con ORDER BY | **~90%** |

(Cifras son estimaciones order-of-magnitude — fase 2 incluye bench real comparado contra `scripts/bench-rag-retrieve.mjs` existente.)

---

## Riesgos identificados

1. **AGE 1.5.x todavía es young**. El project tiene tracción pero menos que `pgvector`. Antes de promover a producción, validar:
   - Estabilidad en restarts del container postgres-farm.
   - Performance de queries que devuelven >1000 nodos (el cast a JSON puede ser pesado).
   - Compatibilidad de pg_dump con extensiones AGE (sí — pg_dump incluye CREATE EXTENSION).
2. **Costo de imagen base**: apache/age:PG15_latest es debian, no alpine → ~250MB vs ~80MB. Aceptable, pero notar para el log.
3. **Sin sops-nix todavía** (issue separado): `POSTGRES_PASSWORD=changeme` sigue en el .nix. NO migrar AGE sin antes resolver eso si va a producción.
4. **AMB-10 simetría**: el catálogo garantiza `species.companions[]` simétrico por CI. Pero el grafo AGE almacena pares dirigidos. Para preguntas simétricas usar `MATCH (a)-[:COMPATIBLE_WITH]-(b)` (sin flecha).

---

## Decisión pendiente del operador

1. **GO migration**: aplicar `/tmp/postgres-farm-age-migration.nix` → switch postgres-farm a apache/age.
2. **Backup pre-cutover**: confirmar último dump de `postgres-farm-backup.nix` (cada 4h) + snapshot ZFS explícito.
3. **Cargar corpus**: ejecutar el importer contra `chagra_kg` (DB nueva, NO `farmos`).
4. **Bench**: medir p95 de Q2/Q3/Q5 vs BM25 actual.

Hasta que esos pasos sean OK del operador, este POC queda exactamente como está: documentado, testeado offline, sin tocar producción.
