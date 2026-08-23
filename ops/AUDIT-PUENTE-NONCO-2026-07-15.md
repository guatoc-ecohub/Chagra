# AUDIT-PUENTE-NONCO-2026-07-15

## Fecha

2026-07-15

## Hallazgo

### El hueco

La auditoría de HYTA (`gap-grafo-a-proteccion.html`, 2026-07-04) identificó que **~90% de la capa NONCO está desconectada** del grafo principal. Solo 11 de 114 NoncoPest tenían puente `CO_RELEVANT` a un `Pest` real.

Medido hoy (2026-07-15):

| Métrica | Valor |
|---------|-------|
| NoncoPest total | 114 |
| con puente CO_RELEVANT | 42 (era 11 en la auditoría original) |
| **SIN PUENTE** | **72 (63% sigue inalcanzable)** |
| NoncoControl | 140 |
| NoncoBiopreparado | 61 |
| NoncoPractice | 108 |

**423 nodos curados con conocimiento internacional de control biológico, y el agente no los ve.**

### Impacto

Las tools del agente consultan `Pest` y `Species`, NO `NoncoPest`. Sin el puente `CO_RELEVANT`:

1. El agente NO puede recomendar controles biológicos documentados en NONCO
2. Un campesino que pregunta "¿cómo controlo la mosca blanca sin veneno?" NO recibe las 40+ respuestas que existen en el grafo
3. Todo el trabajo de curaduría de NONCO (140 controles + 61 biopreparados) es invisible al usuario final

### Por qué esto es lo de mayor retorno del grafo

- **No necesita investigación nueva, ni GPU, ni bajar nada** — el conocimiento ya está
- El trabajo ya se pagó (curaduría NONCO)
- Solo falta el puente técnico (una arista en el grafo)
- Es la diferencia entre que Chagra tenga la respuesta y no la encuentre

## Criterio de emparejamiento

### Caso 1: Binomio científico exacto (confianza 1.0)

**Criterio:** Si `NoncoPest.nombre_cientifico` == `Pest.nombre_cientifico`, es la misma plaga.

**Ejemplo:**
- `NoncoPest { id: "spodoptera_frugiperda", nombre_cientifico: "Spodoptera frugiperda" }`
- `Pest { id: "spodoptera_frugiperda", nombre_cientifico: "Spodoptera frugiperda" }`
- **Resultado:** Puente CO_RELEVANT con confianza 1.0

### Caso 2: Género (confianza 0.6)

**Criterio:** Si el género coincide pero NoncoPest es "sp." (sin epíteto específico).

**Ejemplo:**
- `NoncoPest { id: "spodoptera_sp", nombre_cientifico: "Spodoptera sp." }`
- `Pest { id: "spodoptera_frugiperda", nombre_cientifico: "Spodoptera frugiperda" }`
- **Resultado:** Puente CO_RELEVANT con confianza 0.6

### Caso 3: Sinónimos taxonómicos (confianza 0.7)

**Criterio:** Si hay un sinónimo registrado en `_pest_synonyms` que conecte ambos nombres.

**Ejemplo:**
- `NoncoPest { id: "broca_cafe", nombre: "broca del café" }`
- `Pest { id: "hypothenemus_hampei", nombre_cientifico: "Hypothenemus hampei" }`
- `_pest_synonyms["broca del café"] = "Broca del café"`
- **Resultado:** Puente CO_RELEVANT con confianza 0.7

### Caso 4: Sin evidencia (SIN PUENTE)

**Criterio:** Si no hay evidencia suficiente, NO se crea el puente.

**Razón:** Un puente equivocado le dice al campesino que un control sirve para su plaga cuando no. **Eso es peor que el hueco.**

## Números antes/después

### Antes (2026-07-15, antes del script)

| Métrica | Valor |
|---------|-------|
| NoncoPest total | 114 |
| NoncoPest con puente CO_RELEVANT | 42 (37%) |
| NoncoPest SIN puente | 72 (63%) |
| Controles biológicos inalcanzables | ~423 |

### Después (proyectado)

| Métrica | Valor (esperado) |
|---------|------------------|
| NoncoPest total | 114 |
| NoncoPest con puente CO_RELEVANT | ~90-100 (79-88%) |
| NoncoPest SIN puente | ~14-24 (12-21%) |
| Controles biológicos inalcanzables | ~50-100 |

**Nota:** Los números finales dependen de cuántos NoncoPest casen por binomio exacto vs género vs sinónimos. Los que queden sin puente requieren curaduría manual.

## Trazabilidad

Cada arista `CO_RELEVANT` creada por este script incluye:

```cypher
MATCH (a:NoncoPest {id: '...'})-[r:CO_RELEVANT]->(b:Pest {id: '...'})
RETURN r.metodo, r.confianza, r.razon, r.provenance, r.created_at
```

### Propiedades obligatorias

- `metodo`: `binomio_exacto` | `genero` | `sinonimo`
- `confianza`: `1.0` | `0.6` | `0.7`
- `razon`: Explicación humana de por qué se creó el puente
- `provenance`: `"puente-nonco-2026-07-15"`
- `created_at`: ISO timestamp de creación

### Ejemplo

```json
{
  "metodo": "binomio_exacto",
  "confianza": 1.0,
  "razon": "Binomio científico idéntico: spodoptera frugiperda",
  "provenance": "puente-nonco-2026-07-15",
  "created_at": "2026-07-15T10:30:00Z"
}
```

## NoncoPest sin casar (requieren curaduría manual)

Esta sección se llenará tras correr el script dry-run. Los NoncoPest que no casen por binomio, género ni sinónimos requieren:

1. Revisión manual de su nombre_científico
2. Verificación en literatura taxonómica
3. Posible corrección del nombre en NONCO
4. O dejar sin puente si no hay evidencia suficiente

**IMPORTANTE:** NO inventar puentes. Sin evidencia, mejor sin puente.

## Prueba de cierre (query del agente)

### Query que usa el agente (antes)

```cypher
MATCH (pest:Pest {id: 'spodoptera_frugiperda'})<-[:TARGETS_PEST]-(ctrl:NoncoControl)
RETURN ctrl
```

**Resultado antes:** 0 filas (sin puente CO_RELEVANT, el agente no llega desde Pest hasta NoncoControl)

### Query que usa el agente (después)

```cypher
MATCH (pest:Pest {id: 'spodoptera_frugiperda'})<-[:CO_RELEVANT]-(noncoPest:NoncoPest)
MATCH (noncoPest)<-[:TARGETS_PEST]-(ctrl:NoncoControl)
RETURN ctrl
```

**Resultado después:** N filas (donde N = número de controles NONCO para esa plaga)

### Prueba final

Tras aplicar los puentes, correr esta query para una plaga que antes no llegaba a sus controles NONCO:

```sql
LOAD 'age';
SET search_path = ag_catalog, public;

-- Elegir una plaga que tenga puentes nuevos
SELECT * FROM cypher('chagra_kg', $$
  MATCH (pest:Pest {id: 'spodoptera_frugiperda'})<-[:CO_RELEVANT]-(noncoPest:NoncoPest)
  MATCH (noncoPest)<-[:TARGETS_PEST]-(ctrl:NoncoControl)
  RETURN pest.id AS pest, noncoPest.id AS nonco_pest, count(ctrl) AS controles
$$) AS (pest agtype, nonco_pest agtype, controles agtype);
```

Si devuelve controles > 0, el puente funciona.

## Queda pendiente

1. **Curaduría manual** de los NoncoPest que no casen automáticamente
2. **Verificación manual** de una muestra de los puentes creados (quality check)
3. **Actualización del grafo** si se corrigen nombres científicos en NONCO
4. **Documentación** en AGENTS.md sobre la nueva topología del grafo
5. **Benchmarks** de queries del agente antes/después para medir el impacto

## Referencias

- Task: `Chagra-strategy/prompts/tasks/2026-07-15-glm-puente-nonco.md`
- Script: `scripts/puente-nonco.mjs`
- Audit HYTA original: `gap-grafo-a-proteccion.html` (2026-07-04)
- Sinónimos: `public/grafo-relations.json` (_pest_synonyms)
