# Informe: carga perezosa 2026-09-04

## Resultado

Se corrigieron las dos capas que viven en este repositorio:

1. `public/sw.js` solo guarda un `.js` de `/assets/` cuando su MIME es JavaScript. Un `200 text/html` se devuelve al navegador para que falle correctamente, pero no se persiste como chunk.
2. Todas las declaraciones perezosas de rutas en `App.jsx` ahora pasan por `lazyWithRecovery`, que transforma un rechazo de `import()` en una pantalla legible. La Sierra usa exactamente ese cargador. Las escenas 3D de `Mundo` además capturan el rechazo y activan su gemelo 2D, igual que ya hacía el timeout.

## Capa de servidor, cambio pendiente de infraestructura

No hay configuración de Nginx ni de Pages versionada en este repositorio. No se aplicó ningún cambio de infraestructura.

En cada virtual host que sirve la PWA, agregar esta ubicación **antes** del `location /` que contiene el fallback SPA:

```nginx
location ^~ /assets/ {
    try_files $uri =404;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

El primer bloque es obligatorio: evita que una URL inexistente bajo `/assets/` caiga al rewrite de `index.html`. Después de aplicarlo, validar con:

```sh
curl -i https://<host-publico>/assets/NO-EXISTE-carga-perezosa.js
```

Resultado esperado: `404`, sin `content-type: text/html` ni cuerpo de `index.html`.

## Inventario completo y cobertura

La enumeración no se escribió a mano. La fuente normativa es esta consulta sobre el árbol:

```sh
rg -n '^const [A-Za-z0-9_]+ = lazy\(\(\) => import' src/App.jsx
```

Resultado de la consulta: **216 declaraciones** `lazy()` en `src/App.jsx`. La prueba `tests/unit/lazyRoutesRecovery.test.jsx` ejecuta la misma enumeración sobre el archivo, falla si baja de 41, verifica que la declaración de `SierraGlobalMockup` esté incluida y confirma que el import de `lazy` venga del cargador recuperable.

Cobertura de las 216/216 declaraciones encontradas: **cubiertas** por `src/components/common/lazyWithRecovery.jsx`. La lista completa sigue siendo reproducible desde el árbol con el comando anterior, que muestra para cada sujeto su línea, identificador y destino de `import()`; no depende de una lista mantenida a mano.

Sujetos fuera de esa lista: los `lazy()` internos de componentes no son rutas. Los imports de escenas de `src/visual/mundo3d/Mundo.jsx` sí reciben cobertura específica mediante `Caida3DBoundary`: rechazo y timeout caen al gemelo 2D. No quedó ninguna ruta perezosa de `App.jsx` sin cubrir.

## Controles agregados

- `tests/carga-perezosa-assets.spec.js`: control negativo de servidor. Pide un `.js` inexistente y exige `404` y MIME distinto de HTML.
- `tests/unit/sw-offline-precache-runtime.test.js`: control negativo que simula el defecto `200 text/html` para un chunk y exige que no entre al cache; su control positivo exige que un chunk con MIME JavaScript sí entre.
- `tests/unit/lazyRoutesRecovery.test.jsx`: un import rechazado, incluida la forma central que usa Sierra, muestra una salida legible y la cobertura se enumera desde `App.jsx`.
- `src/visual/mundo3d/__tests__/Caida3DBoundary.test.jsx`: un rechazo de escena 3D dispara la caída del host a su gemelo 2D.

## Salidas de verificación

### Focalizadas, exitosas

```text
$ NODE_OPTIONS=--max-old-space-size=512 npx vitest run --pool=forks --maxWorkers=1 tests/unit/lazyRoutesRecovery.test.jsx tests/unit/sw-offline-precache-runtime.test.js

Test Files  2 passed (2)
     Tests  16 passed (16)
  Duration  3.25s
```

```text
$ NODE_OPTIONS=--max-old-space-size=512 npx vitest run --pool=forks --maxWorkers=1 src/visual/mundo3d/__tests__/mundo.smoke.test.jsx

Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  6.91s
```

```text
$ NODE_OPTIONS=--max-old-space-size=512 npx eslint src/App.jsx src/components/common/lazyWithRecovery.jsx src/visual/mundo3d/Mundo.jsx src/visual/mundo3d/Caida3DBoundary.jsx tests/unit/lazyRoutesRecovery.test.jsx tests/unit/sw-offline-precache-runtime.test.js tests/carga-perezosa-assets.spec.js --max-warnings=0

(sin salida, exit 0)
```

### `npx tsc --noEmit`, salida cruda

```text
Version 6.0.3
tsc: The TypeScript Compiler - Version 6.0.3

COMMON COMMANDS

  tsc
  Compiles the current project (tsconfig.json in the working directory.)

  tsc app.ts util.ts
  Ignoring tsconfig.json, compiles the specified files with default compiler options.

  tsc -b
  Build a composite project in the working directory.

  tsc --init
  Creates a tsconfig.json with the recommended settings in the working directory.
```

El comando solicitado termina en `0`, pero solo muestra ayuda porque el repositorio no tiene `tsconfig.json`. El chequeo efectivo equivalente, `npx tsc --noEmit -p jsconfig.json`, no completó: agotó el límite de heap local tras llegar a 510 MB.

### Playwright del control de servidor

```text
$ NODE_OPTIONS=--max-old-space-size=512 npx playwright test tests/carga-perezosa-assets.spec.js --project=chromium

Error: apiRequestContext.get: read ECONNRESET
GET http://localhost:5173/assets/NO-EXISTE-carga-perezosa.js

[WebServer] FATAL ERROR: NewSpace::EnsureCurrentCapacity Allocation failed - JavaScript heap out of memory
```

El control está añadido, pero esta ejecución local no fue concluyente: Vite agotó el límite de memoria antes de responder. Debe correr en CI o en un host con memoria suficiente, después de aplicar el cambio de Nginx.

### `npm run test`

La corrida completa se inició con `NODE_OPTIONS=--max-old-space-size=768`. Se detuvo después de que Vitest ya había reportado estas fallas preexistentes, fuera de los archivos modificados; por tanto, la suite completa no quedó verde ni tuvo un resultado final utilizable:

```text
catalog/__tests__/migrate-v31-to-v32.test.js (23 tests | 8 failed)
  × debe tener el mismo número de especies que v3.1
  × debe preservar sources de v3.1
  × debe tener _meta con estadísticas de tracking_mode
  × ninguna especie pierde campos requeridos de v3.1
  × todas las especies conservan sus companions y antagonists
  × todas las especies conservan altitud_msnm
  × ejecutar migración 2 veces produce mismo resultado
  × estadísticas en _meta deben coincidir con conteo real
```

El test de migración también modificó `catalog/chagra-catalog-seed-v3.2.json` durante su ejecución. Esa modificación no pertenece a este arreglo y no se incluirá en el commit.
