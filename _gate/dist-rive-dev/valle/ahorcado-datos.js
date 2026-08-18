/**
 * ahorcadoContaminado.js — DATASET de contenido para el juego "Ahorcado
 * Contaminado" (un ahorcado / hangman cuyo tema es la contaminación por
 * agroquímicos y su reemplazo agroecológico).
 *
 * ⚠️  ESTO ES SOLO EL CONTENIDO (Tarea #38 del PLAN-RETOMA). El juego en sí
 *     (mecánica, UI, pantalla) se construye aparte en la Tarea #93. Aquí NO hay
 *     lógica de juego: solo palabras, pistas educativas, fuentes y confianza.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ADVERTENCIA TOXICOLÓGICA (regla inviolable de contenido sensible):
 *   Los datos de intoxicación son EDUCATIVOS, NO son diagnóstico médico ni
 *   protocolo de primeros auxilios. Ante una sospecha de intoxicación por
 *   agroquímicos: retirar a la persona de la exposición, quitar ropa
 *   contaminada, y llamar YA a la línea de toxicología. En Colombia:
 *   Centro de Información y Asesoría Toxicológica (CIATOX) y línea de urgencias
 *   123. Este dataset describe SÍNTOMAS RECONOCIDOS en la literatura para
 *   sensibilizar; nunca los usa para "auto-diagnosticar" gravedad.
 *
 * ANTI-FABRICACIÓN (política Chagra "dato con fuente o no va"):
 *   - Cada plaguicida marcado como vetado/restringido trae su norma real
 *     (Resolución ICA con número/año, y/o convenio internacional que Colombia
 *     ratificó: Estocolmo — Ley 994/2005; Rotterdam — Ley 1159/2007). Donde el
 *     número exacto de la resolución no se pudo confirmar con certeza total, el
 *     hecho de la PROHIBICIÓN/RESTRICCIÓN en Colombia sí está documentado y se
 *     baja el nivel de `confianza` a 'media' y se aclara en la `nota`.
 *   - Cada síntoma trae su marco (IARC 2015 para glifosato; clasificación OMS
 *     por peligrosidad; hojas de seguridad / literatura clínica de
 *     intoxicaciones). No se exageran efectos ni se inventan.
 *   - Las alternativas agroecológicas reusan los nombres canónicos del catálogo
 *     de biopreparados (catalog/biopreparados-seed.json): caldo bordelés,
 *     caldo sulfocálcico, Trichoderma, etc. — no se inventan recetas.
 *
 * FUENTES CLAVE CONSULTADAS (procedencia top-level, ver `FUENTES`):
 *   - IARC / OMS. Monografía Vol. 112 (2015): glifosato = Grupo 2A
 *     ("probablemente carcinogénico para humanos"). Malatión, diazinón también
 *     2A en la misma monografía.
 *   - Convenio de Estocolmo sobre Contaminantes Orgánicos Persistentes (COP),
 *     ratificado por Colombia mediante Ley 994 de 2005.
 *   - Convenio de Rotterdam (consentimiento fundamentado previo, PIC),
 *     ratificado por Colombia mediante Ley 1159 de 2007.
 *   - ICA — Instituto Colombiano Agropecuario. Resoluciones de prohibición y
 *     restricción de plaguicidas de uso agrícola; Resolución ICA 698 de 2011
 *     (registro de bioinsumos y extractos vegetales de uso agrícola).
 *   - OMS — Clasificación recomendada de plaguicidas por su peligrosidad
 *     ("The WHO Recommended Classification of Pesticides by Hazard").
 *   - Restrepo Rivera, J. — "ABC de la agricultura orgánica" / "Manual práctico
 *     de biofertilizantes" (para las alternativas agroecológicas).
 *
 * Español colombiano (tú/usted). Sin voseo (guard lefthook).
 */

/* ──────────────────────────────────────────────────────────────────────────
 * FUENTES — catálogo de procedencia. Cada palabra referencia por `fuenteId`.
 * ────────────────────────────────────────────────────────────────────────── */
export const FUENTES = {
  iarc112: {
    id: 'iarc112',
    label: 'IARC (OMS) — Monografía Vol. 112, 2015',
    detalle:
      'Agencia Internacional para la Investigación sobre el Cáncer. Clasificó '
      + 'el glifosato como Grupo 2A: probablemente carcinogénico para humanos.',
  },
  omsClasif: {
    id: 'omsClasif',
    label: 'OMS — Clasificación de plaguicidas por peligrosidad',
    detalle:
      '"The WHO Recommended Classification of Pesticides by Hazard". Ordena los '
      + 'plaguicidas de Clase Ia (extremadamente peligroso) a Clase U.',
  },
  estocolmo: {
    id: 'estocolmo',
    label: 'Convenio de Estocolmo (COP) — Ley 994 de 2005 (Colombia)',
    detalle:
      'Tratado que elimina o restringe Contaminantes Orgánicos Persistentes. '
      + 'Colombia lo ratificó por la Ley 994 de 2005. Cubre plaguicidas como '
      + 'DDT, aldrín, dieldrín, endrín, clordano, heptacloro, endosulfán, lindano.',
  },
  rotterdam: {
    id: 'rotterdam',
    label: 'Convenio de Rotterdam (PIC) — Ley 1159 de 2007 (Colombia)',
    detalle:
      'Procedimiento de consentimiento fundamentado previo para plaguicidas y '
      + 'químicos peligrosos en comercio internacional. Colombia lo ratificó por '
      + 'la Ley 1159 de 2007.',
  },
  icaProhibicion: {
    id: 'icaProhibicion',
    label: 'ICA — Resoluciones de prohibición/restricción de plaguicidas',
    detalle:
      'El Instituto Colombiano Agropecuario prohíbe y restringe ingredientes '
      + 'activos de uso agrícola mediante resoluciones. Donde no se pudo confirmar '
      + 'el número exacto de la resolución, se baja la confianza y se aclara.',
  },
  ica698: {
    id: 'ica698',
    label: 'ICA — Resolución 698 de 2011',
    detalle:
      'Reglamenta el registro de bioinsumos y extractos vegetales de uso '
      + 'agrícola en Colombia. Marco de las alternativas agroecológicas.',
  },
  restrepo: {
    id: 'restrepo',
    label: 'Restrepo Rivera, J. — ABC de la agricultura orgánica / biofertilizantes',
    detalle:
      'Manuales de referencia de la agroecología latinoamericana. Base de las '
      + 'recetas de biopreparados (caldos, purines, biofermentos).',
  },
  literaturaClinica: {
    id: 'literaturaClinica',
    label: 'Literatura clínica de intoxicaciones + hojas de seguridad (SDS)',
    detalle:
      'Cuadros clínicos reconocidos de intoxicación aguda por plaguicidas '
      + '(organofosforados/carbamatos: síndrome colinérgico; herbicidas: '
      + 'irritación) y fichas de datos de seguridad de los productos.',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 * CATEGORÍAS del juego. Cada palabra pertenece a una.
 * ────────────────────────────────────────────────────────────────────────── */
export const CATEGORIAS = {
  sintoma: {
    id: 'sintoma',
    label: 'Señales del cuerpo',
    descripcion:
      'Síntomas reconocidos de intoxicación por agroquímicos. Educativos, NO '
      + 'diagnóstico: ante sospecha, llame a toxicología (CIATOX) y a urgencias 123.',
    emoji: '🩺',
  },
  vetado: {
    id: 'vetado',
    label: 'Lo que está prohibido',
    descripcion:
      'Plaguicidas prohibidos o restringidos en Colombia por resolución del ICA '
      + 'o por convenios internacionales (Estocolmo, Rotterdam) que el país ratificó.',
    emoji: '🚫',
  },
  alternativa: {
    id: 'alternativa',
    label: 'Lo que SÍ',
    descripcion:
      'Alternativas agroecológicas que reemplazan al químico: biopreparados y '
      + 'manejo. Nombres tomados del catálogo de biopreparados de Chagra.',
    emoji: '🌱',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 * PALABRAS — el dataset. `confianza`: alta | media | baja.
 *   - alta  = hecho y fuente confirmados sin ambigüedad.
 *   - media = el hecho está documentado pero un detalle (nº exacto de norma,
 *             fecha precisa) no se pudo confirmar con certeza total.
 *   - baja  = NO se incluye; si aparece 'baja' es porque el dato quedó como
 *             pendiente de verificación y NO debe usarse en producción.
 * ────────────────────────────────────────────────────────────────────────── */
export const PALABRAS = [
  /* ── SÍNTOMAS de intoxicación por agroquímicos ─────────────────────────── */
  {
    palabra: 'NAUSEA',
    categoria: 'sintoma',
    pista: 'Malestar en el estómago con ganas de vomitar; señal temprana común tras respirar o tragar plaguicida.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Síntoma inespecífico pero frecuente en intoxicación aguda por muchos plaguicidas.',
  },
  {
    palabra: 'VOMITO',
    categoria: 'sintoma',
    pista: 'El cuerpo expulsa lo ingerido; aparece en intoxicaciones por organofosforados y otros agroquímicos.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Parte del síndrome colinérgico y de la irritación gastrointestinal por ingesta.',
  },
  {
    palabra: 'MAREO',
    categoria: 'sintoma',
    pista: 'Sensación de que todo da vueltas; frecuente al fumigar sin protección en espacio cerrado.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Efecto neurológico temprano y también por inhalación de solventes del producto.',
  },
  {
    palabra: 'DOLOR DE CABEZA',
    categoria: 'sintoma',
    pista: 'Uno de los primeros avisos tras la exposición a los vapores del plaguicida.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Síntoma leve y muy común; por sí solo no indica gravedad.',
  },
  {
    palabra: 'IRRITACION DERMICA',
    categoria: 'sintoma',
    pista: 'Ardor, enrojecimiento o ronchas en la piel que tocó el químico; por eso se exige guantes y ropa cubierta.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'La piel es una vía de entrada real; los herbicidas como el paraquat irritan al contacto.',
  },
  {
    palabra: 'LAGRIMEO',
    categoria: 'sintoma',
    pista: 'Los ojos lloran solos; signo del síndrome colinérgico por organofosforados y carbamatos.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Lagrimeo, salivación y sudoración excesiva son la tríada de "secreciones" colinérgicas.',
  },
  {
    palabra: 'SALIVACION EXCESIVA',
    categoria: 'sintoma',
    pista: 'Producir mucha saliva de golpe; alarma clásica de intoxicación por insecticidas organofosforados.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Marcador del bloqueo de la colinesterasa; requiere atención médica urgente.',
  },
  {
    palabra: 'VISION BORROSA',
    categoria: 'sintoma',
    pista: 'La vista se nubla; efecto sobre la pupila en intoxicaciones por organofosforados y carbamatos.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Suele acompañarse de pupilas contraídas (miosis) en el cuadro colinérgico.',
  },
  {
    palabra: 'DIFICULTAD PARA RESPIRAR',
    categoria: 'sintoma',
    pista: 'Falta de aire u opresión en el pecho; en intoxicación grave por plaguicidas es una urgencia vital.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Señal de gravedad. Retirar de la exposición y llamar a urgencias 123 de inmediato.',
  },
  {
    palabra: 'TEMBLOR',
    categoria: 'sintoma',
    pista: 'Manos o cuerpo que tiemblan sin control; efecto sobre el sistema nervioso.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Temblor, calambres y fasciculaciones aparecen en la intoxicación colinérgica.',
  },
  {
    palabra: 'DIARREA',
    categoria: 'sintoma',
    pista: 'Descomposición estomacal; parte del cuadro colinérgico por organofosforados y carbamatos.',
    fuenteId: 'literaturaClinica',
    confianza: 'alta',
    nota: 'Junto con náusea, vómito y dolor abdominal, completa los síntomas digestivos.',
  },

  /* ── PLAGUICIDAS VETADOS / RESTRINGIDOS en Colombia ────────────────────── */
  {
    palabra: 'DDT',
    categoria: 'vetado',
    pista: 'Insecticida organoclorado persistente; prohibido en agricultura por acumularse en el ambiente y la grasa.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota:
      'Contaminante Orgánico Persistente listado en el Convenio de Estocolmo '
      + '(Ley 994/2005). Prohibido para uso agrícola; Colombia también lo restringió '
      + 'por resolución del ICA décadas atrás.',
  },
  {
    palabra: 'ENDOSULFAN',
    categoria: 'vetado',
    pista: 'Insecticida organoclorado muy tóxico para peces y personas; prohibido en Colombia y a nivel mundial.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota:
      'Añadido al Convenio de Estocolmo en 2011 para eliminación mundial. '
      + 'El ICA prohibió su uso en Colombia (Resolución ICA de 2011); si el número '
      + 'exacto se cita en el juego, verificar contra el registro del ICA.',
  },
  {
    palabra: 'ALDRIN',
    categoria: 'vetado',
    pista: 'Insecticida organoclorado del grupo de la "docena sucia"; prohibido por persistente y tóxico.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota: 'Uno de los COP originales del Convenio de Estocolmo (Ley 994/2005).',
  },
  {
    palabra: 'DIELDRIN',
    categoria: 'vetado',
    pista: 'Organoclorado emparentado con el aldrín; contaminante persistente prohibido para uso agrícola.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota: 'COP original del Convenio de Estocolmo (Ley 994/2005).',
  },
  {
    palabra: 'HEPTACLORO',
    categoria: 'vetado',
    pista: 'Organoclorado de la "docena sucia"; prohibido por persistir en suelo y acumularse en la cadena trófica.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota: 'COP original del Convenio de Estocolmo (Ley 994/2005).',
  },
  {
    palabra: 'LINDANO',
    categoria: 'vetado',
    pista: 'Organoclorado (HCH gamma) usado como insecticida; restringido/prohibido por tóxico y persistente.',
    fuenteId: 'estocolmo',
    confianza: 'alta',
    nota:
      'Incorporado al Convenio de Estocolmo en 2009. Su uso agrícola está '
      + 'prohibido; en Colombia el ICA lo restringió por resolución.',
  },
  {
    palabra: 'PARATION',
    categoria: 'vetado',
    pista: 'Insecticida organofosforado extremadamente tóxico (Clase Ia OMS); prohibido para uso agrícola.',
    fuenteId: 'omsClasif',
    confianza: 'alta',
    nota:
      'Etil y metil paratión son Clase Ia/Ib (OMS). El ICA prohibió estos '
      + 'ingredientes activos en Colombia por resolución; también figura en Rotterdam.',
  },
  {
    palabra: 'MONOCROTOFOS',
    categoria: 'vetado',
    pista: 'Organofosforado de altísima toxicidad aguda (Clase Ib OMS); prohibido en Colombia y muchos países.',
    fuenteId: 'omsClasif',
    confianza: 'alta',
    nota:
      'Clase Ib de la OMS. El ICA prohibió el monocrotofos en Colombia por '
      + 'resolución; verificar el número exacto contra el registro del ICA si se cita.',
  },
  {
    palabra: 'ALDICARB',
    categoria: 'vetado',
    pista: 'Carbamato extremadamente tóxico (el "Temik"); prohibido por su altísimo riesgo para personas y fauna.',
    fuenteId: 'omsClasif',
    confianza: 'alta',
    nota:
      'Clase Ia de la OMS. Prohibido en Colombia por el ICA; su uso indebido '
      + 'ha causado intoxicaciones y envenenamiento de animales.',
  },
  {
    palabra: 'CARBOFURAN',
    categoria: 'vetado',
    pista: 'Insecticida carbamato muy tóxico para aves y personas; prohibido/restringido por su peligrosidad.',
    fuenteId: 'icaProhibicion',
    confianza: 'media',
    nota:
      'Restringido/prohibido por el ICA por su toxicidad. Se marca confianza '
      + 'media porque el número y alcance exactos de la resolución vigente deben '
      + 'confirmarse contra el registro del ICA antes de citarlos textualmente.',
  },
  {
    palabra: 'PARAQUAT',
    categoria: 'vetado',
    pista: 'Herbicida de uso restringido; una ingesta pequeña puede ser mortal y no tiene antídoto específico.',
    fuenteId: 'icaProhibicion',
    confianza: 'media',
    nota:
      'En Colombia es de USO RESTRINGIDO (no está prohibido del todo como el DDT). '
      + 'Prohibido en la Unión Europea. Se incluye como caso de "altamente '
      + 'restringido" y se aclara la diferencia con los prohibidos totales.',
  },

  /* ── ALTERNATIVAS agroecológicas (lo que SÍ) ───────────────────────────── */
  {
    palabra: 'CALDO BORDELES',
    categoria: 'alternativa',
    pista: 'Cobre + cal contra hongos; reemplaza fungicidas de síntesis. Uso restringido en certificación orgánica.',
    fuenteId: 'restrepo',
    confianza: 'alta',
    nota:
      'Fungicida mineral de la agroecología (Restrepo). Lleva cobre: usar dosis '
      + 'y protección adecuadas; su uso es restringido en orgánico certificado.',
  },
  {
    palabra: 'CALDO SULFOCALCICO',
    categoria: 'alternativa',
    pista: 'Azufre + cal cocidos; fungicida y acaricida casero que reemplaza productos de síntesis.',
    fuenteId: 'restrepo',
    confianza: 'alta',
    nota: 'Biopreparado del catálogo Chagra. Controla ácaros y algunos hongos.',
  },
  {
    palabra: 'BOCASHI',
    categoria: 'alternativa',
    pista: 'Abono fermentado rápido con melaza y microorganismos; nutre el suelo sin fertilizante químico.',
    fuenteId: 'restrepo',
    confianza: 'alta',
    nota: 'Receta de Restrepo Rivera; reemplaza abonos de síntesis nutriendo la vida del suelo.',
  },
  {
    palabra: 'PURIN DE ORTIGA',
    categoria: 'alternativa',
    pista: 'Ortiga fermentada en agua; bioestimulante tradicional que fortalece la planta sin agroquímicos.',
    fuenteId: 'restrepo',
    confianza: 'alta',
    nota: 'Biopreparado del catálogo Chagra; aporta silicio y estimula el crecimiento.',
  },
  {
    palabra: 'TRICHODERMA',
    categoria: 'alternativa',
    pista: 'Hongo benéfico que controla otros hongos del suelo; control biológico en vez de fungicida químico.',
    fuenteId: 'ica698',
    confianza: 'alta',
    nota:
      'Trichoderma harzianum: existen formulaciones registradas ante el ICA '
      + '(Resolución 698/2011, bioinsumos). Antagonista de patógenos del suelo.',
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * DESCARTADOS — lo que NO se incluyó por no poder fundamentarse con certeza.
 * Se deja documentado (transparencia anti-fabricación), no entra al juego.
 * ────────────────────────────────────────────────────────────────────────── */
export const DESCARTADOS = [
  {
    candidato: 'glifosato = "cancerígeno"',
    motivo:
      'La IARC (2015, Vol. 112) lo clasificó Grupo 2A: "probablemente '
      + 'carcinogénico". Afirmar sin matiz "el glifosato causa cáncer" sobrepasa '
      + 'la evidencia. En el juego el glifosato aparece asociado a síntomas de '
      + 'irritación reconocidos, no como sentencia de cáncer. Como palabra de '
      + 'categoría "vetado" NO entra: el glifosato NO está prohibido en Colombia.',
  },
  {
    candidato: 'número exacto de varias resoluciones ICA',
    motivo:
      'El hecho de la prohibición/restricción está documentado, pero el número '
      + 'y año exactos de algunas resoluciones (carbofurán, monocrotofos, '
      + 'endosulfán) deben verificarse contra el registro vivo del ICA '
      + '(datos.gov.co) antes de citarse textualmente. Por eso esas entradas '
      + 'llevan confianza "media" y una nota de verificación.',
  },
  {
    candidato: 'síntomas graves específicos como "convulsiones = X producto"',
    motivo:
      'Atribuir un síntoma grave a un producto concreto como si fuera '
      + 'diagnóstico es peligroso y fuera de alcance educativo. Se incluyen '
      + 'síntomas reconocidos de forma general, sin prometer identificar el '
      + 'agente ni la gravedad.',
  },
  {
    candidato: 'dosis letales / cantidades ("X ml matan")',
    motivo:
      'No se incluye ninguna cifra de letalidad. Dar números de dosis mortal es '
      + 'morboso e innecesario para el objetivo educativo, y roza la fabricación '
      + 'si no viene de una ficha toxicológica exacta.',
  },
];

/* Índice por categoría (conveniencia para el build #93). */
export const PALABRAS_POR_CATEGORIA = {
  sintoma: PALABRAS.filter((p) => p.categoria === 'sintoma'),
  vetado: PALABRAS.filter((p) => p.categoria === 'vetado'),
  alternativa: PALABRAS.filter((p) => p.categoria === 'alternativa'),
};

export default {
  FUENTES,
  CATEGORIAS,
  PALABRAS,
  PALABRAS_POR_CATEGORIA,
  DESCARTADOS,
};
