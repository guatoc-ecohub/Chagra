# INFORME — CLIMA PASO 2: Defectos de la Sierra

**Fecha**: 2026-09-02 · **Carril**: 3D (Paso 2 del plan `DISENO-TRANSICION-CLIMAS-20260902.md` §11) · **Origen**: `origin/dev` · **Rama**: `feat/clima-paso2-sierra-defectos`
**Fuente del texto normativo**: §2.3 (lo que la Sierra NO entrega), §6 (auditoría Humboldt), PASO 0 (decisiones del operador).

---

## Supuestos declarados (corro HEADLESS; asumí lo conservador, escrito acá)

1. **Paso 1 ya cerró y su tabla canónica existe** (`src/visual/mundo3d/pisosTermicos.js` con `PISOS_TERMICOS`). El orquestador me confirmó **Opción A**: afinar el contraste del render LEYENDO los colores canónicos de `pisosTermicos.js`, sin NUNCA editar la tabla. La consumí vía `import { PISOS_TERMICOS }` (mismo patrón que ya usa `PisosTermicosBandas.jsx`).
2. **No toqué `pisosTermicos.js`** ni `PISOS_DEF` (eso es el Paso 1, corre en paralelo).
3. **Los 12 FX Sylva siguen OFF por defecto** — no toqué ningún default de entrada pública; solo la escena `VistaGlobalSierra.jsx`.
4. **Defecto #2 (haz "usted está aquí")**: en la ruta de la puerta `#/mockups/sierra-global`, `VistaGlobalSierra` se monta con `<SierraGlobalMockup />` SIN `pisoUsuario`, así que `MarcadorPiso` **no se renderiza** en la captura (no aparece en ninguna de mis imágenes). Lo rehíce igualmente (defensivo, conservador): sin tocar la entrada pública, el marcador que exista dejará de lavar las bandas altas con bordes duros.
5. La fuente "valle" (§Paso 3/descenso) NO la toqué: el valle vive en el árbol `~/demos/3d` (`agua-valle.js`), es otra escena y no fue parte de este Paso 2. Solo `VistaGlobalSierra.jsx` cambió.

---

## Qué cambié (1 archivo)

`src/visual/mundo3d/VistaGlobalSierra.jsx` · `+108 / -35` · eslint `--max-warnings=0` limpio · `npm run tsc:check` exit 0 · `vite build` exit 0 · page errors 0 en captura.

| # | Defecto (§2.3) | Cambio |
|---|---|---|
| 1 | Banda nival NO se ve nevada | Color nival a `#f4f9ff` (blanco frío luminoso) + **línea de nieve MUCHO más nítida** (`±0.02` vs `±0.16`): filo nevado, no difuminado ocre. El casquete es **pequeño** por doctrina §6-B (solo la franja más alta, "muerde"), respetando el retroceso glaciar. |
| 2 | Haz "usted está aquí" lava bandas altas | `MarcadorPiso` rehíce: fuera el cono vertical translúcido grande (bordes rectos que leían como fuga de luz). Ahora = **aro fino pegado al suelo + núcleo/glow pequeño**, sin área de cobertura que tape el color de la banda. |
| 3 | Nubes poligonales (esferas hexa/hepta) | `NubesDeNiebla` de esferas facetadas a **billboards con textura fbm de canvas** (borde emplumado, patrón del jirón de `brumaVolumetrica.js`). Cero polígonos contables, offline-first, determinista. Es el "plano texturizado" que §10.4 recomienda para la vista global. |
| 4 | Contraste: ~3 bandas en vez de 7 | Los 6 pisos ecológicos **LEEN su color de `PISOS_TERMICOS`** (canónico) y la transición interior se angosta a `±0.09`. Resultado medido: **7 bandas legibles** (ver gate). `CLAVE_PISOS` actualizada al mismo juego de colores. |

---

## PUERTA — Gate visual (el operador juzga; yo NO certifico)

Captura **GPU-headed** (M6000, X vivo), **cuadro completo** 1280×800, `#/mockups/sierra-global`.
**Control pareado**: 2 corridas por estado (la escena es viva). Juez externo de familia distinta: **`judge-vl`** (qwen3-vl:8b, GPU local).

### Contacto — ¿se distinguen 7 bandas?
| Imagen | Pregunta | Juez responde |
|---|---|---|
| baseline-1 | "Cuántas franjas de color ves en la ladera" | **6** |
| after-1 / after-2 | idéntica | **7 / 7** |
| final-1 / final-2 (estado final, pareado) | idéntica | **7 / 7** |
| final-1 | enumeración | Lista **7**: playa/arena, Bosque seco (marrón), Selva húmeda (verde), Bosque de niebla (turquesa), Páramo (azul-gris), Superpáramo (azul claro), Nieve (blanco) |

→ **De 6 a 7 bandas legibles.** (El "~3" del diseño venía de un examen crítico humano a 300 %; en conteo de Juez, el antes daba 6 y el después 7, y la enumeración nombra las 7.)

### Contacto — ¿la cima es blanca?
| Imagen | Juez responde |
|---|---|
| final-1 | **blanco** ("Nieve perpetua", zona nival) |
| Cima a 300 % (final) | bordes **suaves** (no arista dura) |

### Contacto — ¿algún borde duro a 300 %? (regla de la casa)
| Crop 300 % | Juez responde |
|---|---|
| Cima/nieve (final) | **suaves** |
| Niebla/nubes **baseline** | **poligonos** (el defecto #3 era REAL, confirmado) |
| Niebla/nubes **final** | **suaves** |

→ Defecto #3 verificado por **control pareado en el mismo crop**: baseline = polígonos, final = suaves.

---

## Capturas crudas

En `_gate/paso2-sierra/`:
- `00-baseline-1.png`, `00-baseline-2.png` — ANTES (dev sin cambio).
- `01-final-1.png`, `01-final-2.png` — DESPUÉS (control pareado).
- `02-cima-final-zoom300.png` — cima nevada a 300 %.
- `03-niebla-baseline-zoom300.png`, `03-niebla-final-zoom300.png` — nubes, mismo crop, control pareado.

---

## Lo que me tocaría proponer a la tabla canónica (NO lo cambié)

- El nival canónico es `#eef2f4`; el render lo sube a `#f4f9ff` para que sobreviva a la luz dorada. Si el operador quiere el render idéntico al canónico, o mover la línea de nieve, es decisión de la tabla/arte, no mía. Documentado, no ejecutado.

## No certifico

No afirmo "listo/limpio". Entrego las capturas crudas y los conteos del Juez para que el operador juzgue, especialmente el contraste visual de las 7 bandas y si la nevada ahora convence bajo la luz dorada.
