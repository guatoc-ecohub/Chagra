# BRIEF — Angelita REDO: rubber-hose Cuphead + precisión científica Humboldt
> Fable · arte MÁXIMA. El re-skin anterior fue RECHAZADO por el operador: "no le vi cambio los colores y la forma, Humboldt la rechaza, del referente no capto nada". Esta vez SÍ se transforma.

## El objetivo (las DOS cosas a la vez, sin sacrificar ninguna)
1. **Estética rubber-hose Cuphead / Miss Minutes 1930** — cara grande y expresiva, ojos grandes con catchlight, sonrisa cálida, trazo que respira, squash-and-stretch. Como el referente `ref-abeja.png`.
2. **Precisión científica Humboldt** — es *Tetragonisca angustula* (abeja angelita, meliponino SIN aguijón): cabeza+tórax oscuros, abdomen ámbar pálido esbelto SIN bandas (las 3 barras son de la Apis europea), corbícula, antenas acodadas, remate redondo sin aguijón, alitas de tul. La anatomía correcta vive en el bestiario (`public/valle/juegos/bestiario/criaturas/angelita.js`) y en `abejaIdentidad.js`.

**El punto:** hoy la angelita no logra NINGUNA de las dos. Hay que FUSIONARLAS: una abeja que se lea como Cuphead Y como Tetragonisca real. No es una ni la otra — es las dos.

## Referencias (en disco)
- `docs/angelita/referencias/ref-abeja.png` — el rubber-hose/Cuphead objetivo (SIN sus guantes — eso ya se resolvió).
- `docs/angelita/referencias/roster-aprobado-2026-08-21.jpg` — el estilo aprobado del elenco.
- `public/valle/juegos/bestiario/criaturas/angelita.js` + la foto real de Tetragonisca (buscá referencia GBIF si hace falta) — la ANATOMÍA correcta.

## 🔴 SPEC DE ACCESORIOS (aclaración del operador 2026-08-21) — NO son permanentes
- **Gafas de sol = GESTO ÚNICO cuando hay SOL** (`esDiaSoleado`): se las pone (caída teatral) y **se las quita** cuando ya no hay sol. NO son permanentes, NO viven puestas.
- **Ruana = aparece con FRÍO** (clima frío/noche, ya existe vía `ropaDeClima`/`vestuario`): tampoco es permanente, se quita cuando no hace frío.
- **CONSECUENCIA CLAVE:** la CARA BASE (sin gafas) es la que se ve el 90% del tiempo → **los ojos grandes van en la cara base, sin capar por las gafas.** El re-skin anterior falló justo por esto: capó los ojos para que cupieran bajo gafas permanentes. NO repitas ese error — la gafa es transitoria, la cara base manda.

## ESTA VEZ SÍ PODÉS (el re-skin anterior falló por tímido)
- **Agrandar los ojos de verdad en la CARA BASE** (sin gafas) — grandes y expresivos como la referencia. Cuando la gafa entra (gesto de sol), que se adapte al ojo grande (agrandá la gafa si hace falta, `AngelitaGafas.jsx` autorizado), NO al revés.
- **Entibiar/rebalancear la paleta** (`abejaIdentidad.js`) si mejora la fusión — con cuidado de que la entrada 3D (`useEntradaAbeja`) siga leyéndose; medí que no rompés el 3D.
- **Cambiar la forma/proporciones** hacia la fusión (más carismática Y más correcta).
- Cambios grandes están permitidos. Lo que NO se toca: el CONTRATO de comportamiento.

## CONTRATO — lo que NO se rompe (los comportamientos)
- Clases: `.crt-body`, `.crt-wing`, `.crt-brazo-l/r`, `rh-boil`, `rh-antic`, `rh-travieso`, `.crt-lengua`, etc.
- Componentes del kit: `OjosRubber`, `Sonrisa`, `BocaVisema`, `Cachetes`, `Miembro` (con `sinGuante`), `AntenaRubber`, `GafasSol`, `CejasRubber`.
- data-attrs: `data-visema` (lip-sync), `data-gafas`, `data-pose`, `data-cejas`, `data-creature`, etc.
- Los opt-in: visema, gafas, pose, clima, polen, poder. Todo debe seguir funcionando.
- Los herederos del kit (oso andino, colibrí) NO deben cambiar — cualquier cambio al kit compartido va detrás de un prop.

## Verificación (tuya)
- `npm run build` verde + los tests de render (abeja/agente/oso/colibrí) verdes.
- Rebuild + redeploy de la galería para que Opus verifique a ojo.
- **Autocrítica honesta:** compará tu resultado contra AMBAS referencias y contra la anterior. Si no se ve claramente MÁS Cuphead Y MÁS Tetragonisca que la anterior, seguí. El operador ya rechazó una versión tímida.

## Reporte (a Opus)
Qué cambiaste (forma, paleta, ojos, gafas), cómo lograste la fusión rubber-hose+científica, qué del contrato preservaste. Opus verifica GPU-headed contra las dos referencias antes de mostrarle al operador. Sin commits.
