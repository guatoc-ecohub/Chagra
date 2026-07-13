/*
 * cielosHoraData — el KIT DE CIELOS POR HORA del valle (datos puros, sin three).
 *
 * atmosferaMadre fija LA hora dorada como atmósfera compartida de los mundos.
 * Este módulo la extiende en el tiempo: cuatro momentos del mismo día andino
 * (amanecer → mediodía → hora dorada → noche estrellada) con la MISMA lógica
 * de luz que EscenaBase3D (hemisferio cielo/suelo + ambiente + sol direccional
 * + relleno frío opuesto), para que cambiar de hora se sienta como el mismo
 * valle girando bajo el sol, no como cuatro escenas distintas.
 *
 * Coherencia de paleta (de dónde sale cada hora):
 *   - dorada   : ESPEJO exacto de `ATMOSFERA` (atmosferaMadre / CLIMAS.dorada
 *                de valleData). Es la hora madre; si aquella cambia, este
 *                preset debe actualizarse a mano (se duplica a propósito para
 *                que este archivo siga siendo three-free y autocontenido).
 *   - amanecer : keyframe t=0 de la bóveda del clima (horizonte '#f6c9a0',
 *                cenit '#3f4f80') — durazno rasante con relleno lavanda.
 *   - mediodia : el marfil claro de la familia `neutro`, aclarado y con el sol
 *                casi blanco en el cenit; la niebla se corre lejos.
 *   - noche    : keyframe t=1 de la bóveda ('#26325a' / '#0d1330') — índigo
 *                hondo, luna plata y un relleno tibio de fogata lejana (el
 *                único calor que queda del día).
 *
 * Es DATO PURO (strings y números): lo pueden consumir tests, el 2D digno o
 * cualquier render sin pagar el chunk de three. La única función con costo es
 * `mezclaHex`/`mezclarPresets` (aritmética de enteros, cero alocación THREE).
 *
 * Forma de cada preset:
 *   fondo        hex  — scene.background
 *   cielo/suelo  hex  — hemisphereLight (bóveda / rebote de tierra)
 *   luz          hex  — sol (o luna): direccional principal + ambiente
 *   relleno      hex  — direccional opuesta, tenue (cielo abierto / fogata)
 *   niebla       hex  — color del fog (si el tier lo permite)
 *   sombra       hex  — tinte sugerido para sombras de contacto
 *   intensidad   num  — multiplicador global de la hora (la noche baja todo)
 *   hemisferio/ambiente/sol/rellenoInt num — intensidades base por luz
 *   solPos       [x,y,z] — posición del sol/luna (el arco del día)
 *   nieblaCerca/nieblaLejos num — near/far del fog (la noche cierra el valle)
 *   estrellas    0..1 — fracción del presupuesto de estrellas del tier
 */

/* Orden canónico del día (útil para UIs de selección y para tests). El CICLO
   DIURNO VIVO recorre estas franjas con el reloj real (franjaDeHoraDecimal);
   `dorada` queda como la hora MADRE fuera del arco (espejo de ATMOSFERA, la
   piel que las escenas piden explícita). */
export const HORAS = ['amanecer', 'manana', 'mediodia', 'tarde', 'atardecer', 'noche'];

export const CIELOS_HORA = {
  /* madrugada andina: sol rasante durazno, cenit todavía lavanda, bruma baja
     y las últimas estrellas despidiéndose */
  amanecer: {
    fondo: '#f3cba0',
    cielo: '#f6c9a0',
    suelo: '#6e5a44',
    luz: '#ffc994',
    relleno: '#8fa2cc',
    niebla: '#ecc7a2',
    sombra: '#3c2f40',
    intensidad: 0.9,
    hemisferio: 0.5,
    ambiente: 0.24,
    sol: 0.85,
    rellenoInt: 0.3,
    solPos: [9, 2.5, 5],
    nieblaCerca: 7,
    nieblaLejos: 32,
    estrellas: 0.2,
    luciernagas: 0.15,
  },
  /* la mañana dorada: el sol ya subió del horizonte pero sigue tibio; luz
     fresca de trabajo temprano, el aire limpio antes del calor */
  manana: {
    fondo: '#f4e4bd',
    cielo: '#f7e2ac',
    suelo: '#8a7a52',
    luz: '#ffe9b8',
    relleno: '#a9c0dc',
    niebla: '#eeddb4',
    sombra: '#43351f',
    intensidad: 1.05,
    hemisferio: 0.55,
    ambiente: 0.28,
    sol: 0.95,
    rellenoInt: 0.2,
    solPos: [8, 6, 4.5],
    nieblaCerca: 10,
    nieblaLejos: 42,
    estrellas: 0,
    luciernagas: 0,
  },
  /* día pleno: marfil claro, sol alto casi blanco, el aire se abre y la
     niebla se va lejos — la hora de trabajar */
  mediodia: {
    fondo: '#efe7cf',
    cielo: '#f8f2dd',
    suelo: '#a3854f',
    luz: '#fff2d2',
    relleno: '#adc2d8',
    niebla: '#ecdfc0',
    sombra: '#4a3d28',
    intensidad: 1.15,
    hemisferio: 0.6,
    ambiente: 0.3,
    sol: 1.0,
    rellenoInt: 0.18,
    solPos: [2, 12, 3],
    nieblaCerca: 12,
    nieblaLejos: 48,
    estrellas: 0,
    luciernagas: 0,
  },
  /* la tarde: el sol ya cruzó al otro lado del valle y la luz se inclina
     ámbar; las sombras se alargan hacia el oriente */
  tarde: {
    fondo: '#f0dcae',
    cielo: '#f4d795',
    suelo: '#8f7247',
    luz: '#ffdf9f',
    relleno: '#9fb4d4',
    niebla: '#eccf9d',
    sombra: '#3f2d1a',
    intensidad: 1.02,
    hemisferio: 0.55,
    ambiente: 0.28,
    sol: 0.95,
    rellenoInt: 0.22,
    solPos: [-5, 7, 4],
    nieblaCerca: 10,
    nieblaLejos: 38,
    estrellas: 0,
    luciernagas: 0,
  },
  /* la hora madre: espejo exacto de ATMOSFERA (atmosferaMadre). El sol en
     [6,9,4] calca la direccional de EscenaBase3D para que una escena montada
     con este preset se vea IGUAL a las escenas existentes. */
  dorada: {
    fondo: '#f2d9a8',
    cielo: '#f7c66b',
    suelo: '#8a6b4a',
    luz: '#ffd79a',
    relleno: '#9db8d9',
    niebla: '#f0c98d',
    sombra: '#3a2a18',
    intensidad: 1,
    hemisferio: 0.55,
    ambiente: 0.28,
    sol: 0.9,
    rellenoInt: 0.22,
    solPos: [6, 9, 4],
    nieblaCerca: 9,
    nieblaLejos: 40,
    estrellas: 0,
    luciernagas: 0,
  },
  /* el atardecer: sol rasante al occidente, naranjas y rosas hondos, relleno
     lavanda del cielo que ya se apaga; las primeras luciérnagas asoman */
  atardecer: {
    fondo: '#eeae7e',
    cielo: '#e9986a',
    suelo: '#6e4a3a',
    luz: '#ffb37a',
    relleno: '#9d8fc9',
    niebla: '#e8a97f',
    sombra: '#38222a',
    intensidad: 0.92,
    hemisferio: 0.52,
    ambiente: 0.26,
    sol: 0.9,
    rellenoInt: 0.28,
    solPos: [-8, 2.5, 4.5],
    nieblaCerca: 8,
    nieblaLejos: 34,
    estrellas: 0.12,
    luciernagas: 0.35,
  },
  /* noche estrellada de páramo: índigo hondo, luna plata desde el otro lado
     del valle, relleno tibio de fogata y el fog cerrando la distancia */
  noche: {
    fondo: '#151d3a',
    cielo: '#26325a',
    suelo: '#181410',
    luz: '#b9c6e6',
    relleno: '#6b5638',
    niebla: '#1a2340',
    sombra: '#05070f',
    intensidad: 0.55,
    hemisferio: 0.3,
    ambiente: 0.12,
    sol: 0.35,
    rellenoInt: 0.1,
    solPos: [-6, 7, -4],
    nieblaCerca: 6,
    nieblaLejos: 30,
    estrellas: 1,
    luciernagas: 1,
  },
};

/* Transición por defecto entre horas (segundos). El componente la anima con
   amortiguación exponencial; `reducedMotion` la salta por completo. */
export const TRANSICION = { duracion: 2.5 };

/** Preset de una hora, con fallback a la hora madre (nunca undefined). */
export function presetDeHora(hora) {
  return CIELOS_HORA[hora] || CIELOS_HORA.dorada;
}

/**
 * Franja del día para una hora DECIMAL (p. ej. 17.5 = 5:30 pm). Es EL mapa del
 * ciclo diurno vivo: seis franjas ecuatoriales andinas (el sol sale ~6 y se
 * esconde ~18 todo el año, así que las bandas son estables).
 * @param {number} h  hora decimal 0..24
 * @returns {'amanecer'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche'}
 */
export function franjaDeHoraDecimal(h) {
  if (h < 5) return 'noche';
  if (h < 7) return 'amanecer';
  if (h < 11) return 'manana';
  if (h < 15) return 'mediodia';
  if (h < 17) return 'tarde';
  if (h < 19) return 'atardecer';
  return 'noche';
}

/**
 * Deriva la franja del kit del reloj real (minutos incluidos).
 * @param {Date} [fecha]
 * @returns {'amanecer'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche'}
 */
export function horaDeReloj(fecha = new Date()) {
  return franjaDeHoraDecimal(fecha.getHours() + fecha.getMinutes() / 60);
}

/** Mezcla dos hex `#rrggbb` hacia `t` (0 = a, 1 = b) sin three (aritmética pura). */
export function mezclaHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const canal = (p, d) => (p >> d) & 0xff;
  const paso = (x, y) => Math.round(x + (y - x) * t);
  const r = paso(canal(pa, 16), canal(pb, 16));
  const g = paso(canal(pa, 8), canal(pb, 8));
  const bl = paso(canal(pa, 0), canal(pb, 0));
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

const CAMPOS_COLOR = ['fondo', 'cielo', 'suelo', 'luz', 'relleno', 'niebla', 'sombra'];
const CAMPOS_NUMERO = [
  'intensidad',
  'hemisferio',
  'ambiente',
  'sol',
  'rellenoInt',
  'nieblaCerca',
  'nieblaLejos',
  'estrellas',
  'luciernagas',
];

/**
 * Interpola dos presets completos hacia `t` (0 = a, 1 = b): colores por canal,
 * números lineal, posición del sol componente a componente. Útil para derivar
 * horas intermedias (p. ej. un atardecer 30% noche) o para tests del arco.
 */
export function mezclarPresets(a, b, t) {
  const out = {};
  for (const campo of CAMPOS_COLOR) out[campo] = mezclaHex(a[campo], b[campo], t);
  for (const campo of CAMPOS_NUMERO) out[campo] = a[campo] + (b[campo] - a[campo]) * t;
  out.solPos = a.solPos.map((v, i) => v + (b.solPos[i] - v) * t);
  return out;
}
