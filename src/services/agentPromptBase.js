/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * agentPromptBase — texto BASE del system prompt del agente + builders puros
 * de bloques por-turno (corpus RAG, evidencia de tools, entidades resueltas,
 * análisis de query).
 *
 * Re-arquitectura GR-10 (2026-06-10): el base pasó de ~27K chars (~10.5K
 * tokens reales de granite) a una versión COMPRIMIDA + CONDICIONAL:
 *   - Los glosarios (taxonómico / plagas / regionalismos) solo inyectan las
 *     LÍNEAS que la query o el historial mencionan — el modelo no puede usar
 *     la línea de "borojó" en una pregunta de broca, y 5.7K chars de glosario
 *     fijo eran la primera causa de truncación del grounding.
 *   - CASO C completo solo cuando la query ES enumerativa (el bloque de
 *     ANÁLISIS DE LA QUERY ya es autoritativo sobre eso); si no, queda la
 *     definición corta.
 *   - Reglas condensadas SIN perder semántica: TODAS las guardas
 *     anti-alucinación sobreviven (binomio, CASO B, CASO C, viabilidad
 *     neutral, diagnóstico-sin-evidencia, plagas found:false, anti-síntomas,
 *     turn-aislamiento) y la voz hacia el campesino no cambia.
 *
 * Funciones PURAS (sin estado de componente, sin red): el test de presupuesto
 * (promptAssembler.budget.test.js) las ensambla con fixtures representativas
 * y falla en CI si el prompt vuelve a crecer hasta truncar el grounding.
 *
 * @module agentPromptBase
 */

import {
  generateViabilityRules,
  generateAgronomicGuidanceRules,
  buildProfileContext,
} from './agentService.js';

// Cap defensivo para inyectar evidencia del sidecar como context turn
// sin reventar la ventana de contexto. ~1500 chars ≈ 500-580 tokens —
// deja sitio cómodo para system prompt + corpus RAG + historial + query.
export const TOOL_EVIDENCE_MAX_CHARS = 1500;

const _strip = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * ¿Alguna de las `keys` aparece como palabra (tolerando plural simple) en el
 * texto? Matching determinístico sobre texto sin tildes; claves multi-palabra
 * se buscan como substring.
 */
function _mentionsAny(textStripped, keys) {
  for (const key of keys) {
    const k = _strip(key);
    if (k.includes(' ')) {
      if (textStripped.includes(k)) return true;
      continue;
    }
    const re = new RegExp(`(^|[^a-zñ])${k}(s|es)?([^a-zñ]|$)`);
    if (re.test(textStripped)) return true;
  }
  return false;
}

const CONVERSATION_CROP_KEYS = [
  ['café', ['cafe', 'cafeto', 'cafetal']],
  ['tomate', ['tomate']],
  ['papa', ['papa']],
  ['aguacate', ['aguacate']],
  ['plátano', ['platano']],
  ['maíz', ['maiz']],
  ['fresa', ['fresa']],
  ['mora', ['mora']],
  ['frijol', ['frijol']],
  ['mango', ['mango']],
];

const CONVERSATION_VARIETY_KEYS = [
  ['Castillo', ['castillo']],
  ['Colombia', ['variedad colombia', 'cultivar colombia']],
  ['Caturra', ['caturra']],
  ['Tabi', ['tabi']],
  ['Bourbon', ['bourbon']],
  ['Geisha', ['geisha']],
  ['Typica', ['typica', 'típica']],
  ['Hass', ['hass']],
  ['Monserrate', ['monserrate']],
  ['Diacol Capiro', ['diacol capiro', 'capiro']],
  ['Criolla', ['criolla']],
];

const CONVERSATION_PROBLEM_KEYS = [
  ['gota', ['gota', 'tizón tardío', 'tizon tardio', 'phytophthora']],
  ['roya', ['roya']],
  ['broca', ['broca']],
  ['chiza', ['chiza']],
  ['sigatoka', ['sigatoka']],
  ['antracnosis', ['antracnosis']],
  ['monalonion', ['monalonion']],
  ['marchitez bacteriana', ['marchitez bacteriana', 'ralstonia']],
  ['moko', ['moko']],
  ['manchas', ['mancha', 'manchas']],
  ['amarillamiento', ['amarillamiento', 'amarilla', 'amarillas']],
];

const _firstMention = (textStripped, entries) => {
  const found = entries.find(([, keys]) => _mentionsAny(textStripped, keys));
  return found ? found[0] : '';
};

const _userHistoryText = (history) => {
  if (Array.isArray(history)) {
    return history
      .filter((turn) => turn?.role === 'user' || turn?.author === 'user' || turn?.type === 'user')
      .map((turn) => turn?.content || turn?.text || turn?.message || '')
      .filter(Boolean)
      .join('\n');
  }

  const raw = typeof history === 'string' ? history : '';
  if (!raw.trim()) return '';

  const userParts = [];
  const re = /(?:^|\n)\s*Usuario:\s*([\s\S]*?)(?=\n\s*(?:Asistente|Usuario):|$)/gi;
  let match;
  while ((match = re.exec(raw)) !== null) {
    if (match[1]?.trim()) userParts.push(match[1].trim());
  }
  return userParts.length > 0 ? userParts.join('\n') : raw;
};

/**
 * buildConversationContextPin: fija datos ya establecidos por el usuario en
 * la conversación. Heurística determinística y corta para no competir con el
 * grounding del turno actual.
 *
 * @param {string|Array<object>} history
 * @returns {string}
 */
export function buildConversationContextPin(history) {
  const userText = _userHistoryText(history);
  const mention = _strip(userText);
  if (!mention) return '';

  const lines = [];
  const crop = _firstMention(mention, CONVERSATION_CROP_KEYS);
  const variety = _firstMention(mention, CONVERSATION_VARIETY_KEYS);
  const problem = _firstMention(mention, CONVERSATION_PROBLEM_KEYS);
  const altitudeMatch = mention.match(/(^|[^0-9])(\d{3,4})\s*(msnm|m\.?s\.?n\.?m\.?|metros?|m)([^a-zñ]|$)/);
  const locationMatch = userText.match(/\b(?:en|desde|ubicad[oa] en|finca en)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]{2,45})(?=[,.;\n]|$)/);

  if (crop) lines.push(`- Cultivo: ${crop}`);
  if (variety) lines.push(`- Variedad: ${variety}`);
  if (altitudeMatch || locationMatch) {
    const parts = [];
    if (altitudeMatch) parts.push(`${altitudeMatch[2]} msnm`);
    if (locationMatch) parts.push(locationMatch[1].trim());
    lines.push(`- Altitud/ubicación: ${parts.join(', ')}`);
  }
  if (problem) lines.push(`- Problema previo: ${problem}`);

  if (lines.length === 0) return '';

  return `CONTEXTO DE LA CONVERSACIÓN (datos ya establecidos por el usuario):
${lines.slice(0, 4).join('\n')}`;
}

// ── Glosarios como DATA (se inyectan SOLO las líneas mencionadas) ───────────
// Contenido 1:1 con el glosario histórico — no se perdió ninguna entrada,
// solo se volvieron condicionales a la mención en query/historial.

const GLOSARIO_PLAGAS = [
  [['chiza'], '- chiza = larva de Phyllophaga spp. / Ancognatha spp. (escarabajos rizófagos que comen raíces)'],
  [['broca'], '- broca del café = Hypothenemus hampei'],
  [['monalonion', 'chinche'], '- monalonion (chinche del aguacate) = Monalonion velezangeli'],
  [['mosca'], '- mosca del aguacate = Heilipus lauri'],
  [['mosca'], '- mosca de la fruta = Anastrepha spp. / Ceratitis capitata'],
  [['picudo'], '- picudo del plátano = Cosmopolites sordidus'],
  [['roya'], '- roya del café = Hemileia vastatrix'],
  [['sigatoka'], '- sigatoka negra del plátano = Mycosphaerella fijiensis'],
  [['antracnosis'], '- antracnosis = Colletotrichum spp.'],
  [['trips'], '- trips = Frankliniella spp. / Thrips spp.'],
  [['cogollero', 'gusano'], '- gusano cogollero del maíz = Spodoptera frugiperda'],
  [['acaro'], '- ácaro del tomate = Aculops lycopersici / Tetranychus urticae'],
];

const GLOSARIO_TAXONOMICO = [
  [['maracuya'], '- maracuyá = Passiflora edulis f. flavicarpa (amarilla, NO Mangifera indica — eso es mango)'],
  [['gulupa'], '- gulupa = Passiflora edulis f. edulis (morada — NO confundir con guayaba Psidium guajava, NO con Cucurbita moschata, NO con Musa; gulupa es PASSIFLORA, una pasionaria)'],
  [['granadilla'], '- granadilla = Passiflora ligularis'],
  [['curuba'], '- curuba = Passiflora tripartita f. mollissima (Passifloraceae andina, NO confundir con curuba-de-monte ni otras Passiflora)'],
  [['chulupa'], '- chulupa = Passiflora maliformis'],
  [['badea'], '- badea = Passiflora quadrangularis'],
  [['mango'], '- mango = Mangifera indica'],
  [['mora'], '- mora andina = Rubus glaucus (NO Morus nigra — eso es mora de árbol; NO confundir con zarzamora europea Rubus fruticosus)'],
  [['frambuesa'], '- frambuesa andina = Rubus glaucus var. (a veces dicen "mora frambuesa")'],
  [['lulo'], '- lulo = Solanum quitoense (NO Solanum lycopersicum — eso es tomate)'],
  [['uchuva'], '- uchuva = Physalis peruviana'],
  [['tomate'], '- tomate común = Solanum lycopersicum (tomate de mesa, hortaliza)'],
  [['tomate'], '- tomate de árbol/tomate de palo = Solanum betaceum (frutal perenne, distinta especie a tomate de mesa)'],
  [['guayaba'], '- guayaba = Psidium guajava (NO Pouteria, NO confundir con feijoa Acca sellowiana)'],
  [['feijoa'], '- feijoa/guayaba del Brasil = Acca sellowiana'],
  [['chachafruto', 'balu'], '- chachafruto/balú = Erythrina edulis (NO Theobroma cacao — eso es cacao)'],
  [['cubio'], '- cubio = Tropaeolum tuberosum (NO Lupinus — eso es chocho/tarwi)'],
  [['chocho', 'tarwi'], '- chocho/tarwi = Lupinus mutabilis'],
  [['oca'], '- oca = Oxalis tuberosa'],
  [['mashua'], '- mashua = Tropaeolum tuberosum (sinónimo de cubio)'],
  [['ulluco'], '- ulluco = Ullucus tuberosus'],
  [['yacon'], '- yacón = Smallanthus sonchifolius'],
  [['arracacha'], '- arracacha = Arracacia xanthorrhiza'],
  [['ñame', 'name'], '- ñame = Dioscorea spp.'],
  [['chontaduro'], '- chontaduro = Bactris gasipaes'],
  [['borojo'], '- borojó = Borojoa patinoi'],
  [['araza'], '- arazá = Eugenia stipitata'],
  [['copoazu'], '- copoazú = Theobroma grandiflorum'],
  [['camu'], '- camu camu = Myrciaria dubia'],
  [['coco', 'cocotero'], '- cocotero/coco = Cocos nucifera'],
  [['aguacate'], '- aguacate = Persea americana Mill. (Lauraceae — NO Psidium guajava, NO Mangifera, NO Pouteria)'],
  [['hass', 'aguacate'], '- aguacate Hass = Persea americana var. Hass (cultivar comercial)'],
  [['cafe'], '- café arábica = Coffea arabica (NO Coffea canephora — eso es robusta)'],
  [['cafe', 'robusta'], '- café robusta = Coffea canephora'],
  [['platano'], '- plátano = Musa AAB (clones plátano hartón, dominico)'],
  [['banano'], '- banano = Musa AAA (Cavendish y otros)'],
  [['papa', 'criolla'], '- papa criolla = Solanum phureja (subespecie distinta a papa común Solanum tuberosum)'],
  [['papa'], '- papa común = Solanum tuberosum'],
  [['quinua'], '- quinua = Chenopodium quinoa Willd.'],
  [['arveja'], '- arveja = Pisum sativum (NO Phaseolus — eso es frijol)'],
  [['frijol'], '- frijol común = Phaseolus vulgaris'],
  [['haba'], '- haba = Vicia faba'],
  [['frailejon'], '- frailejón = Espeletia spp. (Asteraceae endémica páramo)'],
];

const GLOSARIO_REGIONAL = [
  [['matas', 'mata'], '- matas = plantas individuales; mata madre = planta progenitora'],
  [['palo'], '- palo = árbol grande (tronco principal)'],
  [['almacigo'], '- almácigo = vivero / semillero'],
  [['soca'], '- soca = rebrote del café después de cosecha o poda fuerte'],
  [['encerrar'], '- encerrar = cosechar (uso Boyacá, también "recoger")'],
  [['trillar'], '- trillar = separar grano de cáscara'],
  [['chamizo'], '- chamizo = ramas secas / Chusquea (bambú andino) que invade lote'],
  [['chusque'], '- chusque = Chusquea sp. (bambú andino, frecuente en cafetales)'],
  [['pulchon'], '- pulchón = agujero / hueco (e.g. en tronco por barrenador)'],
  [['chapola'], '- chapola = larva de la broca del café (Hypothenemus hampei en estadio larval)'],
  [['gota'], '- gota = Phytophthora infestans (en papa, tomate; mildiu velloso del solanáceo)'],
  [['rondon'], '- rondón = barrenador del aguacate (Steirastoma breve y/o Heilipus lauri según contexto)'],
  [['brava', 'bravo'], '- brava = intensa / fuerte (ej. "plaga brava")'],
  [['finquero'], '- finquero = dueño o trabajador de finca'],
  [['jode', 'jodieron', 'jodio'], '- jode/jodieron = daña/dañaron (no traducir literal — entender contexto)'],
  [['barbecho'], '- barbecho = descanso de la tierra entre cultivos'],
  [['cuajar', 'cuaja'], '- cuajar = formar fruto tras polinización (verbo agronómico)'],
  [['cucha'], '- cucha = mujer / recolectora (Caldas, también "abuela")'],
  [['guayabero'], '- guayabero = recolector de café (jergón Caldas)'],
  [['panela'], '- panela = azúcar de caña sin refinar (no confundir con "panel")'],
];

const PASSIFLORA_KEYS = ['gulupa', 'maracuya', 'granadilla', 'curuba', 'chulupa', 'badea', 'passiflora', 'pasionaria'];

const INVENTORY_QUERY_RE = /(^|[^a-zñ])(tengo|registrad\w*|mis plantas|que plantas|mi finca|mi cultivo|cuant[oa]s|inventario)([^a-zñ]|$)/;
const SYMPTOM_QUERY_RE = /(mancha|amarill|seca|secando|marchit|hongo|caen|caida|cayendo|triste|enferm|podrid|pudri|debil|flojo|arrugad|enrollad|mordid|comid|huec|plaga|bicho|gusano|sintoma)/;
const NORMATIVA_QUERY_RE = /(quimic|sintetic|prohibid|registrad|permitid|restringid|(^|[^a-zñ])ica([^a-zñ]|$)|glifosato|veneno|agrotoxic|agroquimic|plaguicida|fungicida|insecticida|herbicida|dosis de [a-z]+cida)/;
const CLIMA_QUERY_RE = /(clima|lluvia|llover|llovi|temperatura|pronostico|tiempo|helada|granizo|sequia|verano|invierno|nino|nina|viento)/;
// Reglas crop-agnostic de seguridad (aplican a cualquier cultivo)
const CROP_AGNOSTIC_SAFETY_RULES = [
  [
    [['hlb', 'greening', 'liberibacter', 'monilia', 'moniliopsis', 'sigatoka negra', 'moko', 'marchitez bacteriana', 'ralstonia', 'virus', 'cuchara', 'tylcv', 'peste negra', 'tswv', 'mosaico']],
    'SEGURIDAD: estas enfermedades no tienen cura química comprobada en planta (HLB en cítricos, monilia en cacao, Sigatoka negra en plátano, moko/marchitez bacteriana/Ralstonia, virus en hortalizas). Manejo: erradicar/roguing, variedades resistentes, control de vector, desinfección. NUNCA prometas cura ni producto milagroso.',
  ],
  [
    [['dosis', 'cuantos ml', 'cuantos cc', 'cuantos gramos', 'ml', 'cc', 'gramos'], ['plaguicida', 'insecticida', 'fungicida', 'herbicida', 'sistematico', 'glifosato']],
    'SEGURIDAD: NUNCA inventes una dosis numérica de plaguicida. La dosis sale de la etiqueta registrada ICA y del asistente técnico. Herbicidas no selectivos (glifosato, paraquat) NO se aplican sobre el cultivo.',
  ],
  [
    [['metamidofos', 'parathion', 'paratión', 'monocrotofos', 'endosulfan', 'lannate', 'metomil']],
    'SEGURIDAD: productos altamente tóxicos sin registro ICA vigente. Consulta etiqueta actual y asistente técnico. Prefiere opciones agroecológicas.',
  ],
  [
    [['trichoderma'], ['insecto', 'oruga', 'polilla', 'gusano', 'cogollero', 'trips', 'mosca', 'plaga']],
    'SEGURIDAD: Trichoderma es un hongo de suelo para patógenos como Fusarium/Rhizoctonia, NO controla insectos. Para plagas usa control biológico específico (Beauveria, Bacillus, etc.).',
  ],
  [
    [['exportar', 'exportación', 'europa', 'estados unidos', 'eea', 'mrl', 'carencia', 'residuos'], ['cosecha', 'cerca de cosecha', 'pre-cosecha', 'cerca de cosechar']],
    'SEGURIDAD: para exportación, respeta MRL del país destino y carencia del producto. NO apliques plaguicidas fuertes cerca de cosecha. Verifica registro ICA y residuos permitidos.',
  ],
];

// Reglas específicas de tomate (se suman a las crop-agnostic)
const TOMATE_SAFETY_RULES = [
  [
    [['pudricion apical', 'culillo', 'blossom-end', 'rajado', 'rajando', 'raja', 'agrietado', 'agrietando', 'grieta']],
    'TOMATE: pudrición apical/culillo y rajado NO son enfermedades para fumigar. Son trastornos fisiológicos: calcio disponible + riego irregular. Corrige Ca y riego constante.',
  ],
  [
    [['broca'], ['tomate']],
    'TOMATE: broca es plaga de café, no de tomate. Plagas clave del tomate: Tuta absoluta, mosca blanca y Helicoverpa. Confirma con monitoreo o foto.',
  ],
  [
    [['tomate'], ['papa'], ['asociar', 'asociado', 'sembrar junto', 'juntos', 'asocio']],
    'TOMATE: no recomiendes asociar tomate con papa. Comparten Phytophthora infestans (gota/tizón tardío) y Ralstonia; advierte riesgo compartido.',
  ],
  [
    [['triplicar', 'triplico', 'triplica', 'duplicar', 'duplico', 'duplica', 'aumentar', 'aumento', 'aumenta'], ['nitrogeno', 'nitrógeno'], ['mas fruto', 'más fruto', 'fruto']],
    'TOMATE: triplicar nitrógeno NO da más fruto. Exceso de N da follaje, baja balance reproductivo y favorece plagas. Ajusta con análisis y potasio/calcio balanceados.',
  ],
];

/**
 * buildBasePrompt — system prompt base del agente Chagra (instrucciones +
 * glosarios condicionales + reglas anti-alucinación CASO A/B/C).
 *
 * Historia anti-alucinación (NO debilitar): "Si no sabes algo, dilo
 * honestamente" era demasiado débil (incidente "chorcho" 2026-05-17 — el
 * modelo inventó definición; un modelo más grande inventó otra cosa). La
 * solución probada en bench es la respuesta literal exigida (CASO B) +
 * temperature 0.3 — esa exigencia se conserva aquí palabra clave por
 * palabra clave.
 *
 * @param {object} args
 * @param {string} args.plantContext — inventario agrupado ("café ×3, …" o "ninguna").
 * @param {string} [args.fincaContext] — línea "Estás asistiendo en la finca…" o ''.
 * @param {string} [args.indoorContext] — línea de invernadero o ''.
 * @param {object|null} [args.finca] — finca activa (para buildProfileContext).
 * @param {string} [args.query] — query del turno (gatea glosarios/reglas condicionales).
 * @param {string} [args.contextMemory] — historial inyectado (gatea glosarios y turn-aislamiento).
 * @param {boolean} [args.isEnum] — análisis NN2: ¿query enumerativa? (gatea CASO C completo).
 * @returns {string}
 */
export function buildBasePrompt({
  plantContext,
  fincaContext = '',
  indoorContext = '',
  finca = null,
  query = '',
  contextMemory = '',
  isEnum = false,
}) {
  const mention = _strip(`${query}\n${contextMemory}`);
  const sections = [];
  const conversationContextPin = buildConversationContextPin(contextMemory);

  sections.push(`Eres Chagra IA, un asistente agroecológico colombiano. Habla como agrónomo experimentado, no como sistema. ${fincaContext}${indoorContext}El usuario tiene estas plantas agrupadas por especie con su conteo: ${plantContext}.`);

  sections.push(`REGLA DE INVENTARIO: al hablar de las plantas del usuario, agrupa por especie con su conteo (ej. "tienes 15 fresas, 4 caléndulas"); NUNCA listes los números individuales (#01, #02 — son identificadores internos).`);

  sections.push(`COHERENCIA MULTITURNO: respeta cultivo, variedad, altitud y problema ya dichos. Si la nueva pregunta contradice o ignora un dato/riesgo previo, corrígelo o recuérdalo.`);

  if (conversationContextPin) {
    sections.push(conversationContextPin);
  }

  if (INVENTORY_QUERY_RE.test(mention)) {
    sections.push(`REGLA INVENTARIO-DIRECTO: si el usuario pregunta por su inventario ("tengo X", "ya tengo X registrado", "cuántos X tengo", "mis plantas", "qué plantas tengo"), responde DIRECTAMENTE con el inventario de arriba — NO lo redirijas a "ingresar al sistema y revisar la lista": TÚ ya tienes el inventario en este contexto. Si no tiene lo que pregunta: "No, todavía no tienes X registrado. ¿Quieres agregarlo desde la sección Mi Finca?". Si el inventario es "ninguna": "No tienes plantas registradas aún. ¿Te ayudo a registrar la primera?".`);
  }

  if (typeof contextMemory === 'string' && contextMemory.trim()) {
    sections.push(`REGLA CRÍTICA TURN-AISLAMIENTO: la "Conversación previa" trae respuestas que YA diste. No las copies ni mezcles; responde solo al último mensaje, sin residuos de turnos pasados.`);
  }

  sections.push(`REGLAS ANTI-ALUCINACIÓN (núcleo):
- TÉRMINO DESCONOCIDO: ante un sustantivo técnico (planta, plaga, fitopatógeno, variedad, biopreparado, fertilizante) que NO reconozcas como referente botánico/agrícola estándar, responde "No reconozco el término X. ¿Podrías describirlo o decirme si quisiste referirte a otra palabra similar?" — NUNCA inventes su definición.
- BINOMIO: NUNCA inventes el nombre científico de un nombre común colombiano (errar género/especie es leak grave). Si no estás 100% seguro del binomio Linneano, usa EL NOMBRE COMÚN sin paréntesis con científico; solo si estás seguro lo pones entre paréntesis.
- PRIORIDAD TOOL GROUNDING: si "=== EVIDENCIA AUTORITATIVA ===" / "=== DATOS VERIFICADOS ===" trae un nombre_cientifico, USA ESE LITERAL — NO lo sustituyas aunque suene parecido (si dice "Persea americana Mill.", NUNCA digas "Psidium guajava").
- PLAGA SIN EVIDENCIA: si get_pest_controllers devuelve found:false, NUNCA generes un nombre científico latino para esa plaga (bordea fraude pedagógico): responde "no tengo esta plaga documentada en el catálogo Chagra todavía. Si quieres, descríbeme síntomas (qué parte ataca, color, tamaño) y te ayudo a identificarla".`);

  // Glosarios CONDICIONALES: solo las líneas que la conversación menciona.
  const plagas = GLOSARIO_PLAGAS.filter(([keys]) => _mentionsAny(mention, keys)).map(([, l]) => l);
  if (plagas.length > 0) {
    sections.push(`Glosario plagas regionales colombianas (usa nombre común + científico cuando ESTÉS 100% seguro):\n${plagas.join('\n')}\nPara términos NO en este glosario, NO inventes — usa CASO B (pide aclaración).`);
  }

  const taxo = GLOSARIO_TAXONOMICO.filter(([keys]) => _mentionsAny(mention, keys)).map(([, l]) => l);
  if (taxo.length > 0) {
    sections.push(`Glosario taxonómico colombiano (úsalo LITERAL, NO inventes ni sustituyas):\n${taxo.join('\n')}`);
  }

  if (_mentionsAny(mention, PASSIFLORA_KEYS)) {
    sections.push(`REGLA ESPECIAL ANTI-CONFUSIÓN PASSIFLORACEAE: para "gulupa", "maracuyá", "granadilla", "curuba", "chulupa", "badea" o cualquier pasionaria, el género es SIEMPRE **Passiflora** (Passifloraceae). NUNCA respondas con Psidium, Mangifera, Musa, Cucurbita, Pouteria u otro género — esa confusión es alucinación grave.`);
  }

  if (_mentionsAny(mention, ['tomate'])) {
    sections.push(`REGLA ESPECIAL ANTI-CONFUSIÓN TOMATES: "tomate" sin más contexto = Solanum lycopersicum (hortaliza). "Tomate de árbol"/"tomate de palo" = Solanum betaceum (frutal perenne, ESPECIE DISTINTA). NO los mezcles.`);
  }

  const regional = GLOSARIO_REGIONAL.filter(([keys]) => _mentionsAny(mention, keys)).map(([, l]) => l);
  if (regional.length > 0) {
    sections.push(`Glosario regionalismos campesinos (Boyacá / Caldas / Choachí):\n${regional.join('\n')}`);
  }

  sections.push(`COLOQUIAL vs DESCONOCIDO (dos casos):
CASO A — coloquialismo del campo con sustantivos que SÍ reconoces: interpreta con sentido común ("punto más alto donde sobrevive" = altitud máxima; "se enferman las matas" = padecen; "pegó bien" = prendió) y responde con datos agronómicos concretos.
CASO B — sustantivo que NO reconoces como palabra común del español NI nombre estándar de planta/plaga/biopreparado (no está en glosario/grounding ni lo derivas con confianza): ES TYPO o término que no manejas. NUNCA inventes su definición ni asumas familia por sonido. Responde "No reconozco el término 'X'. ¿Será que querías decir [sugerencia]? Si es otra cosa, cuéntame qué planta o problema es y te ayudo." — [sugerencia] del glosario/grounding si hay match cercano. Auto-chequeo antes de un científico: ¿está en glosario/grounding? ¿es español cotidiano? Si NO → CASO B. ES PREFERIBLE QUEDAR COMO IGNORANTE QUE INVENTAR.
ANTI-INVENCIÓN-DE-SÍNTOMAS: NUNCA describas síntomas/problemas/observaciones de las plantas del usuario que él NO escribió, ni le atribuyas síntomas genéricos del corpus. Para indagar usa pregunta abierta ("¿Ha notado cambios en las hojas?"), NO afirmación.`);

  if (SYMPTOM_QUERY_RE.test(mention)) {
    sections.push(`REGLA CRÍTICA DIAGNÓSTICO-SIN-EVIDENCIA: si el usuario reporta un síntoma VAGO ("manchas amarillas", "se está secando", "está triste") y se cumplen LAS DOS: (a) NO nombró la especie o no está clara, Y (b) NO adjuntó foto en este turno → PROHIBIDO nombrar un patógeno específico o binomio ("es Phytophthora…", "es el hongo Golovinomyces…") y PROHIBIDO inventar síntomas no escritos. Un síntoma vago tiene MUCHAS causas: responde con (1) un diferencial BREVE sin latín (2-3 causas comunes: falta de nutrientes, exceso/falta de agua, hongo, plaga, sol fuerte) y (2) preguntas para acotar: ¿qué planta es? ¿me envías una foto de la hoja? ¿la mancha está en el haz o el envés? ¿se siente seca o húmeda? ¿hace cuánto empezó? NUNCA cierres con un diagnóstico único y seguro sin esa evidencia. ES PREFERIBLE PEDIR LA FOTO QUE INVENTAR EL HONGO.`);
  }

  // Reglas crop-agnostic (aplican a cualquier cultivo)
  const cropAgnosticSafety = CROP_AGNOSTIC_SAFETY_RULES.filter(([groups]) =>
    groups.every((keys) => _mentionsAny(mention, keys))
  ).map(([, line]) => line);

  // Reglas específicas de tomate (se suman a las crop-agnostic)
  const tomateSafety = TOMATE_SAFETY_RULES.filter(([groups]) => groups.every((keys) => _mentionsAny(mention, keys))).map(([, line]) => line);

  const allSafetyRules = [...cropAgnosticSafety, ...tomateSafety];
  if (allSafetyRules.length > 0) {
    sections.push(allSafetyRules.join('\n'));
  }

  // CASO C: definición SIEMPRE presente (guarda); detalle completo solo si la
  // query ES enumerativa — el bloque ANÁLISIS DE LA QUERY es autoritativo.
  if (isEnum) {
    sections.push(`CASO C — Consultas ENUMERATIVAS / CUANTITATIVAS sobre el catálogo (REGLA ESTRICTA): aplica SOLO si la query pide LITERALMENTE "variedades", "clases", "tipos" o "cultivares" ("cuántas variedades de X", "qué clases de X", "lista los tipos de X"). NO aplica a atributos ("a qué altitud crece X"), manejo ("cómo podo X"), relaciones ("qué compañeros van bien con X", "qué biopreparado controla X") ni descripción ("háblame de X").
REGLA CASO C (cuando aplica): si NO hay bloque "=== EVIDENCIA AUTORITATIVA ===" con la enumeración explícita, NUNCA listes números ni variedades — aplica AUNQUE conozcas la planta. Respuesta correcta: "El catálogo Chagra todavía no tiene un inventario de variedades de [planta] documentado. ¿Quieres información general del cultivo, o prefieres registrar las variedades que tengas en tu finca?".`);
  } else {
    sections.push(`CASO C (enumerar variedades/clases/tipos/cultivares del catálogo): para ESTA query NO aplica — responde normal con evidencia o conocimiento (el ANÁLISIS DE LA QUERY al final es autoritativo). Solo cuando la query pide literalmente "variedades/clases/tipos/cultivares" sin evidencia enumerativa se declina listar y se ofrece registrar las de la finca.`);
  }

  sections.push(`CAMPOS NULL EN TOOL RESULT: si la evidencia confirma la especie (found:true) pero un campo viene null o [] (companions, temp, altitud), NO lo rellenes de memoria ni defaultes a CASO C: di "El catálogo confirma [especie] pero el campo [X] aún no está documentado" y usa el resto.`);

  // Herramientas: instrucciones condicionales a la intención de la query.
  const toolRules = [];
  if (NORMATIVA_QUERY_RE.test(mention)) {
    toolRules.push(`- get_normativa_ica (agroquímicos registrados ICA): SOLO para validar productos químicos/sintéticos mencionados o preguntas de prohibido/registrado/restringido — NUNCA para responder "¿qué le pongo a la plaga X?" (para eso van get_biopreparados + get_pest_controllers primero, agroecológico). Si la respuesta incluye sintéticos, contextualiza con biopreparados alternativos y advertencia de impacto agroecológico.`);
  }
  if (CLIMA_QUERY_RE.test(mention)) {
    toolRules.push(`- get_clima_ideam (estaciones IDEAM): para clima histórico/actual del municipio del usuario; si no ha dicho municipio, pregúntale antes. No inventes datos de lluvia/temperatura — si IDEAM no responde, dilo plano.`);
  }
  if (toolRules.length > 0) {
    sections.push(`HERRAMIENTAS NORMATIVA SOLO PARA VALIDACIÓN, NUNCA PRESCRIPCIÓN:\n${toolRules.join('\n')}`);
  }
  sections.push(`PRECIOS: NUNCA inventes precios. El dataset SIPSA/DANE no permite consulta directa: si preguntan precio sin dato del tool, decláralo y orienta al boletín SIPSA del DANE o a la central de abastos (Corabastos).
Responde en español colombiano (tú/usted, sin voseo argentino). Sé específico y útil cuando tengas certeza; humilde y preguntón cuando no.`);

  sections.push(generateViabilityRules());
  sections.push(generateAgronomicGuidanceRules());
  // Las alertas climáticas regionales del perfil solo aportan en consultas de
  // clima; en plaga/manejo se omiten para no empujar la truncación (GR-10).
  sections.push(buildProfileContext(finca, { climaQuery: CLIMA_QUERY_RE.test(mention) }));

  return sections.join('\n\n');
}

/**
 * Analiza una consulta para detectar si es enumerativa, que plagas menciona
 * y el tema principal. Señales NN2+NN3 para inyectar al system prompt.
 * @param {string} q
 * @returns {{isEnum: boolean, pestsMentioned: Array<{name: string, canonical: string}>, topic: string}}
 */
export const analyzeQuery = (q) => {
  const lower = (q || '').toLowerCase();
  // NN2: detección estricta de query enumerativa. Solo SI contiene
  // "variedades / clases / tipos / cultivares" combinado con
  // "cuántas / cuáles / qué / lista / enumera".
  const enumNoun = /\b(variedades|clases|tipos|cultivares)\b/.test(lower);
  const enumVerb = /\b(cu[áa]ntas?|cu[áa]les|qu[ée]|lista|enumera|hay)\b/.test(lower);
  const isEnum = enumNoun && enumVerb;

  // NN3: detección de plagas conocidas mencionadas en la query.
  // Mapping canónico glosario PR #1016 — usar EXACTO en respuesta.
  const PEST_GLOSSARY = {
    chiza: 'Phyllophaga spp. (escarabajos rizófagos, larvas que comen raíces)',
    'broca del café': 'Hypothenemus hampei',
    broca: 'Hypothenemus hampei',
    monalonion: 'Monalonion velezangeli (chinche del aguacate, Hemiptera — NO es hongo, NO es Fusarium)',
    'mosca del aguacate': 'Heilipus lauri',
    'mosca de la fruta': 'Anastrepha spp. / Ceratitis capitata',
    'picudo del plátano': 'Cosmopolites sordidus',
    'roya del café': 'Hemileia vastatrix (hongo, royas)',
    roya: 'Hemileia vastatrix',
    'sigatoka negra': 'Mycosphaerella fijiensis (hongo, plátano/banano)',
    sigatoka: 'Mycosphaerella fijiensis',
    antracnosis: 'Colletotrichum spp.',
    trips: 'Frankliniella spp. / Thrips spp.',
    'gusano cogollero': 'Spodoptera frugiperda (lepidóptero, maíz)',
    'ácaro del tomate': 'Aculops lycopersici / Tetranychus urticae',
  };
  const pestsMentioned = [];
  for (const [name, canonical] of Object.entries(PEST_GLOSSARY)) {
    if (lower.includes(name)) pestsMentioned.push({ name, canonical });
  }

  // Tema principal (heurística simple): manejo, atributo, descripción.
  let topic = 'general';
  if (/c[óo]mo\s+(podo|cosecho|riego|abono|fertilizo|controlo|combato|preparo|hago|manejo)/.test(lower)) topic = 'manejo';
  else if (/c[áa]nd?o\s+(podo|cosecho|riego|abono|siembro)/.test(lower)) topic = 'manejo';
  else if (/a\s+qu[ée]\s+altitud|qu[ée]\s+(temperatura|altitud|luz|drenaje|suelo)/.test(lower)) topic = 'atributo';
  else if (/qu[ée]\s+compa[ñn]eros|qu[ée]\s+biopreparado|asocia|companions/.test(lower)) topic = 'relación';
  else if (/h[áa]blame|qu[ée]\s+es|c[óo]ntame/.test(lower)) topic = 'descripción';
  else if (pestsMentioned.length > 0) topic = 'plaga/enfermedad';

  return { isEnum, pestsMentioned, topic };
};

/**
 * buildQueryAnalysisBlock — NN2+NN3 bloque dinámico de análisis. Va al final
 * del system prompt (máxima proximidad a la query): dice EXACTAMENTE qué tipo
 * de query es y qué plagas canónicas usar.
 *
 * @param {{isEnum:boolean, pestsMentioned:Array, topic:string}} analysis
 * @returns {string}
 */
export function buildQueryAnalysisBlock(analysis) {
  return `

=== ANÁLISIS DE LA QUERY ACTUAL (frontend) ===
- Tipo: ${analysis.topic}
- Es enumerativa (CASO C aplica): ${analysis.isEnum ? 'SÍ — usa respuesta CASO C' : 'NO — IGNORA CASO C completamente, responde normal con tool evidence o conocimiento'}
${analysis.pestsMentioned.length > 0 ? `- Plagas mencionadas (USA NOMBRE CIENTÍFICO EXACTO de abajo, NO inventes):
${analysis.pestsMentioned.map((p) => `  · "${p.name}" → ${p.canonical}`).join('\n')}` : '- Plagas mencionadas: ninguna'}

REGLA: este análisis es autoritativo para ESTA query. Si dice "Es enumerativa: NO", el CASO C NO aplica aunque tu instinto diga lo contrario. Si lista plagas, usa ESOS nombres científicos exactos (jamás otros, jamás "Fusarium spp" para chinches, jamás géneros inventados).
=== FIN ANÁLISIS ===`;
}

/**
 * buildCorpusContext — bloque de referencia agronómica (corpus RAG).
 *
 * 2026-05-19: incidente alucinación tomate — el modelo confundía el corpus
 * RAG con lo que el usuario dijo (le atribuía síntomas del documento). Fix:
 * delimitar EXPLÍCITAMENTE + instrucción literal de no citarlo como del
 * usuario.
 *
 * @param {Array<{text:string}>} contextCorpus — chunks recuperados por el RAG.
 * @returns {string} bloque delimitado, o '' si no hay corpus.
 */
export function buildCorpusContext(contextCorpus) {
  if (!Array.isArray(contextCorpus) || contextCorpus.length === 0) return '';
  return `

=== INFORMACIÓN DE REFERENCIA AGRONÓMICA (NO viene del usuario, NO citarla como si el usuario te lo hubiera contado) ===
${contextCorpus.map((c) => c.text).join('\n\n---\n\n')}
=== FIN REFERENCIA ===

Usa esta referencia para informar tu respuesta, pero RESPONDE SOLO a lo que el usuario preguntó. NO menciones síntomas ni observaciones que no estén en su mensaje.`;
}

/**
 * buildCorpusVariants — variantes del bloque de corpus RAG para la degradación
 * por presupuesto del promptAssembler: la variante 0 lleva TODOS los chunks,
 * cada siguiente quita el último chunk (los retrievers ordenan por score, así
 * que se sacrifica primero el menos relevante), y la última es '' (sin corpus).
 *
 * @param {Array<{text:string}>} contextCorpus
 * @returns {string[]} variantes de la más completa a la vacía.
 */
export function buildCorpusVariants(contextCorpus) {
  const chunks = Array.isArray(contextCorpus) ? contextCorpus : [];
  const variants = [];
  for (let n = chunks.length; n >= 0; n -= 1) {
    variants.push(buildCorpusContext(chunks.slice(0, n)));
  }
  return variants;
}

/**
 * buildResolvedEntitiesBlock — ENTIDADES RESUELTAS (DR taxonómico Tier 1 B).
 * El sidecar /resolve-entities ya verificó contra Apache AGE qué plantas/
 * plagas menciona el usuario y resolvió los binomios canónicos. Capa
 * DETERMINÍSTICA: bypassea que el LLM ignore reglas generales del prompt.
 *
 * @param {Array<object>|null} resolvedEntities
 * @returns {string} bloque, o '' si no hay entidades.
 */
export function buildResolvedEntitiesBlock(resolvedEntities) {
  if (!Array.isArray(resolvedEntities) || resolvedEntities.length === 0) return '';
  return `

=== ENTIDADES RESUELTAS DEL CATÁLOGO (autoritativo, verificado en Apache AGE) ===
El catálogo Chagra confirma estos binomios CANÓNICOS para lo que el usuario mencionó. Si tu respuesta los menciona, USA el nombre científico EXACTO listado — JAMÁS otro género por similitud de sonido (gulupa NO es Psidium ni Cucurbita; aguacate NO es Psidium). Si dudas entre varias, elige la de mayor confidence.

${resolvedEntities.map((e) => `- "${e.mentioned}" (${e.kind}) → ${e.nombre_comun} = ${e.nombre_cientifico} [id: ${e.canonical_id}, confidence: ${e.confidence}]`).join('\n')}
=== FIN ENTIDADES RESUELTAS ===`;
}

/**
 * formatToolEvidence — bloque "DATOS VERIFICADOS" / evidencia a partir de la
 * respuesta del sidecar (tool simple o tool_chain D2 #246). Cubre los modos
 * found:false (anti-mapeo creativo), _error (tool caído) y el warning de
 * campos críticos null (anti-relleno de memoria).
 *
 * @param {object|Array<object>|null} toolEvidence
 * @returns {string}
 */
export const formatToolEvidence = (toolEvidence) => {
  // D2 (#246): array de evidences (tool_chain) → un bloque por tool, en orden.
  if (Array.isArray(toolEvidence)) {
    if (toolEvidence.length === 0) return '';
    const blocks = toolEvidence
      .map((ev) => formatToolEvidence(ev))
      .filter((b) => b && b.trim().length > 0);
    return blocks.join('\n');
  }
  if (!toolEvidence || !toolEvidence.tool || !toolEvidence.result) return '';

  const result = toolEvidence.result;
  // ToolError: el tool fue intentado pero falló. El LLM debe saber que NO hay
  // datos, en vez de suplirlos de memoria.
  if (result && typeof result === 'object' && result._error === true) {
    const errorReason = result.reason || 'unknown';
    const toolName = toolEvidence.tool;
    return `
=== ERROR DE CONSULTA: ${toolName} NO DISPONIBLE ===
El tool '${toolName}' falló: ${errorReason}. NO hay datos disponibles: NO inventes datos de catálogo NI los suplas de memoria. Responde honesto: "No pude consultar la información técnica necesaria." Si puedes responder desde conocimiento general sin inventar datos concretos, sé explícito: "Esto lo sé por conocimiento general, no por el catálogo Chagra."
=== FIN ERROR ===
`;
  }

  // 2026-05-23 incidente "mareñongoño": el tool devolvió found:false y el
  // modelo igual mapeó creativamente a otra especie real. Bloque
  // hyper-explícito que prohíbe el mapeo creativo.
  const isNotFound =
    result &&
    typeof result === 'object' &&
    (result.found === false ||
      result.available === false ||
      (result.matches_count !== undefined && result.matches_count === 0));

  if (isNotFound) {
    const hint = (result && (result.hint || result.reason)) || '';
    const queryStr = JSON.stringify(toolEvidence.args || {});
    return `

=== ESPECIE / RELACIÓN NO ENCONTRADA EN CATÁLOGO ===
El tool ${toolEvidence.tool} con args ${queryStr} devolvió found:false: lo que el usuario preguntó NO existe en el catálogo Chagra. INSTRUCCIÓN OBLIGATORIA anti-alucinación creativa: NO mapees el nombre a otra especie "parecida" del catálogo, NO listes relaciones de OTRA especie como si fueran de esta, NO inventes científicos como sinónimos. Responde: "El catálogo Chagra no tiene esa especie o relación documentada todavía. ¿Puedes describir la planta o decir su nombre científico? Si te refieres a una especie conocida con otro nombre, dime cuál y la busco." Solo puedes sugerir "Si te refieres a [especie real del catálogo], avísame y consulto", sin afirmar la equivalencia.
Hint del tool: ${hint}
=== FIN ===
`;
  }

  let payload;
  try {
    payload = JSON.stringify(result);
  } catch (_) {
    return '';
  }
  let truncated = false;
  if (payload.length > TOOL_EVIDENCE_MAX_CHARS) {
    payload = payload.slice(0, TOOL_EVIDENCE_MAX_CHARS);
    truncated = true;
  }
  // 2026-05-23 Tests A/B: found:true con CAMPOS NULL → el modelo rellenaba de
  // memoria valores inventados. Warning explícito por campo crítico vacío.
  const criticalEmptyFields = [];
  if (result && typeof result === 'object') {
    const sp = result.species || result;
    if (sp && typeof sp === 'object') {
      if (sp.temp_min === null && sp.temp_max === null) {
        criticalEmptyFields.push('temperatura (temp_min y temp_max son null)');
      }
      if (sp.altitud_min === null && sp.altitud_max === null) {
        criticalEmptyFields.push('altitud (altitud_min y altitud_max son null)');
      }
      if (sp.companions === null || (Array.isArray(sp.companions) && sp.companions.length === 0)) {
        criticalEmptyFields.push('companions (vacío o null)');
      }
      if (sp.antagonists === null || (Array.isArray(sp.antagonists) && sp.antagonists.length === 0)) {
        criticalEmptyFields.push('antagonists (vacío o null)');
      }
    }
  }
  const emptyFieldsWarning =
    criticalEmptyFields.length > 0
      ? `

⚠️ CAMPOS CRÍTICOS VACÍOS EN ESTOS DATOS: ${criticalEmptyFields.join(', ')}.
NO INVENTES valores numéricos ni listas para esos campos. Responde literal: "El catálogo Chagra todavía no tiene documentados los valores de [campo] para [especie]. Tu consulta queda como pendiente de curaduría editorial."`
      : '';

  // Caso "found:true" — wording autoritativo (PR #998) condensado.
  return `

=== DATOS VERIFICADOS (chagra-agro-mcp tool: ${toolEvidence.tool}) — VERDAD AUTORITATIVA ===
Estos datos vienen del knowledge graph del catálogo Chagra (Apache AGE, validado). RESPONDE BASADO EXCLUSIVAMENTE en ellos: NO inventes especies que no estén aquí, NO los mezcles con el inventario de la finca del usuario, cita los nombres exactos (común + científico). Si el bloque no contiene la respuesta, dilo: "El catálogo Chagra no tiene esa relación documentada todavía" — NO inventes.
${payload}${truncated ? '\n<!-- nota interna sistema: record truncado para ahorrar contexto. NO lo menciones al usuario ni digas "truncated". Responde con los datos visibles arriba. -->' : ''}
=== FIN DATOS VERIFICADOS ===${emptyFieldsWarning}

RESPONDE SOLO a lo que el usuario preguntó usando ÚNICAMENTE los datos verificados de arriba.`;
};
