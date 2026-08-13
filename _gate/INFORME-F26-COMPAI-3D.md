# INFORME F26 — jaguar, oso del bastón y luciérnaga dejan de ser la abeja en 3D

**Rama:** `fable/f26-compai-3d-tres` (desde `origin/dev` = `89191366f`) · **Fecha:** 2026-08-13
**Brief:** `Chagra-strategy/queue/fable-F26-presencia-3d-jaguar-oso-luciernaga.md`

---

## 1. Qué se medía ANTES (el control)

En `origin/dev`, `src/visual/mundo3d/escenas/compaiRegistry.js:77-79` tenía a los tres
tipos con `EscenaComponent: null, presencia: ABEJA_PRESENCIA, pendienteFable: true`:
elegir jaguar, oso del bastón o luciérnaga en la PWA montaba **la abeja Angelita**
dentro de cualquier mundo 3D (el bug histórico "oso→abeja" resucitado en tres tipos).
Los cuerpos 2.5D ya existían (`src/visual/creatures/{Jaguar,OsoBaston,Luciernaga}.jsx`
con sus identidades y tests de render) — faltaba la coreografía de presencia 3D.

## 2. Qué se hizo (reusar, no redibujar)

Molde seguido exactamente: `MaizCompaiEscena` / `ZariguyaCompaiEscena` (la escena posee
la coreografía, la creature posee el cuerpo). **Cero cuerpos nuevos, cero CSS nuevo**:
se reusan los tres cuerpos existentes, sus perfiles idle ya presentes en
`creatureIdle.js` (`jaguar`, `oso-baston`, `luciernaga`) y las clases genéricas del
billboard (`.mundo-abeja*`).

- **`JaguarCompaiEscena.jsx`** — felino de suelo: entra ACECHANDO desde el borde
  (`data-acecha`), camina pesado y silencioso (sin bob de paso — lo que se mueve es el
  rodar de los hombros), viaja con la marcha de perfil del cuerpo (`pose='camina'`,
  con histéresis de rig), patrulla en óvalos amplios, se echa (perfil idle: percha
  larga), y al toque de hotspot acecha un instante. La noche no lo duerme
  (crepuscular). Sale caminando sin prisa. **Jamás vuela ni trota.**
- **`OsoBastonCompaiEscena.jsx`** — caminante de trocha: llega a pie, paso LARGO y
  lento de plantígrado (cadencia a la mitad del trote de la zarigüeya) con vaivén de
  quien se apoya en un cayado, y **se detiene periódicamente a apoyarse en el bastón**
  (compuerta de marcha con cubo del seno — la pausa es parte del andar). Al llegar a
  su marca el bastón **FLORECE** (`data-florece`) — "por donde camina, florece" — y el
  toque también lo hace florecer. De noche acampa (es diurno: acá la hora sí viaja).
- **`LuciernagaCompaiEscena.jsx`** — sí vuela, pero no como la abeja: **deriva lento**
  (lerp 0.014 contra 0.05-0.06 de la abeja), **bajo** (ronda 0.6 contra 1.6), entra
  **encendiéndose por pulsos** (tres destellos de opacidad, nada de picada), el
  billboard entero **PULSA luz** (latido de opacidad 0.78..1), cada ~9s se detiene a
  **leer la noche** (`data-eco='leer'`) y con `hayAlerta` real de la finca la linterna
  titila `data-eco='degradado'` (la bioindicadora diagnosticando). Nocturna: la noche
  jamás la acurruca. Sale apagándose hacia arriba.
- **`jaguarIdentidad.js`** — se agregó `JAGUAR_PRESENCIA` (la única identidad de las
  tres que no traía presencia 3D; oso y luciérnaga ya la tenían).
- **`compaiRegistry.js`** — los tres registrados con escena + presencia propias,
  `pendienteFable: false`. La regla del fallback queda intacta en `resolverCompai`
  (tipo desconocido → Angelita sin lanzar; test lo cubre).
- **Tests** (31 en el seam, todos verdes): `compaiRegistry.test.js` ampliado (los tres
  con escena propia, las SEIS presencias distintas entre sí, fallback vivo) + tests de
  render POR CRIATURA (`JaguarCompaiEscena.test.jsx`, `OsoBastonCompaiEscena.test.jsx`,
  `LuciernagaCompaiEscena.test.jsx`): cuerpo correcto montado (no el de la abeja),
  billboard genérico, presencia de suelo/aire con las cifras firmadas, bastón en
  escena, florece al rebote, eco 'leer'/'degradado', data-hablando, reduced motion.

## 3. Qué certifica el gate (medido, no reportado)

| Check | Resultado |
|---|---|
| `npx vitest run` (seam compai: 4 archivos) | ✅ 31/31 verdes |
| `npx vitest run` (suite completa) | ⚠️ **68 fallos PRE-EXISTENTES** — idénticos en un worktree limpio de `origin/dev` en la misma máquina (comparado archivo por archivo: **cero fallos nuevos de este cambio**; el único delta entre corridas fue flaky en ambas direcciones). `boundaryAudit` falla igual (42 hits) en ambas ramas. |
| eslint (regla real del repo: staged files, `--max-warnings=0`) | ✅ 0 errores 0 warnings en los 9 archivos tocados. (`eslint .` repo completo muere por OOM de heap — igual en dev; el propio `deploy.yml` documenta esa OOM y por eso el gate de lint vive en lefthook pre-commit.) |
| `npm run tsc:check` | ✅ **666 errores = baseline exacto** de `origin/dev` (a mitad de camino eran 669: los 3 nuevos eran míos, en tests, corregidos). |
| `npm run build` | ✅ verde (11.7s, `vendor-three` 1.03MB como siempre) |
| **Captura GPU headed** (`shot3d --headed`, M6000, DISPLAY=:0, misma pasada) | ✅ 4/4 `MUNDO VIVO`, **0 page errors**, 0 request failures, en `#mockups/mundo3d-suelo` servido del build real (`dist/` + página bootstrap que fija las llaves de `escribirCompanero`) |

### La prueba que importa: los CUATRO se leen DISTINTOS entre sí (PNG mirados, no resumidos)

| Captura | Qué se ve |
|---|---|
| `f26-suelo-angelita-control.png` (+zoom) | **CONTROL**: la abeja de siempre — dorada, sombrero, alas — VOLANDO ALTO sobre el diorama. |
| `f26-suelo-jaguar.png` (+zoom) | Cuadrúpedo manchado (rosetas) DE PERFIL, caminando PEGADO AL PISO al pie del bloque, sombra de contacto bajo las patas. No vuela, no trota. |
| `f26-suelo-oso-baston.png` (+zoom) | Bípedo erguido oscuro con la luna crema del pecho, anteojos, botas y el BASTÓN FLORECIDO (flor amarilla encendida + follaje) más alto que él, plantado en el piso. |
| `f26-suelo-luciernaga.png` (+zoom) | ESCARABAJO con pronoto-escudo coral, élitros con costura, antenas filiformes y linterna pálida asomando, flotando BAJO con halo verde. Nada del vuelo alto de la abeja. |

Los ocho PNG (4 tomas completas + 4 zooms 3x) están en este directorio, commiteados.

## 4. Qué quedó SIN verificar (honesto)

- **El ARTE lo certifica el operador** — este gate solo certifica que dejaron de ser
  la abeja recoloreada, no que estén bien dibujados.
- **FPS / costo de frame**: no medido. Las coreografías siguen el patrón de la
  zarigüeya (cero alloc por frame, style-writes cacheados, `invalidate()` bajo
  demanda), pero no hay cifra.
- **Comportamientos temporales en vivo**: la entrada con cruce real 2D→3D (overlay
  del host), la salida, el florecer de llegada, la lectura periódica de la noche, el
  parpadeo de entrada y las reacciones al toque están cubiertos por tests unitarios y
  por construcción del molde, pero NO se observaron en video — la captura es un
  fotograma a los 9s.
- **De noche**: no se capturó el mundo nocturno (la luciérnaga es donde más brillaría).
- **El encarame/percha con foco en alto** (hotspot elevado): el jaguar y el oso se
  quedan en el piso por diseño; no se verificó visualmente con un hotspot activo alto.
- **Los otros mundos**: solo se capturó el mundo del suelo (mismo criterio que el gate
  de maíz/zarigüeya del PR #2803). El seam es el mismo para todos los mundos que
  montan `EscenaBase3D`.
