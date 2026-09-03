/*
 * nsRigValle — namespacing de ids para los rigs SVG reusados del valle (F24,
 * `~/demos/3d/compai/rigs/`, copiados verbatim en este directorio).
 *
 * El rig + defs + css originales asumen UNA SOLA instancia en la página (ids
 * planos: #cuerpoRig, #alaIzq, #boil…) — la demo del valle los monta uno a la
 * vez. En la PWA varias criaturas conviven en el MISMO documento a la vez (el
 * grid de `AgentAvatarSelector` monta las 8 opciones al tiempo, y guacamaya +
 * chivito-punk COMPARTEN nombres de id como `#cuerpoRig`/`#picoBajo`). Sin
 * namespacing, el selector CSS `#cuerpoRig{...}` de una criatura anima
 * también el `<g id="cuerpoRig">` de la otra — un cruce real, no hipotético.
 *
 * Esta utilidad reescribe cada `id="x"` declarado en el SVG a `id="x-<sufijo>"`
 * y actualiza toda referencia (`url(#x)`, `href="#x"`, selector CSS `#x`) al
 * mismo sufijo. Solo toca los ids REALMENTE declarados en el propio SVG
 * (matcheados por nombre exacto, con límite de palabra) — los colores hex de
 * las hojas de estilo (`#2a140b`, etc.) quedan intactos porque no coinciden
 * con ningún id declarado.
 */

/** Recolecta los ids declarados (`id="x"`) en un fragmento SVG. */
export function idsDeclaradosEnSvg(svgTexto) {
  const ids = new Set();
  const re = /\bid="([^"]+)"/g;
  let m = re.exec(svgTexto);
  while (m) {
    ids.add(m[1]);
    m = re.exec(svgTexto);
  }
  return ids;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reescribe ids + referencias (`url(#x)`, `href="#x"`) en el marcado SVG. */
export function namespaceSvg(svgTexto, ids, sufijo) {
  let out = svgTexto;
  for (const id of ids) {
    const safe = escapeRegExp(id);
    out = out
      .replace(new RegExp(`id="${safe}"`, 'g'), `id="${id}-${sufijo}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${id}-${sufijo})`)
      .replace(new RegExp(`href="#${safe}"`, 'g'), `href="#${id}-${sufijo}"`)
      .replace(new RegExp(`xlink:href="#${safe}"`, 'g'), `xlink:href="#${id}-${sufijo}"`);
  }
  return out;
}

/** Reescribe los selectores CSS por id (`#x`) al mismo sufijo. Deja intactas
 *  las clases (`.x`) y los colores hex — el cruce de clases compartidas
 *  (p.ej. `.flota`, `.pupila`) entre dos criaturas simultáneas es un cruce
 *  cosmético menor conocido (cadencia de parpadeo/flote), no estructural;
 *  namespacearlas también queda para una segunda pasada si hace falta. */
export function namespaceCss(cssTexto, ids, sufijo) {
  let out = cssTexto;
  for (const id of ids) {
    const safe = escapeRegExp(id);
    out = out.replace(new RegExp(`#${safe}\\b`, 'g'), `#${id}-${sufijo}`);
  }
  return out;
}

/**
 * Extrae SOLO el bloque de CSS del rig (desde el comentario `/* ===== NOMBRE
 * — rig rubber-hose ... *\/` hasta el final del archivo) de la hoja de estilo
 * completa de la demo del valle. La hoja completa trae chrome de página
 * (`*`, `body`, `header`, `#lienzo`, `#burbuja`, `#controles`…) que NO se
 * puede inyectar tal cual en la PWA — reventaría estilos globales reales
 * (`*{margin:0;padding:0}`, `body{background:...}`). Si el marcador se
 * pierde en un futuro re-sync desde el valle, devuelve cadena vacía (mejor
 * criatura sin idle propio que layout global roto).
 * @param {string} cssCompleto
 * @param {string} marcador  texto único del comentario que abre la sección rig.
 * @returns {string}
 */
export function extraerCssDelRig(cssCompleto, marcador) {
  const idx = cssCompleto.indexOf(marcador);
  if (idx === -1) return '';
  const inicioComentario = cssCompleto.lastIndexOf('/*', idx);
  return cssCompleto.slice(inicioComentario === -1 ? idx : inicioComentario);
}

/**
 * hostALigero — arregla el bug de LIGHT DOM de los rigs del valle.
 *
 * Los CSS originales (`guacamaya.css`, `chivitoPunk.css`…) fueron escritos
 * para Shadow DOM: cada estado se selecciona con `:host([data-estado="X"])`,
 * un pseudo-selector que solo existe DENTRO de un shadow tree — fuera de uno
 * (como aquí, `creatures/` vive en LIGHT DOM a propósito, ver nota de
 * `GuacamayaCompai.jsx`) `:host(...)` no matchea NADA. Resultado real: el
 * idle AMBIENTE corre (no depende de `:host`) pero los 6-7 estados por
 * `data-estado` quedan inertes — el rig nunca "actúa".
 *
 * En LIGHT DOM el `<svg data-estado="X">` raíz YA es un ancestro real del
 * resto del marcado, así que `:host([data-estado="X"]) Y` puede reescribirse
 * llanamente a `[data-estado="X"] Y` (mismo significado: "Y dentro de un
 * elemento con ese atributo") — X ya venía siendo el propio contenido del
 * paréntesis de `:host(...)`, así que basta con pelar el envoltorio.
 *
 * Pura, no toca clases/ids/colores — solo la sintaxis de `:host(...)`.
 * @param {string} cssTexto
 * @returns {string}
 */
export function hostALigero(cssTexto) {
  return cssTexto.replace(/:host\(([^)]*)\)/g, '$1');
}
