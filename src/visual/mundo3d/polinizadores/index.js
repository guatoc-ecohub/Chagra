/*
 * mundo3d/polinizadores — EL MUNDO DE LA RED QUE DA LA COSECHA.
 *
 * La tesis, en una línea: SIN ESTOS BICHOS NO HAY COSECHA — y el trabajo que
 * hacen es invisible, y por invisible es gratis, y por gratis no se cuida. Este
 * mundo hace lo único que hay que hacer: DIBUJARLO.
 *
 * ── CÓMO SE MONTA ───────────────────────────────────────────────────────────
 * La escena importa three → SIEMPRE perezosa (chunk `vendor-three`):
 *
 *   const Escena = React.lazy(() =>
 *     import('.../visual/mundo3d/polinizadores/EscenaPolinizadores.jsx'));
 *
 *   <Escena tier={tier} reducedMotion={rm}
 *           momento="dia"        // 'dia' | 'noche' → el turno cambia, no se apaga
 *           comoAbeja={false}    // el ojo de ella: se apaga el rojo, se encienden las guías UV
 *           veneno={false}       // cruza la deriva del lote vecino
 *           meliponarioAbierto={false} /> // corte de la caja: los potes de cerumen
 *
 * Este barrel NO importa three: los datos (`polinizadoresIdentidad`, `sembrado`,
 * `telar`) son seguros en el bundle base y sirven para textos, fichas y tests.
 * Los `*.geom.js` y los `.jsx` sí arrastran three — impórtelos perezoso.
 *
 * ── EL MAPA DEL MUNDO ───────────────────────────────────────────────────────
 *   polinizadoresIdentidad.js  LA VERDAD como datos: quién poliniza qué, el
 *                              síndrome floral, la dependencia de cada cultivo y
 *                              el ojo de abeja. Sale del corpus de campo.
 *   sembrado.js                el PLANO de la finca (y por qué cada cosa está
 *                              donde está). OJO: `planta` ≠ `sindrome`.
 *   telar.js                   LA RED como estado. La regla honesta: una visita
 *                              no poliniza; poliniza el polen que VIAJA entre
 *                              flores de la misma planta.
 *   floresSindrome.geom.js     las flores como CARTELES, con doble color horneado
 *                              (ojo humano / ojo de abeja).
 *   polinizadores.geom.js      los ocho cuerpos, reconocibles de un vistazo.
 *   meliponario.geom.js        la caja racional, la piquera de cera, los potes.
 *   cultivos.geom.js           las matas que cobran... y el maíz, que no cobra.
 *   RedPolinizacion.jsx        EL SERVICIO, VISIBLE. El componente que justifica
 *                              el mundo entero.
 *   EnjambrePolinizadores.jsx  el motor: quienes trabajan, trabajando.
 *   FloresMundo.jsx            los carteles sembrados: la hora y la visión.
 *   Meliponario.jsx            la casa de la angelita, con sus guardianas.
 *   ParcelaCultivos.jsx        donde el servicio se vuelve fruta (o no).
 *   AmenazaVeneno.jsx          lo que pasa cuando pasa. Sin sermón.
 *   EscenaPolinizadores.jsx    la finca armada.
 *
 * ── DE DÓNDE SALE LA VERDAD ─────────────────────────────────────────────────
 * Del corpus maestro de polinización (121 pares de campo) y del arte aprobado de
 * Angelita (`creatures/AbejaAngelita.jsx`, `agente/Angelita.jsx`): la angelita de
 * este mundo es LA MISMA vecina del home — mismos colores, misma identidad, misma
 * especie sin aguijón. Este mundo se construyó SOBRE ese arte, no al lado.
 */

/* Datos y lógica: three-free, seguros en el bundle base. */
export {
  PAL,
  SINDROMES,
  SINDROMES_IDS,
  POLINIZADORES,
  POLINIZADORES_IDS,
  CULTIVOS,
  CULTIVOS_IDS,
  TIER,
  tierDe,
  calidadDe,
  visitaSindrome,
  bichosDe,
  florAbierta,
  cultivoNecesitaRed,
  cuajeDe,
  ojoDeAbeja,
  DANO_POR_HORA,
  rng,
} from './polinizadoresIdentidad.js';

export {
  FINCA,
  ZONAS,
  ZONA_POR_ID,
  sembrarFlores,
  sembrarMatas,
  sitiosDeFruto,
  sitioMeliponario,
  agruparPorGeom,
  floresParaBicho,
  cultivoDeZona,
} from './sembrado.js';

export { crearTelar, esPuente, polenSirve } from './telar.js';
