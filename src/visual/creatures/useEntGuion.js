/*
 * useEntGuion — la voz que ENSEÑA del Ent del páramo (el frailejón guardián).
 *
 * El Ent no es un bicho más: es un ÁRBOL-MAESTRO. Cuando habla, dice cosas de
 * botánica, del clima del páramo, de conservación y de la caza — pausado y
 * profundo. Ese GUION lo prepara otro frente del proyecto en
 * `src/data/entGuion.js`. Mientras ese archivo aterriza, este hook trae un
 * fallback DIGNO de 4 snippets (uno por tema) en usted colombiano, y deja el
 * PUNTO DE INTEGRACIÓN listo:
 *
 *   // cuando exista src/data/entGuion.js, el host lo pasa:
 *   import { ENT_GUION } from '../../data/entGuion.js';
 *   const { snippet, avanzar, fuente } = useEntGuion({ guion: ENT_GUION });
 *
 * Sin `guion` (o vacío/ inválido) → placeholders (`fuente === 'placeholder'`).
 * Con `guion` real → lo consume tal cual (`fuente === 'guion'`). Jamás rompe:
 * nunca importa estáticamente un archivo que quizá no existe todavía.
 *
 * Species-agnostic del RESTO de la fundación: el Ent produce TEXTO; el lip-sync
 * (useLipSync) y la boca-en-las-grietas (BocaVisema) ya saben animar la boca a
 * partir del audio del TTS. Este hook solo elige QUÉ enseña.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* Los 4 temas del Ent-maestro (biblia del guardián del páramo). */
export const ENT_TEMAS = Object.freeze(['botanica', 'clima', 'conservacion', 'caza']);

/**
 * Fallback DIGNO — 4 snippets, uno por tema, en usted colombiano cordial.
 * Cada uno: { id, tema, titulo, texto }. Reemplácelos (o mejor: pásele el
 * `guion` real) cuando `src/data/entGuion.js` esté listo.
 * @type {ReadonlyArray<{id:string,tema:string,titulo:string,texto:string}>}
 */
export const ENT_GUION_PLACEHOLDER = Object.freeze([
  {
    id: 'ent-botanica',
    tema: 'botanica',
    titulo: 'Quién soy',
    texto:
      'Soy el frailejón. Crezco un centímetro al año, así que tengo la edad de sus '
      + 'bisabuelos. Mis hojas viejas no las boto: se quedan pegadas al tronco '
      + 'abrigándome del frío. Tenga paciencia, que el páramo no se afana.',
  },
  {
    id: 'ent-clima',
    tema: 'clima',
    titulo: 'El agua del páramo',
    texto:
      'Mire mis hojas peludas: atrapan la neblina y la vuelven gotas. Este suelo '
      + 'negro guarda esa agua como una esponja y se la entrega despacito al río. '
      + 'De aquí baja el agua que usted toma allá abajo.',
  },
  {
    id: 'ent-conservacion',
    tema: 'conservacion',
    titulo: 'No le prenda candela',
    texto:
      'El páramo quemado no vuelve a ser el mismo en la vida de usted. Si quema '
      + 'para sembrar más arriba, seca el nacimiento. Cuídeme la mata y yo le '
      + 'cuido el agua: ese es el trato viejo.',
  },
  {
    id: 'ent-caza',
    tema: 'caza',
    titulo: 'Los animales son de la casa',
    texto:
      'El oso, el venado y el borugo también son del páramo. Déjelos vivir: ellos '
      + 'riegan las semillas y mantienen la montaña sana. Cazarlos es quedarse solo '
      + 'en la niebla.',
  },
]);

/** ¿Es un snippet de guion válido? (defensivo ante datos a medio hornear.) */
function snippetValido(s) {
  return !!s && typeof s === 'object' && typeof s.texto === 'string' && s.texto.trim().length > 0;
}

/**
 * Resuelve el GUION efectivo del Ent (helper PURO, testeable sin React).
 * Con un `guion` real válido → { lista, fuente: 'guion' }; si no → placeholders.
 *
 * @param {ReadonlyArray<any>} [guion] el guion real (src/data/entGuion.js) o nada.
 * @returns {{ lista: ReadonlyArray<{id:string,tema:string,titulo:string,texto:string}>, fuente:('guion'|'placeholder') }}
 */
export function resolverGuionEnt(guion) {
  if (Array.isArray(guion)) {
    const limpio = guion.filter(snippetValido);
    if (limpio.length > 0) return { lista: limpio, fuente: 'guion' };
  }
  return { lista: ENT_GUION_PLACEHOLDER, fuente: 'placeholder' };
}

/**
 * useEntGuion — elige QUÉ enseña el Ent. Recorre los snippets (avance manual o
 * automático). No toca audio ni SVG: solo entrega el snippet del momento para
 * que el host lo lea con el TTS (y el lip-sync anime la boca).
 *
 * @param {object} [opts]
 * @param {ReadonlyArray<any>} [opts.guion] el guion real; sin él → placeholders.
 * @param {number} [opts.indiceInicial=0]
 * @param {boolean} [opts.autoAvanzar=false] rota solo cada `intervaloMs`.
 * @param {number} [opts.intervaloMs=9000] periodo del auto-avance.
 * @returns {{
 *   snippet: {id:string,tema:string,titulo:string,texto:string},
 *   indice: number, total: number, temas: ReadonlyArray<string>,
 *   fuente: ('guion'|'placeholder'),
 *   avanzar: () => void, irA: (i:number)=>void, porTema:(t:string)=>void,
 * }}
 */
export function useEntGuion({
  guion,
  indiceInicial = 0,
  autoAvanzar = false,
  intervaloMs = 9000,
} = {}) {
  const { lista, fuente } = useMemo(() => resolverGuionEnt(guion), [guion]);
  const total = lista.length;
  const [indice, setIndice] = useState(() => {
    const i = Number.isInteger(indiceInicial) ? indiceInicial : 0;
    return total > 0 ? ((i % total) + total) % total : 0;
  });

  // Si la lista cambia de tamaño (aterriza el guion real), reencauza el índice.
  const totalRef = useRef(total);
  useEffect(() => {
    if (totalRef.current !== total) {
      totalRef.current = total;
      setIndice((i) => (total > 0 ? ((i % total) + total) % total : 0));
    }
  }, [total]);

  const irA = useCallback((i) => {
    setIndice((prev) => {
      if (total <= 0) return 0;
      const n = Number.isInteger(i) ? i : prev;
      return ((n % total) + total) % total;
    });
  }, [total]);

  const avanzar = useCallback(() => {
    setIndice((prev) => (total > 0 ? (prev + 1) % total : 0));
  }, [total]);

  const porTema = useCallback((tema) => {
    setIndice((prev) => {
      const i = lista.findIndex((s) => s.tema === tema);
      return i >= 0 ? i : prev;
    });
  }, [lista]);

  useEffect(() => {
    if (!autoAvanzar || total <= 1) return undefined;
    const ms = Number.isFinite(intervaloMs) && intervaloMs > 0 ? intervaloMs : 9000;
    const t = setInterval(avanzar, ms);
    return () => clearInterval(t);
  }, [autoAvanzar, intervaloMs, total, avanzar]);

  const snippet = lista[indice] || ENT_GUION_PLACEHOLDER[0];

  return { snippet, indice, total, temas: ENT_TEMAS, fuente, avanzar, irA, porTema };
}

export default useEntGuion;
