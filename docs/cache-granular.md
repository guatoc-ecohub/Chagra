# Estrategia de caché granular — prod.chagra.app

> Rama `feat/tareas-12-20`. Documento de diseño. Implementación pendiente.

## Problema actual

Cada deploy (cada push a main) purga TODO el `CACHE_NAME` (`chagra-prodapp-<sha>`). Esto obliga al Service Worker a re-descargar ~24MB completos en el siguiente arranque, incluyendo assets que NO cambiaron (catálogo SQLite, imágenes de cultivos, modelos TF.js).

## Solución propuesta

Migrar de UN solo `CACHE_NAME` a cachés GRANULARES versionados independientemente:

| Cache | Contenido | Versionado por | Peso ~ |
|---|---|---|---|
| `chagra-shell-v<N>` | index.html + JS/CSS entry chunks | build SHA (cada deploy) | ~1.5MB |
| `chagra-mundos-v<N>` | Chunks 3D lazy (mundos, mockups) | hash del manifiesto de mundos | ~8MB |
| `chagra-catalog-v<N>` | catalog.sqlite + species-images | version del catálogo SQLite | ~3MB |
| `chagra-content-v<N>` | cycle-content/ JSONs | hash del manifest.json | ~3.4MB |
| `chagra-models-v<N>` | TF.js + speech-commands | hash del modelo wake-word | ~9MB |

### Reglas de purga

1. Solo se purga el cache que CAMBIÓ (detectado por hash del contenido)
2. Los demás cachés sobreviven el deploy
3. El `activate` event itera `caches.keys()` y borra solo las versiones VIEJAS de cada prefijo
4. El `install` event precachea SOLO `chagra-shell` (crítico para el arranque)

### Implementación

```js
// sw.js — en vez de UN CACHE_NAME:
const CACHES = {
  shell: `chagra-shell-${SHELL_HASH}`,
  mundos: `chagra-mundos-${MUNDOS_HASH}`,
  catalog: `chagra-catalog-${CATALOG_HASH}`,
  content: `chagra-content-${CONTENT_HASH}`,
  models: `chagra-models-${MODELS_HASH}`,
};
```

Los hashes se generan en `build:prod` y se inyectan en el SW de la misma forma que el SHA actual.

## Impacto esperado

- Deploy típico (solo cambia JS): ~1.5MB re-descargados (vs 24MB hoy)
- Deploy con nuevos mundos: +8MB (solo quien entra a un mundo 3D)
- Catálogo nuevo: +3MB (solo al abrir el directorio de especies)
