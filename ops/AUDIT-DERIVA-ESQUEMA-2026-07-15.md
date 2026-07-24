# Auditoría de Deriva de Esquema en Altitud - 2026-07-15

## Contexto

**Bug verificado en producción:** `chagra-pro/modules/agro-mcp/src/tools/age-tools.ts:822`

La query que responde *"¿qué puedo sembrar a mi altura?"* lee solo `altitud_min` y `altitud_max`, pero el grafo guarda la altitud bajo dos nombres distintos, haciendo que 91 especies sean **invisibles** para el usuario final.

### La Query de Producción (con el bug)

```sql
WHERE s.altitud_min IS NOT NULL AND s.altitud_max IS NOT NULL
  AND s.altitud_min <= ${alt} AND s.altitud_max >= ${alt}
```

Esta query **solo lee `altitud_min`/`altitud_max`**, ignorando completely `altitud_min_msnm`/`altitud_max_msnm`.

## Estado Actual del Grafo

### Altitud

| Convención | Especies | Notas |
|-------------|----------|-------|
| `altitud_min/altitud_max` (canónica) | 571 | Convención que lee la query de producción |
| `altitud_min_msnm/altitud_max_msnm` (variante) | 170 | Variante del esquema |
| Ambas convenciones presentes | 79 | Requieren revisión de conflictos |
| **Solo `_msnm` (INVISIBLES)** | **91** | **No aparecen en query de producción** |
| **Ambas con valores distintos (CONFLICTO)** | **61** | **NO tocar sin curaduría** |

### Temperatura (auditoría adicional)

| Convención | Especies |
|-------------|----------|
| `temp_min` | 495 |
| `temp_min_c` | 153 |
| Ambas presentes | 87 |
| Ambas con valores distintos (CONFLICTO) | 23 |

## Impacto Real

Las 91 especies invisibles incluyen cultivos **comerciales importantes para Colombia**:

- **Rosa** (1800-3000 msnm) - Flor de corte, exportación principal
- **Clavel** (1800-2900 msnm) - Flor de corte, exportación
- **Crisantemo/Pompón** (1600-2900 msnm) - Flor de corte
- **Vid/Uva** (400-2000 msnm) - Frutal
- **Umarí** (80-500 msnm) - Frutal amazónico

Un campesino de Bogotá (2.600 msnm) que pregunta a Chagra "¿qué puedo sembrar?" **NO ve estas especies** en la respuesta, aunque están en el grafo y su altitud está correcta - solo guardada bajo el nombre equivocado.

## Estrategia de Corrección

### PARTE 1 ✅ - Migración Segura (91 especies sin conflicto)

**Especies que tienen solo `altitud_min_msnm`/`altitud_max_msnm` y NO tienen `altitud_min`/`altitud_max`.**

- **Estado:** ✅ Seguro para migrar
- **Acción:** Copiar valores a la convención canónica `altitud_min`/`altitud_max`
- **Riesgo:** Ninguno - no hay ambigüedad, son propiedades vacías en el destino

**Script:** `scripts/normalizar-esquema-altitud.mjs --write` (con backup previo)

### PARTE 2 ⚠️ - Conflictos (61 especies - NO migrar)

**Especies que tienen AMBAS convenciones con valores DISTINTOS.**

Alguien registró dos rangos altitudinales diferentes para la misma especie bajo dos nombres de propiedad. Sin curaduría manual, **es imposible saber cuál es el correcto**.

- **Estado:** ⚠️ NO MIGRAR - requiere curaduría
- **Acción:** Reportar con ambos valores lado a lado
- **Riesgo:** ALTO - un rango equivocado puede causar pérdida de cultivo

**Ejemplo de conflicto:**

| Especie | `altitud_min` | `altitud_max` | `altitud_min_msnm` | `altitud_max_msnm` |
|---------|--------------|--------------|-------------------|-------------------|
| Tomate  | 0            | 2400         | 100               | 2500              |
| Maíz    | 0            | 3000         | 200               | 3200              |

**¿Cuál es el rango real?** Sin revisar fuentes, no hay forma de saber.

### PARTE 3 📊 - Temperatura (solo auditoría)

Mismo patrón de deriva en temperatura. Se reportan los números pero **no se migra nada** hasta que el operador decida.

| Convención | Especies |
|-------------|----------|
| `temp_min` | 495 |
| `temp_min_c` | 153 |
| Ambas presentes | 87 |
| **Ambas con valores distintos (CONFLICTO)** | **23** |

## Acciones Requeridas

1. **PARTE 1:** Ejecutar `scripts/normalizar-esquema-altitud.mjs --write` con backup previo
2. **PARTE 2:** Revisar manualmente las 61 especies en conflicto (ver `conflictos-altitud.json`)
3. **PARTE 3:** Decidir estrategia para temperatura basada en los números reportados

## Verificación Empírica

Después de la migración de PARTE 1, **validar con la query real de producción**:

```sql
-- Query de producción (age-tools.ts:822)
SELECT s.nombre_comun, s.altitud_min, s.altitud_max
FROM cypher('chagra_kg', $$
  MATCH (s:Species)
  WHERE s.altitud_min IS NOT NULL AND s.altitud_max IS NOT NULL
    AND s.altitud_min <= 2600 AND s.altitud_max >= 2600
  RETURN s.nombre_comun, s.altitud_min, s.altitud_max
  ORDER BY s.nombre_comun
$$) AS (nombre_comun agtype, altitud_min agtype, altitud_max agtype);
```

**Altitud de prueba:** 2600 msnm (Bogotá)

**Antes de la migración:** NO debería salir Rosa, Clavel, Crisantemo, Vid, Umarí
**Después de la migración:** SÍ deben salir estas especies

## Archivos Relacionados

- `scripts/normalizar-esquema-altitud.mjs` - Script de migración idempotente
- `ops/conflictos-altitud-2026-07-15.json` - Lista de 61 especies en conflicto
- `ops/especies-migrar-altitud-2026-07-15.json` - Lista de 91 especies a migrar

## Referencias

- Task: `Chagra-strategy/prompts/tasks/2026-07-15-glm-deriva-esquema-altitud.md`
- Bug en producción: `chagra-pro/modules/agro-mcp/src/tools/age-tools.ts:822`
- Base de datos: `chagra_kg` (Apache AGE, postgres-farm)
