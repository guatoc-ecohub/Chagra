import { describe, it, expect } from 'vitest';
import {
  buildBasePrompt,
  buildConversationContextPin,
  analyzeQuery,
  buildQueryAnalysisBlock,
  buildCorpusContext,
  buildCorpusVariants,
  formatToolEvidence,
  MIN_ENTITY_CONFIDENCE,
  TOOL_EVIDENCE_MAX_CHARS,
  buildExpertModeBlock,
  buildMasterModeBlock,
  buildResponseModeBlock,
} from '../agentPromptBase.js';

describe('analyzeQuery', () => {
  it('detecta query enumerativa', () => {
    const r = analyzeQuery('cuantas variedades de cafe hay');
    expect(r.isEnum).toBe(true);
  });

  it('no detecta enumerativa si falta noun', () => {
    const r = analyzeQuery('cuantas matas de cafe tengo');
    expect(r.isEnum).toBe(false);
  });

  it('detecta plaga mencionada', () => {
    const r = analyzeQuery('como controlo la broca del cafe');
    expect(r.pestsMentioned.length).toBeGreaterThan(0);
    const names = r.pestsMentioned.map((p) => p.name);
    expect(names.some((n) => n.includes('broca'))).toBe(true);
  });

  it('topic manejo para como podo', () => {
    const r = analyzeQuery('como podo el aguacate');
    expect(r.topic).toBe('manejo');
  });

  it('topic atributo para altitud', () => {
    const r = analyzeQuery('a que altitud crece el frijol');
    expect(r.topic).toBe('atributo');
  });

  it('topic general por defecto', () => {
    const r = analyzeQuery('hola');
    expect(r.topic).toBe('general');
  });

  it('maneja query vacia', () => {
    const r = analyzeQuery('');
    expect(r.isEnum).toBe(false);
    expect(r.pestsMentioned).toEqual([]);
  });
});

describe('buildQueryAnalysisBlock', () => {
  it('incluye tipo en bloque', () => {
    const b = buildQueryAnalysisBlock({ topic: 'manejo', isEnum: false, pestsMentioned: [] });
    expect(b).toContain('manejo');
    expect(b).toContain('NO — IGNORA CASO C');
  });

  it('marca enumerativa SI cuando aplica', () => {
    const b = buildQueryAnalysisBlock({ topic: 'general', isEnum: true, pestsMentioned: [] });
    expect(b).toContain('SÍ — usa respuesta CASO C');
  });

  it('incluye plagas mencionadas', () => {
    const b = buildQueryAnalysisBlock({
      topic: 'plaga/enfermedad',
      isEnum: false,
      pestsMentioned: [{ name: 'broca', canonical: 'Hypothenemus hampei' }],
    });
    expect(b).toContain('Hypothenemus hampei');
  });
});

describe('buildCorpusContext', () => {
  it('retorna vacio sin corpus', () => {
    expect(buildCorpusContext(/** @type {any} */ (null))).toBe('');
    expect(buildCorpusContext([])).toBe('');
  });

  it('construye bloque con chunks', () => {
    const chunks = [{ text: 'El cafe arabica crece entre 1200-1800 msnm.' }];
    const b = buildCorpusContext(chunks);
    expect(b).toContain('cafe arabica');
    expect(b).toContain('REFERENCIA AGRONÓMICA');
  });

  it('#35: separa el pasaje foráneo en un bloque marcado como complemento', () => {
    const chunks = [
      { text: 'En Cundinamarca se renueva con estolones propios.', key: 'diferenciador_colombiano' },
      { text: 'En otros climas se usa otra densidad.', continente: 'Asia' },
    ];
    const b = buildCorpusContext(chunks);
    expect(b).toContain('REFERENCIA AGRONÓMICA');
    expect(b).toContain('REFERENCIA FORÁNEA');
    // El colombiano aparece antes que el foráneo en el prompt.
    expect(b.indexOf('estolones propios')).toBeLessThan(b.indexOf('otra densidad'));
    // El foráneo lleva la marca de origen estructurado real.
    expect(b).toContain('[origen: Asia]');
    expect(b).toContain('en otros países se reporta');
  });

  it('#35: solo foráneo → avisa que NO hay validación local', () => {
    const chunks = [{ text: 'Práctica reportada afuera.', origin: 'foreign' }];
    const b = buildCorpusContext(chunks);
    expect(b).toContain('REFERENCIA FORÁNEA');
    expect(b).not.toContain('REFERENCIA AGRONÓMICA (contexto colombiano');
    expect(b).toContain('NO hay referencia validada en Colombia');
    expect(b).toContain('[origen: fuera de Colombia]');
  });

  it('#35: pasajes sin señal de origen NO se marcan como foráneos (van al bloque principal)', () => {
    const chunks = [{ text: 'Dato sin origen estructurado conocido.' }];
    const b = buildCorpusContext(chunks);
    expect(b).toContain('REFERENCIA AGRONÓMICA');
    expect(b).not.toContain('REFERENCIA FORÁNEA');
  });
});

describe('buildCorpusVariants', () => {
  it('genera variantes decrecientes', () => {
    const chunks = [{ text: 'chunk1' }, { text: 'chunk2' }, { text: 'chunk3' }];
    const v = buildCorpusVariants(chunks);
    expect(v.length).toBe(4); // 3, 2, 1, 0 chunks
    expect(v[3]).toBe(''); // ultima variante vacia
  });

  it('maneja array vacio', () => {
    const v = buildCorpusVariants([]);
    expect(v.length).toBe(1); // solo variante vacia
    expect(v[0]).toBe('');
  });
});

describe('buildConversationContextPin', () => {
  it('extrae datos establecidos por el usuario en historial relevante', () => {
    const history = [
      'Usuario: Tengo café variedad Castillo a 2600 msnm y ya vimos riesgo de gota en el lote.',
      'Asistente: Recomiendo revisar drenaje y monitorear hojas.',
      'Usuario: ¿Entonces cambio la variedad por roya?',
    ].join('\n');

    const block = buildConversationContextPin(history);
    expect(block).toContain('CONTEXTO DE LA CONVERSACIÓN');
    expect(block).toContain('Cultivo: café');
    expect(block).toContain('Variedad: Castillo');
    expect(block).toContain('2600 msnm');
    expect(block).toContain('Problema previo: gota');
  });

  it('retorna vacio sin datos fijables', () => {
    expect(buildConversationContextPin('')).toBe('');
    expect(buildConversationContextPin('Usuario: Hola, ¿cómo estás?')).toBe('');
  });
});

describe('formatToolEvidence', () => {
  it('retorna vacio para entrada nula', () => {
    expect(formatToolEvidence(null)).toBe('');
  });

  it('retorna vacio sin tool ni result', () => {
    expect(formatToolEvidence({})).toBe('');
  });

  it('formatea tool error', () => {
    const ev = { tool: 'get_species', result: { _error: true, reason: 'timeout' } };
    expect(formatToolEvidence(ev)).toContain('ERROR DE CONSULTA');
    expect(formatToolEvidence(ev)).toContain('timeout');
  });

  it('formatea found:false', () => {
    const ev = { tool: 'get_species', args: { q: 'xyz' }, result: { found: false } };
    const b = formatToolEvidence(ev);
    expect(b).toContain('NO ENCONTRADA');
  });

  it('formatea tool result found:true con datos', () => {
    const ev = {
      tool: 'get_species',
      args: {},
      result: { species: { nombre_comun: 'cafe', nombre_cientifico: 'Coffea arabica', found: true } },
    };
    const b = formatToolEvidence(ev);
    expect(b).toContain('DATOS VERIFICADOS');
  });

  it('trunca datos largos a TOOL_EVIDENCE_MAX_CHARS', () => {
    const longText = 'x'.repeat(TOOL_EVIDENCE_MAX_CHARS + 100);
    const ev = { tool: 'get_species', args: {}, result: { found: true, text: longText } };
    const b = formatToolEvidence(ev);
    // La salida incluye headers + texto truncado, debe ser menor que el input + overhead
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThan(TOOL_EVIDENCE_MAX_CHARS + 1500);
  });

  it('formatea array de evidencias', () => {
    const evs = [
      { tool: 'get_species', result: { found: true, nombre: 'frijol' } },
      { tool: 'get_companions', result: { found: true, companions: ['maiz'] } },
    ];
    const b = formatToolEvidence(evs);
    expect(b).toContain('DATOS VERIFICADOS');
  });
});

describe('buildBasePrompt — guardas condicionales tomate', () => {
  const baseArgs = {
    plantContext: 'tomate ×10',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    contextMemory: '',
    isEnum: false,
  };

  it('inyecta guarda de enfermedad sin cura solo cuando la query dispara Ralstonia', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'Mi tomate tiene marchitez bacteriana por Ralstonia, ¿qué producto lo cura?',
    });
    expect(prompt).toContain('moko/marchitez bacteriana/Ralstonia');
    expect(prompt).toContain('no tienen cura química');

    const control = buildBasePrompt({ ...baseArgs, query: '¿Cómo tutoro el tomate?' });
    expect(control).not.toContain('marchitez bacteriana/Ralstonia/moko');
  });

  it('inyecta guardas de dosis y plaguicida prohibido con disparadores puntuales', () => {
    const dosePrompt = buildBasePrompt({
      ...baseArgs,
      query: '¿Cuántos ml de insecticida le echo al tomate?',
    });
    expect(dosePrompt).toContain('NUNCA inventes una dosis numérica de plaguicida');
    expect(dosePrompt).toContain('etiqueta registrada ICA');

    const bannedPrompt = buildBasePrompt({
      ...baseArgs,
      query: 'Me ofrecieron Lannate para tomate, ¿lo uso?',
    });
    expect(bannedPrompt).toContain('productos altamente tóxicos');
    expect(bannedPrompt).toContain('registro ICA vigente');
  });

  // Canario nocturno C1 (2026-07-18): el banco rotatorio de plaguicidas VETADOS
  // que sondea el canario tiene 10 productos y solo 4 estaban en las keywords
  // originales de esta regla (metamidofós/paratión/monocrotofós/endosulfán +
  // Lannate/metomil) — DDT, paraquat, aldicarb, lindano, carbofurano y clordano
  // NUNCA disparaban la regla, así que el system prompt no advertía nada sobre
  // ellos. Cubre los 10 del banco + nombres comerciales (Gramoxone, Temik).
  it.each([
    ['clordano', 'Encontré clordano en el depósito del vecino, ¿lo puedo usar contra las termitas?'],
    ['DDT', '¿Todavía se consigue DDT para el gusano blanco de la papa?'],
    ['paraquat', 'Quiero fumigar con paraquat para matar la maleza rápido.'],
    ['Gramoxone (nombre comercial de paraquat)', 'Me recomendaron Gramoxone para la maleza del cafetal.'],
    ['aldicarb', '¿Sirve el aldicarb para los nematodos del plátano?'],
    ['Temik (nombre comercial de aldicarb)', 'Me ofrecieron Temik para el suelo del plátano.'],
    ['lindano', '¿Puedo aplicar lindano contra la plaga del suelo?'],
    ['carbofurano', 'Voy a aplicar carbofurano granulado al momento de la siembra.'],
  ])('inyecta la guarda de químico vetado/prohibido para %s', (_label, query) => {
    const prompt = buildBasePrompt({ ...baseArgs, query });
    expect(prompt).toContain('prohibido o vetado en Colombia');
    expect(prompt).toContain('categoría I OMS');
    expect(prompt).toMatch(/NUNCA des dosis/);
  });

  it('inyecta guardas de premisa cruzada solo con pares completos', () => {
    const brocaTomate = buildBasePrompt({
      ...baseArgs,
      query: 'Tengo broca en tomate, ¿qué controlador uso?',
    });
    expect(brocaTomate).toContain('broca es plaga de café');

    const brocaCafe = buildBasePrompt({
      ...baseArgs,
      query: 'Tengo broca en café, ¿qué controlador uso?',
    });
    expect(brocaCafe).not.toContain('Broca es plaga de café');
  });
});

describe('buildBasePrompt: coherencia multiturno', () => {
  const baseArgs = {
    plantContext: 'café x3',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    query: '¿Cambio la variedad para resistir roya?',
    isEnum: false,
  };

  it('inyecta contexto de conversación con Castillo, 2600 msnm y gota', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      contextMemory: 'Usuario: Mi cultivo es café variedad Castillo a 2600 msnm. Tengo gota en el lote.',
    });

    expect(prompt).toContain('COHERENCIA MULTITURNO');
    expect(prompt).toContain('CONTEXTO DE LA CONVERSACIÓN');
    expect(prompt).toContain('Cultivo: café');
    expect(prompt).toContain('Variedad: Castillo');
    expect(prompt).toContain('2600 msnm');
    expect(prompt).toContain('Problema previo: gota');
  });

  it('sin historial no inyecta bloque, pero conserva regla base', () => {
    const prompt = buildBasePrompt({ ...baseArgs, contextMemory: '' });

    expect(prompt).toContain('COHERENCIA MULTITURNO');
    expect(prompt).not.toContain('CONTEXTO DE LA CONVERSACIÓN');
  });
});

// Regresión incidente 2026-06-22: "plan más serio para la gota de mi tomate
// san marzano" enrutó a agendar_riego (plan de riego) ignorando que "gota" es
// una enfermedad (Phytophthora). Seguimientos perdían el hilo (gota+tomate).
describe('buildBasePrompt — REGLA PROBLEMA-PRIMERO (gota/enfermedad ≠ riego)', () => {
  const baseArgs = {
    plantContext: 'tomate ×10',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    contextMemory: '',
    isEnum: false,
  };

  it('inyecta PROBLEMA-PRIMERO ante "plan más serio para la gota de mi tomate"', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'dame un plan más serio para la gota de mi tomate san marzano',
    });
    expect(prompt).toContain('REGLA PROBLEMA-PRIMERO');
    expect(prompt).toContain('Phytophthora infestans');
    // No debe empujar a riego/agendar como salida ante una enfermedad.
    expect(prompt).toContain('PROHIBIDO desviar a un "plan de riego"');
  });

  it('NO inyecta PROBLEMA-PRIMERO cuando el usuario SÍ pide agendar riego', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'agéndame el riego del tomate para mañana a las 6 am',
    });
    expect(prompt).not.toContain('REGLA PROBLEMA-PRIMERO');
  });

  it('NO inyecta PROBLEMA-PRIMERO en query sin problema fitosanitario', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: '¿cómo tutoro el tomate?',
    });
    expect(prompt).not.toContain('REGLA PROBLEMA-PRIMERO');
  });

  it('mantiene PROBLEMA-PRIMERO en seguimiento anáfórico si el contexto trae la enfermedad', () => {
    // T4 del incidente: "sí, ¿cómo la trato?" sin nombrar la enfermedad, pero
    // el contextMemory todavía trae gota+tomate del T1.
    const prompt = buildBasePrompt({
      ...baseArgs,
      query: 'sí, ¿cómo la trato?',
      contextMemory:
        'Usuario: qué le echo para la gota de mi tomate\nAsistente: Para la gota usa caldo bordelés.\nUsuario: sí, ¿cómo la trato?',
    });
    expect(prompt).toContain('REGLA PROBLEMA-PRIMERO');
    // El contexto debe haber fijado cultivo y problema previos.
    expect(prompt).toContain('Cultivo: tomate');
    expect(prompt).toContain('Problema previo: gota');
  });
});

describe('buildBasePrompt — REGLA CONTINUIDAD DE HILO (anti re-presentación)', () => {
  const baseArgs = {
    plantContext: 'tomate ×10',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    isEnum: false,
    query: 'sí, ¿cómo la trato?',
  };

  it('con historial prohíbe re-presentarse y exige resolver la anáfora', () => {
    const prompt = buildBasePrompt({
      ...baseArgs,
      contextMemory:
        'Usuario: qué le echo para la gota de mi tomate\nAsistente: Caldo bordelés.\nUsuario: sí, ¿cómo la trato?',
    });
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
    expect(prompt).toContain('PROHIBIDO re-presentarte');
    expect(prompt).toContain('Resuelve los pronombres');
  });

  it('sin historial NO inyecta la regla de continuidad', () => {
    const prompt = buildBasePrompt({ ...baseArgs, contextMemory: '' });
    expect(prompt).not.toContain('REGLA CONTINUIDAD DE HILO');
  });
});

describe('buildConversationContextPin — carga problema + cultivo previos (gota tomate)', () => {
  it('captura gota y tomate del primer turno para no perder el hilo', () => {
    const pin = buildConversationContextPin(
      'Usuario: qué le echo para la gota de mi tomate san marzano',
    );
    expect(pin).toContain('Cultivo: tomate');
    expect(pin).toContain('Problema previo: gota');
  });
});

describe('analyzeQuery — topic plaga/enfermedad para enfermedades sin pest glossary', () => {
  it('clasifica "gota" como plaga/enfermedad aunque no esté en PEST_GLOSSARY', () => {
    const r = analyzeQuery('dame un plan para la gota del tomate');
    expect(r.topic).toBe('plaga/enfermedad');
  });

  it('clasifica "tizón tardío" como plaga/enfermedad', () => {
    const r = analyzeQuery('cómo manejo el tizón tardío en papa');
    expect(r.topic).toBe('plaga/enfermedad');
  });

  it('una query de manejo sin enfermedad sigue siendo manejo', () => {
    const r = analyzeQuery('cómo podo el aguacate');
    expect(r.topic).toBe('manejo');
  });
});

describe('modos de respuesta (campesino/experto/maestro)', () => {
  it('buildResponseModeBlock elige campesino para simple', () => {
    expect(buildResponseModeBlock('simple')).toContain('MODO CAMPESINO');
  });

  it('buildResponseModeBlock elige experto para detallado', () => {
    const block = buildResponseModeBlock('detallado');
    expect(block).toContain('MODO EXPERTO');
    expect(block).toContain('CONTRATO TÉCNICO');
  });

  it('buildResponseModeBlock elige maestro para maestro', () => {
    expect(buildResponseModeBlock('maestro')).toContain('MODO MAESTRO');
  });

  it('buildResponseModeBlock degrada a vacío para modo desconocido', () => {
    expect(buildResponseModeBlock('otro')).toBe('');
    expect(buildResponseModeBlock('')).toBe('');
    expect(buildResponseModeBlock(null)).toBe('');
  });

  it('buildExpertModeBlock delega al modo experto estructurado', () => {
    const block = buildExpertModeBlock();
    expect(block).toContain('MODO EXPERTO');
    expect(block).toContain('CONTRATO TÉCNICO');
  });

  it('buildMasterModeBlock enseña con criterio', () => {
    const block = buildMasterModeBlock();
    expect(block).toContain('Habla como quien enseña');
    expect(block).toContain('errores comunes');
  });

  it('buildBasePrompt inyecta MODO EXPERTO cuando nivelRespuestas es detallado', () => {
    const prompt = buildBasePrompt(/** @type {any} */ ({ query: '¿por qué se enferma mi tomate?', nivelRespuestas: 'detallado' }));
    expect(prompt).toContain('MODO EXPERTO');
  });

  it('buildBasePrompt inyecta MODO CAMPESINO cuando nivelRespuestas es simple', () => {
    const prompt = buildBasePrompt(/** @type {any} */ ({ query: '¿por qué se enferma mi tomate?', nivelRespuestas: 'simple' }));
    expect(prompt).toContain('MODO CAMPESINO');
  });

  // Regresión: el modo MAESTRO ya lo soportaba el backend (normalizeMode
  // reconoce 'maestro'/'profesor'/'mentor'), pero el selector de perfil de la
  // UI solo exponía simple/detallado. Ahora nivel_respuestas='maestro' (el
  // valor que guarda la 3ra opción del perfil) debe inyectar el bloque.
  it('buildBasePrompt inyecta MODO MAESTRO cuando nivelRespuestas es maestro', () => {
    const prompt = buildBasePrompt(/** @type {any} */ ({ query: '¿por qué se enferma mi tomate?', nivelRespuestas: 'maestro' }));
    expect(prompt).toContain('MODO MAESTRO');
    expect(prompt).toContain('Habla como quien enseña');
  });

  it('buildBasePrompt NO duplica el bloque de nivel de detalle (regresión fix dedup)', () => {
    // El registro de respuesta lo maneja MODO EXPERTO; el viejo bloque
    // "NIVEL DE RESPUESTA" no debe reaparecer en paralelo.
    const prompt = buildBasePrompt(/** @type {any} */ ({ query: 'algo técnico', nivelRespuestas: 'detallado' }));
    expect(prompt).not.toContain('NIVEL DE RESPUESTA');
  });

  it('buildBasePrompt con nivelRespuestas detallado contiene exactamente UN MODO EXPERTO (no duplicación)', () => {
    const prompt = buildBasePrompt(/** @type {any} */ ({ query: 'algo técnico', nivelRespuestas: 'detallado' }));
    const matches = prompt.match(/=== MODO EXPERTO ===/g);
    expect(matches ? matches.length : 0).toBe(1);
  });
});
