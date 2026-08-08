# Auditor "¿los árboles se mueven?"

Herramienta CLI en **Node puro (ESM, `.mjs`)** — sin `npm install`, sin red, sin GPU —
que audita un directorio de mundos 3D (Three.js) y reporta, archivo por archivo,
si los árboles tienen animación de viento o están congelados.

Contexto: en este proyecto hay una regla dura — *los árboles se mueven en TODOS
los mundos*. Un mundo con árboles estáticos es un bug. Esta herramienta vuelve
mecánica esa revisión que hoy se hace a ojo.

> **AVISO DE HONESTIDAD**: esto es una **heurística de texto**, no un parser de
> AST ni una verificación visual ni un render. **No reemplaza el gate visual
> humano.** Lo que hace es encontrar *señales* y medir su *cercanía*, y si no
> está seguro, lo dice con `confianza: baja` en vez de inventar.

## Uso

```
node auditor.mjs <directorio> [--json]
```

- Recorre `*.js` / `*.mjs` del directorio (recursivo).
- Salta `node_modules/`, `vendor/` y `dist/`.
- **Read-only**: nunca modifica los archivos que audita, solo lee e imprime.
- `--json`: imprime un objeto JSON válido (para CI o scripting).

```
node selfcheck.mjs   # corre el auditor sobre fixtures/ y verifica (exit 0 si todo OK)
```

## Qué decide por archivo

| Decisión        | Significado                                                        |
|-----------------|-------------------------------------------------------------------|
| `CON_MOVIMIENTO`  | hay árboles y una señal de movimiento cerca (mismo bloque o ≤ ~40 líneas) |
| `SIN_MOVIMIENTO`  | hay árboles pero ninguna señal de movimiento cerca de ellos       |
| `SIN_ARBOLES`     | no se encontró ninguna señal de árbol                             |

Además reporta `confianza` (`alta` / `media` / `baja`) y cita `archivo:línea`
de la evidencia que usó (tokens árbol y token de movimiento emparejado).

## Cómo funciona (las heurísticas)

**Señales de árbol** (identificadores y strings; también comentarios como
evidencia débil): `arbol(s)`, `árbol(es)`, `tree(s)`, `follaje`, `foliage`,
`copa`, `canopy`, `hoja(s)`, `leaf`, `leaves`, `tronco`, `trunk`, `bosque`,
`forest`.

**Señales de movimiento**, divididas en dos fuerzas:

- *Fuerte*: oscilación (`Math.sin`, `Math.cos`), viento (`viento`, `wind`,
  `sway`) y shader de viento (`vertexShader` con `displacement` /
  `desplazamiento` en un radio de 60 líneas).
- *Débil*: uso de tiempo (`elapsedTime`, `getElapsedTime`, `clock`, `delta`,
  `performance.now`, `uTime`, `u_time`, `time +=`).

**Ponderación por cercanía** — para evitar el falso positivo obvio ("el archivo
tiene `Math.sin`, luego el árbol se mueve", cuando el `Math.sin` es del agua,
del sol o de la cámara):

- Se calcula la distancia en líneas entre cada señal de árbol y cada señal de
  movimiento.
- Cuenta como relación si la señal de movimiento está **en el mismo bloque** que
  la señal de árbol (seguimiento de profundidad de llaves: misma función o un
  nivel de anidado) **o dentro de una ventana de ~40 líneas**.
- Mejor pareja (mismo bloque y señal fuerte gana) → decide y da confianza:
  - mismo bloque + señal fuerte → `alta`
  - ≤ 15 líneas + señal fuerte → `alta`
  - mismo bloque + solo tiempo → `media`
  - ventana de 40 + señal fuerte → `media`
  - ventana de 40 + solo tiempo → `baja`
- Si solo hay señales de árbol en **comentarios**, la confianza nunca sube de
  `baja`.

## Lo que NO detecta (leé esto antes de confiarle un mundo)

1. **No verifica visualmente** que la animación se *vea* (amplitud, curva,
   frame-rate, que el mesh esté conectado a la escena, que el update loop
   corra).
2. **No es un parser de AST**: un `Math.sin` dentro de un string, un comentario
   o un nombre de variable cuenta igual que en código. Un string GLSL con viento
   sí cuenta (es un shader real), pero un comentario `// viento` no cuenta.
3. **Falso positivo conocido**: si la animación de otro objeto (agua, cámara)
   vive **a menos de ~40 líneas** de un árbol **pero en otra función**, el
   auditor puede reportar `CON_MOVIMIENTO` con confianza `media`/`baja`. El
   fixture `arbol_estatico_con_agua.mjs` verifica el caso *separado por más de
   40 líneas*; el caso pegado es exactamente el límite de esta heurística.
4. **Falso negativo posible**: animación real por bone-morph, skeletal animation
   (`SkinnedMesh`), instancias con `InstancedMesh` o transformaciones vía
   `tween`/physics pueden no dejar ninguna señal que la heurística reconozca →
   `SIN_MOVIMIENTO` aunque el árbol se mueva.
5. **Idioma**: las señales cubren español e inglés común. Un shader de viento
   con nombres inventados (p. ej. `gustFactor`, `breezeAmount`) no suma señal
   salvo que use `sin`/`cos` vía `Math` o `wind`/`sway`/`viento`.
6. **Archivos enormes**: si la función de animación queda a más de ~200 líneas
   del código de creación del árbol dentro del mismo bloque, puede no emparejarse.

Por todo esto: **tratá `SIN_MOVIMIENTO` como señal de alerta, no como veredicto
final** — y el gate sigue siendo humano/visual.

## Fixtures (casos sintéticos de prueba)

| fixture | contenido | esperado |
|---|---|---|
| `arbol_viento.mjs` | árbol con `Math.sin` + viento + `getElapsedTime` en el mismo bloque | `CON_MOVIMIENTO` (alta) |
| `arbol_estatico.mjs` | árbol sin ninguna señal de movimiento | `SIN_MOVIMIENTO` (alta) |
| `solo_agua.mjs` | `Math.sin` solo para olas, sin árboles | `SIN_ARBOLES` |
| `arbol_estatico_con_agua.mjs` | árboles estáticos + agua animada en el MISMO archivo (agua a >40 líneas) | `SIN_MOVIMIENTO` |
| `arbol_shader_viento.mjs` | árbol con `vertexShader` + `displacement` | `CON_MOVIMIENTO` (alta) |
| `arbol_camara_animada.mjs` | árboles estáticos + cámara con `Math.sin`/`Math.cos` lejos | `SIN_MOVIMIENTO` |

El caso `arbol_estatico_con_agua` es el que separa una herramienta útil de una
inútil: hay `Math.sin` en el archivo, pero es del agua, no de los árboles.

## Ejemplos de salida

```json
{
  "directorio": "fixtures",
  "resumen": { "CON_MOVIMIENTO": 2, "SIN_MOVIMIENTO": 3, "SIN_ARBOLES": 1, "total": 6 },
  "resultados": [
    {
      "archivo": "fixtures/arbol_viento.mjs",
      "decision": "CON_MOVIMIENTO",
      "confianza": "alta",
      "explicacion": "Señal de movimiento (Math.sin) a 1 línea de un árbol (arbol) en el mismo bloque. Evidencia: arbol:26, Math.sin:27.",
      "relacion": { "arbol_linea": 26, "arbol_match": "arbol", "movimiento_linea": 27, "movimiento_match": "Math.sin", "distancia_lineas": 1, "mismo_bloque": true }
    }
  ]
}
```

Modo legible (sin `--json`):

```
archivo                                    decisión          confianza   evidencia
fixtures/arbol_estatico_con_agua.mjs      SIN_MOVIMIENTO    media       arboles@23
fixtures/arbol_viento.mjs                 CON_MOVIMIENTO    alta        arbol@26 -> Math.sin@27
```

## Verificación

```bash
node selfcheck.mjs               # DEBE dar exit 0
node auditor.mjs fixtures --json # DEBE imprimir JSON válido
```
