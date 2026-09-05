# INFORME — Inventario COMPLETO de datos de clima: variables, uso y confiabilidad

Fecha: 2026-09-04 · Canal: opencode/deepseek-v4-flash · cwd `/home/kortux/Workspace/chagra`
Tipo: AUDITORÍA (no se tocó código de producto) · HEAD leído: `4bcbd4fb7` (rama
`feat/sierra-datos-por-piso-20260904`) · base `origin/dev` `39b4e4cf4`.

## 0. Límites de este carril (registro obligatorio)

- La entrega pedida (`/home/kortux/Workspace/Chagra-strategy/ops/INVENTARIO-CLIMA-CONFIABILIDAD-20260904.md`,
  commiteada en el repo `Chagra-strategy`) vive **fuera del cwd** de opencode: cada
  escritura se auto-rechaza en silencio. El orquestador debe mover/committear este
  informe al repo privado si lo va a archivar.
- El valle 3D canónico (`~/demos/3d`: `clima-vivo.js`, `clima.js`,
  `lib3d/clima/climaPorPiso.js`) también está fuera del cwd y no se inspeccionó.
  Para las columnas «3D» de esas variables uso la medición del brief (lee 12,
  mueve la imagen con 4) y la marco **no re-verificada en este carril**.
- El **sidecar** (`chagra-pro`, servidor del snapshot `/clima/snapshot`) está fuera
  del cwd. Su contrato se infiere del lado cliente; su estado vivo se cita del
  carril hermano `INFORME-VERIF-RADAR-CLIMA-20260904.md` (medido en pantalla el
  mismo día): ENSO «El Niño fuerte» ONI 1.8, `openmeteo: null` sin coordenadas,
  `climatologia: coords_required`, `ideam` falló.
- Sí se analizó y verificó en disco: `src/services/*clima*`, `enso*`,
  `agroIndices`, `atmosphereService`, `skyConditionService`, `incendioRiskService`,
  hooks, `src/data/*clima*`, los espejos 3D dentro del repo
  (`src/hooks/useClima3DVivo.js`, `src/visual/mundo3d/...`) y sus consumidores 2D/3D/Sierra.

## 1. Método y prueba de control

- **Instrumento = importar y evaluar los módulos** (probe `_gate/clima-inventory-probe.mjs`
  + suite vitest del repo), no grep del literal. Las suites de los 12 módulos del
  dominio corren verdes: **12 files, 183 tests** (`climaService`, `skyConditionService`,
  `ensoContext`, `ensoService`, `incendioRiskService`, `atmosphereService`,
  `agroIndices`, `ensoModulador`, `climaBoletines`, `fichasAgroclimaticas`,
  `compai/climaVivo`, `climaPorPiso.vendor`).
- **Control del brief sobre `precipitation`**: la función pura que decide la lluvia la
  consume (`classifySkyCondition` con precip ≥ umbral → `lluvia`; sin precip → no),
  `skyForDay` lee `day.precip_mm`, `balanceHidricoDia(3,4) → falta 1 mm`, `spi` usa
  precip+histórico. El instrumento ve `precipitation` como usada → instrumento válido.
- Lección de calibración del propio probe (la registra el método, no el producto):
  el primer conteo de variables diarias/horarias por regex sobre TODO el archivo dio
  14/12 porque `weathercode` se repite entre la lista diaria y la horaria; acotado al
  bloque de cada lista da **13 diarias + 11 horarias = 24**, idéntico a la lectura
  directa de `agroMeteoService.js:49-77`.
- Conteos por importe real (no grep): `FICHAS_AGROCLIMATICAS` = **8**, `CULTIVOS_AGRO` =
  **22**, `MODELOS_ENFERMEDAD` = 6, `LECTURA_ENSO` = 3 familias, `BOLETINES_IDEAM` = 3,
  `ENSO_CALENDARIO_2026_27` = 4 periodos, `CLOUD_THRESHOLDS` = {35, 70},
  `graph-stats-snapshot.fecha_snapshot` = `2026-07-01`.
- **Anti-grep corregido**: `modularPorENSO` (ensoModulador) y `enso-modulacion.json`
  NO tienen consumidor en runtime (solo un test); si el inventario se hiciera por
  export existente diría «usado». No lo está.

## 2. La tabla — TODAS las variables/índices de clima del proyecto

Niveles de confianza (verificados contra el código, no asumidos):
`P`=PRONOSTICADO/OBSERVADO Open-Meteo · `R`=reanálisis ERA5 ·
`N`=NORMAL CLIMÁTICA · `D`=DERIVADO POR CHAGRA · `S`=SNAPSHOT/ESTÁTICO ·
`X`=SIN FUENTE VIVA. TTL = declarado en el módulo. «2D» = PWA (Página del Tiempo,
strip/bell/hoy/agente/compai); «3D» = valle canónico `~/demos/3d` (medición del
brief, no re-verificada) + espejos en-repo verificados; «Sierra» = VistaGlobalSierra/
descenso.

### A. Variables crudas Open-Meteo — forecast API (blend ECMWF/GFS/ICON), fetch directo del browser vía `agroMeteoService` (y `skyConditionService` donde se nota)

| variable | fuente | nivel | frescura (TTL) | ¿2D? dónde | ¿3D? dónde | ¿Sierra? |
|---|---|---|---|---|---|---|
| `weathercode` (daily, WMO) | Open-Meteo forecast | P | 3 h | **No se pinta por día** (el 2D usa `precip_prob` para el ícono de 16 días). Solo el `weathercode` *current*/horario alimenta `now.weather` | — | no |
| `temperature_2m_max` (daily) | Open-Meteo forecast | P | 3 h | Sí. Página del Tiempo: `today.temp_max` (gráfico 7 d, tile 16 d, amplitud, media para anomalía, ETc por cultivo) | leída (tempMax) | no |
| `temperature_2m_min` (daily) | Open-Meteo forecast | P | 3 h | Sí. `today.temp_min`: amplitud, gráfico, tile, GDD, media; en compai vía forecast_7d del sidecar | leída (tempMin) | no |
| `apparent_temperature_max` (daily) | Open-Meteo forecast | P | 3 h | **No usada.** (El «se siente como» usa `apparent_temperature` *current*, ver A-c1) | — | no |
| `precipitation_sum` (daily) | Open-Meteo forecast | P | 3 h | Sí, intensivo: `today.precip_mm` (tile lluvia, balance, SPI, anomalía, tarjetas cultivo, ventana secar, gráfico) | **mueve lluvia/charcos** (medición brief) | no |
| `precipitation_probability_max` | Open-Meteo forecast | P | 3 h | Sí: `precip_prob` (tile, ventanas de labor, ícono 16 d) | — | no |
| `et0_fao_evapotranspiration` | Open-Meteo forecast (FAO-56 Penman-Monteith **nativo**, no nuestro) | P | 3 h | Sí: tile ETo, ETc por cultivo, SPEI de balance (referencia Kc 1.0) | — | no |
| `uv_index_max` (daily) | Open-Meteo forecast | P | 3 h | Sí: tile Rayos UV + `leerUv` | — | no |
| `shortwave_radiation_sum` (daily) | Open-Meteo forecast | P | 3 h | **Pedida y calculada (`radiacion_mj`) pero NO usada en ningún componente** | — | no |
| `sunshine_duration` (daily) | Open-Meteo forecast | P | 3 h | Sí (indirecto): `sol_horas` decide la ventana «Secar grano» | — | no |
| `windspeed_10m_max` (daily) | Open-Meteo forecast | P | 3 h | Sí (indirecto): `viento_max` decide la ventana «Aplicar foliar» | — | no |
| `windgusts_10m_max` (daily) | Open-Meteo forecast | P | 3 h | **No usada** (`racha_max` queda en el payload) | — | no |
| `winddirection_10m_dominant` | Open-Meteo forecast | P | 3 h | **No usada** (`viento_dir` queda en el payload) | — | no |
| `temperature_2m` (hourly) | Open-Meteo forecast | P | 3 h | Sí: agregada → `horas_frio` (tile), respaldo de `now.temp` | — | no |
| `relative_humidity_2m` (hourly) | Open-Meteo forecast | P | 3 h | Sí: `rh_mean` (ventana secar), `horas_hr_alta` (presión de enfermedad), respaldo `now.rh` | — | no |
| `dew_point_2m` (hourly) | Open-Meteo forecast | P | 3 h | Sí: `now.dew` («Rocío a X °C») | — | no |
| `precipitation` (hourly) | Open-Meteo forecast | P | 3 h | Respaldo de `now.precip` (sin tile directo) | **mueve lluvia/wet** (medición brief) | no |
| `cloud_cover` (hourly) | Open-Meteo forecast | P | 3 h | **No mostrada desde este payload.** La nubosidad que ve el 2D llega por `skyConditionService` (fetch propio, fila B-sky) | **mueve nube** (medición brief) | no |
| `uv_index` (hourly) | Open-Meteo forecast | P | 3 h | Solo respaldo de `now.uv`; el tile usa `uv_index_max` | — | no |
| `weathercode` (hourly) | Open-Meteo forecast | P | 3 h | Sí (respaldo): `now.weather` (ícono/label honestos) | — | no |
| `is_day` (hourly) | Open-Meteo forecast | P | 3 h | Indirecto: decide ☀️/🌙 del ícono | **mueve día/noche** (medición brief) | no |
| `soil_moisture_0_to_1cm` (hourly) | Open-Meteo forecast | P | 3 h | **Pedida, expuesta en payload, SIN consumidor en src** | — | no |
| `soil_moisture_1_to_3cm` (hourly) | Open-Meteo forecast | P | 3 h | **Sin consumidor** | — | no |
| `soil_moisture_3_to_9cm` (hourly) | Open-Meteo forecast | P | 3 h | **Sin consumidor** | — | no |
| **A-c1** `apparent_temperature` (*current*) | Open-Meteo forecast | P | 3 h | Sí: «Se siente como X °C» (hero Hoy) | — | no |
| **A-c2** `wind_speed_10m` (*current*) | Open-Meteo forecast | P | 3 h | **No pintada en la Página del Tiempo**; sí la lee el HUD 3D del espejo en-repo (`derivarClima3D.viento`) | leída (viento HUD) | no |
| **A-sky** `cloud_cover` current + `cloud_cover_mean` daily + `weather_code` + `precipitation_sum` (fetch de `skyConditionService`) | Open-Meteo forecast, **segundo fetch directo** | P | 30 min | Sí: condición del cielo honesta del día en ClimaStrip/NotificationsBell/HoyEnFinca/AgentHero (`skyForDay`, `classifySkyCondition`) | — | no |

> Los 8 campos del bloque `current` (A-c) que pide `agroMeteoService.js:204` son los
> mismos 6 de hourly ya contados (temperature/rh/precip/weathercode/is_day/cloud) + los
> 2 de arriba. No inflan el conteo de las 24.

### B. Open-Meteo — archive API (reanálisis ERA5): las NORMALES para la anomalía

| variable | fuente | nivel | frescura (TTL) | ¿2D? dónde | ¿3D? | ¿Sierra? |
|---|---|---|---|---|---|---|
| `temperature_2m_mean` (archive, 12 años, ventana ±10 d) | Open-Meteo archive (ERA5) | N | 30 días | Sí: `temp_media_normal` → anomalía «hoy está X °C sobre lo normal» | — | no |
| `precipitation_sum` (archive) | Open-Meteo archive (ERA5) | N | 30 días | Sí: `precip_dia_normal`+desv → SPI de lluvia | — | no |
| `et0_fao_evapotranspiration` (archive) | Open-Meteo archive (ERA5, FAO-56 nativo) | N | 30 días | Sí: balance normal Kc 1.0 → SPEI de balance | — | no |

El único consumidor de `fetchNormales` es ClimaBoletinScreen (anomalía/SPI/SPEI).
**Es climatología, no el día de hoy**: el código lo etiqueta y la UI lo dice
(`FuenteFase source="archive"` → «Open-Meteo archive (ERA5)»).

### C. Snapshot del sidecar (`/clima/snapshot`, chagra-pro) — ENSO vivo + pronóstico local normalizado

Lado servidor **fuera del cwd**; contrato leído del lado cliente. Estado vivo medido por el
carril hermano (2026-09-04): `enso_status` presente («El Niño fuerte», ONI 1.8),
`openmeteo: null` sin coordenadas de finca, `climatologia: coords_required`, `ideam` falló.

| variable | fuente | nivel | frescura (TTL) | ¿2D? dónde | ¿3D? | ¿Sierra? |
|---|---|---|---|---|---|---|
| `enso_status.phase` (slugs nino_*/nina_*/neutral) | NOAA CPC (ONI) + IDEAM + CIIFEN vía sidecar | P | 30 min (cache snapshot) | Sí, extensivo: ClimaStrip, NotificationsBell, Bell tab, Página del Tiempo, `agentService.buildClimaContext`, alertEngine, cropAlertEngine, compai (ensoCanal, angelita) | **sesgo nino del valle** (medición brief) | **Sí: fase viva** |
| `enso_status.oni_value` | NOAA CPC | P | 30 min | Sí: contexto agente / HUD (módulo El Niño) | leída (HUD ONI) | no directa |
| `enso_status.trend` | NOAA CPC | P | 30 min | Lectura (grounding agente) | — | no |
| `enso_status.ideam_probabilities` {nino/neutral/nina_pct} | NOAA CPC/IRI + IDEAM | P | 30 min | `getEnsoOutlook`/`buildEnsoAgentLines`; si el feed no las trae, cae al estático `ENSO_WATCH_2026` (ver E) | — | no |
| `enso_status.label`/`severity` | sidecar | P | 30 min | Badge de fase y color (severity → verde/ámbar/rojo) | — | no |
| `alertas_locales` | sidecar (deriva de pronóstico) | P | 30 min | Bell / Página del Tiempo / compai (helada/escarcha) | leídas (alertas texto) | gate helada (opcional) |
| `openmeteo.available` + `forecast_7d[{date,temp_min_c,temp_max_c,precip_mm,weather_code,cloud_cover_mean_pct?}]` | Open-Meteo vía sidecar (4 vars hoy, según el seam de agroMeteoService) | P | 30 min | Sí: ClimaStrip, NotificationsBell, HoyEnFinca, AgentHero, compai climaVivo, useClima3DVivo. **Hoy sin coordenadas llega `openmeteo:null`** (medido) | **mueve el valle cuando hay coords** | no |
| `openmeteo.alertas` | sidecar | P | 30 min | Bell / Hoy / Página del Tiempo | leídas | gate helada |
| `openmeteo.current.cloud_cover*` | sidecar | **X hoy** | 30 min | **No emitido hoy** (medido): la cláusula forward-compat de atmosphereService sigue sin cumplirse en el contexto sin coords; el HUD de la vitrina quedó en `•••` | — | no |

### D. Derivados por Chagra (cliente puro, `agroIndices.js` + otros) — fórmula y respaldo

| índice | fuente | nivel | frescura (TTL) | ¿2D? dónde | ¿3D? | ¿Sierra? |
|---|---|---|---|---|---|---|
| **VPD** `vpdKpa` (es(T)·(1−HR/100), Tetens FAO-56 ec. 11) | D sobre T+HR Open-Meteo | D | 3 h | Sí: tile «Sed del aire» (Página del Tiempo) | — | no |
| `leerVpd` (lectura campesina, referencia agtech: <0.4 hongo / 0.8-1.5 confort / >2 estrés) | D (umbrales referencia, **no dr-crosseada**) | D | 3 h | Sí: color+texto del tile VPD | — | no |
| **ETc** `etcMm` = ETo × Kc (Kc FAO-56 Tabla 12, con `kcConfianza` alta/media/baja/pendiente) | D sobre ETo Open-Meteo | D | 3 h | Sí: tarjetas por cultivo (ETc, barra de agua) | — | no |
| **Balance hídrico día** `balanceHidricoDia` (lluvia − ETc; estados cubierto/justo/riego/exceso) | D sobre precip+ETc | D | 3 h | Sí: tarjetas cultivo, SPI/SPEI | — | no |
| `deficitAcumulado` (suma de faltas N días) | D | D | 3 h | **Exportada, sin consumidor en src hoy** | — | no |
| **Horas-frío** `horasFrio` (h con T < 7 °C, base FAO/UC-Davis) | D sobre serie horaria Open-Meteo | D | 3 h | Sí: tile Horas-frío | — | no |
| **SPI** `spi` = (precip − media histórica)/desv histórica | D sobre archive ERA5 (media/desv ventana ±10 d) | D | 30 d (normal) | Sí: tile SPI | — | no |
| **SPEI** `spei` = SPI aplicado al balance (precip − ETc Kc 1.0) | D sobre archive ERA5 | D | 30 d (normal) | Sí: tile SPEI | — | no |
| **Anomalía** `anomalia` (hoy vs normal: ΔT °C + Δprecip %) | D sobre forecast+normales | D | 3 h / 30 d | Sí: banner «Hoy está …» | — | no |
| `amplitudTermica` (máx−mín) | D | D | 3 h | Sí: tile + aviso helada/quemado | — | no |
| `leerUv` (escala OMS: <3/6/8/11) | D | D | 3 h | Sí: tile Rayos UV | — | no |
| **Presión de enfermedad** `presionEnfermedad` + `MODELOS_ENFERMEDAD` (6: roya_cafe, gota_papa, tizon_tomate, monilia_cacao, sigatoka_platano, antracnosis). Scorer: T en rango del hongo + horas mojado (HR≥90) | D (umbrales citados: Cenicafé/RustOnt alta; Smith/Hutton y Agrosavia **media, dr-cross pendiente**) | D | 3 h | Sí: semáforo verde/amarillo/rojo en tarjetas por cultivo + radar | — | no |
| **Condición del cielo** `classifySkyCondition` (despejado/parcial/nublado/niebla/lluvia + `confidence` alta/media/baja + `degraded` por orografía/ENSO) | D sobre cloud/weather_code WMO + corrección altoandina (≥2000 msnm tarde) y ENSO; prior por piso | D | 30 min | Sí: ícono y label honestos (ClimaStrip, bell, HoyEnFinca, AgentHero, grounding agente) | — | no |
| **Helada** `hayHelada` (no/aviso/rocio/escarcha/negra; escarcha exige tempMin≤umbral de piso + nubosidad<40 % + viento<10 km/h; negra ≤ −2 °C) | D sobre tempMin/nubosidad/viento/alertas/piso (umbrales `HELADA_MIN_C` por piso, = alertThresholds) | D | 30 min | Sí: avisos/compai «se abriga», ClimaStrip (piso helada) | gate único de la helada del valle (cable opcional) | gate helada del descenso (opcional) |
| `celdaClima`/`fenomenoEfectivo`/`pisoDeFinca` (regla dura: en frío/páramo «sol» bajo Niño → helada; ámbar prohibido en frío) | D (dirección de arte clima, paletas por piso) | D | — | Velo 2D (CieloENSO/pisos) | **cable del valle** | **Sierra: cota de nube/descenso** |
| **Luz** `deriveLuz` (amanecer/dia/atardecer/noche) | D astronómico (`skyEphemeris`), offline | D | reeval 10 min | Sí: velo `data-luz` en <html> | día/noche del valle (hour → clock) | — |
| **Atmósfera** `deriveCondicion`+`deriveEnso`+`applyAtmosphere` (velo CSS `data-clima/data-luz/data-enso`; alphas ≤0.16, kill-switch) | D sobre snapshot | **X hoy (sin cloud del sidecar)** | reeval 10 min | Sí: tema visual entero (App vía `useClimaAtmosphere`); **en contexto medido cae a null** → tema puro | — | — |
| **Riesgo de incendio** `evaluarRiesgoIncendio` (matriz temporada seca regional × ENSO) | D + climatología IDEAM (régimen de lluvias) | D (**es_estimacion: true, disclaimer, no es alerta oficial**) | 30 d (estacional) | Sí: grounding del agente, PDF de restauración (UNGRD) | — | no |
| **GDD / reloj térmico** `gddDia` (fuera de agroIndices: `gradosDiaCalculator`) | D sobre temp_min/max | D | 3 h | Sí: CultivoTarjeta (papa/maíz con Tb groundeada), calculadora de cultivos | — | no |

### E. SNAPSHOT / ESTÁTICO / SIN FUENTE VIVA — fechados, no se refrescan solos

| entrada | fuente | nivel | frescura | ¿2D? dónde | ¿3D? | ¿Sierra? | nota |
|---|---|---|---|---|---|---|---|
| `ENSO_CALENDARIO_2026_27` + `ENSO_TRANSICION` (probabilidades foto, pico nov-dic 2026) | NOAA CPC/IDEAM/CIIFEN (cross-check DR **2026-08-23**) | S | estático (foto fechada; la vigente se lee del boletín) | Sí: timeline «El Niño mes a mes»; el chip dice «foto del boletín … la vigente se lee del boletín en vivo» | — | — | honesto: la UI lo marca |
| `ENSO_WATCH_2026` (ONI ~0.0, transición 58-70 % trimestres) | NOAA CPC+IRI, plume **16-may-2026** | S | estático (fallback) | Fallback de probabilidades si el feed vivo no trae `ideam_probabilities` | — | — | **riesgo**: quedó desactualizado vs El Niño fuerte medido hoy (ONI 1.8); solo aplica cuando falta el dato vivo |
| `FUENTES_VIVAS` (URLs oficiales IDEAM/NOAA/UPRA…) | verificación HTTP 2026-08-23 | S | estático | Deep-links «contraste con el IDEAM oficial» | — | — | URLs de sección, no PDF fechado |
| `LLUVIA_MENSUAL_ZONA` / `PROBABILIDAD_TRANSICION` / `MTA_VENTANA_SIEMBRA.ventanaVigente` | IDEAM MTA | **X** | grounded_pendiente | **SlotPendiente explícito** («se lee del boletín vigente»), nunca número inventado | — | — | así debe ser; honesto |
| `climaBoletines` LECTURA/ACCIONES/REGLA (contenido pedagógico durable) | IDEAM/Fenalce (grounding 2026-07-04) | S | durable | Sí: pestaña «El Niño» | — | — | contenido, no dato numérico |
| `enso-modulacion.json` + `ensoModulador.modularPorENSO` | IDEAM, DR-AGUA-1 | S | estático | **NINGÚN consumidor en runtime (solo un test)** | — | — | dormante |
| `fichasAgroclimaticas.js` (8 fichas: rangos T/HR/altitud/lluvia + alertas con umbral y fuente) | AGROSAVIA/DANE-SIPSA/UTADEO/INIA/UPTC/WMO (verificadas, commit 7b7fc2053) | S (durable, con fuente) | durable | Sí: radar de cultivos, umbrales de alerta (`evaluarAlertasAgroclimaticas`) | — | — | rangos de cultivo, no pronóstico |
| `graph-stats-snapshot.json` | export del grafo | S | **fecha 2026-07-01** | `public/chagra-stats.json` (estadísticas de especies/aristas) | — | — | **NO es variable climática**; el brief lo pide marcar: fecha 2026-07-01 confirmada; mide el grafo (721 sp), distinto del catálogo (581) |
| `sierra-pisos-datos.json` + `sierraPisosDatos.js` (altitud y temperatura media por piso) | catálogo OSS × grafo (`scripts/build-sierra-pisos-datos.mjs`) | S | generado | — | — | **Sí: PanelDatosPiso en VistaGlobalSierra** | derivado de catálogo, no medición en vivo |
| sensores en finca (`applySensorCalibration`, `setAtmosphereCalibration`, incendio/calibración) | sin hardware hoy | **X** | — | identidad (no calibra) | — | — | forward-compat documentado, sin fuente |
| riesgo de incendio «alerta oficial en tiempo real IDEAM/UNGRD» | no existe API verificada | **X** | — | se declara y se remite a CMGRD/bomberos | — | — | anti-fabricación explícita en el servicio |

## 3. Cierre obligatorio

**1) ¿Cuántas variables hay y cuántas se ven en cada superficie?** (definición: filas de la
tabla de la §2; se excluyen solo las filas que son contenedores/fetch-compartidos «A-sky» y
«C openmeteo.current» se cuentan dentro de sus variables).

- Total de filas del inventario: **69** (A=27 · B=3 · C=9 · D=19 · E=11; conteo mecánico
  de la tabla de la §2). Base cruda Open-Meteo: **24 pedidas** (13 daily + 11 hourly) +
  **2** del bloque current no duplicadas + **3** del archive = **29 series crudas**; la
  fila «A-sky» es el fetch propio de `skyConditionService` (cloud current+daily +
  weather_code + precip, mismas variables, segundo camino de datos); **19 derivados por
  Chagra**, **9** del feed ENSO/pronóstico del sidecar, **11** estáticos/sin fuente.
- De esas **69 filas, 57 tienen consumo visible en el 2D** (todo lo que pinta la Página
  del Tiempo + strip/bell/hoy/agente/compai + los derivados usados), **15 tocan el 3D**
  (contadas con sus gates opcionales/espejos; del valle canónico solo **4 mueven la
  imagen**: precipitation, cloud_cover, is_day + fase ENSO, y hour/light salen del
  reloj — medición del brief, no re-verificada) y **6 tocan la Sierra** (de las cuales
  **solo 2 efectivas**: la fase ENSO viva y el panel estático de pisos; las otras 4 son
  gates opcionales alertas/helada/celdaClima que hoy no se alimentan). Cifras por fila
  «toca la superficie» (ver columna a columna para el matiz real).

**2) Las que Chagra ya tiene y nadie usa** (ordenadas por cuánto se notarían en pantalla):
1. `soil_moisture_0_1cm / 1_3cm / 3_9cm` — pedidas a Open-Meteo y expuestas en el payload,
   **cero consumidores**. De mostrarse, cambiarían la lectura de riego del campesino
   (la más notoria de las ociosas: es la «humedad del suelo» que el módulo de agua promete).
2. `shortwave_radiation_sum` (`radiacion_mj`) — pedida, calculada, no pintada.
3. `windgusts_10m_max` (`racha_max`) y `winddirection_10m_dominant` (`viento_dir`) — en el
   payload, sin UI; la racha sí se notaría como aviso de volcamiento.
4. `deficitAcumulado` (agroIndices) — exportado, sin consumidor.
5. `ensoModulador` + `enso-modulacion.json` — módulo completo dormante (solo test).
6. `apparent_temperature_max` diaria — calculada y no usada (el «se siente como» usa la
   *current*).

**3) Las que NO tenemos y harían falta** (con candidato de fuente):
1. **Humedad de suelo como dato real** (hoy pedida pero sin consumidor; y el módulo de
   riego usa balance meteorológico, no suelo): calibrar con sensores de campo en finca
   (estación BOM/teros) o habilitar el consumo de `soil_moisture_*` que ya llega.
2. **Acumulado/lluvia caída histórica de la finca** (compai climaVivo lo pide y usa un
   proxy «3 días secos» porque el snapshot no trae acumulado): fuente = archive ERA5
   ya disponible (`precipitation_sum` histórico).
3. **Pronóstico oficial departamental en vivo (BSA/Boletín Agroclimático IDEAM)** — hoy
   solo deep-link a la sección; el dato numérico IDEAM «manda» es una promesa, no un feed.
   Fuente: scraping/boletín IDEAM o el sidecar (MTA ENANDES).
4. **Probabilidades ENSO vigentes** (la foto es 2026-08-23 y el fallback 2026-05): el
   sidecar ya las trae cuando NOAA/IDEAM responden (medido: `ideam` falló).
5. **Radar/alertas oficiales de incendio en tiempo real** — no existe fuente pública
   verificada; el servicio ya se declara estimación.
6. **Viento/racha como dato visible** si la Página del Tiempo quiere avisos de
   volcamiento/tutoreo (ya llega por Open-Meteo, solo falta pintarlo).

**4) Las de baja confianza / rancias que hoy se muestran como si fueran firmes** — la
sección que más importa:
1. **`openmeteo.forecast_7d` del sidecar**: sin coordenadas de finca el lado vivo entrega
   `openmeteo: null` y la vitrina/HUD mostró las 4 métricas en `•••`. El riesgo real no es
   un número inventado (no se muestra), sino que **el HUD parece «lectura activa» cuando
   no hay señal**: el copy «SEÑAL CLIMÁTICA / LECTURA DE CAMPO: ACTIVA» convive con
   métricas vacías (medido 2026-09-04).
2. **`atmosphereService`**: la cláusula «si climaService empieza a emitir nubosidad» sigue
   **sin cumplirse** (el sidecar no emite cloud hoy); en el contexto medido `condicion`
   cae a null. No pinta falso, pero tampoco modula lo que el diseño promete.
3. **`ENSO_WATCH_2026`** (fallback estático, plume 2026-05: «Neutral con vigilancia, ONI
   0.0») ya contradice la fase viva medida (El Niño fuerte, ONI 1.8). Solo aplica si el
   feed no trae probabilidades, pero un agente que lo use como respaldo diría «vigilancia,
   58-70 % hacia dic-feb» en pleno Niño fuerte: **fecha de caducidad no controlada**.
4. **Pisos térmicos por altitud guardada** (el perfil puede no tener coordenadas) → la
   corrección orográfica y los umbrales de helada dependen de `msnm`, que sin coords cae a
   prior de municipio (centroide DANE) o a heurística: confianza «baja» en el clasificador,
   marcada en el propio código (`confidence: 'baja'`).
5. **`graph-stats-snapshot.json` (2026-07-01)** se usa para cifras públicas de «especies»
   (721) que el panel Sierra ya no mezcla (581 catálogo): el snapshot quedó rancio y la
   medición 2026-09-02 dio 743. No es clima, pero es la cifra rancia que el brief manda
   cazar.
6. **Kc y umbrales de enfermedad de confianza «media»** con `dr-cross pendiente` (gota,
   tizón, monilia, sigatoka, antracnosis) se muestran con semáforo — pero la UI declara la
   confianza (lo cual está bien y es lo que pide la regla).
7. **Fichas de 5 cultivos con `kcConfianza: 'pendiente'`** (fresa, granadilla, espinaca,
   gulupa, limón, guayaba): ETc no se calcula (kc {}), la UI muestra ETc en camino — no
   fabrica. Correcto, anotado.

**5) Lo que NO verifiqué (honestidad del canal)**:
- El valle canónico `~/demos/3d` (fuera del cwd): las columnas «3D» del valle son la
  medición del brief (lee 12 / mueve 4), NO re-medidas. Los espejos en-repo sí se leyeron.
- El **lado servidor del sidecar** (chagra-pro, fuera del cwd y privado): qué variables
  pide hoy exactamente (`snapshot` con 4 vars según el seam vs 16 de la Fase 0), por qué
  `ideam` falló, y si con coordenadas sí emite `cloud_cover`. El estado vivo citado es del
  carril hermano, no propio.
- **Caches vivos en localStorage** (si hay un snapshot de clima/ENSO fresco en un browser
  real ahora): solo verificable en browser con sesión; el carril hermano midió ENSO vivo
  (ONI 1.8) pero no dejé evidencia propia.
- Los rangos «óptimos» de las fichas agroclimáticas (respaldo editorial de cada fuente):
  tomados como ciertos del commit que los agrega, no re-verificados contra los PDF.
- Este modelo no recibe imágenes: nada de lo anterior es un juicio visual.

## 4. Evidencia reproducible

- Probe de conteo e imports reales: `_gate/clima-inventory-probe.mjs` (salida en §1).
- Tests verdes del dominio: 12 files / 183 tests (comando en §1).
- Verificación en vivo del mismo día (carril hermano, citada): `_gate/INFORME-VERIF-RADAR-CLIMA-20260904.md`.
- Sin commits a `chagra` (auditoría; reglas del brief). Soporte sin trackear en `./_gate/`.
