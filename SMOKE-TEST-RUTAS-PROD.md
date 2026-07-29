# Smoke Test — prod.chagra.app (126 rutas hidratadas)

> Playwright + chromium. Token fake en IndexedDB (`localforage`). 6s de espera por ruta.
> Rama `app-3d`, build `dist-prod`. Fecha: 2026-07-14.

## Resumen

| Estado | Cantidad | % |
|---|---|---|
| ✅ OK | **121** | 96.0% |
| ❌ CRASH | 1 | 0.8% |
| ⏱️ TIMEOUT | 4 | 3.2% |
| **Total** | **126** | |

## Rutas CRASH o TIMEOUT

| Ruta | Estado | Causa | Acción |
|---|---|---|---|
| `sembrar` | ❌ CRASH | `VITE_FARMOS_CLIENT_ID` no definida — `SeedingLog` requiere este env var y crashea sin él | Hacer el cliente ID opcional o usar un fallback |
| `aliados_finca` | ⏱️ TIMEOUT | Screenshot 30s timeout — escena 3D pesada (`AliadosFinca3D`) no termina de renderizar en headless | Revisar rendimiento en tier bajo |
| `plant_asset` | ⏱️ TIMEOUT | Screenshot 30s timeout — `AssetDetailView` con carga de datos pesada | Revisar lazy loading de sub-componentes |
| `mundo_cultivos` | ⏱️ TIMEOUT | `page.goto` timeout 20s — el import de `MundoCultivosHub` no resuelve | Posible dependencia circular o red |
| `mercado` | ⏱️ TIMEOUT | Screenshot 30s timeout — carga de fuentes bloquea el render | Revisar preload de fuentes |

## Tabla completa

| # | Ruta | Estado | Errores de consola |
|---|---|---|---|
| 1 | `valle3d` | ✅ OK | 8 (env var + 404s) |
| 2 | `valle3d_noche` | ✅ OK | 8 |
| 3 | `valle3d_lluvia` | ✅ OK | 8 |
| 4 | `ventana_valle` | ✅ OK | 8 |
| 5 | `sierra_global` | ✅ OK | 8 |
| 6 | `montana_mundos` | ✅ OK | 8 |
| 7 | `vitrina_maestra` | ✅ OK | 8 |
| 8 | `mundo` | ✅ OK | 8 |
| 9 | `diorama_abejas` | ✅ OK | 8 |
| 10 | `diorama_gallinero` | ✅ OK | 8 |
| 11 | `diorama_paramo` | ✅ OK | 8 |
| 12 | `diorama_agua` | ✅ OK | 8 |
| 13 | `diorama_suelo` | ✅ OK | 8 |
| 14 | `diorama_compost` | ✅ OK | 8 |
| 15 | `diorama_fermentos` | ✅ OK | 8 |
| 16 | `diorama_microfauna` | ✅ OK | 8 |
| 17 | `subsuelo` | ✅ OK | 8 |
| 18 | `camara_director` | ✅ OK | 8 |
| 19 | `artesania_andina` | ✅ OK | 8 |
| 20 | `efectos_funcionales` | ✅ OK | 8 |
| 21 | `catalogo_infra` | ✅ OK | 15 (env + 404s + más) |
| 22 | `colocar_infra` | ✅ OK | 8 |
| 23 | `gemelos_2d` | ✅ OK | 8 |
| 24 | `aliados_finca` | ⏱️ TIMEOUT | screenshot 30s |
| 25 | `momento_venta` | ✅ OK | 8 |
| 26 | `new_donk` | ✅ OK | 8 |
| 27 | `murales_new_donk` | ✅ OK | 8 |
| 28 | `loading` | ✅ OK | 8 |
| 29 | `login` | ✅ OK | 8 |
| 30 | `oauth-callback` | ✅ OK | 8 |
| 31 | `dashboard` | ✅ OK | 8 |
| 32 | `ubicacion-detectada` | ✅ OK | 8 |
| 33 | `agente` | ✅ OK | 11 (env + 404s + más) |
| 34 | `perfil` | ✅ OK | 8 |
| 35 | `espiritu_pro` | ✅ OK | 8 |
| 36 | `onboarding-perfil` | ✅ OK | 8 |
| 37 | `hoy_finca` | ✅ OK | 8 |
| 38 | `evolucion` | ✅ OK | 8 |
| 39 | `directorio` | ✅ OK | 8 |
| 40 | `sembrar` | ❌ CRASH | `VITE_FARMOS_CLIENT_ID` requerida + 404s |
| 41 | `cosechar` | ✅ OK | 8 |
| 42 | `insumos` | ✅ OK | 8 |
| 43 | `observacion` | ✅ OK | 8 |
| 44 | `registro_unificado` | ✅ OK | 8 |
| 45 | `voz` | ✅ OK | 8 |
| 46 | `procesos` | ✅ OK | 8 |
| 47 | `activos` | ✅ OK | 10 |
| 48 | `bodega` | ✅ OK | 8 |
| 49 | `plant_asset` | ⏱️ TIMEOUT | screenshot 30s |
| 50 | `new_task` | ✅ OK | 8 |
| 51 | `seguimiento` | ✅ OK | 8 |
| 52 | `bitacora` | ✅ OK | 8 |
| 53 | `clima_boletin` | ✅ OK | 8 |
| 54 | `agua` | ✅ OK | 8 |
| 55 | `suelo` | ✅ OK | 8 |
| 56 | `salud_suelo` | ✅ OK | 8 |
| 57 | `cromatografia` | ✅ OK | 8 |
| 58 | `mundo_cultivos` | ⏱️ TIMEOUT | goto 20s |
| 59 | `cafe` | ✅ OK | 8 |
| 60 | `cacao` | ✅ OK | 8 |
| 61 | `platano` | ✅ OK | 8 |
| 62 | `aguacate` | ✅ OK | 8 |
| 63 | `citricos` | ✅ OK | 8 |
| 64 | `cana` | ✅ OK | 8 |
| 65 | `mango` | ✅ OK | 8 |
| 66 | `uchuva` | ✅ OK | 8 |
| 67 | `frutales` | ✅ OK | 8 |
| 68 | `hortalizas` | ✅ OK | 8 |
| 69 | `tuberculos` | ✅ OK | 8 |
| 70 | `aromaticas` | ✅ OK | 8 |
| 71 | `botica` | ✅ OK | 8 |
| 72 | `fique` | ✅ OK | 8 |
| 73 | `milpa_cultivo` | ✅ OK | 8 |
| 74 | `sanidad_sintoma` | ✅ OK | 8 |
| 75 | `reportar_invasora` | ✅ OK | 8 |
| 76 | `toxicologia` | ✅ OK | 8 |
| 77 | `mantenimiento` | ✅ OK | 8 |
| 78 | `ciclo` | ✅ OK | 8 |
| 79 | `germinacion` | ✅ OK | 8 |
| 80 | `ciclo_nutrientes` | ✅ OK | 8 |
| 81 | `ciclo_vivo` | ✅ OK | 8 |
| 82 | `calendario_finca` | ✅ OK | 8 |
| 83 | `ano_finca` | ✅ OK | 8 |
| 84 | `semilla` | ✅ OK | 8 |
| 85 | `poscosecha` | ✅ OK | 8 |
| 86 | `almacenamiento` | ✅ OK | 16 |
| 87 | `mi_cosecha` | ✅ OK | 8 |
| 88 | `nutricion` | ✅ OK | 8 |
| 89 | `animales` | ✅ OK | 8 |
| 90 | `animales_gallinas` | ✅ OK | 8 |
| 91 | `animales_abejas` | ✅ OK | 8 |
| 92 | `animales_vacas` | ✅ OK | 8 |
| 93 | `animales_conejos` | ✅ OK | 8 |
| 94 | `animales_caprinos` | ✅ OK | 8 |
| 95 | `estiercol` | ✅ OK | 8 |
| 96 | `compost` | ✅ OK | 8 |
| 97 | `biopreparados` | ✅ OK | 8 |
| 98 | `fermentos` | ✅ OK | 8 |
| 99 | `biodiversidad` | ✅ OK | 8 |
| 100 | `asociaciones` | ✅ OK | 8 |
| 101 | `restauracion` | ✅ OK | 8 |
| 102 | `mapa` | ✅ OK | 8 |
| 103 | `informes` | ✅ OK | 8 |
| 104 | `glaciar` | ✅ OK | 8 |
| 105 | `glaciar_historial` | ✅ OK | 8 |
| 106 | `extensionista` | ✅ OK | 8 |
| 107 | `casos` | ✅ OK | 8 |
| 108 | `caso_detail` | ✅ OK | 8 |
| 109 | `faq` | ✅ OK | 8 |
| 110 | `aprende` | ✅ OK | 8 |
| 111 | `curso` | ✅ OK | 8 |
| 112 | `onboarding-perfil-clasico` | ✅ OK | 8 |
| 113 | `mockup_onboarding_siembra` | ✅ OK | 8 |
| 114 | `juego` | ✅ OK | 8 |
| 115 | `defensores` | ✅ OK | 8 |
| 116 | `milpa` | ✅ OK | 8 |
| 117 | `doom_finca` | ✅ OK | 8 |
| 118 | `mockup_metal_slug_campo` | ✅ OK | 8 |
| 119 | `mockup_juego_la_milpa` | ✅ OK | 8 |
| 120 | `mercado` | ⏱️ TIMEOUT | screenshot 30s (fuentes) |
| 121 | `mercados` | ✅ OK | 8 |
| 122 | `mockup_mercado` | ✅ OK | 8 |
| 123 | `mockup_voz_con_forma` | ✅ OK | 8 |
| 124 | `mockup_conversacion_voz` | ✅ OK | 8 |
| 125 | `mockup_ensena_dibujando` | ✅ OK | 8 |
| 126 | `almanaque` | ✅ OK | 8 |

## Notas

- **8 errores baseline** en casi todas las rutas: `VITE_FARMOS_CLIENT_ID` faltante (no hay `.env` en el smoke test) + 404s de recursos (favicon, fonts). Son esperables sin backend real.
- **121/126 rutas (96%) renderizan React correctamente.** El ErrorBoundary NO se activa en ninguna.
- Los 4 TIMEOUT son probablemente problemas de performance en headless (escenas 3D complejas, carga de fuentes) más que bugs de la ruta en sí.
- `sembrar` es el único CRASH genuino: `SeedingLog` requiere `VITE_FARMOS_CLIENT_ID` y lanza error sin él. Se debe hacer el env var opcional o inyectarlo en runtime.
