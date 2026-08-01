/*
 * RUTAS DE ACARREO DEL VALLE — datos puros, sin React.
 *
 * El alma tipo Settlers/AoE: no basta con gente trabajando EN un sitio —
 * la MATERIA de la finca tiene que verse MOVERSE entre sitios. Este módulo
 * es la única fuente de qué se acarrea, de dónde a dónde y a qué hora:
 * el ciclo real de nutrientes de la finca agroecológica, caminado.
 *
 *   amanecer   estiércol : tranquera del potrero → pila de abono
 *   mañana     compost   : pila de abono → eras de siembra
 *   mediodía   descanso  : aparejada a la sombra, cerca de la casa
 *   tarde      cosecha   : milpa → casa (maíz en canasto)
 *   atardecer  cosecha   : huerta → casa (hortalizas en canasto)
 *   noche      guardada  : desaparejada en el potrero (no se dibuja)
 *
 * Quien acarrea es LA MULA DE CARGA (arriería campesina): el valle tiene
 * EXACTAMENTE DOS campesinos por decisión de dirección, así que el flujo
 * de materia lo lleva el animal de trabajo — va CARGADA a la ida, suelta
 * en el destino y vuelve VACÍA. Las rutas pisan los SENDEROS_VALLE
 * existentes (composicionValle.js): el camino dibujado es el camino usado.
 *
 * Lo consumen:
 *   · <ArrieriaValle> — dibuja la mula en marcha y las pilas de entrega.
 *   · Angelita (narración) — via `acarreoAhora()`: qué está llevando AHORA.
 *
 * Los puntos [x, z] están en unidades de mundo del valle (misma escala que
 * SENDEROS_VALLE / COMPOSICION_LUGARES).
 */
import { horaDeReloj } from '../../visual/mundo3d/cielosHoraData.js';
import { normalizarFranja } from './campesinosFaenas.js';

/* ── Los tipos de carga (color de la pila de entrega + palabras) ──────────
   `pila` es el color del montoncito que crece en el destino con cada viaje:
   la prueba visible de que la materia LLEGÓ. */
export const CARGAS_ACARREO = {
  estiercol: { pila: '#4a3a24', nombre: 'estiércol' },
  compost: { pila: '#3d2e1c', nombre: 'compost' },
  maiz: { pila: '#d9a53a', nombre: 'maíz' },
  hortaliza: { pila: '#b5533c', nombre: 'hortalizas' },
};

/* ── EL MAPA franja → viaje de acarreo ────────────────────────────────────
 * Campos:
 *   carga      clave de CARGAS_ACARREO (qué lleva a la ida)
 *   ruta       [[x, z], ...] origen → destino, SOBRE senderos existentes;
 *              la vuelta es el mismo camino, vacía
 *   velocidad  unidades de mundo por segundo (paso de mula, no de perro)
 *   px/factor/dy  tamaño y asiento del billboard (jerarquía: px ≤ 44)
 *   punto      solo descanso: dónde se planta
 *   origen/destino  en palabras (para la narración)
 *   verbo      "la mula está …" — frase que Angelita puede decir tal cual
 *   sugerencia frase en usted que ata el viaje al ciclo de nutrientes
 *   visible    false = no se dibuja (desaparejada de noche)
 */
export const ACARREO_POR_FRANJA = {
  amanecer: {
    carga: 'estiercol',
    // sendero 'abono' (la tranquera → la pila), arrancando en la tranquera
    ruta: [[-3.7, 6.75], [-3.4, 7.4], [-3.3, 8.0]],
    velocidad: 0.22, px: 40, factor: 8, dy: 0.5,
    origen: 'la tranquera del potrero', destino: 'la pila de abono',
    verbo: 'está subiendo el estiércol del potrero a la pila de abono',
    sugerencia: 'El estiércol del ordeño no se pierde: es el abono de mañana.',
  },
  manana: {
    carga: 'compost',
    // sendero 'abono' invertido + cola del 'trajin' hasta el patio de las eras
    ruta: [[-3.3, 8.0], [-3.4, 7.4], [-3.6, 6.7], [-3.6, 6.4], [-3.0, 5.9], [-2.45, 5.4]],
    velocidad: 0.3, px: 40, factor: 8, dy: 0.5,
    origen: 'la pila de abono', destino: 'las eras',
    verbo: 'está bajando compost maduro de la pila a las eras',
    sugerencia: 'Del estiércol a la pila y de la pila a la cama: así se cierra el ciclo.',
  },
  mediodia: {
    descansa: true,
    punto: [-1.75, 4.1], // la sombra a la vera del sendero del trajín
    px: 38, factor: 7.8, dy: 0.48,
    origen: null, destino: null,
    verbo: 'está descansando aparejada a la sombra, espantando moscas',
    sugerencia: 'Hasta la mula para al mediodía: retome cuando baje el sol.',
  },
  tarde: {
    carga: 'maiz',
    // sendero 'milpa' invertido: la cosecha BAJA del lote a la casa
    ruta: [[-5.0, 2.4], [-3.6, 3.7], [-1.3, 2.5]],
    velocidad: 0.32, px: 40, factor: 8, dy: 0.5,
    origen: 'la milpa', destino: 'la casa',
    verbo: 'está bajando la cosecha de la milpa a la casa',
    sugerencia: 'Lo que baja de la milpa se anota: lo que no se pesa se pierde.',
  },
  atardecer: {
    carga: 'hortaliza',
    // tramo del sendero 'plaza' invertido: de la huerta a la casa
    ruta: [[3.2, 4.7], [1.4, 4.0], [-0.4, 2.9]],
    velocidad: 0.3, px: 40, factor: 8, dy: 0.5,
    origen: 'la huerta', destino: 'la casa',
    verbo: 'está entrando los canastos de la huerta a la casa',
    sugerencia: 'Lo último de la huerta entra antes de que oscurezca.',
  },
  noche: {
    visible: false,
    origen: null, destino: null,
    verbo: 'ya está desaparejada, descansando en el potrero',
    sugerencia: 'El aparejo colgado: mañana hay más viaje.',
  },
};

/**
 * Qué está acarreando la mula AHORA — el contrato para Angelita.
 *
 * @param {Date|string} [franjaOFecha]  una Date (usa el reloj real), o una
 *   franja/clima del valle ('manana', 'noche', 'lluvia', …). Por defecto: ya.
 * @returns {{ franja: string, carga: string|null, origen: string|null,
 *   destino: string|null, verbo: string, sugerencia: string, visible: boolean }}
 */
export function acarreoAhora(franjaOFecha = new Date()) {
  const franja = franjaOFecha instanceof Date
    ? horaDeReloj(franjaOFecha)
    : (normalizarFranja(franjaOFecha) ?? horaDeReloj());
  const def = ACARREO_POR_FRANJA[franja] ?? ACARREO_POR_FRANJA.manana;
  return {
    franja,
    carga: def.carga ?? null,
    origen: def.origen,
    destino: def.destino,
    verbo: def.verbo,
    sugerencia: def.sugerencia,
    visible: def.visible !== false,
  };
}
