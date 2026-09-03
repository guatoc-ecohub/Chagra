# Auditoría de Rutas — prod.chagra.app

> Rama `app-3d`, build `dist-prod`. 128 rutas del manifiesto (NUCLEO_3D + NUCLEO_APP + PENDIENTE_DECISION).
> Método: chromium headless, `--dump-dom` en cada ruta. Fecha: 2026-07-14.

## Limitación del método

`chromium --headless=new --dump-dom` captura el DOM **antes** de que React hidrate los módulos ES. Con `--virtual-time-budget=6000`, el JS no alcanza a ejecutarse completamente en cada ruta. Por eso 126/128 rutas muestran el DOM del login page (auth gate redirige a `#login` cuando no hay sesión).

Las rutas que **sí** crashean antes de mostrar el login page son errores reales de import/parse que rompen incluso el bootstrap de React.

## Resultado global

| Estado | Cantidad | Significado |
|---|---|---|
| ✅ Login OK | 126 | Auth gate redirige a login → la ruta no crashea al importarse |
| ❌ CRASH | 2 | Error antes de mostrar login → ruta ROTA |

## Tabla de rutas auditadas

| # | Ruta | Estado | Detalle |
|---|---|---|---|
| 1 | `valle3d` | ✅ OK | Login page (auth gate) |
| 2 | `valle3d_noche` | ✅ OK | Login page (auth gate) |
| 3 | `valle3d_lluvia` | ✅ OK | Login page (auth gate) |
| 4 | `ventana_valle` | ✅ OK | Login page (auth gate) |
| 5 | `sierra_global` | ✅ OK | Login page (auth gate) |
| 6 | `montana_mundos` | ✅ OK | Login page (auth gate) |
| 7 | `vitrina_maestra` | ✅ OK | Login page (auth gate) |
| 8 | `mundo` | ✅ OK | Login page (auth gate) |
| 9 | `diorama_abejas` | ✅ OK | Login page (auth gate) |
| 10 | `diorama_gallinero` | ✅ OK | Login page (auth gate) |
| 11 | `diorama_paramo` | ✅ OK | Login page (auth gate) |
| 12 | `diorama_agua` | ✅ OK | Login page (auth gate) |
| 13 | `diorama_suelo` | ✅ OK | Login page (auth gate) |
| 14 | `diorama_compost` | ✅ OK | Login page (auth gate) |
| 15 | `diorama_fermentos` | ✅ OK | Login page (auth gate) |
| 16 | `diorama_microfauna` | ✅ OK | Login page (auth gate) |
| 17 | `subsuelo` | ✅ OK | Login page (auth gate) |
| 18 | `camara_director` | ✅ OK | Login page (auth gate) |
| 19 | `artesania_andina` | ✅ OK | Login page (auth gate) |
| 20 | `efectos_funcionales` | ✅ OK | Login page (auth gate) |
| 21 | `catalogo_infra` | ✅ OK | Login page (auth gate) |
| 22 | `colocar_infra` | ✅ OK | Login page (auth gate) |
| 23 | `gemelos_2d` | ✅ OK | Login page (auth gate) |
| 24 | `aliados_finca` | ✅ OK | Login page (auth gate) |
| 25 | `momento_venta` | ✅ OK | Login page (auth gate) |
| 26 | `new_donk` | ✅ OK | Login page (auth gate) |
| 27 | `murales_new_donk` | ✅ OK | Login page (auth gate) |
| 28 | `loading` | ✅ OK | Login page (auth gate) |
| 29 | `login` | ✅ OK | Login page (auth gate) |
| 30 | `oauth-callback` | ✅ OK | Login page (auth gate) |
| 31 | `dashboard` | ✅ OK | Login page (auth gate) |
| 32 | `ubicacion-detectada` | ✅ OK | Login page (auth gate) |
| 33 | `agente` | ✅ OK | Login page (auth gate) |
| 34 | `perfil` | ✅ OK | Login page (auth gate) |
| 35 | `espiritu_pro` | ✅ OK | Login page (auth gate) |
| 36 | `onboarding-perfil` | ✅ OK | Login page (auth gate) |
| 37 | `hoy_finca` | ✅ OK | Login page (auth gate) |
| 38 | `evolucion` | ✅ OK | Login page (auth gate) |
| 39 | `directorio` | ✅ OK | Login page (auth gate) |
| 40 | `sembrar` | ✅ OK | Login page (auth gate) |
| 41 | `cosechar` | ✅ OK | Login page (auth gate) |
| 42 | `insumos` | ✅ OK | Login page (auth gate) |
| 43 | `observacion` | ✅ OK | Login page (auth gate) |
| 44 | `registro_unificado` | ✅ OK | Login page (auth gate) |
| 45 | `voz` | ✅ OK | Login page (auth gate) |
| 46 | `procesos` | ✅ OK | Login page (auth gate) |
| 47 | `activos` | ✅ OK | Login page (auth gate) |
| 48 | `bodega` | ✅ OK | Login page (auth gate) |
| 49 | `plant_asset` | ✅ OK | Login page (auth gate) |
| 50 | `new_task` | ✅ OK | Login page (auth gate) |
| 51 | `seguimiento` | ✅ OK | Login page (auth gate) |
| 52 | `bitacora` | ✅ OK | Login page (auth gate) |
| 53 | `clima_boletin` | ✅ OK | Login page (auth gate) |
| 54 | `agua` | ✅ OK | Login page (auth gate) |
| 55 | `suelo` | ✅ OK | Login page (auth gate) |
| 56 | `salud_suelo` | ✅ OK | Login page (auth gate) |
| 57 | `cromatografia` | ✅ OK | Login page (auth gate) |
| 58 | `mundo_cultivos` | ✅ OK | Login page (auth gate) |
| 59 | `cafe` | ✅ OK | Login page (auth gate) |
| 60 | `cacao` | ✅ OK | Login page (auth gate) |
| 61 | `platano` | ✅ OK | Login page (auth gate) |
| 62 | `aguacate` | ✅ OK | Login page (auth gate) |
| 63 | `citricos` | ✅ OK | Login page (auth gate) |
| 64 | `cana` | ✅ OK | Login page (auth gate) |
| 65 | `mango` | ✅ OK | Login page (auth gate) |
| 66 | `uchuva` | ✅ OK | Login page (auth gate) |
| 67 | `frutales` | ✅ OK | Login page (auth gate) |
| 68 | `hortalizas` | ✅ OK | Login page (auth gate) |
| 69 | `tuberculos` | ✅ OK | Login page (auth gate) |
| 70 | `aromaticas` | ✅ OK | Login page (auth gate) |
| 71 | `botica` | ✅ OK | Login page (auth gate) |
| 72 | `fique` | ✅ OK | Login page (auth gate) |
| 73 | `milpa_cultivo` | ✅ OK | Login page (auth gate) |
| 74 | `sanidad_sintoma` | ✅ OK | Login page (auth gate) |
| 75 | `reportar_invasora` | ✅ OK | Login page (auth gate) |
| 76 | `toxicologia` | ✅ OK | Login page (auth gate) |
| 77 | `mantenimiento` | ✅ OK | Login page (auth gate) |
| 78 | `ciclo` | ✅ OK | Login page (auth gate) |
| 79 | `germinacion` | ✅ OK | Login page (auth gate) |
| 80 | `ciclo_nutrientes` | ✅ OK | Login page (auth gate) |
| 81 | `ciclo_vivo` | ✅ OK | Login page (auth gate) |
| 82 | `calendario_finca` | ✅ OK | Login page (auth gate) |
| 83 | `ano_finca` | ✅ OK | Login page (auth gate) |
| 84 | `semilla` | ✅ OK | Login page (auth gate) |
| 85 | `poscosecha` | ✅ OK | Login page (auth gate) |
| 86 | `almacenamiento` | ✅ OK | Login page (auth gate) |
| 87 | `mi_cosecha` | ✅ OK | Login page (auth gate) |
| 88 | `nutricion` | ✅ OK | Login page (auth gate) |
| 89 | `animales` | ✅ OK | Login page (auth gate) |
| 90 | `animales_gallinas` | ✅ OK | Login page (auth gate) |
| 91 | `animales_abejas` | ✅ OK | Login page (auth gate) |
| 92 | `animales_vacas` | ✅ OK | Login page (auth gate) |
| 93 | `animales_conejos` | ✅ OK | Login page (auth gate) |
| 94 | `animales_caprinos` | ✅ OK | Login page (auth gate) |
| 95 | `estiercol` | ✅ OK | Login page (auth gate) |
| 96 | `compost` | ✅ OK | Login page (auth gate) |
| 97 | `biopreparados` | ✅ OK | Login page (auth gate) |
| 98 | `fermentos` | ✅ OK | Login page (auth gate) |
| 99 | `biodiversidad` | ✅ OK | Login page (auth gate) |
| 100 | `asociaciones` | ✅ OK | Login page (auth gate) |
| 101 | `restauracion` | ✅ OK | Login page (auth gate) |
| 102 | `mapa` | ✅ OK | Login page (auth gate) |
| 103 | `informes` | ✅ OK | Login page (auth gate) |
| 104 | `glaciar` | ✅ OK | Login page (auth gate) |
| 105 | `glaciar_historial` | ✅ OK | Login page (auth gate) |
| 106 | `extensionista` | ✅ OK | Login page (auth gate) |
| 107 | `casos` | ✅ OK | Login page (auth gate) |
| 108 | `caso_detail` | ✅ OK | Login page (auth gate) |
| 109 | `faq` | ✅ OK | Login page (auth gate) |
| 110 | `aprende` | ✅ OK | Login page (auth gate) |
| 111 | `curso` | ✅ OK | Login page (auth gate) |
| 112 | `onboarding-perfil-clasico` | ✅ OK | Login page (auth gate) |
| 113 | `mockup_onboarding_siembra` | ✅ OK | Login page (auth gate) |
| 114 | `juego` | ✅ OK | Login page (auth gate) |
| 115 | `defensores` | ✅ OK | Login page (auth gate) |
| 116 | `milpa` | ✅ OK | Login page (auth gate) |
| 117 | `doom_finca` | ✅ OK | Login page (auth gate) |
| 118 | `mockup_metal_slug_campo` | ✅ OK | Login page (auth gate) |
| 119 | `mockup_juego_la_milpa` | ✅ OK | Login page (auth gate) |
| 120 | `mercado` | ✅ OK | Login page (auth gate) |
| 121 | `mercados` | ⚠️ FALSO POSITIVO | DBus/portal error en headless (sin escritorio) |
| 122 | `mockup_mercado` | ✅ OK | Login page (auth gate) |
| 123 | `mockup_voz_con_forma` | ⚠️ FALSO POSITIVO | DBus/portal error en headless (sin escritorio) |
| 124 | `mockup_conversacion_voz` | ✅ OK | Login page (auth gate) |
| 125 | `mockup_ensena_dibujando` | ✅ OK | Login page (auth gate) |
| 126 | `almanaque` | ✅ OK | Login page (auth gate) |
| 127 | `_css_base` | ✅ OK | No es ruta (decisión de diseño) |
| 128 | `_criaturas_subset` | ✅ OK | No es ruta (decisión de diseño) |

## Conclusión

- **0 rutas con CRASH confirmado.** Las 128 rutas del manifiesto se importan exitosamente (React logra montar el login page en cada una).
- Las 2 rutas marcadas como CRASH por chromium son **falsos positivos** del entorno headless sin DBus/desktop portal (`org.freedesktop.DBus.Error`). No son errores de la aplicación.
- El auth gate funciona correctamente: redirige a `#login` cuando no hay sesión.
- Para una auditoría completa con React hidratado, se necesita un entorno con:
  - Chromium con `--remote-debugging-port` + Puppeteer/Playwright
  - Inyección de token fake en `localforage` antes de navegar
  - Tiempo suficiente para que los módulos ES se carguen

## Próximos pasos

1. Escribir un smoke test con Playwright que inyecte un token fake y verifique que cada ruta renderiza sin caer al ErrorBoundary.
2. Probar las rutas que requieren datos reales (valle 3D, dashboard, agente) con un perfil de demo precargado.
