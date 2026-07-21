# Diagnóstico: Navegación 3D → 2D en prod.chagra.app

> Rama `fix/wiring-nav-3d-a-2d`. Fecha: 2026-07-14.

## Rótulos del Valle 3D (Valle3D.jsx → RotulosLugares → onEntrar)

Los rótulos del valle llaman `onEntrar(m.id)` donde `m.id` es el ID del mundo/lugar en `valleData.js`. Antes solo enfocaban la cámara y mostraban un panel. Ahora también navegan al 2D correspondiente vía `window.location.hash`.

| Valle3D ID | Ruta Manifest | Componente |
|---|---|---|
| `agua` | `agua` | AguaScreen |
| `cafe` | `cafe` | CafeScreen |
| `cultivos` | `mundo_cultivos` | MundoCultivosHub |
| `suelo` | `suelo` | SoilDiagnosticScreen |
| `sanidad` | `sanidad_sintoma` | SanidadSintomaScreen |
| `animales` | `animales` | AnimalesScreen |
| `clima` | `clima_boletin` | ClimaBoletinScreen |
| `mercado` | `mercado` | MercadoScreen |
| `semillero` | `semilla` | SemillaScreen |
| `disenio` | `biodiversidad` | BiodiversidadView |
| `micorrizas` | — | Sin ruta 2D aún |
| `bosque_vivo` | `bosque_vivo` | MundoEntBosque |

## Hotspots internos de cada mundo 3D (mundoData.js)

Cada escena 3D tiene hotspots con `view:` que apuntan a sub-rutas.

| ID hotspot | Ruta Manifest |
|---|---|
| `subsuelo` | `subsuelo` |
| `salud_suelo` | `salud_suelo` |
| `cromatografia` | `cromatografia` |
| `biodiversidad` | `biodiversidad` |
| `toxicologia` | `toxicologia` |
| `hortalizas` | `hortalizas` |
| `animales_gallinas` | `animales_gallinas` |
| `estiercol` | `estiercol` |
| `restauracion` | `restauracion` |
| `asociaciones` | `asociaciones` |
| `compost` | `compost` |
| `milpa_cultivo` | `milpa_cultivo` |
| `directorio` | `directorio` |
| `calendario_finca` | `calendario_finca` |

## Montaña de los Mundos (MontanaMundosCampesino.jsx)

IDs de la montaña que no tienen escena 3D propia → navegan a ruta 2D.

| Montana ID | Ruta Manifest |
|---|---|
| `heladas` | `clima_boletin` |
| `glaciar` | `glaciar` |
| `restauracion` | `restauracion` |
| `cosecha` | `mi_cosecha` |
| `cafe` | `cafe` |
| `vender` | `mercado` |
| `mango` | `mango` |
| `platano` | `platano` |
| `rio` | `agua` |
| `papa` | `tuberculos` |
| `corral` | `animales` |
| `guardian` | `espiritu_pro` |

## Juegos promovidos de PENDIENTE_DECISION a NUCLEO_APP

Todos pasaron smoke test sin crash.

| Ruta | Componente | Antes | Ahora |
|---|---|---|---|
| `juego` | MiFincaVivaScreen | PENDIENTE | NUCLEO_APP |
| `defensores` | DefensoresFincaScreen | PENDIENTE | NUCLEO_APP |
| `milpa` | MilpaSimulator | PENDIENTE | NUCLEO_APP |
| `doom_finca` | DoomFincaScreen | PENDIENTE | NUCLEO_APP |
| `metal_slug_campo` | MetalSlugCampo | PENDIENTE | NUCLEO_APP |
| `juego_la_milpa` | JuegoLaMilpa | PENDIENTE | NUCLEO_APP |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/prodApp/wire3DNav.js` | **NUEVO** — Mapa de IDs 3D → rutas 2D + `navegarDesde3D()` |
| `src/mockups/EntradaValle3D.jsx` | `entrarMundo()` ahora navega al 2D con 700ms delay (cámara primero) |
| `src/mockups/MontanaMundosCampesino.jsx` | IDs sin escena ahora navegan a ruta 2D con 600ms delay |
| `src/config/rutasProdChagraApp.js` | 6 juegos movidos de PENDIENTE_DECISION a NUCLEO_APP |
