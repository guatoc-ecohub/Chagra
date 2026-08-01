/*
 * _hiloVida.js — la PROSA del hilo de la "vida vista" (funciones puras).
 *
 * Vive separada de HiloVidaVista.jsx por la misma razón que _cielo.js: el
 * componente no debe exportar también funciones (react-refresh). Aquí se
 * compone la narración; el .jsx solo la presenta. Contrato: NUNCA fabrica
 * estado — sin dato, describe lo neutro.
 */

const SUFIJO_CONDICION = {
  soleado: 'bajo un cielo despejado',
  nublado: 'bajo un cielo cubierto',
  lluvia: 'mientras cae la lluvia',
  niebla: 'entre la niebla',
};

const BASE_LUZ = {
  amanecer: 'Su finca amanece',
  dia: 'El día avanza sobre su finca',
  atardecer: 'La tarde cae sobre su finca',
  noche: 'Es de noche en su finca',
};

/** La frase del cielo. Sin dato → lo neutro (nunca inventa clima). */
export function fraseCielo(cielo) {
  const base = BASE_LUZ[cielo?.luz];
  if (!base) return 'Su finca sigue su ritmo, tranquila en el valle.';
  const sufijo = SUFIJO_CONDICION[cielo?.condicion];
  return sufijo ? `${base} ${sufijo}.` : `${base}.`;
}

/** La frase de Angelita, por su ánimo real. */
export function fraseAngelita(animo, energia, lugar) {
  const donde = typeof lugar === 'string' && lugar.trim() ? lugar.trim() : 'el valle';
  const FRASES = {
    pleno: `La abeja Angelita vuela contenta por ${donde}: todo se ve en orden.`,
    sereno: `La abeja Angelita ronda ${donde} con calma.`,
    atento: `La abeja Angelita está atenta: algo en ${donde} pide una mirada.`,
    sediento: `La abeja Angelita busca agua por ${donde}; un riego le vendría bien a la finca.`,
    descansa: `La abeja Angelita descansa; la finca también merece su pausa.`,
  };
  const frase = FRASES[animo] || FRASES.sereno;
  const e = typeof energia === 'number' ? energia : 1;
  if (e <= 0.35 && animo !== 'descansa') {
    return `${frase} Va despacio, guardando energía.`;
  }
  return frase;
}

/** La frase de los pendientes. `undefined` → null (no se fabrica saber). */
export function frasePendientes(pendientes) {
  if (!Array.isArray(pendientes)) return null;
  const reales = pendientes.filter(Boolean);
  if (reales.length === 0) return 'Por ahora no hay pendientes que atender.';
  if (reales.length === 1) {
    const p = reales[0];
    if (typeof p.texto === 'string' && p.texto.trim()) return p.texto.trim();
    return p.tema
      ? `Hay algo que atender en ${p.tema}.`
      : 'Hay algo en la finca que pide su mirada.';
  }
  const temas = [...new Set(reales.map((p) => p.tema).filter(Boolean))];
  if (temas.length === 0) return `Hay ${reales.length} asuntos que esperan su mirada.`;
  const lista = temas.length === 1
    ? temas[0]
    : `${temas.slice(0, -1).join(', ')} y ${temas[temas.length - 1]}`;
  return `Hay ${reales.length} asuntos que esperan su mirada: ${lista}.`;
}

/** El hilo completo, en orden fijo: cielo → Angelita → pendientes. */
export function componerHilo(/** @type {{cielo?: any, animo?: any, energia?: any, lugar?: any, pendientes?: any}} */ { cielo, animo, energia, lugar, pendientes } = {}) {
  return [
    fraseCielo(cielo),
    fraseAngelita(animo, energia, lugar),
    frasePendientes(pendientes),
  ].filter(Boolean);
}

