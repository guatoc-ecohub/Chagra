/*
 * beneficos/ — LOS ALIADOS INVISIBLES, en una sola puerta.
 *
 *   import { ALIADOS, UMBRAL, RELATO, veredicto } from '../beneficos';
 *
 * ── CÓMO SE MONTA ───────────────────────────────────────────────────────────
 * Este barrel NO importa three (la regla de `polinizadores/index.js`): los datos
 * y la dinámica son seguros en el bundle base y sirven para fichas, textos y
 * tests. Los `*.geom.js` y el `.jsx` SÍ arrastran three → perezosos:
 *
 *   const Escena = React.lazy(() =>
 *     import('.../visual/mundo3d/beneficos/EscenaBeneficos.jsx'));
 *
 *   <Escena tier={tier} reducedMotion={rm} />
 *
 * EL MUNDO en una frase: el campesino ve un bicho y lo mata; cuando fumiga de
 * amplio espectro mata más aliados que plagas, y por eso al año siguiente hay
 * MÁS plaga, no menos. Acá se ve el ejército que trabaja gratis, y se ve —en dos
 * parcelas gemelas— lo que cuesta perderlo.
 *
 * Qué hay adentro:
 *
 *   beneficosIdentidad.js   LA VERDAD COMO DATOS (three-free): el elenco con su
 *                           oficio, el arco de la mariquita, la triada del
 *                           hábitat, el umbral, el relato. Grounded en el corpus
 *                           maestro de MIP (140 pares) y plagas (135).
 *   dinamicaPlaga.js        EL ARGUMENTO HECHO NÚMEROS (puro): Lotka-Volterra
 *                           con techo. La escena DIBUJA su salida — no finge el
 *                           desenlace. `veredicto()` lo deja auditar.
 *   beneficos.geom.js       LA FORMA (three-core, headless): cada bicho por su
 *                           oficio, low-poly con vertex colors.
 *   EscenaBeneficos.jsx     EL ESPEJO: las dos parcelas + el arco en primer plano.
 *
 * REGISTRO: REALISTA. Esto es fauna secundaria (GUIA-RUBBERHOSE.md §1): sin ojos
 * de goma, sin tinta, sin chapetas, sin line-boil. Los personajes rubber-hose
 * (los 9 bichos, Angelita) viven en `creatures/` y NO se mezclan con esto.
 *
 * EL SÍRFIDO ADULTO NO ESTÁ ACÁ Y NO DEBE ESTARLO: ya vive en
 * `mundo3d/polinizadores/`. Este módulo aporta su LARVA depredadora — la mitad
 * del oficio que allá falta. Ver `ADULTO_SIRFIDO` en la identidad antes de
 * ceder a la tentación de redibujarlo.
 *
 * La escena importa three → cargala perezosa desde el host:
 *   const EscenaBeneficos = lazy(() => import('../beneficos/EscenaBeneficos.jsx'));
 */
export {
  PAL,
  ALIADOS,
  INVISIBLES,
  ADULTO_SIRFIDO,
  ARCO_MARIQUITA,
  HABITAT,
  UMBRAL,
  PARCELAS,
  RELATO,
  CICLO,
  CUPO_POR_TIER,
  elencoDeTier,
  invisiblesDeTier,
} from './beneficosIdentidad.js';

export { PARAMS, paso, serie, muestra, espejo, veredicto } from './dinamicaPlaga.js';

/* La escena NO se re-exporta acá a propósito: arrastraría three (y react-three)
   al bundle base y este barrel dejaría de ser seguro. Se importa perezosa desde
   el host, como manda la casa. */
