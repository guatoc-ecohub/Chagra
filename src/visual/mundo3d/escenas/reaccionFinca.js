/*
 * reaccionFinca — LA CAPA DE ESTADO de Angelita (auditoría §5b).
 *
 * "Tu finca es un lugar vivo que refleja tu realidad." Este módulo traduce el
 * ESTADO REAL de la finca en un REPERTORIO de reacción que la escena aplica al
 * cuerpo de la abeja. Es a propósito una función PURA y DESACOPLADA de la especie:
 * el día que entre el selector de avatar (AVATAR_GAME.md — chivito de páramo, rana,
 * abeja...), cada Espíritu reacciona con SU repertorio a este mismo descriptor.
 * Angelita es hoy el prototipo de ese sistema.
 *
 * ENTRADA — `estadoFinca` (interfaz LIMPIA, hoy datos de MUESTRA):
 *   {
 *     clima,           // 'dorada'|'soleado'|'niebla'|'lluvia'|'noche' (CLIMAS)
 *     enso,            // fase ENSO: 'nino' (sequía/calor) | 'nina' (más lluvia) | 'neutro'
 *     cosechaReciente, // null | { cultivo: 'café', mundoId: 'cafetal' } — algo que libar
 *     saludFinca,      // { matasVivas, matasTotal, agua(0..1) } — la vitalidad real
 *   }
 * El backend (useFincaViva, lo cabla codex después) alimenta ESTA MISMA forma:
 * logs de matas → saludFinca, Open-Meteo → clima/enso, cosechas del ciclo →
 * cosechaReciente. Aquí solo hay MUESTRA para poder verlo hoy.
 *
 * SALIDA — descriptor de reacción que consume `useEntradaAbeja`/`AbejaEscena`:
 *   {
 *     animo,     // piel/gesto: 'pleno'|'sereno'|'atento'|'sediento'|'descansa'
 *     energia,   // 0..1 vivacidad del vuelo/aura (de la salud real)
 *     mojada,    // llueve → gotas y brillo, vuela más bajo y lento
 *     sed,       // Niño/sequía → jadea, busca agua abajo
 *     comiendo,  // hay cosecha → revolotea sobre el fruto y liba
 *     cultivo,   // qué liba (para el copy/gesto), o null
 *     frase,     // una línea en usted, puntual (sin muros de texto)
 *     vuelo,     // modificadores de la coreografía: { altura, velocidad, vagar, tiembla }
 *   }
 */

/* Estado de MUESTRA: una finca sana bajo lluvia — así "llueve → mojada" se ve
   HOY sin backend. Codex lo reemplaza por el estado real (useFincaViva). */
export const ESTADO_FINCA_MUESTRA = {
  clima: 'lluvia',
  enso: 'neutro',
  cosechaReciente: null,
  saludFinca: { matasVivas: 34, matasTotal: 41, agua: 0.72 },
};

const SALUD_DEFECTO = { matasVivas: 34, matasTotal: 41, agua: 0.72 };

/* Umbral de sed: agua baja de reserva, o El Niño empujando calor/sequía. */
const AGUA_SEDIENTA = 0.35;

/**
 * Deriva el repertorio de reacción de Angelita del estado real de la finca.
 * Prioridad del ÁNIMO: sed > alerta pendiente > noche > salud. Los flags de
 * clima (mojada) y de cosecha (comiendo) son ORTOGONALES: la abeja puede estar
 * mojada Y libando a la vez (es una finca viva, pasan cosas juntas).
 *
 * @param {object} [estadoFinca=ESTADO_FINCA_MUESTRA]
 * @param {object} [opts]
 * @param {boolean} [opts.hayAlerta=false]  ?lo del día sigue sin atender?
 * @returns descriptor de reacción (ver cabecera del módulo).
 */
export function reaccionDeFinca(estadoFinca = ESTADO_FINCA_MUESTRA, { hayAlerta = false } = {}) {
  const {
    clima = 'dorada',
    enso = 'neutro',
    cosechaReciente = null,
    saludFinca = SALUD_DEFECTO,
  } = estadoFinca || {};
  const total = saludFinca.matasTotal > 0 ? saludFinca.matasTotal : 1;
  const vivas = Math.max(0, Math.min(1, saludFinca.matasVivas / total));
  const agua = Math.max(0, Math.min(1, saludFinca.agua ?? 0.5));

  const llueve = clima === 'lluvia';
  const nino = enso === 'nino';
  // Sed: reserva baja, o El Niño en un clima que reseca (no bajo lluvia).
  const sed = agua < AGUA_SEDIENTA || (nino && (clima === 'soleado' || clima === 'dorada'));
  const comiendo = !!(cosechaReciente && cosechaReciente.cultivo);
  const cultivo = comiendo ? cosechaReciente.cultivo : null;

  // Energía: mezcla de matas vivas y agua, atenuada por el clima duro y la sed.
  const climaFactor = clima === 'noche' ? 0.55 : llueve ? 0.8 : 1;
  const sedFactor = sed ? 0.75 : 1;
  const energia = Math.max(
    0.3,
    Math.min(1, (vivas * 0.65 + agua * 0.35) * climaFactor * sedFactor),
  );

  // ── ÁNIMO (piel/gesto). Prioridad: sed > alerta > noche > salud plena.
  let animo = 'sereno';
  let frase = 'La abeja anda serena, echándole ojo a la finca.';
  if (sed) {
    animo = 'sediento';
    frase = nino
      ? 'Angelita jadea con este calorón del Niño: a la finca le hace falta agua.'
      : 'La abeja la ve con sed: a la finca le hace falta agua.';
  } else if (hayAlerta) {
    animo = 'atento';
    frase = 'Angelita anda pendiente: hay algo que atender hoy.';
  } else if (clima === 'noche') {
    animo = 'descansa';
    frase = 'Angelita descansa; la finca duerme tranquila esta noche.';
  } else if (vivas >= 0.85 && agua >= 0.55) {
    animo = 'pleno';
    frase = 'Angelita anda contenta: sus matas están vivas y con agua.';
  }
  if (comiendo && !sed) {
    // Libar es alegría: si no hay sed que la opaque, la cosecha manda el copy.
    frase = `Angelita revolotea sobre ${cultivo}: hay cosecha y se da un banquete.`;
  }

  // ── VUELO (modificadores de la coreografía que aplica useEntradaAbeja).
  //    altura/velocidad/vagar son multiplicadores (1 = vuelo normal); `tiembla`
  //    es la amplitud de un temblor nervioso (sed) o de mordisco (comiendo).
  const vuelo = {
    altura: 1,
    velocidad: 1,
    vagar: 1,
    tiembla: 0,
  };
  if (mojadaLenta(llueve)) {
    vuelo.altura = 0.6; // pesada por el agua, vuela más bajo
    vuelo.velocidad = 0.72; // y más lento
    vuelo.vagar = 0.8;
  }
  if (sed) {
    vuelo.altura = 0.5; // baja a buscar agua/sombra
    vuelo.velocidad = 0.85;
    vuelo.tiembla = 0.06; // aleteo nervioso, jadeo
  }
  if (comiendo) {
    vuelo.altura = Math.min(vuelo.altura, 0.7); // se acerca al fruto
    vuelo.tiembla = Math.max(vuelo.tiembla, 0.04); // micro-lunges de mordisco
  }

  return { animo, energia, mojada: llueve, sed, comiendo, cultivo, frase, vuelo };
}

/* pequeño helper nombrado para que el `if` de arriba se lea como intención */
function mojadaLenta(llueve) {
  return llueve;
}

export default reaccionDeFinca;
