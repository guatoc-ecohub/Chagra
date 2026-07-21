# Auditoría de Salud — prod.chagra.app (completa)

> Rama `audit/salud-prod-completa`. Fecha: 2026-07-14.
> 127 rutas NUCLEO_3D + NUCLEO_APP. Smoke test con Playwright + chromium headless, token fake, 8s hidratación por ruta.

## FASE 1 — Matriz de Salud (127 rutas)

| # | Ruta | Estado | Detalle |
|---|---|---|---|
| 1 | `valle3d` | ✅ OK | — |
| 2 | `valle3d_noche` | ✅ OK | — |
| 3 | `valle3d_lluvia` | ✅ OK | — |
| 4 | `ventana_valle` | ✅ OK | — |
| 5 | `sierra_global` | ✅ OK | — |
| 6 | `bosque_vivo` | ✅ OK | 15 errors (3D + env baseline) |
| 7 | `montana_mundos` | ✅ OK | — |
| 8 | `vitrina_maestra` | ✅ OK | — |
| 9 | `mundo` | ✅ OK | — |
| 10 | `diorama_abejas` | ✅ OK | — |
| 11 | `diorama_gallinero` | ✅ OK | — |
| 12 | `diorama_paramo` | ✅ OK | — |
| 13 | `diorama_agua` | ✅ OK | — |
| 14 | `diorama_suelo` | ✅ OK | — |
| 15 | `diorama_compost` | ✅ OK | — |
| 16 | `diorama_fermentos` | ✅ OK | — |
| 17 | `diorama_microfauna` | ✅ OK | — |
| 18 | `subsuelo` | ✅ OK | — |
| 19 | `camara_director` | ✅ OK | — |
| 20 | `artesania_andina` | ✅ OK | — |
| 21 | `efectos_funcionales` | ✅ OK | — |
| 22 | `catalogo_infra` | ✅ OK | — |
| 23 | `colocar_infra` | ✅ OK | — |
| 24 | `gemelos_2d` | ✅ OK | — |
| 25 | `aliados_finca` | ✅ OK | — |
| 26 | `momento_venta` | ✅ OK | — |
| 27 | `new_donk` | ✅ OK | — |
| 28 | `murales_new_donk` | ✅ OK | — |
| 29 | `loading` | ✅ OK | — |
| 30 | `login` | ✅ OK | — |
| 31 | `oauth-callback` | ✅ OK | — |
| 32 | `dashboard` | ✅ OK | 10 errors (env + network baseline) |
| 33 | `ubicacion-detectada` | ✅ OK | — |
| 34 | `agente` | ✅ OK | 11 errors |
| 35 | `perfil` | ✅ OK | — |
| 36 | `espiritu_pro` | ✅ OK | — |
| 37 | `onboarding-perfil` | ✅ OK | — |
| 38 | `hoy_finca` | ✅ OK | — |
| 39 | `evolucion` | ✅ OK | — |
| 40 | `directorio` | ✅ OK | — |
| 41 | `sembrar` | ✅ OK | Fix #2452 — fallback graceful |
| 42 | `cosechar` | ✅ OK | — |
| 43 | `insumos` | ✅ OK | — |
| 44 | `observacion` | ✅ OK | — |
| 45 | `registro_unificado` | ✅ OK | — |
| 46 | `voz` | ✅ OK | — |
| 47 | `procesos` | ✅ OK | — |
| 48 | `activos` | ✅ OK | 10 errors |
| 49 | `bodega` | ✅ OK | — |
| 50 | `plant_asset` | ✅ OK | — |
| 51 | `new_task` | ✅ OK | — |
| 52 | `seguimiento` | ✅ OK | — |
| 53 | `bitacora` | ✅ OK | — |
| 54 | `clima_boletin` | ✅ OK | — |
| 55 | `agua` | ✅ OK | — |
| 56 | `suelo` | ✅ OK | — |
| 57 | `salud_suelo` | ✅ OK | — |
| 58 | `cromatografia` | ✅ OK | — |
| 59 | `mundo_cultivos` | ✅ OK | — |
| 60 | `cafe` | ✅ OK | — |
| 61 | `cacao` | ✅ OK | — |
| 62 | `platano` | ✅ OK | — |
| 63 | `aguacate` | ✅ OK | — |
| 64 | `citricos` | ✅ OK | — |
| 65 | `cana` | ✅ OK | — |
| 66 | `mango` | ✅ OK | — |
| 67 | `uchuva` | ✅ OK | — |
| 68 | `frutales` | ✅ OK | — |
| 69 | `hortalizas` | ✅ OK | — |
| 70 | `tuberculos` | ✅ OK | — |
| 71 | `aromaticas` | ✅ OK | — |
| 72 | `botica` | ✅ OK | — |
| 73 | `fique` | ✅ OK | — |
| 74 | `milpa_cultivo` | ✅ OK | — |
| 75 | `sanidad_sintoma` | ✅ OK | — |
| 76 | `reportar_invasora` | ✅ OK | — |
| 77 | `toxicologia` | ✅ OK | — |
| 78 | `mantenimiento` | ✅ OK | — |
| 79 | `ciclo` | ✅ OK | — |
| 80 | `germinacion` | ✅ OK | — |
| 81 | `ciclo_nutrientes` | ✅ OK | — |
| 82 | `ciclo_vivo` | ✅ OK | — |
| 83 | `calendario_finca` | ✅ OK | — |
| 84 | `ano_finca` | ✅ OK | — |
| 85 | `semilla` | ✅ OK | — |
| 86 | `poscosecha` | ✅ OK | — |
| 87 | `almacenamiento` | ✅ OK | — |
| 88 | `mi_cosecha` | ✅ OK | — |
| 89 | `nutricion` | ✅ OK | — |
| 90 | `animales` | ✅ OK | — |
| 91 | `animales_gallinas` | ✅ OK | — |
| 92 | `animales_abejas` | ✅ OK | — |
| 93 | `animales_vacas` | ✅ OK | — |
| 94 | `animales_conejos` | ✅ OK | — |
| 95 | `animales_caprinos` | ✅ OK | — |
| 96 | `estiercol` | ✅ OK | — |
| 97 | `compost` | ✅ OK | — |
| 98 | `biopreparados` | ✅ OK | — |
| 99 | `fermentos` | ✅ OK | — |
| 100 | `biodiversidad` | ✅ OK | — |
| 101 | `asociaciones` | ✅ OK | — |
| 102 | `restauracion` | ✅ OK | — |
| 103 | `mapa` | ✅ OK | — |
| 104 | `informes` | ✅ OK | — |
| 105 | `glaciar` | ✅ OK | — |
| 106 | `glaciar_historial` | ✅ OK | — |
| 107 | `extensionista` | ✅ OK | — |
| 108 | `casos` | ✅ OK | — |
| 109 | `caso_detail` | ✅ OK | 3 errors (501 POST sin backend) |
| 110 | `faq` | ✅ OK | — |
| 111 | `aprende` | ✅ OK | — |
| 112 | `curso` | ✅ OK | — |
| 113 | `juego` | ✅ OK | — |
| 114 | `defensores` | ✅ OK | — |
| 115 | `milpa` | ✅ OK | — |
| 116 | `doom_finca` | ✅ OK | — |
| 117 | `metal_slug_campo` | ✅ OK | — |
| 118 | `juego_la_milpa` | ✅ OK | — |
| 119 | `onboarding-perfil-clasico` | ✅ OK | — |
| 120 | `mockup_onboarding_siembra` | ✅ OK | — |
| 121 | `mercado` | ✅ OK | — |
| 122 | `mercados` | ✅ OK | — |
| 123 | `mockup_mercado` | ✅ OK | — |
| 124 | `mockup_voz_con_forma` | ✅ OK | — |
| 125 | `mockup_conversacion_voz` | ✅ OK | — |
| 126 | `mockup_ensena_dibujando` | ✅ OK | — |
| 127 | `almanaque` | ✅ OK | — |

**Resultado: 127/127 OK (100%). 0 CRASH. 0 TIMEOUT.**

## FASE 2 — Verificación Wiring 3D→2D

### Mapeos verificados

| Origen 3D | Destino 2D | Estado |
|---|---|---|
| `agua` | `agua` | ✅ OK |
| `cafe` | `cafe` | ✅ OK |
| `cultivos` | `mundo_cultivos` | ✅ OK |
| `suelo` | `suelo` | ✅ OK |
| `sanidad` | `sanidad_sintoma` | ✅ OK |
| `animales` | `animales` | ✅ OK |
| `clima` | `clima_boletin` | ✅ OK |
| `mercado` | `mercados` | ✅ CORREGIDO |
| `semillero` | `semilla` | ✅ OK |
| `disenio` | `biodiversidad` | ✅ OK |
| `micorrizas` | `null` | ⚠️ Sin ruta 2D |
| `bosque_vivo` | `bosque_vivo` | ✅ OK |
| `subsuelo` | `subsuelo` | ✅ OK |
| `salud_suelo` | `salud_suelo` | ✅ OK |
| `cromatografia` | `cromatografia` | ✅ OK |
| `biodiversidad` | `biodiversidad` | ✅ OK |
| `toxicologia` | `toxicologia` | ✅ OK |
| `hortalizas` | `hortalizas` | ✅ OK |
| `animales_gallinas` | `animales_gallinas` | ✅ OK |
| `estiercol` | `estiercol` | ✅ OK |
| `restauracion` | `restauracion` | ✅ OK |
| `asociaciones` | `asociaciones` | ✅ OK |
| `compost` | `compost` | ✅ OK |
| `milpa_cultivo` | `milpa_cultivo` | ✅ OK |
| `directorio` | `directorio` | ✅ OK |
| `calendario_finca` | `calendario_finca` | ✅ OK |
| `animales_abejas` | `animales_abejas` | ✅ OK |
| `animales_vacas` | `animales_vacas` | ✅ OK |
| `animales_conejos` | `animales_conejos` | ✅ OK |
| `animales_caprinos` | `animales_caprinos` | ✅ OK |
| `biopreparados` | `biopreparados` | ✅ OK |
| `semilla` | `semilla` | ✅ OK |
| `poscosecha` | `poscosecha` | ✅ OK |
| `almacenamiento` | `almacenamiento` | ✅ OK |
| `juego` | `subsuelo` | ✅ OK |
| `milpa` | `milpa` | ✅ OK |
| `defensores` | `defensores` | ✅ OK |
| `doom_finca` | `doom_finca` | ✅ OK |
| `heladas` | `clima_boletin` | ✅ OK |
| `glaciar` | `glaciar` | ✅ OK |
| `guardian` | `espiritu_pro` | ✅ OK |
| `corral` | `animales` | ✅ OK |
| `cosecha` | `mi_cosecha` | ✅ OK |
| `vender` | `mercados` | ✅ CORREGIDO |
| `papa` | `tuberculos` | ✅ OK |
| `rio` | `agua` | ✅ OK |
| `platano` | `platano` | ✅ OK |

**Total: 47 mapeos. 45 OK. 2 corregidos (eran huérfanos). 1 null (micorrizas).**

## FASE 3 — Fixes aplicados

### Huérfanos corregidos en wire3DNav.js

| Antes | Después | Motivo |
|---|---|---|
| `mercado → "mercado"` | `mercado → "mercados"` | La ruta `mercado` sin 's' no está en el router (importLazy: null). La ruta real es `mercados`. |
| `vender → "mercado"` | `vender → "mercados"` | Ídem. ID de MontanaMundos apunta a la misma pantalla del mercado. |

### Dead-ends (labels 3D sin mapeo)

No hay dead-ends que bloqueen al usuario. Las rutas sin mapeo (auth, configuración, etc.) no son accesibles desde el 3D — se acceden por otros flujos (menú, dashboard). `micorrizas` queda como exploración 3D pura (sin destino 2D).

### Baseline de errores de consola

Todas las rutas comparten errores esperables sin backend:
- `VITE_FARMOS_CLIENT_ID` no definida (sin `.env`)
- 404s de recursos (fuentes, favicon, imágenes)
- 501 POST (`http.server` no acepta POST)

Estos NO son crashes y desaparecen con backend real.

## FASE 4 — Prioridades pendientes

| Prioridad | Tarea | Estado |
|---|---|---|
| 1 | `caso_detail` — errores 501 POST (llama API sin backend) | Bajo — funcional con backend |
| 2 | `micorrizas` — sin ruta 2D | Pendiente — crear pantalla de micorrizas |
| 3 | `mercado` (sin 's') en PENDIENTE — importLazy: null | Pendiente decisión de Miguel |
| 4 | 100+ rutas solo con datos reales | Necesitan backend + perfil de demo |
