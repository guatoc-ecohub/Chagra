-- =============================================================================
-- scripts/age-queries-example.sql
--
-- 5 queries Cypher de ejemplo sobre el grafo `chagra_kg` que demuestran:
--   1. single-hop trivial (filtro por piso térmico)
--   2. multi-hop simple (compatibilidad dentro de un piso)
--   3. multi-hop complejo (triples compatibles entre sí)
--   4. cross-query SQL + Cypher (corpus × farmOS inventory si la DB se uniera)
--   5. agregación con ORDER BY (top compañeras del grafo)
--
-- Para ejecutar (cuando AGE esté instalado en postgres-farm y `chagra_kg`
-- haya sido poblado por scripts/catalog-to-age.mjs):
--
--     psql -h localhost -p 5432 -U farmos -d chagra_kg -f scripts/age-queries-example.sql
--
-- Estado POC: NO ejecutado contra postgres real. Validar primero en una DB
-- aparte con AGE habilitado.
-- =============================================================================

LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- -----------------------------------------------------------------------------
-- Q1. SINGLE-HOP — Especies del piso templado
-- -----------------------------------------------------------------------------
-- Patrón: filtro plano por un atributo categórico relacionado.
-- En BM25 actual esto es trivial; en SQL convencional requiere JOIN
-- `species_thermal_zones`. En Cypher: una sola línea declarativa.
-- Cost esperado AGE: <5 ms en 488 species (lookup directo por etiqueta + filter).
-- -----------------------------------------------------------------------------

SELECT * FROM cypher('chagra_kg', $$
  MATCH (sp:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'})
  RETURN sp.id AS species_id, sp.nombre_comun AS nombre, sp.categoria AS categoria
  ORDER BY sp.id
  LIMIT 50
$$) AS (species_id agtype, nombre agtype, categoria agtype);

-- -----------------------------------------------------------------------------
-- Q2. MULTI-HOP SIMPLE — Pares de especies del templado compatibles
-- -----------------------------------------------------------------------------
-- Patrón: dos especies que comparten piso térmico Y tienen arista de
-- compatibilidad. En SQL serían 3 JOINs (species × piso × companions);
-- en Cypher: 3 aristas pattern-matched en una sola query.
-- En BM25 actual NO se puede expresar — requiere razonamiento manual del LLM
-- sobre múltiples chunks RAG (consume tokens).
-- -----------------------------------------------------------------------------

SELECT * FROM cypher('chagra_kg', $$
  MATCH (a:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'}),
        (b:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'}),
        (a)-[:COMPATIBLE_WITH]->(b)
  WHERE a.id < b.id  -- dedup pares (a,b) vs (b,a)
  RETURN a.id AS a, b.id AS b
  ORDER BY a, b
  LIMIT 100
$$) AS (a agtype, b agtype);

-- -----------------------------------------------------------------------------
-- Q3. MULTI-HOP COMPLEJO — Triples compatibles entre sí del piso templado
-- -----------------------------------------------------------------------------
-- Patrón: triángulo de compatibilidad (las 3 especies son mutuamente
-- compañeras) Y todas comparten piso templado Y todas tienen rol crop.
-- Este es el caso "guild design" de permacultura: tres cultivos que se
-- llevan entre sí y caben en el mismo piso. En SQL puro: 6+ JOINs con
-- self-joins sobre la tabla companion. En Cypher: 6 patterns en 4 líneas.
-- -----------------------------------------------------------------------------

SELECT * FROM cypher('chagra_kg', $$
  MATCH (a:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'}),
        (b:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'}),
        (c:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'}),
        (a)-[:COMPATIBLE_WITH]-(b),
        (b)-[:COMPATIBLE_WITH]-(c),
        (a)-[:COMPATIBLE_WITH]-(c),
        (a)-[:HAS_ROLE]->(:RoleInGuild {id: 'crop'}),
        (b)-[:HAS_ROLE]->(:RoleInGuild {id: 'crop'}),
        (c)-[:HAS_ROLE]->(:RoleInGuild {id: 'crop'})
  WHERE a.id < b.id AND b.id < c.id
  RETURN a.id AS a, b.id AS b, c.id AS c
  ORDER BY a, b, c
  LIMIT 25
$$) AS (a agtype, b agtype, c agtype);

-- -----------------------------------------------------------------------------
-- Q4. CROSS-QUERY (corpus × farmOS inventory)
-- -----------------------------------------------------------------------------
-- Patrón: si la DB `farmos` y `chagra_kg` vivieran en el mismo cluster
-- postgres-farm (o vía FDW), se puede cruzar el grafo del corpus con el
-- inventario de assets del operador. Esto es el caso de uso real para el
-- "agente recomendador": "el operador tiene maíz y cebolla en su finca,
-- qué companions del corpus le faltan agregar".
--
-- Diseño postergado al wrapper REST. Acá demo del shape SQL:
-- -----------------------------------------------------------------------------

-- ⚠️ Esta query asume que existe un FDW `farmos_fdw` apuntando a la DB
-- farmos del cluster, o que ambas DBs viven en el mismo postgres y se puede
-- cross-database query via dblink. AGE NO permite todavía hacer JOIN nativo
-- entre cypher() y tablas relacionales en la misma query — el patrón
-- estándar es: ejecutar cypher() → CTE → JOIN contra tablas relacionales.

WITH companions_recomendados AS (
  SELECT
    (companion_id::text)::text AS companion_slug,
    (companion_nombre::text)::text AS companion_nombre
  FROM cypher('chagra_kg', $$
    MATCH (mine:Species)-[:COMPATIBLE_WITH]->(comp:Species)
    WHERE mine.id IN ['zea_mays', 'allium_cepa']   -- inventario del operador
      AND NOT comp.id IN ['zea_mays', 'allium_cepa']
    RETURN comp.id AS companion_id, comp.nombre_comun AS companion_nombre
  $$) AS (companion_id agtype, companion_nombre agtype)
)
SELECT companion_slug, companion_nombre
FROM companions_recomendados
ORDER BY companion_slug
LIMIT 25;
-- En producción: el array `['zea_mays', 'allium_cepa']` vendría de
-- `SELECT slug FROM farmos.asset__plant WHERE uid = $tenant`.

-- -----------------------------------------------------------------------------
-- Q5. AGREGACIÓN — Top 10 species con más compañeras documentadas
-- -----------------------------------------------------------------------------
-- Patrón: ranking. Útil para detectar "species hub" del grafo (las que
-- más conexiones tienen suelen ser las mejor documentadas o las que más
-- aplicaciones tienen en sistemas tradicionales — yuca, maíz, fríjol).
-- En BM25 imposible expresar; en SQL relacional implica COUNT con JOIN
-- pesado; en Cypher: COUNT directo sobre pattern.
-- -----------------------------------------------------------------------------

SELECT * FROM cypher('chagra_kg', $$
  MATCH (sp:Species)-[:COMPATIBLE_WITH]-(other:Species)
  RETURN sp.id AS species, sp.nombre_comun AS nombre, COUNT(DISTINCT other) AS companion_count
  ORDER BY companion_count DESC
  LIMIT 10
$$) AS (species agtype, nombre agtype, companion_count agtype);

-- =============================================================================
-- Notas operacionales
--   - Todas las queries devuelven `agtype` (tipo nativo AGE). Casts a text/int
--     se hacen del lado del wrapper REST (ver /tmp/age-rest-wrapper-design-2026-05-20.md).
--   - Para integrar al cliente Chagra PWA: NO se expone Cypher arbitrario al
--     navegador. Solo queries pre-compiladas vía /api/graph/* (whitelist).
--   - Bench plan: medir p50/p95 de cada Q tras importar el catálogo completo;
--     comparar contra BM25 actual para confirmar la estimación 80-95% ahorro
--     de tokens en multi-hop.
-- =============================================================================
