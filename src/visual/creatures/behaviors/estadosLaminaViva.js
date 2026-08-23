/* eslint-disable chagra-i18n/no-hardcoded-spanish -- narración aria de lector
   de pantalla, DATOS PUROS igual que `agente/angelitaEstados.js` (que hoy trae
   los mismos literales sin migrar): la migración a `src/config/messages.js`
   (ADR-050) es un pendiente de TODA la familia de estados, fuera de esta lane. */
/*
 * estadosLaminaViva — EL REPERTORIO DE ESTADOS de la familia lámina-viva
 * (Taita Jaguar, Oso Protector, Chivito Punk), como DATOS PUROS.
 *
 * Es la MISMA vara que `agente/angelitaEstados.js` (el NORTE de la casa:
 * https://angelitas.guatoc.co/), llevada a los compai de lámina recortada.
 * Angelita, como cara de la inteligencia de Chagra, tiene 10 estados
 * conversacionales canónicos con su pose/cejas/aria; hasta hoy el jaguar, el
 * oso y el chivito solo respondían a cuatro (idle/thinking/speaking/listening)
 * más caminando. Este módulo cierra esa brecha: define el vocabulario canónico
 * completo, sus alias (para que el host pueda escribir con las palabras de
 * Angelita: 'acompana', 'respondiendo', 'celebra'…) y la narración accesible
 * de cada estado por compai. Con esto CADA compai es >= la base de Angelita.
 *
 * REGLA DE ORO (la misma de angelitaEstados.js y abejaIdentidad.js): SOLO
 * datos + funciones puras, cero React/three/DOM. La POSE de cada estado la
 * pone el CSS del rig ([data-agt-estado='...'] en jaguarLamina/osoLamina/
 * chivitoLamina.css); el idle vivo entre estados lo pone `vidaEstados.js`.
 *
 * QUÉ NO vive aquí (a propósito): las poses/cejas concretas son del CSS de
 * cada lámina (cada rig tiene su anatomia distinta: el jaguar tiene orejas y
 * cola, el oso una corona florecida, el chivito una cresta y un lapiz), no un
 * mapa comun como el de Angelita ('vuela'|'reposo'|'celebra'). El comun es el
 * VOCABULARIO y la NARRACION; el cuerpo lo actua cada quien a su manera.
 */

/* Los estados canónicos que el CSS de cada lámina selecciona por
   [data-agt-estado='...']. En la forma que el rig entiende (idle/thinking/
   speaking/listening son las llaves historicas del CSS de la familia; las seis
   nuevas y caminando completan la base de Angelita). */
export const ESTADOS_LAMINA = [
  'idle', // acompaña: respira, parpadea, mira; su idle-cerebro dispara micro-gestos
  'listening', // escucha: atiende, ladea la testa, para la oreja
  'thinking', // piensa: mira arriba, busca en su memoria de la finca
  'speaking', // responde: habla con lip-sync y gesticula
  'contenta', // acertó / buena noticia: celebra a su manera
  'preocupada', // alerta (plaga, sequía, riesgo)
  'no-se', // honesta: no sabe, y lo dice sin rodeos
  'senala', // guía: se inclina y apunta al punto de interés
  'invita', // guía: hace "venga" y se acerca
  'husmea', // fisgona: revisa la finca con cuidado
  'caminando', // anda (la marcha; el gate del roaming la mueve por pantalla)
];

/* Sinónimos amables -> canónico. El host escribe como piensa (con el
   vocabulario de Angelita o el del contrato de avatar); el cuerpo entiende.
   Cubre las palabras de `angelitaEstados.js` para paridad con el NORTE. */
const ALIAS = {
  // idle / acompaña
  idle: 'idle', reposo: 'idle', acompana: 'idle', 'acompaña': 'idle', calma: 'idle',
  // escuchando -> listening
  listening: 'listening', escuchando: 'listening', escucha: 'listening', atiende: 'listening',
  // pensando -> thinking
  thinking: 'thinking', pensando: 'thinking', piensa: 'thinking', buscando: 'thinking',
  // respondiendo -> speaking
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking', habla: 'speaking', responde: 'speaking',
  // contenta
  contenta: 'contenta', celebra: 'contenta', alegre: 'contenta', feliz: 'contenta',
  // preocupada
  preocupada: 'preocupada', alerta: 'preocupada', aviso: 'preocupada', preocupa: 'preocupada',
  // no-se
  'no-se': 'no-se', nose: 'no-se', 'no-sé': 'no-se', 'nosé': 'no-se', duda: 'no-se', 'no sé': 'no-se',
  // senala
  senala: 'senala', 'señala': 'senala', guia: 'senala', 'guía': 'senala', apuntando: 'senala',
  // invita
  invita: 'invita', ven: 'invita', venga: 'invita', invitando: 'invita',
  // husmea
  husmea: 'husmea', husmeando: 'husmea', fisgonea: 'husmea', olfatea: 'husmea', revisa: 'husmea',
  // caminando
  caminando: 'caminando', walking: 'caminando', anda: 'caminando', camina: 'caminando', marcha: 'caminando',
};

/**
 * Estado canónico de la familia lámina-viva (o 'idle' si no se reconoce: el
 * compai nunca se rompe por un estado desconocido, se queda acompañando).
 * @param {string} [estado]
 * @returns {string}
 */
export function canonEstadoLamina(estado) {
  if (!estado) return 'idle';
  const e = String(estado).toLowerCase().trim();
  if (ESTADOS_LAMINA.includes(e)) return e;
  return ALIAS[e] || 'idle';
}

/* Los tres compai de esta lane, con su NOMBRE OFICIAL (el que va a UI y
   diálogo) y su carácter. El `slug` es la llave de rig/vida (data-creature,
   IDLE_PERFILES, VIDA_REPERTORIO). Las hermanas (zarigüeya, luciérnaga) las
   maneja otra lane; se dejan fuera de este mapa a propósito. */
export const COMPAI_LAMINA = {
  jaguar: {
    slug: 'jaguar',
    nombre: 'Taita Jaguar',
    caracter: 'guardián sabio y digno (taita = mayor respetado); felino que ya vio todo',
  },
  oso: {
    slug: 'oso-baston',
    nombre: 'Oso Protector',
    caracter: 'protector y cálido; el oso del bastón florecido, plantígrado de andar pausado',
  },
  chivito: {
    slug: 'chivito-punk',
    nombre: 'Chivito Punk',
    caracter: '70% sereno / 30% punk; escribano de páramo con cresta mohicana y lápiz',
  },
};

/* Narración accesible por estado, para lectores de pantalla (usted,
   colombiano, sin tecnicismos; sin em dashes en el copy UI). Keyeada por SLUG
   de rig para que el componente la busque directo con su `data-creature`.
   Cada compai narra CON su carácter y su NOMBRE OFICIAL: es la voz de la
   diferencia, no un texto comun con el nombre cambiado. */
export const ARIA_LAMINA = {
  jaguar: {
    idle: 'Taita Jaguar lo acompaña, sereno: respira hondo, la cola ondea y la mirada sigue atenta',
    listening: 'Taita Jaguar lo escucha con atención: para las orejas y ladea la testa hacia usted',
    thinking: 'Taita Jaguar está pensando, buscando en su memoria de la selva',
    speaking: 'Taita Jaguar le está respondiendo',
    contenta: 'Taita Jaguar está contento: alza la cabeza con orgullo tranquilo',
    preocupada: 'Taita Jaguar está en guardia: hay algo que conviene revisar',
    'no-se': 'Taita Jaguar niega con la cabeza: no sabe la respuesta, y se lo dice con honestidad',
    senala: 'Taita Jaguar le está señalando algo: se inclina y dirige la mirada al punto',
    invita: 'Taita Jaguar lo invita a acercarse',
    husmea: 'Taita Jaguar está rastreando: baja la cabeza y olfatea el terreno de la finca',
    caminando: 'Taita Jaguar camina',
  },
  'oso-baston': {
    idle: 'Oso Protector lo acompaña, cálido: respira hondo y el bastón florecido late despacio',
    listening: 'Oso Protector lo escucha con atención: para las orejas y ladea la cabeza hacia usted',
    thinking: 'Oso Protector está pensando, buscando en su memoria de la finca',
    speaking: 'Oso Protector le está respondiendo',
    contenta: 'Oso Protector está contento: se bambolea alegre y el bastón florece',
    preocupada: 'Oso Protector se pone protector: se yergue y vigila con cuidado',
    'no-se': 'Oso Protector se encoge de hombros: no sabe la respuesta, y se lo dice con honestidad',
    senala: 'Oso Protector le está señalando algo: extiende el bastón hacia el punto',
    invita: 'Oso Protector lo invita a acercarse con la mano del bastón',
    husmea: 'Oso Protector está husmeando: baja el hocico y revisa la finca con cuidado',
    caminando: 'Oso Protector camina',
  },
  'chivito-punk': {
    idle: 'Chivito Punk lo acompaña, sereno pero vivo: respira, parpadea y de rato en rato rockea o apunta',
    listening: 'Chivito Punk lo escucha con atención: ladea la testa hacia usted, atento',
    thinking: 'Chivito Punk está pensando: mira arriba y golpetea el lápiz',
    speaking: 'Chivito Punk le está respondiendo, cantando la respuesta',
    contenta: 'Chivito Punk está contento: pega un headbang alegre',
    preocupada: 'Chivito Punk está preocupado: baja la cresta; hay algo que conviene revisar',
    'no-se': 'Chivito Punk ladea la cabeza: no sabe la respuesta, y se lo dice con honestidad',
    senala: 'Chivito Punk le está señalando algo con el lápiz',
    invita: 'Chivito Punk lo invita a acercarse',
    husmea: 'Chivito Punk está fisgoneando: picotea el rastro y revisa la finca',
    caminando: 'Chivito Punk camina',
  },
};

/**
 * Narración accesible de un estado para un compai, por su slug de rig.
 * Devuelve cadena vacía si el slug no está en el mapa (el consumidor cae a su
 * aria-label de siempre, sin romperse).
 * @param {string} slug  'jaguar' | 'oso-baston' | 'chivito-punk'
 * @param {string} [estado]  crudo (se normaliza con canonEstadoLamina)
 * @returns {string}
 */
export function ariaLamina(slug, estado) {
  const tabla = ARIA_LAMINA[slug];
  if (!tabla) return '';
  return tabla[canonEstadoLamina(estado)] || '';
}

export default {
  ESTADOS_LAMINA,
  canonEstadoLamina,
  COMPAI_LAMINA,
  ARIA_LAMINA,
  ariaLamina,
};
