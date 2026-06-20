/**
 * diseaseObservationService — detecta SÍNTOMAS / ENFERMEDADES en las
 * observaciones de bitácora de un ciclo y los expone para que el agente los
 * conozca PROACTIVAMENTE (grounding) y para que cropAlertEngine los empuje como
 * alerta del home.
 *
 * Es lógica PURA + lectura del event store (IndexedDB). NO escribe, NO toca red,
 * NO inventa: solo lee lo que el usuario YA anotó. Degrada limpio (null / []).
 *
 * El campesino anota en lenguaje natural ("a la lechuga le salió un polvillo
 * blanco en las hojas"); este servicio reconoce ese vocabulario y, si reconoce
 * un patógeno conocido para la especie, lo nombra. Si no, marca "síntoma sin
 * identificar" — sin afirmar un diagnóstico falso.
 */
import { getFarmEvents } from '../db/farmProcessCache';

/**
 * Vocabulario de síntomas de enfermedad/daño en lenguaje campesino. Alineado
 * con SYMPTOM_QUERY_RE de agentPromptBase pero enfocado a ENFERMEDAD (no etapa).
 */
const DISEASE_SYMPTOM_RE =
  /(mildeo|mildiu|mildiú|mancha|manchas|polvillo|polvo blanco|ceniza|oídio|oidio|hongo|hongos|moho|podrid|pudri|amarill|marchit|secand|secas|secos|enferm|tizón|tizon|roya|botritis|botrytis|esclerotinia|bacteria|virus|virosis|pulgon|pulgón|babosa|gusano|larva|mordid|comid)/i;

/**
 * Patógenos conocidos por especie (catálogo curado mínimo). El nombre científico
 * solo se afirma cuando el síntoma reportado coincide con un patrón típico de la
 * especie. Fuente agronómica general — marcado [VALIDAR] en UI.
 */
const KNOWN_PATHOGENS = {
  lactuca_sativa: [
    {
      match: /(mildeo|mildiu|mildiú|polvillo|polvo blanco|ceniza|hongo|moho|mancha)/i,
      pathogen: 'Mildeo velloso (Bremia lactucae)',
      severity: 'alto',
      control:
        'Mejora la aireación, evita el riego sobre las hojas y aplica caldo bordelés o extracto de cola de caballo de forma preventiva. Retira hojas muy afectadas.',
    },
    {
      match: /(podrid|pudri|botritis|botrytis|esclerotinia)/i,
      pathogen: 'Pudrición / hongo de suelo (Botrytis o Sclerotinia)',
      severity: 'alto',
      control:
        'Reduce humedad y encharcamiento, mejora el drenaje y elimina las plantas podridas para que no contagien.',
    },
  ],
};

/**
 * Analiza un texto de observación y devuelve la enfermedad detectada o null.
 *
 * @param {string} text — texto de la observación (campesino)
 * @param {string} [speciesSlug] — para nombrar el patógeno típico de la especie
 * @returns {{ isDisease: boolean, pathogen: string|null, severity: string, control: string|null, symptom: string }|null}
 */
export function detectDiseaseInText(text, speciesSlug) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!DISEASE_SYMPTOM_RE.test(trimmed)) return null;

  // ¿Coincide con un patógeno conocido de la especie?
  const known = KNOWN_PATHOGENS[speciesSlug] || [];
  for (const k of known) {
    if (k.match.test(trimmed)) {
      return {
        isDisease: true,
        pathogen: k.pathogen,
        severity: k.severity,
        control: k.control,
        symptom: trimmed,
      };
    }
  }

  // Síntoma reconocido pero patógeno no identificado para la especie: NO
  // inventamos un nombre científico — lo marcamos como síntoma a vigilar.
  return {
    isDisease: true,
    pathogen: null,
    severity: 'medio',
    control: null,
    symptom: trimmed,
  };
}

/** Extrae el texto de una observación independiente de la forma del payload. */
function observationText(event) {
  const p = event?.attributes?.payload || {};
  return p.text || p.transcription || p.note || '';
}

/**
 * Lee los eventos de un ciclo y devuelve la enfermedad MÁS RECIENTE detectada en
 * sus observaciones de bitácora, o null si no hay ninguna.
 *
 * @param {string} processId
 * @param {string} [speciesSlug]
 * @returns {Promise<({ isDisease: boolean, pathogen: string|null, severity: string, control: string|null, symptom: string, observedAt: number })|null>}
 */
export async function getActiveDiseaseForCycle(processId, speciesSlug) {
  if (!processId) return null;
  let events = [];
  try {
    events = (await getFarmEvents(processId)) || [];
  } catch {
    return null;
  }
  // getFarmEvents ya viene ordenado descendente por occurred_at.
  for (const ev of events) {
    if (ev?.attributes?.event_type !== 'observation') continue;
    const text = observationText(ev);
    const det = detectDiseaseInText(text, speciesSlug);
    if (det && det.isDisease) {
      return { ...det, observedAt: ev.attributes.occurred_at || 0 };
    }
  }
  return null;
}
