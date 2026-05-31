# Ubicaciones de Colombia — dataset DANE DIVIPOLA (#338)

`colombia-locations.dane.json` es el catálogo autoritativo de
**departamentos + municipios** de Colombia usado por el onboarding
(`LocationDetectedScreen` → cascade Departamento → Municipio).

## Fuente

- **DANE — DIVIPOLA** (Codificación de la División Político-Administrativa,
  parte del Marco Geoestadístico Nacional). Dominio público.
- Publicado en `datos.gov.co` (Socrata), dataset **`gdxc-w37w`**.
- Trae por municipio: `cod_dpto`, `dpto`, `cod_mpio` (DIVIPOLA de 5 dígitos),
  `nom_mpio`, `latitud`, `longitud` (centroide).

Reemplaza la antigua lista mantenida a mano (25 deptos / 117 municipios).
Ahora: **33 departamentos / 1.122 municipios**.

## Regenerar

```bash
node scripts/gen-colombia-locations.mjs                 # online (fuente oficial)
node scripts/gen-colombia-locations.mjs --source ./divipola.csv   # offline
```

El generador valida (hard-fail): código DIVIPOLA bien formado, sin duplicados,
consistencia depto↔municipio, lat/lng dentro del bounding box de Colombia.

## Altitud (msnm)

El DANE **no** publica altitud en DIVIPOLA. Estrategia:

1. Se conservan las altitudes curadas a mano (IGAC/OSM) del dataset legacy
   (`scripts/colombia-locations-curated-altitudes.legacy.mjs`) por match de
   nombre → **110 municipios** con altitud confiable.
2. El resto sale `altitud: null`. El consumidor la hidrata **online** vía
   `resolveUbicacion` → `altitudeService` (Open-Elevation) usando el centroide
   lat/lng, y deriva el piso térmico. Offline degrada con gracia (el piso
   térmico simplemente no se precalcula hasta tener red).

## Veredas — Fase 2 (no incluidas)

Las ~32.000 veredas del DANE **no** se incluyen en este dataset: inflarían el
bundle del PWA en ~1MB+ de JSON sin beneficio para el flujo actual (el campesino
selecciona municipio y escribe la vereda en texto libre). Si se requiere
resolución a nivel vereda, será un dataset aparte cargado bajo demanda
(lazy import / endpoint), no embebido en el bundle inicial.

## Peso

JSON sin minificar ~182 KB (gzip ~40-50 KB). Aceptable para carga inicial.
