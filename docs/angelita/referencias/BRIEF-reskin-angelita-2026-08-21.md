# BRIEF — Re-skin de la angelita hacia la referencia aprobada (cara/expresión + sin guantes)
> Fable · arte. Aprobado por el operador 2026-08-21. **Cirugía, NO regeneración.**

## Objetivo
Que la angelita **que tiene todos los comportamientos** (agente `Angelita.jsx`, cuerpo `AbejaAngelita.jsx`) se parezca **en CARA y EXPRESIÓN** a la referencia aprobada, y que **NO tenga guantes/mitones**. Sin dañar NINGÚN comportamiento rubber-hose.

## Referencia (en disco)
- `docs/angelita/referencias/ref-abeja.png` — la abeja ámbar estilo **Cuphead / Miss Minutes 1930**: ojos grandes redondos muy expresivos, sonrisa ancha y amable, trazo grueso. **Su defecto: tiene guantes blancos → NO los copies.**
- `docs/angelita/referencias/roster-aprobado-2026-08-21.jpg` — el roster completo (contexto de estilo).
- Toma de la referencia SOLO: la **cara/expresión** (ojos + sonrisa) y la calidez del trazo. NO el color exacto del cuerpo (ver abajo).

## Archivos que SÍ tocás
1. `src/visual/creatures/_rubberhose.jsx` — componente `Miembro`: agregá un prop **opt-in** `sinGuante = false` (default = comportamiento actual, con mitón). Cuando `sinGuante` es true, la punta NO dibuja el círculo/elipse `glove` crema — deja el remate de manguera desnudo (o un puntito de tinta muy sutil). **El default NO cambia nada** → oso andino y colibrí conservan sus mitones.
2. `src/visual/creatures/AbejaAngelita.jsx` — pasá `sinGuante` a los 4 `Miembro` (2 brazos `crt-brazo-l/r` + 2 patitas). Y ajustá la CARA (los params de `OjosRubber` y `Sonrisa`, líneas ~279-288) para acercarla a la referencia: ojos un poco más grandes/redondos con buen catchlight, sonrisa más ancha y cálida. Trazo/expresión más "Cuphead".
3. Si hace falta afinar la cara viva del agente: `src/visual/agente/Angelita.jsx` (V3 la cara viva) — SOLO ajustes de expresión, sin tocar la lógica de estados.

## CONTRATO — lo que NO se puede romper (o los comportamientos mueren)
- **NO borres ni renombres** ninguna clase: `.crt-body`, `.crt-wing`, `.crt-brazo-l/r`, `rh-boil`, `rh-antic`, `rh-travieso`, `.crt-lengua`, `.crt-gota`, `.crt-polen-mota`.
- **NO borres** ninguna llamada del kit: `OjosRubber`, `Sonrisa`, `BocaVisema`, `Cachetes`, `Miembro`, `AntenaRubber`, `GafasSol`, `CejasRubber`. (Solo cambiás sus PARÁMETROS de dibujo, no los quitás.)
- **NO toques** los `data-*` que emite (`data-creature`, `data-pose`, `data-visema`, `data-gafas`, `data-cejas`, `data-animo`…): el CSS de comportamiento cuelga de ahí.
- **NO cambies** `abejaIdentidad.js` (paleta+proporciones) — la usa también la entrada 3D. Si querés calentar el ámbar, hacelo con moderación y solo si mejora; ante duda, dejá la paleta.
- **NO rompas** los opt-in: `visema` (lip-sync), `gafas`/`poniendose`, `pose` (vuela/celebra/reposo/señala), `clima`, `polen`, `poder`. Deben seguir funcionando igual.
- El cuerpo sigue siendo la **melipona** (cabeza/tórax oscuros + abdomen ámbar pálido sin bandas) — eso es correcto científicamente; el operador pidió parecerse en **cara y expresión**, NO recolorear todo a la Apis. Si el ámbar general se puede entibiar un pelo para acercarse a la referencia sin volverla Apis, bien; si no, dejalo.

## Verificación (tuya, antes de reportar)
- `npm run build` verde en `chagra`.
- Grep de que siguen emitiéndose `data-visema`, `data-gafas`, `data-pose` y que las clases del contrato siguen ahí.
- Rebuild + redeploy de la galería para que Opus verifique a ojo:
  `cd /home/kortux/Workspace/galeria-angelitas && npm run build && XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus microapp-deploy angelitas /home/kortux/Workspace/galeria-angelitas/dist --public`

## Reporte (dato, a Opus)
Qué cambiaste en la cara (params concretos), cómo quitaste el guante (el prop), si tocaste el ámbar, build+deploy. **Opus verifica GPU-headed en la galería antes de cantarle nada al operador.** No commits.
