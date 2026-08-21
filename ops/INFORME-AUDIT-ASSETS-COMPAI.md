# INFORME: Auditoría de Assets compAI

**Fecha:** 2026-08-18
**Alcance:** PNGs en `public/valle/compai/laminas/`, SVGs en `public/valle/compai/rigs/`, referencias en `src/`
**Método:** Solo bytes (sin GPU, sin ojo). Validación de cabeceras PNG, dimensiones IHDR, cobertura alfa por decodificación de scanlines, parsing SVG, cruce de referencias.

---

## Control del instrumento

### Control positivo: `jaguar-natural.png`
- **Bytes:** 417,853
- **Header PNG:** VALIDO (magic bytes `89 50 4E 47 0D 0A 1A 0A`)
- **Dimensiones IHDR:** 705 x 394 (matchea la constante `ARCHIVO_LAMINA` en `anatomia.js:71`)
- **Cobertura alfa:** 49.8% píxeles con alfa > 0 (fondo transparente recortado, esperado para lámina de personaje)
- **Veredicto:** SANO. El instrumento lo clasifica correctamente.

### Control negativo: PNG de 0 bytes + SVG vacío
- **`empty.png` (0 bytes):** Header PNG = INVALIDO, clasificado como ROTO. Correcto.
- **`empty.svg` (`<svg></svg>`, 12 bytes):** Tiene tag `<svg>` pero 0 nodos de dibujo, marcado como EMPTY/ROTO. Correcto.

Ambos controles pasan. Los resultados que siguen son confiables dentro del alcance de la medición (bytes + cabeceras + alfa + referencias).

---

## Tabla de assets: PNG Láminas

| Asset | Bytes | Header | Dimensiones | % Alfa | Referenciado por | Veredicto |
|---|---|---|---|---|---|---|
| `angelita-cara.png` | 26,588 | OK | 96x114 | 78.5% | **NADIE** | HUÉRFANO |
| `angelita.png` | 119,427 | OK | 434x319 | 30.8% | `piloto-lamina.js` (kart) | SANO* |
| `chivito-actuando.png` | 463,437 | OK | 334x643 | 47.3% | **NADIE** | HUÉRFANO |
| `chivito-normal.png` | 284,290 | OK | 387x652 | 38.9% | `piloto-lamina.js` (kart) | SANO* |
| `chivito-punk.png` | 328,931 | OK | 397x654 | 43.5% | `piloto-lamina.js` (kart) | SANO* |
| `chivito-reposo.png` | 405,185 | OK | 331x589 | 43.3% | **NADIE** | HUÉRFANO |
| `jaguar-actuando.png` | 449,848 | OK | 463x455 | 37.6% | **NADIE** | HUÉRFANO |
| `jaguar-gesto.png` | 241,512 | OK | 408x458 | 42.3% | `piloto-lamina.js` (kart) | **DIM MISMATCH** |
| `jaguar-natural.png` | 417,853 | OK | 705x394 | 49.8% | `piloto-lamina.js` + `anatomia.js` + tests | SANO |
| `luciernaga.png` | 228,050 | OK | 367x507 | 42.0% | `piloto-lamina.js` (kart) | SANO |
| `oso-cara.png` | 331,658 | OK | 420x464 | 53.2% | **NADIE** | HUÉRFANO |
| `oso-cuerpo.png` | 299,775 | OK | 343x452 | 53.5% | **NADIE** | HUÉRFANO |
| `oso.png` | 425,313 | OK | 615x630 | 56.4% | `piloto-lamina.js` (kart) | SANO* |
| `zariguella.png` | 384,209 | OK | 472x411 | 39.2% | **NADIE** | HUÉRFANO |
| `zariguya.png` | 247,009 | OK | 481x444 | 39.7% | `piloto-lamina.js` (kart) | SANO* |

**Notas:**
- Los PNG marcados con `*` son SANO pero tienen **dimensiones declaradas distintas** a las reales en `piloto-lamina.js` (ver sección de abajo).
- Ningún PNG está en 0 bytes ni tiene header corrupto. El incidente que motivó esta auditoría (zariguya.defs.svg = 0 bytes en F24) fue un SVG, no un PNG.
- **Cobertura alfa 0% = no existe** en esta muestra. Todos los PNGs son RGBA con fondos transparentes recortados (30-79% de píxeles visibles), lo cual es correcto para láminas de personaje.

---

## Tabla de assets: SVG Rigs

| Asset | Bytes | `<svg>` | Nodos dibujo | Filtros | Gradientes | Referenciado por | Veredicto |
|---|---|---|---|---|---|---|---|
| `angelita.defs.svg` | 2,481 | fragmento | 9 | si | si | **NADIE** | HUÉRFANO |
| `angelita.rig.svg` | 11,138 | fragmento | 84 | no | no | **NADIE** | HUÉRFANO |
| `chivito.defs.svg` | 3,250 | fragmento | 30 | si | si | `ChivitoPunk.jsx` (via arte-valle) | SANO |
| `chivito.rig.svg` | 12,339 | fragmento | 116 | no | no | `ChivitoPunk.jsx` (via arte-valle) | SANO |
| `guacamaya.defs.svg` | 6,508 | fragmento | 62 | si | si | `GuacamayaCompai.jsx` (via arte-valle) | SANO |
| `guacamaya.rig.svg` | 8,938 | fragmento | 95 | no | no | `GuacamayaCompai.jsx` (via arte-valle) | SANO |
| `jaguar.defs.svg` | 4,012 | fragmento | 26 | si | si | **NADIE** (usa lamina PNG) | HUÉRFANO |
| `jaguar.rig.svg` | 37,547 | fragmento | 343 | no | no | **NADIE** (solo docstrings) | HUÉRFANO |
| `luciernaga.defs.svg` | 2,641 | fragmento | 12 | si | si | **NADIE** (usa rubberhose JSX) | HUÉRFANO |
| `luciernaga.rig.svg` | 9,462 | fragmento | 94 | no | no | **NADIE** (usa rubberhose JSX) | HUÉRFANO |
| `oso.defs.svg` | 3,839 | fragmento | 27 | si | si | **NADIE** (usa rubberhose JSX) | HUÉRFANO |
| `oso.rig.svg` | 26,188 | fragmento | 195 | no | no | **NADIE** (usa rubberhose JSX) | HUÉRFANO |
| `zariguya.defs.svg` | 1,354 | fragmento | 5 | no | si | **NADIE** (usa rubberhose JSX) | SANO* |
| `zariguya.rig.svg` | 10,650 | fragmento | 113 | si | no | **NADIE** (usa rubberhose JSX) | HUÉRFANO |

**Notas:**
- Todos los SVGs son **fragmentos** (empiezan por `<defs>` o `<g>`, no por `<svg>`). Esto es correcto: se inyectan vía `?raw` import o se montan en un `<svg>` contenedor en JSX. No son archivos standalone.
- `zariguya.defs.svg` fue regenerado el 2026-08-18 (nota en el archivo: "quedó 0 bytes desde F24").
- Los SVGs de `chivito` y `guacamaya` existen en DOS ubicaciones idénticas: `public/valle/compai/rigs/` y `src/visual/creatures/arte-valle/`. Los de arte-valle son los que importa el código. Los de `public/valle/` parecen ser el original del valle 3D (posiblemente consumidos por `~/demos/3d`).

---

## Referencias colgadas: código → archivo que no existe

**No se encontraron.** Todos los imports dinámicos (`?raw`) y constantes de path (`CARPETA_LAMINA + ARCHIVO_LAMINA`) apuntan a archivos que existen en disco. Las dimensiones declaradas en `piloto-lamina.js` matchean para 5 de 8 láminas (ver abajo).

---

## Dimensiones declaradas vs reales (piloto-lamina.js)

| Lámina | Declarado (ancho x altoPx) | Real (IHDR) | Estado |
|---|---|---|---|
| `jaguar-natural.png` | 705 x 394 | 705 x 394 | MATCH |
| `jaguar-gesto.png` | 569 x 661 | 408 x 458 | **MISMATCH (-161w, -203h)** |
| `oso.png` | 611 x 629 | 615 x 630 | MISMATCH (+4w, +1h) |
| `zariguya.png` | 481 x 444 | 481 x 444 | MATCH |
| `angelita.png` | 414 x 493 | 434 x 319 | **MISMATCH (+20w, -174h)** |
| `luciernaga.png` | 367 x 507 | 367 x 507 | MATCH |
| `chivito-punk.png` | 397 x 654 | 397 x 654 | MATCH |
| `chivito-normal.png` | 387 x 652 | 387 x 652 | MATCH |

**`jaguar-gesto.png`**: La discrepancia es grande (161px de ancho, 203px de alto). El archivo declarado parece ser de una versión anterior del arte. El archivo actual mide 408x458. Las `capas` medidas para anatomía en `jaguarLamina/anatomia.js` están calibradas sobre `jaguar-natural.png` (705x394), no sobre esta. **Riesgo de renderizado incorrecto** si `montarPilotoLamina` usa las dimensiones declaradas para escalar.

**`angelita.png`**: El archivo declarado era 414x493 (retrato vertical, 0.84:1). El actual es 434x319 (horizontal, 1.36:1). El `recorteV: 0.60` fue calibrado para el formato original. **Riesgo de recorte incorrecto.**

**`oso.png`**: Mismatch menor (+4w, +1h). Diferencia de redondeo, sin impacto práctico.

---

## Cruce compAI canónicos x assets

Los 7 compAI canónicos (según `elenco.js` + elenco unificado 2026-08-14):

| CompAI | Componente PWA | Tiene lámina PNG? | Tiene rig SVG? | Rendering method |
|---|---|---|---|---|
| angelita | `AbejaAngelita.jsx` | Si (`angelita.png`) | Si (en rigs/ pero no importado) | Rubberhose procedural SVG + kart lamina PNG |
| jaguar | `Jaguar.jsx` | Si (`jaguar-natural.png`) | Si (en rigs/ pero no importado) | 2.5D lamina PNG + kart lamina PNG |
| oso (baston) | `OsoBaston.jsx` | Si (`oso.png`) | Si (en rigs/ pero no importado) | Rubberhose procedural SVG + kart lamina PNG |
| zariguya | `Zariguya.jsx` | Si (`zariguya.png`) | Si (en rigs/ pero no importado) | Rubberhose procedural SVG + kart lamina PNG |
| chivito-punk | `ChivitoPunk.jsx` | Si (`chivito-punk.png`) | Si (`chivito.rig.svg` via arte-valle) | Rig SVG + kart lamina PNG |
| guacamaya | `GuacamayaCompai.jsx` | **No** | Si (`guacamaya.rig.svg` via arte-valle) | Rig SVG (sin lamina PNG) |
| luciernaga | `Luciernaga.jsx` | Si (`luciernaga.png`) | Si (en rigs/ pero no importado) | Rubberhose procedural SVG + kart lamina PNG |

**Confirmado:** La guacamaya NO tiene lámina PNG en `public/valle/compai/laminas/`. Los otros 6 sí.

---

## Huérfanos (archivo existe, nadie lo referencia en runtime)

### PNGs huérfanos (5 de 15)
1. **`angelita-cara.png`** (26,588 bytes, 96x114, 78.5% alfa) — Cara histórica de la abeja. La lámina activa es `angelita.png` (cuerpo entero, 434x319). Referencia histórica en el código pero sin consumo runtime.
2. **`chivito-actuando.png`** (463,437 bytes, 334x643, 47.3% alfa) — Pose de actuación. Sin referencia en código fuente.
3. **`chivito-reposo.png`** (405,185 bytes, 331x589, 43.3% alfa) — Pose de reposo. Sin referencia en código fuente.
4. **`jaguar-actuando.png`** (449,848 bytes, 463x455, 37.6% alfa) — Pose de actuación. Reemplazada por `jaguar-natural.png`. Solo mencionado en comentarios de `_gate/`.
5. **`oso-cara.png`** (331,658 bytes, 420x464, 53.2% alfa) — Cara del oso. Sin referencia en código fuente.
6. **`oso-cuerpo.png`** (299,775 bytes, 343x452, 53.5% alfa) — Cuerpo del oso. Sin referencia en código fuente.
7. **`zariguella.png`** (384,209 bytes, 472x411, 39.2% alfa) — Variante de nombre. Sin referencia en código fuente.

### SVGs huérfanos (10 de 14)
Los rigs SVG de angelita, jaguar, luciernaga, oso y zariguya (defs + rig = 10 archivos) **no son importados** por ningún componente PWA. Estos personajes usan rubberhose procedural SVG (`AbejaAngelita.jsx`, `OsoBaston.jsx`, `Luciernaga.jsx`, `Zariguya.jsx`) o lamina PNG (`Jaguar.jsx`). Los SVGs pueden ser consumidos por `~/demos/3d` u otros contextos fuera de este repo.

---

## Referencias colgadas (código → archivo inexistente)

**Ninguna encontrada.** Todos los imports de assets en código apuntan a archivos existentes:
- `anatomia.js` → `ARCHIVO_LAMINA = 'jaguar-natural.png'` → existe
- `ChivitoPunk.jsx` → `arte-valle/chivito.{rig,defs}.svg` → existen
- `GuacamayaCompai.jsx` → `arte-valle/guacamaya.{rig,defs}.svg` → existen

---

## Lo que no pude verificar

1. **Visual correctness**: No tengo GPU ni ojo. No puedo decir si una lámina se VE bien, si el arte es correcto, o si la pose corresponde al personaje. Las dimensiones de `jaguar-gesto.png` y `angelita.png` son sospechosas pero no puedo confirmar si causan problemas visuales sin renderizar.
2. **Duplicados arte-valle vs public/valle**: Los SVGs de chivito y guacamaya existen en ambas ubicaciones con idéntico byte count. No verifiqué si el contenido byte-a-byte es idéntico (solo comparé tamaño). Si se actualiza uno, el otro quedaría desincronizado.
3. **Consumo fuera de este repo**: Los SVGs en `public/valle/compai/rigs/` podrían ser consumidos por `~/demos/3d` u otros contextos que no puedo inspeccionar desde este cwd.
4. **Corrección del alfa con precisión de 1 bit**: Mi decodificador PNG reversa filtros por canal, pero no verifiqué contra una referencia externa. Para esta auditoría basta con distinguir 0% (ROTO) de >0% (con contenido). Los porcentajes son orientativos.

---

## Resumen ejecutivo

| Hallazgo | Cantidad | Severidad |
|---|---|---|
| PNGs en 0 bytes | 0 | — |
| PNGs con header corrupto | 0 | — |
| PNGs con 0% alfa | 0 | — |
| SVGs vacíos (`<svg></svg>`) | 0 | — (zariguya.defs fue regenerado tras el incidente F24) |
| Dimensiones declaradas != reales (significativo) | 2 | **MEDIA** (jaguar-gesto, angelita) |
| PNGs huérfanos | 7 | **BAJA** (ocupan 2.8 MB, ninguno roto) |
| SVGs huérfanos | 10 | **BAJA** (pueden ser consumidos por valle 3D) |
| Referencias colgadas | 0 | — |
| Guacamaya sin lamina PNG | 1 | INFO (diseño: usa rig SVG) |
