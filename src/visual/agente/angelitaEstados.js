/*
 * angelitaEstados — EL REPERTORIO DEL AGENTE, COMO DATOS.
 *
 * Angelita (Tetragonisca angustula, la abeja angelita sin aguijón) es LA CARA
 * de la inteligencia de Chagra: cuando el campesino le habla a la app, quien
 * escucha, piensa y responde es ella. Este módulo define — como datos puros,
 * cero react/three — el vocabulario de esa conversación:
 *
 *   ESTADOS_ANGELITA   → los estados conversacionales canónicos del agente.
 *   POSE_DE_ESTADO     → qué pose del dibujo base (AbejaAngelita) sostiene
 *                        cada estado — el agente REUTILIZA el cuerpo aprobado,
 *                        no dibuja otra abeja.
 *   ARIA_DE_ESTADO     → cómo se narra cada estado a lectores de pantalla
 *                        (usted, colombiano — nunca "tú").
 *   nivelDeConfianza   → normaliza la confianza del modo científico
 *                        (número 0..1 o etiqueta) a 'alta'|'media'|'baja'.
 *   MOMENTOS_IDLE      → el repertorio del idle VIVO (acompana): los micro-
 *                        gestos de criatura que existe aunque nadie le hable.
 *   elegirMomentoIdle  → el azar ponderado (sin repetir) con el que Angelita
 *                        decide qué hacer en el próximo rato de vuelo.
 *
 * REGLA DE ORO (la misma de abejaIdentidad.js): SOLO datos. La CADENCIA vive
 * en `angelita-agente.css`; el DIBUJO en `Angelita.jsx`.
 */

/* Los estados canónicos del cuerpo del agente. En ASCII (sin ñ/tildes) porque
   viajan como valores de atributo data-* que el CSS selecciona. El nombre es
   deliberadamente species-neutral: cada rig traduce estas ideas a su cuerpo. */
export const ESTADOS_AGENTE = Object.freeze([
  'acompana',     // idle vivo: flota, respira, mira alrededor — presente sin hablar
  'escuchando',   // se posa y ladea la cabeza hacia usted; ondas de voz entrando
  'pensando',     // busca en su memoria de la finca (burbuja con recuerdos)
  'respondiendo', // habla (lip-sync por visema) y gesticula; su voz sale en miel
  'contenta',     // acertó / buena noticia: brinca celebrando con chispas
  'preocupada',   // alerta (plaga, sequía, riesgo): cejas, sudor, aro de alerta
  'no-se',        // honesta: se encoge de hombros — no sabe y LO DICE
  'senala',       // guía: se inclina y apunta al POI, con destello donde señala
  'invita',       // guía: hace "venga" con la manita, acercándose
  'husmea',       // fisgona: se inclina a olfatear el rastro (revisa la finca)
]);

/* Nombres de transición para consumidores nuevos. Son la misma referencia,
   no copias que puedan divergir del vocabulario canónico. */
export const ESTADOS_COMPAI = ESTADOS_AGENTE;
export const ESTADOS_CONVERSACIONALES = ESTADOS_AGENTE;

/* Alias histórico: Angelita fue el primer cuerpo, pero el contrato ya no le
   pertenece. */
export const ESTADOS_ANGELITA = ESTADOS_AGENTE;

/* Sinónimos amables → canónico. El host escribe como piensa; el cuerpo entiende. */
export const ALIASES_ESTADO = Object.freeze({
  idle: 'acompana',
  acompaña: 'acompana',
  escucha: 'escuchando',
  piensa: 'pensando',
  buscando: 'pensando',
  habla: 'respondiendo',
  hablando: 'respondiendo',
  celebra: 'contenta',
  alerta: 'preocupada',
  nose: 'no-se',
  'no-sé': 'no-se',
  'nosé': 'no-se',
  duda: 'no-se',
  'señala': 'senala',
  guia: 'senala',
  'guía': 'senala',
  ven: 'invita',
  calma: 'acompana',
  aviso: 'preocupada',
  husmeando: 'husmea',
  fisgonea: 'husmea',
});

export const ALIAS_DE_ESTADO = ALIASES_ESTADO;
export const ALIAS_ESTADO = ALIASES_ESTADO;

/**
 * Devuelve el estado canónico (o 'acompana' si no se reconoce: el agente
 * nunca se rompe por un estado desconocido — se queda acompañando, digno).
 * @param {string} [estado]
 * @returns {string}
 */
export function estadoCanonico(estado) {
  if (!estado) return 'acompana';
  const e = String(estado).toLowerCase().trim();
  if (ESTADOS_ANGELITA.includes(e)) return e;
  return ALIASES_ESTADO[e] || 'acompana';
}

/* Cada estado del agente sostiene UNA pose del dibujo base (AbejaAngelita:
   'vuela'|'reposo'|'celebra'|'señala'). El resto del carácter (ondas, burbuja,
   cejas, shrug) lo ponen las capas del agente encima. */
export const POSES_DE_ESTADO = Object.freeze({
  acompana: 'vuela',
  escuchando: 'reposo',   // se posa a escuchar — atención de verdad, no vuelo
  pensando: 'vuela',
  respondiendo: 'vuela',
  contenta: 'celebra',
  preocupada: 'vuela',
  'no-se': 'vuela',
  senala: 'señala',       // el gesto afinado que ya vive en creatures.css
  invita: 'vuela',
  husmea: 'vuela',        // la inclinación fisgona la pone el CSS del estado
  caminando: 'vuela',     // la especie puede resolverlo a `camina`
});

export const POSE_POR_ESTADO = POSES_DE_ESTADO;
export const POSE_DE_ESTADO = POSES_DE_ESTADO;

/* Cada estado ACTÚA también con las CEJAS (CejasRubber, opt-in del cuerpo):
   el que habla hace eyebrow-flash, la contenta las arquea, la que escucha las
   levanta, la fisgona las frunce de concentración. null = la carita de siempre
   (preocupada y no-se conservan SUS cejas dibujadas por el agente). */
export const CEJAS_POR_ESTADO = Object.freeze({
  acompana: null,
  escuchando: 'altas',
  pensando: null,
  respondiendo: 'vivas',
  contenta: 'alegres',
  preocupada: null,
  'no-se': null,
  senala: 'fruncidas',
  invita: 'altas',
  husmea: 'fruncidas',
});

export const CEJAS_DE_ESTADO = CEJAS_POR_ESTADO;

/* Copy común. Las plantillas son datos, y el nombre se inyecta solo al
   construir el texto. Así un jaguar o una luciérnaga no anuncian a Angelita. */
export const TEXTO_POR_ESTADO = Object.freeze({
  acompana: '{nombre} lo acompaña',
  escuchando: '{nombre} lo está escuchando con atención',
  pensando: '{nombre} está pensando, buscando en su memoria de la finca',
  respondiendo: '{nombre} le está respondiendo',
  contenta: '{nombre} está contenta',
  preocupada: '{nombre} está preocupada: hay algo que conviene revisar',
  'no-se': '{nombre} no sabe la respuesta y se lo dice con honestidad',
  senala: '{nombre} le está señalando algo',
  invita: '{nombre} lo invita a acercarse',
  husmea: '{nombre} está husmeando: revisa la finca con cuidado',
});

export const ARIA_POR_ESTADO = Object.freeze({
  acompana: '{nombre} lo acompaña',
  escuchando: '{nombre} lo está escuchando con atención',
  pensando: '{nombre} está pensando, buscando en su memoria de la finca',
  respondiendo: '{nombre} le está respondiendo',
  contenta: '{nombre} está contenta',
  preocupada: '{nombre} está preocupada: hay algo que conviene revisar',
  'no-se': '{nombre} niega con la cabeza: no sabe la respuesta, y se lo dice con honestidad',
  senala: '{nombre} le está señalando algo',
  invita: '{nombre} lo invita a acercarse',
  husmea: '{nombre} está husmeando: revisa la finca con cuidado',
});

function nombreDeAgente(nombre) {
  return typeof nombre === 'string' && nombre.trim() ? nombre.trim() : 'Angelita';
}

function interpolarEstado(plantillas, estado, nombre) {
  const canonico = estadoCanonico(estado);
  return plantillas[canonico].replaceAll('{nombre}', nombreDeAgente(nombre));
}

/** Texto breve del estado, parametrizado por el nombre visible del compai. */
export function textoDeEstado(estado, nombre = 'Angelita') {
  return interpolarEstado(TEXTO_POR_ESTADO, estado, nombre);
}

/** Narración accesible del estado, parametrizada por el nombre visible. */
export function ariaDeEstado(estado, nombre = 'Angelita') {
  return interpolarEstado(ARIA_POR_ESTADO, estado, nombre);
}

export const textoParaEstado = textoDeEstado;
export const ariaParaEstado = ariaDeEstado;

/* Alias compatible con Angelita: conserva exactamente el copy histórico,
   incluido el descriptor de abeja que ya pueden anunciar consumidores viejos. */
/** @type {Record<string, string>} */
export const ARIA_DE_ESTADO = Object.freeze({
  ...Object.fromEntries(ESTADOS_AGENTE.map((estado) => [estado, ariaDeEstado(estado, 'Angelita')])),
  acompana: 'Angelita la abeja lo acompaña',
});

/* Un perfil de rig debe resolver todos los estados conversacionales y la
   locomoción transversal. La validación vive aquí para que cualquier especie
   pueda usarla sin importar React, Three ni un componente concreto. */
export const ESTADOS_DE_PERFIL = Object.freeze([...ESTADOS_AGENTE, 'caminando']);

function argumentosDeValidacion(perfil, slug) {
  /* Admite tanto validarPerfilDeEstados(perfil, slug) como la forma legible
     validarPerfilDeEstados(slug, perfil), útil en tests y herramientas. */
  if (typeof perfil === 'string') {
    return { mapa: slug, nombre: perfil };
  }
  return {
    mapa: perfil?.posePorEstado || perfil?.poses || perfil,
    nombre: typeof slug === 'string' && slug.trim() ? slug.trim() : perfil?.slug || 'perfil',
  };
}

/**
 * Valida que un mapa de poses cubra los 10 estados y `caminando`.
 * @param {object|string} perfil mapa, perfil con `posePorEstado`, o slug
 * @param {object|string} [slug] slug o mapa cuando se usa la firma invertida
 * @returns {true}
 * @throws {Error} con el slug y el primer estado que falta
 */
export function validarPerfilDeEstados(perfil, slug) {
  const { mapa, nombre } = argumentosDeValidacion(perfil, slug);
  const faltante = ESTADOS_DE_PERFIL.find((estado) => (
    !mapa || typeof mapa[estado] !== 'string' || !mapa[estado].trim()
  ));
  if (faltante) {
    throw new Error(`Perfil ${nombre} incompleto: falta el estado ${faltante}`);
  }
  return true;
}

export const validarMapaDePoses = validarPerfilDeEstados;
export const validarPerfil = validarPerfilDeEstados;

/* Cuando Angelita NO SABE, el globo (BurbujaAngelita) debe decirlo CLARO: "No
   sé" a secas, nunca una evasiva ni un rodeo — decir "no sé" es la conducta
   correcta (política anti-alucinación de Chagra), no una falla que disimular.
   Los hosts que compongan el mensaje del estado 'no-se' parten de aquí. */
export const TEXTO_NO_SE = 'No sé.';

/* ── EL REPERTORIO DEL IDLE VIVO (estado acompana) ───────────────────────────
   Una vecina de verdad EXISTE aunque nadie le hable: entre ratos de vuelo
   sereno ('flota') se distrae con una mota que pasa, mira alrededor, se
   acicala las antenas con la manita, se rasca la barriguita, sacude las alas
   y — de vez en cuando — SE POSA a descansar (aterriza con peso, respira
   plegadita y vuelve a despegar). Angelita.jsx hojea este repertorio con un
   reloj de jitter (nunca metrónomo); la CADENCIA de cada momento vive en
   angelita-agente.css bajo [data-agt-idle=…].

   REGLA DURA: `dur` (ms) debe COINCIDIR con la duración del keyframe one-shot
   del CSS de ese momento — el scheduler suelta el atributo exactamente cuando
   el gesto termina en identidad, y así el empalme no salta.
   `peso` = probabilidad relativa al elegir (0 = no se elige por azar: son los
   momentos de secuencia — flota es el "entre-gestos"; posada/despega los
   encadena el propio scheduler después de posa). */
export const MOMENTOS_IDLE = {
  flota: { dur: [3200, 8600], peso: 0 },  // vuelo sereno entre gestos (dur al azar)
  mira: { dur: 2600, peso: 3 },       // mira alrededor, curiosa (ojos primero, cabeza después)
  distraida: { dur: 3600, peso: 2 },  // pasa una mota de vilano y la sigue con los ojos
  acicala: { dur: 3000, peso: 2 },    // se acicala la antena con la manita (aseo de abeja)
  rasca: { dur: 2400, peso: 1.5 },    // se rasca la barriguita, satisfecha
  sacude: { dur: 1500, peso: 1.5 },   // sacudón de alas: escalofrío alegre que la esponja
  guino: { dur: 1800, peso: 1.2 },    // se pica el ojo: complicidad, no biología (SPEC)
  estira: { dur: 2600, peso: 1.4 },   // se estira a gusto: bracitos arriba, bosteza el cuerpo
  bosteza: { dur: 3200, peso: 1.1 },  // bostezo de goma: boca enorme, manita tarde a taparla
  rascanuca: { dur: 2400, peso: 1.3 },// se rasca la nuca, medio apenada (rascarse distinto)
  cabecea: { dur: 3600, peso: 0.9 },  // se le van los ojos… zzz… y DESPIERTA de un brinco
  voltereta: { dur: 1700, peso: 0.8 },// pirueta juguetona: vuelta de campana con anticipación
  posa: { dur: 1150, peso: 2 },       // aterriza con peso (→ posada → despega)
  posada: { dur: [3400, 5200], peso: 0 }, // descansa posada: alitas plegadas, respira hondo
  despega: { dur: 950, peso: 0 },     // se agacha, coge impulso y vuelve al aire
};

/* Los momentos elegibles por azar (peso > 0), congelados una vez. */
const GESTOS_IDLE = Object.keys(MOMENTOS_IDLE).filter((m) => MOMENTOS_IDLE[m].peso > 0);

/**
 * Elige el próximo micro-gesto del idle: azar ponderado que NUNCA repite el
 * anterior (una criatura viva no se rasca dos veces seguidas como un GIF).
 * Pura y testeable: el azar se inyecta.
 * @param {string|null} [previo]  el último gesto hecho (se excluye).
 * @param {() => number} [rand]  fuente de azar 0..1 (default Math.random).
 * @returns {string} nombre del momento elegido.
 */
export function elegirMomentoIdle(previo = null, rand = Math.random) {
  const candidatos = GESTOS_IDLE.filter((m) => m !== previo);
  const total = candidatos.reduce((s, m) => s + MOMENTOS_IDLE[m].peso, 0);
  let bola = rand() * total;
  for (const m of candidatos) {
    bola -= MOMENTOS_IDLE[m].peso;
    if (bola <= 0) return m;
  }
  return candidatos[candidatos.length - 1];
}

/**
 * Duración en ms de un momento del idle; los rangos [min,max] salen con
 * jitter (el reloj de una criatura viva no es de cuarzo).
 * @param {string} momento
 * @param {() => number} [rand]
 * @returns {number}
 */
export function duracionDeMomento(momento, rand = Math.random) {
  const m = MOMENTOS_IDLE[momento] || MOMENTOS_IDLE.flota;
  return Array.isArray(m.dur) ? Math.round(m.dur[0] + rand() * (m.dur[1] - m.dur[0])) : m.dur;
}

/* ── CONFIANZA (modo científico) ─────────────────────────────────────────────
   Chagra valora la honestidad sobre la alucinación: cuando el agente responde
   con evidencia firme se NOTA, y cuando duda TAMBIÉN se nota. El cuerpo lo
   dibuja como un anillo de certeza (halo): firme si está segura, punteado si
   es regular, titilante y con puntos suspensivos si duda. */
export const NIVELES_CONFIANZA = ['alta', 'media', 'baja'];

/**
 * Normaliza la confianza que entrega el host: acepta número 0..1 (score del
 * modo científico) o etiqueta directa. null/undefined = sin marca (el halo no
 * se dibuja; consumidores que no manejan confianza no ven nada nuevo).
 * @param {number|string|null|undefined} confianza
 * @returns {'alta'|'media'|'baja'|null}
 */
export function nivelDeConfianza(confianza) {
  if (confianza === null || confianza === undefined || confianza === '') return null;
  if (typeof confianza === 'string') {
    const c = confianza.toLowerCase().trim();
    if (c === 'segura') return 'alta';
    if (c === 'duda' || c === 'dudosa') return 'baja';
    return NIVELES_CONFIANZA.includes(/** @type {any} */ (c)) ? /** @type {any} */ (c) : null;
  }
  const n = Number(confianza);
  if (Number.isNaN(n)) return null;
  if (n >= 0.75) return 'alta';
  if (n >= 0.4) return 'media';
  return 'baja';
}
