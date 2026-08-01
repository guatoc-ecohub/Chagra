/*
 * FAENAS DE LOS DOS CAMPESINOS DEL VALLE — datos puros, sin React.
 *
 * El valle tiene EXACTAMENTE DOS campesinos. Este módulo es la única fuente
 * de qué hace cada uno según la franja del día (la misma franja del ciclo
 * diurno vivo: cielosHoraData.horaDeReloj). Lo consumen:
 *
 *   · <CampesinosValle> — para dibujar la faena en su sitio del terreno.
 *   · Angelita (narración) — via `actividadCampesinosAhora()`: qué están
 *     haciendo AHORA y qué sugerirle al usuario ("como ellos, usted también…").
 *
 * Los puntos [x, z] están en unidades de mundo del valle (misma escala que
 * VECINOS_VALLE / SENDEROS_VALLE de composicionValle.js) y reutilizan los
 * sitios donde cada faena tiene sentido: eras para sembrar, huerta para
 * deshierbar, milpa para cosechar, la pila de abono, la tranquera del
 * potrero para ordeñar y el sendero 'plaza' para cargar.
 */
import { horaDeReloj } from '../../visual/mundo3d/cielosHoraData.js';

/* Los DOS habitantes fijos. La paleta (índice en PALETAS del componente) es
   su identidad visual estable: la ruana no cambia aunque cambie la faena. */
export const CAMPESINOS = [
  { id: 'campesino-terracota', paleta: 0 }, // ruana terracota
  { id: 'campesina-verde', paleta: 1 }, // ruana verde monte
];

/* Franjas que este mapa entiende (las del ciclo diurno vivo). */
export const FRANJAS_CAMPO = ['amanecer', 'manana', 'mediodia', 'tarde', 'atardecer', 'noche'];

/* Las pieles de clima "manual" del valle (CLIMAS de valleData) que no son
   franjas horarias se acercan a la franja que mejor les queda. */
const FRANJA_DE_CLIMA = {
  dorada: 'atardecer',
  soleado: 'manana',
  niebla: 'amanecer',
  lluvia: 'mediodia', // con aguacero se guarece: la faena de descanso
};

/**
 * Normaliza cualquier valor de `clima`/franja del valle a una franja de este
 * mapa. Devuelve null si no lo reconoce (el llamador decide su fallback).
 * @param {string|null|undefined} v
 * @returns {string|null}
 */
export function normalizarFranja(v) {
  if (!v) return null;
  if (FRANJAS_CAMPO.includes(v)) return v;
  return FRANJA_DE_CLIMA[v] ?? null;
}

/* ── EL MAPA franja → [faena del campesino 0, faena de la campesina 1] ──────
 *
 * Cada entrada es la jornada real del campo colombiano a esa hora. Campos:
 *   faena      clave del rig de dibujo ('siembra'|'deshierba'|'cosecha'|
 *              'compost'|'ordeno'|'carga'|'descanso')
 *   punto      [x, z] donde se planta — o `ruta` + `velocidad` si camina
 *   px/factor/dy  tamaño y asiento del billboard (jerarquía: px ≤ 44)
 *   lugar      dónde está, en palabras (para la narración)
 *   verbo      "está …" — la frase que Angelita puede decir tal cual
 *   sugerencia frase en usted que invita al usuario a hacer lo mismo
 *   visible    false = no se dibuja (está adentro descansando), pero la
 *              narración igual lo cuenta
 */
export const FAENAS_POR_FRANJA = {
  amanecer: [
    {
      faena: 'ordeno', punto: [-4.15, 6.85], px: 30, factor: 7.5, dy: 0.42,
      lugar: 'la tranquera del potrero',
      verbo: 'está ordeñando en la tranquera del potrero',
      sugerencia: 'El día arranca con los animales: revise los suyos antes de que caliente el sol.',
    },
    {
      faena: 'siembra', punto: [-0.85, 6.35], px: 30, factor: 7.4, dy: 0.48,
      lugar: 'el semillero del vivero',
      verbo: 'está regando y sembrando el semillero del vivero',
      sugerencia: 'El semillero se atiende temprano: mire cómo amanecieron sus matas.',
    },
  ],
  manana: [
    {
      faena: 'siembra', punto: [-2.1, 5.3], px: 32, factor: 7.8, dy: 0.5,
      lugar: 'las eras',
      verbo: 'está sembrando en las eras',
      sugerencia: 'La mañana es buena para sembrar o abonar: aproveche la tierra fresca.',
    },
    {
      faena: 'deshierba', punto: [1.6, 4.2], px: 33, factor: 7.8, dy: 0.5,
      lugar: 'la huerta',
      verbo: 'está deshierbando la huerta con el azadón',
      sugerencia: 'Revise su huerta: una deshierbada a tiempo le ahorra plagas después.',
    },
  ],
  mediodia: [
    {
      faena: 'descanso', punto: [-2.4, 5.7], px: 30, factor: 7.6, dy: 0.42,
      lugar: 'la sombra junto a las eras',
      verbo: 'está descansando a la sombra después del almuerzo',
      sugerencia: 'A esta hora el sol pega duro: descanse usted también, el campo sabe esperar.',
    },
    {
      faena: 'descanso', punto: [1.95, 3.65], px: 30, factor: 7.6, dy: 0.42,
      lugar: 'la sombra de la huerta',
      verbo: 'está tomándose un tinto a la sombra',
      sugerencia: 'Buen momento para mirar sus apuntes con calma antes de volver a la faena.',
    },
  ],
  tarde: [
    {
      faena: 'cosecha', punto: [-4.7, 2.6], px: 32, factor: 7.8, dy: 0.5,
      lugar: 'la milpa',
      verbo: 'está cosechando en la milpa',
      sugerencia: 'La tarde es de cosecha: mire qué de lo suyo ya está a punto.',
    },
    {
      faena: 'compost', punto: [-3.05, 7.75], px: 32, factor: 7.6, dy: 0.5,
      lugar: 'la pila de abono',
      verbo: 'está volteando la pila de compost',
      sugerencia: 'Voltear el compost lo mantiene vivo: su tierra se lo agradece.',
    },
  ],
  atardecer: [
    {
      faena: 'carga', carga: 'bulto', px: 33, factor: 8, dy: 0.52,
      ruta: [[1.4, 4.0], [3.2, 4.7], [4.8, 6.2]], velocidad: 0.55, // sendero 'plaza'
      lugar: 'el sendero de la casa',
      verbo: 'está cargando la cosecha del día hacia la casa',
      sugerencia: 'Vaya recogiendo lo del día y anote lo que cosechó antes de que oscurezca.',
    },
    {
      faena: 'ordeno', punto: [-4.15, 6.85], px: 30, factor: 7.5, dy: 0.42,
      lugar: 'la tranquera del potrero',
      verbo: 'está en el ordeño de la tarde',
      sugerencia: 'Segundo ordeño del día: hora de recoger y encerrar sus animales.',
    },
  ],
  noche: [
    {
      faena: 'carga', carga: 'bulto', px: 30, factor: 7.6, dy: 0.5,
      ruta: [[3.2, 4.7], [4.8, 6.2]], velocidad: 0.4, // el último viaje a la casa
      lugar: 'el sendero de la casa',
      verbo: 'está entrando lo último antes de acostarse',
      sugerencia: 'De noche se recoge y se descansa: el campo también duerme.',
    },
    {
      faena: 'descanso', visible: false,
      lugar: 'su casa',
      verbo: 'ya recogió todo y está descansando adentro',
      sugerencia: 'Deje el campo quieto: mañana temprano se ve mejor lo que la noche esconde.',
    },
  ],
};

/**
 * Qué están haciendo los dos campesinos AHORA — el contrato para Angelita.
 *
 * @param {Date|string} [franjaOFecha]  una Date (usa el reloj real), o una
 *   franja/clima del valle ('manana', 'noche', 'lluvia', …). Por defecto: ya.
 * @returns {Array<{ id: string, franja: string, faena: string, lugar: string,
 *   verbo: string, sugerencia: string, visible: boolean }>}  siempre 2 filas,
 *   en el orden de CAMPESINOS.
 */
export function actividadCampesinosAhora(franjaOFecha = new Date()) {
  const franja = franjaOFecha instanceof Date
    ? horaDeReloj(franjaOFecha)
    : (normalizarFranja(franjaOFecha) ?? horaDeReloj());
  const defs = FAENAS_POR_FRANJA[franja] ?? FAENAS_POR_FRANJA.manana;
  return defs.map((def, i) => ({
    id: CAMPESINOS[i].id,
    franja,
    faena: def.faena,
    lugar: def.lugar,
    verbo: def.verbo,
    sugerencia: def.sugerencia,
    visible: def.visible !== false,
  }));
}
