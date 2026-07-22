# Rescate de ramas del bosque/páramo — dictamen

**Fecha:** 2026-07-21
**Ramas juzgadas:** `fable/bosque-escena-takeA` (PR #2513) · `fable/bosque-escena-takeB` (PR #2510)
**Veredicto global: DESCARTAR TODO. Cero archivos portados. Cerrar ambos PRs.**

---

## 1. El dato que cambia el análisis

La comparación de tamaños contra `dev` era engañosa. El dato correcto es el **merge-base**:

```
merge-base(dev, takeA) = merge-base(dev, takeB) = 5dc8e7f3  (2026-07-16)
```

Ambas ramas salen del mismo punto y tienen **1–3 commits propios**:

| rama | commits fuera de `dev` |
|---|---|
| takeA | `69121947` (1 commit) |
| takeB | `bd2daab4`, `e91f352b` (2 commits) |

Las ~90.000 líneas de borrado **no son trabajo de las ramas**: son 257 commits que `dev` avanzó
mientras las ramas quedaban congeladas sobre una base del 16-jul. Las ramas no borran nada
deliberadamente; simplemente no tienen lo que vino después.

**Corolario crítico:** cuando un archivo es *más grande* en la rama que en `dev`, casi siempre
significa que la rama tiene la versión **vieja** y `dev` la adelgazó a propósito. Verificado abajo.

---

## 2. Los cuatro commits "de arte valioso": ya están en `dev` o fueron descartados por el autor

| commit | ¿en `dev`? | realidad |
|---|---|---|
| `69121947` take A — anfiteatro de niebla | no como commit | **su contenido SÍ**, vía PR **#2519** (MERGED 2026-07-16, "el bosque de páramo definitivo (toma A)"). `dev` lo evolucionó 5 días más. |
| `8028b5f8` frailejón roseta afelpada | no | **no pertenece a estas ramas** (vive en `fable/frailejones-roseta`). Su contenido está en `dev` vía PR **#2495** (MERGED 2026-07-16), más 3 commits posteriores de hoy. |
| `bd2daab4` toma B en clave Switch | no | toma alternativa **perdedora**. |
| `e91f352b` frailejón de pétalos carnosos | no | el propio mensaje del autor dice: *"preservado, **toma A ganó**"*. |

La decisión de toma A vs toma B **ya la tomó el operador el 16-jul** y está mergeada. Estas ramas
son las candidatas que ya compitieron y perdieron, no trabajo pendiente.

---

## 3. Dictamen archivo por archivo

### 3.1 Los dos "candidatos" que motivaron la revisión — DESCARTAR ambos

Se midieron como "mayores en las ramas" (`EntQuenua.jsx` +8, `FaunaBosque.jsx` +32). El diff real
muestra que **ninguna rama tocó estos archivos**: valen 673 y 1312 líneas en el merge-base *y* en
ambas ramas. `dev` los bajó a 665 y 1280 **quitando cosas a propósito**.

| archivo | veredicto | motivo (verificado en el diff) |
|---|---|---|
| `src/visual/mundo3d/bosque/FaunaBosque.jsx` | **DESCARTAR** | Las 32 líneas "de más" son **exactamente los bloques `oso-andino` y `borugo`** — la fauna **archivada por fea**. `dev` los eliminó deliberadamente. Portar esto resucita justo lo que descalifica la rama. |
| `src/visual/mundo3d/bosque/EntQuenua.jsx` | **DESCARTAR** | Las 8 líneas "de más" son la versión **vieja del ojo**, la que el propio código de `dev` documenta como rechazada: *"el ojo NO puede ser un disco naranja con reborde (goggles de caricatura)"*. `dev` tiene el ojo hundido en cuenca + `MasaFollaje` (masa de hojas con hueco y fleco) que las ramas no tienen. Portar = regresión ya rechazada. |

### 3.2 Escena y geometría del bosque — DESCARTAR

| archivo | veredicto | motivo |
|---|---|---|
| `bosque/bosqueTakeA.geom.js` | **DESCARTAR** | Ya existe en `dev` y **evolucionó allí**: `dev` migró al sistema compartido `crearSueloRico` (heightfield fbm + warp de dominio + sendero), expuso el contrato `sueloDelBosque` y `PALETA_BOSQUE`, y agrandó el queñual lejano a siluetas colosales (r 15–28, escala 1.5–2.4×). La versión de la rama es la previa, con `fusionarConNormales` a mano y `geomTerrenoBosque` suelto. Portar = deshacer #2519 y posteriores. |
| `bosque/EscenaBosqueVivo.jsx` | **DESCARTAR** | Ídem: `dev` es la versión posterior, ya con godrays, `CIELOS_HORA`/`TRANSICION` compartidos y niebla protagonista. |
| `bosque/floraParamo.geom.js` | **DESCARTAR** | `dev` (1074 líneas) trae el frailejón reconstruido **hoy** y aprobado por el operador: enagua de marcescentes en tejas, roseta densa en **espiral áurea** con tomento plateado y **gradiente de edad** (joven/adulto/viejo, ~1 cm/año). Las ramas tienen 711/784 líneas. Comparado, no asumido: gana `dev` por goleada. |
| `bosque/FloraParamo.jsx`, `EscenaEntMaestro.jsx`, `MundoEntBosque.jsx`, `entQuenua.geom.js`, `sombreadoVegetal.js` | **DESCARTAR** | Versiones del merge-base. Además las ramas **no tienen** `DoselBiodiverso.jsx`, `doselBiodiverso.geom.js` ni `corteSuelo.geom.js`, que sí existen en `dev`. |

### 3.3 El único archivo genuinamente exclusivo — DESCARTAR

| archivo | veredicto | motivo |
|---|---|---|
| `bosque/bosqueTakeB.geom.js` (519 líneas, solo en takeB) | **DESCARTAR** | Es la toma B estilizada que **ya perdió**. Sus tres técnicas de venta ya están en `dev`, y mejor factorizadas: **godrays** en `EscenaBosqueVivo.jsx`, **domo** como kit compartido `src/visual/mundo3d/kit/DomoCielo.jsx` (lo usan 6 escenas), **toon por bandas** en `src/visual/mundo3d/kit/bandas.js`. La rama las tiene como shader ad-hoc de una sola escena. Su `geomFrailejonTakeB` es además crudo: cilindro de 7 segmentos + dos anillos de conos, sin tomento, sin espiral, sin edad. Portarlo dejaría 519 líneas de código muerto no cableado — el antipatrón "construido pero no cableado". |

### 3.4 Contaminación no-bosque en takeB — DESCARTAR (peligroso)

El commit `e91f352b` toca archivos ajenos al bosque. Portarlos sería destructivo:

| archivo | rama | `dev` | veredicto |
|---|---|---|---|
| `src/mockups/valle/Valle3D.jsx` | 1787 | **2768** | **DESCARTAR** — la rama tiene el valle **pelado**. Pisar `dev` con esto borra el valle bueno. |
| `src/components/dashboard/FincaVivaHero.jsx` | 2265 | 2060 | **DESCARTAR** — `dev` es posterior (Angelita como agente, "umbral del valle" #2522); la rama es una bifurcación previa. |
| `src/components/dashboard/finca-viva-hero.css` | 1531 | 1461 | **DESCARTAR** — ídem. |
| `scripts/diag/frailejon-vitrina.html`, `tests/visual/visualTestUtils.js` | — | — | **DESCARTAR** — andamio de una decisión ya tomada. |

---

## 4. Qué se portó

**Nada.** No se creó rama ni PR: no hay un solo trozo de estas ramas que mejore `dev`.
Inventar un porte habría metido, en el mejor caso, código muerto, y en el peor la fauna archivada,
el ojo rechazado y el valle pelado.

---

## 5. Recomendación sobre los PRs

**Cerrar #2513 y #2510 sin mergear** (`gh pr close 2513 2510`), con nota de que el trabajo ya vive
en `dev` vía #2519 y #2495. Razones:

1. Ambos apuntan a `app-3d`, rama **muerta** (0 commits fuera de `dev`, 259 atrás, último 16-jul).
   Aunque se mergearan, no llegarían a `dev`.
2. Su contenido ganador ya está en `dev` y evolucionó cinco días más.
3. Mantenerlos abiertos invita a que alguien los mergee "por rescatar algo" y meta ~90k líneas de
   regresión.

**No borrar las ramas** — quedan como registro de la comparación toma A / toma B.

---

## 6. Lección para el próximo juicio de ramas

Comparar tamaños contra `dev` **miente** cuando la rama está atrasada. El primer comando de
cualquier triage de rama debe ser:

```
git merge-base origin/dev origin/<rama>
git log --oneline origin/dev..origin/<rama>     # lo que la rama REALMENTE aporta
```

Si un archivo es más grande en la rama y la rama **no lo tocó**, la rama tiene la versión vieja y
`dev` lo adelgazó por una razón. Aquí esa razón era, literalmente, el oso archivado por feo.
