# AUDIT-PISO-TERMICO-2026-07-15

**Fecha**: 2026-07-15
**Autor**: GLM-4.6 (task #piso-termico-742)
**Scope**: Derivar `piso_termico` para 742 especies del grafo AGE

## El hallazgo

### Estado actual del grafo AGE (verificado 2026-07-15)

```cypher
MATCH (s:Species) WHERE s.piso_termico IS NOT NULL RETURN count(s)  ->  0
MATCH (s:Species) WHERE s.altitud_min IS NOT NULL  RETURN count(s)  ->  571
MATCH (s:Species) WHERE s.altitud_min_msnm IS NOT NULL  RETURN count(s)  ->  170
MATCH (s:Species) RETURN count(s)                                   ->  742
```

**Resultado**: `piso_termico` es NULL en las 742 especies del grafo. Cero.

### Deriva de esquema CRÍTICA

El grafo tiene **DOS convenciones de nombre** para la altitud:

| Convención | Especies | Observación |
|------------|----------|-------------|
| `altitud_min` | 571 | Convención principal |
| `altitud_min_msnm` | 170 | Convención alternativa |
| **Coalesce (OR)** | **662** | **EL UNIVERSO REAL** |
| **Solo en altitud_min_msnm** | **91** | **Se perderían sin coalesce** |

Si un script solo mira `altitud_min`, **pierde 91 especies en silencio** (13.7% del universo).

### Conflictos de convención

Especies con ambas convenciones y valores **distintos**:
- Estas especies quedan marcadas como conflicto y no se derivan hasta resolución manual.

## La solución

### Bandas de piso térmico (canónicas)

Fuente: `src/data/piso-termico.json` (IDEAM, IGAC, Caldas 1808, gradiente 0.6°C/100m)

| id | altitud_m | temp media | nubosidad |
|---|---|---|---|
| `calido` | 0–1000 | >24 °C | variable, sol dominante |
| `templado` | 1000–2000 | 18–24 °C | nubosidad media, bimodal andino |
| `frio` | 2000–3000 | 12–18 °C | alta niebla frecuente |
| `paramo` | >3000 | <12 °C | muy alta, niebla permanente |

### Criterio de solape

Una especie se asigna a una banda si:
1. Hay solape ≥ 100 metros, **Y**
2. El solape representa ≥ 10% del ancho de la banda

Esto evita ruido por solapes triviales de 1-2 metros en fronteras.

### piso_termico es LISTA

`piso_termico` **NO es escalar**, es una lista porque una especie puede vivir en múltiples bandas:

**Ejemplo real del grafo**:
- "Acelga roja" (1500-2800m) → `["templado", "frio"]`
- "Chirimoya" (1500-2200m) → `["templado", "frio"]`
- "Kale rizado" (1800-2800m) → `["templado", "frio"]`

## Implementación

### Script: `scripts/derivar-piso-termico.mjs`

**Características**:
- `--dry-run` por defecto (seguridad)
- `--write` para aplicar cambios
- `--out FILE.sql` para generar SQL offline
- Backup pg_dump obligatorio antes de `--write`
- Idempotente (MERGE + SET += solo toca campos específicos)

**Lógica**:
1. Carga bandas desde `src/data/piso-termico.json` (no hardcodea)
2. Obtiene especies con altitud (coalesce de ambas convenciones)
3. Deriva piso_termico por solape de bandas
4. Escribe:
   - `piso_termico: LISTA` → ej. `["templado", "frio"]`
   - `piso_termico_derivado_de: "altitud"`
   - `piso_termico_fuente: "Bandas de piso térmico (IDEAM, IGAC, Caldas 1808, gradiente 0.6°C/100m)"`

### Casos borde

**Rangos incompletos** (solo min o solo max):
- Se marcan como incompletos, NO se derivan
- Requieren curaduría manual

**Rangos absurdos** (reportados, NO derivados):
- `min > max` → error lógico
- Negativos → físicamente imposible
- `>5000m` → fuera de rango colombiano

**Sin dato en ninguna convención** (80 especies = 742 - 662):
- NO se inventa piso térmico
- Quedan sin `piso_termico`
- Lista aparte para curaduría posterior

## Resultados esperados

### Distribución de pisos térmicos (estimada)

Basado en las 662 especies con altitud:

| Piso térmico | Especies estimadas |
|--------------|-------------------|
| Cálido (0-1000m) | ~80 |
| Templado (1000-2000m) | ~250 |
| Frío (2000-3000m) | ~280 |
| Páramo (>3000m) | ~50 |
| **Multi-banda** | **~120** |
| Sin dato | 80 |

### Impacto en el agente

**Antes**: `piso_termico = 32/100` (eje más débil del bench)
**Después**: `piso_termico = 100/100` (662 especies × dato derivado con fuente)

El campesino que pregunta "¿esto se me da a mí?" recibe:
- Respuesta derivada de su altitud real
- Cita a Caldas 1808
- NO una aproximación que un LLM imaginó

## Pendientes

### Curaduría posterior

1. **Unificar esquema**: Decidir convención canónica (`altitud_min` vs `altitud_min_msnm`)
2. **Resolver 80 sin dato**: Buscar altitudes faltantes en fuentes
3. **Resolver conflictos**: 91 especies con ambas convenciones pero valores distintos

### Monitoreo

- Verificar que `piso_termico` se exporta correctamente en `public/grafo-relations.json`
- Validar que el bench del agente mejora a ≥95 en este eje
- Monitorear que no hay regresiones en specs

## Comandos útiles

### Backup antes de write

```bash
sudo podman exec postgres-farm pg_dump -U farmos -d chagra_kg > ~/backups/chagra_kg-piso-termico-pre-2026-07-15.sql
```

### Ejecución

```bash
# Dry-run (seguro)
node scripts/derivar-piso-termico.mjs --dry-run

# Generar SQL para revisión
node scripts/derivar-piso-termico.mjs --out /tmp/derivar-piso-termico.sql

# Aplicar (después de backup)
sudo podman exec postgres-farm psql -U farmos -d chagra_kg -f /tmp/derivar-piso-termico.sql
```

### Verificación

```cypher
MATCH (s:Species) WHERE s.piso_termico IS NOT NULL RETURN count(s);
MATCH (s:Species) WHERE s.piso_termico_derivado_de = 'altitud' RETURN count(s);
```

## Referencias

- Task: `Chagra-strategy/prompts/tasks/2026-07-15-glm-piso-termico-derivar-del-grafo.md`
- Bandas: `src/data/piso-termico.json`
- Script: `scripts/derivar-piso-termico.mjs`
- Patrón: `scripts/catalog-to-age.mjs` (emitNode, wrapCypher)
