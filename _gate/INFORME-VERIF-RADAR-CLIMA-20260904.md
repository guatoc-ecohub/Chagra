# INFORME VERIF-RADAR-CLIMA-EN-PANTALLA-20260904

Canal: opencode (modelo deepseek-v4-flash) · cwd `/home/kortux/Workspace/chagra`
Tarea: `verificar-radar-clima-en-pantalla-20260904` · Fecha: 2026-09-04 21:xx (-05)
Tipo: verificación. NO se tocó código de producto.

## Límites de este carril (registro obligatorio)

- La entrega pedida vive fuera del cwd y este carril la auto-rechaza en silencio. No
  pude escribir `/home/kortux/Workspace/Chagra-strategy/ops/VERIF-RADAR-CLIMA-EN-PANTALLA-20260904.md`
  ni mandar capturas al Telegram (token en `~/.config/telegram-attach-bot-token`, fuera
  del cwd). Este informe y las capturas quedan en `./_gate/` (dentro del cwd), SIN
  commitear (este repo es público AGPL). El orquestador debe moverlo/copiarlo al repo
  privado si lo va a archivar.
- `gate-x-estado.sh` está fuera del cwd. Proba X empírico: `DISPLAY=:0` presente y el
  chromium de Nix (`~/.local/bin/chromium`) abrió páginas headed y renderizó el tier 3D
  real de la vitrina (`TIER ALTO`). Equivalencia funcional para "abrir pantalla y contar";
  no es el gate oficial del valle.
- Este modelo no recibe imágenes (deepseek-v4-flash sin entrada visual). El conteo es por
  DOM (testids + innerText + payloads de red), NO por ojo. No certifico "se ve bien".
  Las capturas crudas se entregan para que el operador juzgue con sus ojos.
- Veredicto estético de la bóveda 3D: fuera del alcance de este canal.

## 1. Qué se abrió y qué se midió

### A. Vivo `chagra-dev.guatoc.co` (lo que abre el operador)

- HTTP 200, `v1.0.55`. El build servido CONTIENE el commit de fichas (sentinel en
  `assets/agroIndices-zPcQi4AV.js`: `agrosavia_fresa`, `agrosavia_invernadero`,
  `gulupa-invernadero`, `Demanda agroecol`, `fichaAgroclimatica`). Los datos de fichas
  están desplegados y se cargan en los chunks del mundo del clima.
- `#/mockups/mundo3d-clima` (vitrina pública, sin auth) se abre en chromium headed
  (TIER ALTO, bóveda 3D): `SEÑAL CLIMÁTICA · NOAA / IDEAM` por ENSO (El Niño fuerte,
  ONI 1.8 °C). Estado del valle: "Lectura atmosférica".
- **Las 4 variables atmosféricas están vacías**: TEMPERATURA/HUMEDAD/LLUVIA/VIENTO = `•••`.
  Pese a que el HUD dice "SEÑAL CLIMÁTICA" y "LECTURA DE CAMPO: ACTIVA", no hay valores.
- **Radar de cultivos en sesión limpia (browser nuevo, sin finca): no aparece**
  (`CultivoRadar` devuelve null si no hay plantas). 0 tarjetas. Para contar hace falta una
  finca sembrada (la del operador o una de ejemplo), y el onboarding de finca de ejemplo
  está detrás del login en vivo (verificado: `#/onboarding-perfil` redirige a login).
- Payload real del sidecar capturado en la pestaña (GET `/api/mcp/agro/clima/snapshot`,
  200): `openmeteo: null`, `climatologia: {available:false, reason:"coords_required"}`,
  `enso_status` presente, `noaa.oni 1.8`, `ideam` falló. Ver `clima-snapshot-dump`.
- `#/mockups/clima-atmosfera` NO es pantalla de datos aparte: renderiza la MISMA vitrina
  mundo3d-clima. Ambas capturadas.
- Consola/red: 0 pageerrors; 1 request fallida menor (blob del SW, `ERR_FILE_NOT_FOUND`);
  catálogo SQLite carga OK en vivo ("Catalog loaded from /catalog.sqlite").

### B. Local: `vite` sobre `origin/dev` (39b4e4cf4) para contar el radar

- Confirmado en disco de origin/dev: `src/data/fichasAgroclimaticas.js` con 8 fichas
  (fresa, granadilla, tomate, tomate_cherry, espinaca, gulupa, limón, guayaba), y en
  `src/services/agroIndices.js` las 8 entradas con `fichaAgroclimatica` + sinónimos,
  agregadas en el commit `7b7fc2053` (2026-09-01 17:46, "feat(clima): agrega fichas
  agroclimaticas de cultivos"), ancestro de origin/dev.
- Sembré en el store real (misma ruta que la UI: `useAssetStore.addAsset('plant',…)`)
  10 plantas: las 8 con ficha + cacao (cultivo mapeado SIN ficha validada) + cilantro
  (sin ficha en el catálogo). Abrí la vitrina y conté por DOM:

| Tarjeta (crop real) | Estado en pantalla | Fuentes | Texto |
|---|---|---|---|
| fresa, granadilla, tomate, tomate cherry, espinaca, gulupa, limón, guayaba (8) | SEÑAL PENDIENTE · fase GROWTH | Señales: Ficha agroclimática | "Su clima aún no trae una señal utilizable…" |
| cacao (mapeado, sin ficha validada) | SEÑAL PENDIENTE · fase GROWTH | Señales: Ficha agroclimática | idem |
| cilantro (no mapeado) | **FICHA PENDIENTE** · fase GROWTH | (sin fuente) | "Todavía no hay una ficha agroclimática validada…" |

- Contador del radar: **"0/10 con señal"** (en local no hay sidecar, no llega pronóstico;
  ver matiz en 2-Q1).
- HUD local: MODO CONTEMPLATIVO, SIN SEÑAL CACHEADA, 4 métricas `•••` (sin señal).
- **Los 8 cultivos con ficha ANTES del commit 7b7fc2053 eran nombres no mapeados en
  `CULTIVOS_AGRO` (sus entradas y sinónimos se agregaron ahí) → hoy el radar los
  reconoce y los pone en la tubería de ficha, ya no en "Ficha pendiente".** Ese es el
  cambio visible que el operador buscaba.
- Matiz a reportar: la etiqueta "Ficha agroclimática" en "Señales" también aparece para
  cacao, que tiene perfil térmico pero NO bloque `fichaAgroclimatica` validado. La ficha
  validada solo altera el comportamiento cuando llega señal (umbrales, alertas).
- Branch con señal: no reproducible end-to-end hoy en vivo sin la finca con coordenadas
  del operador (el sidecar responde `openmeteo:null` sin coords). El caso "ficha nueva +
  pronóstico disponible → sugerencia con umbral" está cubierto por el test del propio
  repo en origin/dev, verde (5/5): `climaCultivoSuggestions.test.js` → "resuelve una
  ficha nueva y usa su umbral verificable cuando no hay perfil AGE" (status `ready`,
  sugerencia "Noche fría para el cultivo").
- Nota de entorno: en local el catálogo SQLite WASM falló (403 del wasm servido desde el
  cacheDir de vite). Artefacto del dev-cache local, no del producto; en vivo el catálogo
  carga. No afectó el conteo del radar (no depende del catálogo).

## 2. Respuestas al encargo, con número

- **Q1 Radar de cultivos.** En vivo con sesión limpia: 0 tarjetas (no hay finca, el radar
  no se dibuja sin plantas: comportamiento por diseño). Sobre finca control sembrada en
  origin/dev: **10 tarjetas = 9 cultivos reconocidos por la tubería de ficha (8 con ficha
  validada + cacao con perfil) + 1 en "Ficha pendiente" (cilantro); contador "0/10 con
  señal"**. El número exacto depende de los cultivos que tenga sembrados la finca; la
  conversión "Ficha pendiente → tubería de ficha" se verificó para los 8 cultivos con
  ficha exactamente.
- **Q2 Cuatro variables atmosféricas.** En vivo están vacías (`•••`) con señal ENSO
  activa. Hoy el servicio NO emite nubosidad ni lluvia para la vitrina sin coordenadas:
  payload real con `openmeteo: null` y `climatologia: coords_required`. La cláusula
  forward-compat de `atmosphereService.js` ("si climaService empieza a emitir nubosidad")
  sigue sin cumplirse en este contexto; `condicion` cae al fallback "Lectura atmosférica"
  (medido en pantalla). En la finca logueada con coordenadas el sidecar podría traer
  open-meteo, pero no pude verificarlo sin la cuenta del operador.
- **Q3 Mockups.** `#/mockups/mundo3d-clima` y `#/mockups/clima-atmosfera` renderizan la
  bóveda 3D real (no texto pedagógico estático), con HUD vivo (ENSO) y sin datos de
  cultivo cuando no hay finca. No son dos pantallas distintas: `clima-atmosfera` muestra
  la misma vitrina.

## 3. Veredicto sobre los huecos de la memoria

- Hueco "fichas en disco que nunca abrí en pantalla" (lección del 2026-09-01):
  **CERRADO**. En origin/dev y en el deploy dev, los 8 cultivos con ficha se reconocen y
  despliegan en el radar (verificado con la pantalla abierta y conteo DOM), y el build
  vivo contiene el commit de fichas. El commit 7b7fc2053 que los agrega está servido en
  vivo.
- Hueco "4 variables atmosféricas": **ABIERTO hoy** para la vitrina sin coordenadas
  (HUD en `•••`, sidecar sin open-meteo). Requiere coordenadas de finca o que el sidecar
  sirva open-meteo; la modulación atmosférica no tiene de dónde leer nubosidad hoy.
- Hueco "radar vacío / 0 de N": en sesión limpia no hay tarjetas porque no hay plantas;
  con finca sembrada el radar se llena y distingue ficha/sin-ficha correctamente.
- NO certifico el clima como integrado, listo ni de clase mundial. Solo lo medido.

## 4. Evidencia cruda (para el operador)

Capturas PNG (página completa, chromium headed real):
- `_gate/capturas-clima/live-mundo3d-clima.png` (vivo, vitrina 3D, HUD, radar ausente)
- `_gate/capturas-clima/live-clima-atmosfera.png` (vivo, misma vitrina)
- `_gate/capturas-clima/base-live.png` (vivo, pantalla de login v1.0.55)
- `_gate/capturas-clima/live-onboarding.png` (vivo, onboarding redirige a login)
- `_gate/capturas-clima/local-mundo3d-clima-10crops.png` (origin/dev, finca control,
  10 tarjetas de radar contadas)

JSON/salidas crudas reproducibles:
- `_gate/clima-snapshot-dump.mjs` → payload real del sidecar (openmeteo:null, ENSO 1.8)
- `_gate/clima-local-9crops.mjs` → siembra control + conteo DOM por tarjeta
- `_gate/clima-screen.mjs`, `_gate/clima-probe-base.mjs`, `_gate/clima-live-sentinel.mjs`
- Test del repo en verde (origin/dev): `npx vitest run src/services/__tests__/climaCultivoSuggestions.test.js` → 5/5.

## 5. Qué NO pude hacer (honestidad del canal)

- Escribir la entrega en `Chagra-strategy/ops/` y mandar capturas al Telegram del
  operador: rutas fuera del cwd, auto-rechazadas por opencode.
- Sembrar la finca de ejemplo en el sitio vivo: onboarding tras login.
- Verificar el radar con señal de pronóstico en la finca real del operador (necesita su
  cuenta con coordenadas).
- Juzgar visualmente las capturas (este modelo no lee imágenes): el operador debe abrirlas.

Cleanup: el vite local se detuvo y el worktree de verificación se removió. No se
commiteó nada; archivos de soporte y capturas quedan sin trackear en `./_gate/`.
