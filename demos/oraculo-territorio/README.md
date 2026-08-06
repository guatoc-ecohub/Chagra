# Oraculo de territorio

Biblioteca Node.js pura en ESM para contexto geoespacial determinista.

- Sin IA.
- Sin red.
- Sin dependencias externas.
- Coordenadas de demo ficticias.

## Exports

- `encodePlusCode(lat, lng, codeLength = 10)`
- `decodePlusCode(code)`
- `haversine(a, b)`
- `bearing(a, b)`
- `pointInPolygon(point, ring)`
- `zonaDe(point, geojson)`
- `oraculo(point, { geojson, referencias })`

## Archivos

- `oraculo.mjs`: núcleo puro.
- `fixtures.mjs`: GeoJSON y referencias ficticias de ejemplo.
- `selfcheck.mjs`: validación dura de comportamiento.
- `demo.mjs`: ejecución legible sobre un punto de demo.

## Uso

```bash
node selfcheck.mjs
node demo.mjs
```
