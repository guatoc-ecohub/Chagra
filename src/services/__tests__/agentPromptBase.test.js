import { describe, it, expect } from 'vitest';
import {
  buildBasePrompt,
  buildConversationContextPin,
  analyzeQuery,
  buildQueryAnalysisBlock,
  buildCorpusContext,
  buildCorpusVariants,
  formatToolEvidence,
  TOOL_EVIDENCE_MAX_CHARS,
  buildCampesinoModeBlock,
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
    expect(buildCorpusContext(null)).toBe('');
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

// ── Suite de regresión multiturno (2026-06-24) ─────────────────────────────
// Anáfora: "la"/"lo" resuelven al cultivo + problema previo cuando el turno
// actual no los nombra explícitamente. Coherencia: no re-presentarse, respeta
// cultivo/altitud/variedad ya dichos en turnos anteriores.

describe('buildConversationContextPin — regresión multiturno: anáfora "la"/"lo"', () => {
  it('extrae café+roya del historial cuando T2 solo dice "¿cómo la controlo?" (la = roya)', () => {
    const history =
      'Usuario: Mi café variedad Colombia está con roya.\n' +
      'Asistente: Aplica caldo bordelés cada 15 días.\n' +
      'Usuario: ¿cómo la controlo?';
    const pin = buildConversationContextPin(history);
    expect(pin).toContain('Cultivo: café');
    expect(pin).toContain('Variedad: Colombia');
    expect(pin).toContain('Problema previo: roya');
  });

  it('extrae café cuando T2 dice "¿cómo lo abono?" (lo = café)', () => {
    const history =
      'Usuario: Tengo café variedad Caturra a 1600 msnm.\n' +
      'Asistente: Excelente altitud para café.\n' +
      'Usuario: ¿cómo lo abono?';
    const pin = buildConversationContextPin(history);
    expect(pin).toContain('Cultivo: café');
    expect(pin).toContain('Variedad: Caturra');
    expect(pin).toContain('1600 msnm');
  });

  it('extrae papa+gota de historial con array de turnos', () => {
    const history = [
      { role: 'user', content: 'Tengo papa variedad Diacol Capiro con gota.' },
      { role: 'assistant', content: 'Revisa el drenaje y aplica cobre.' },
      { role: 'user', content: 'sí, ¿cómo la trato?' },
    ];
    const pin = buildConversationContextPin(history);
    expect(pin).toContain('Cultivo: papa');
    expect(pin).toContain('Variedad: Diacol Capiro');
    expect(pin).toContain('Problema previo: gota');
  });

  it('extrae solo cultivo cuando no hay problema fitosanitario (consulta cultural)', () => {
    const history =
      'Usuario: Tengo aguacate Hass.\n' +
      'Asistente: Bien.\n' +
      'Usuario: ¿cómo lo podo?';
    const pin = buildConversationContextPin(history);
    expect(pin).toContain('Cultivo: aguacate');
    expect(pin).toContain('Variedad: Hass');
    expect(pin).not.toContain('Problema previo');
  });

  it('altitud sobrevive aunque el turno anafórico no la repita', () => {
    const history =
      'Usuario: café a 2200 msnm con broca.\n' +
      'Asistente: La broca se controla con trampas.\n' +
      'Usuario: ok, ¿y cómo la evito?';
    const pin = buildConversationContextPin(history);
    expect(pin).toContain('Cultivo: café');
    expect(pin).toContain('2200 msnm');
    expect(pin).toContain('Problema previo: broca');
  });

  it('historial vacío retorna string vacío', () => {
    expect(buildConversationContextPin('')).toBe('');
    expect(buildConversationContextPin([])).toBe('');
  });
});

describe('buildBasePrompt — regresión multiturno: anáfora + coherencia', () => {
  const BASE = {
    plantContext: 'café x5',
    fincaContext: '',
    indoorContext: '',
    finca: null,
    isEnum: false,
  };

  it('con historial de café+roya y query anafórica "la": inyecta pin + PROBLEMA-PRIMERO + CONTINUIDAD', () => {
    const prompt = buildBasePrompt({
      ...BASE,
      contextMemory:
        'Usuario: Mi café variedad Colombia está con roya.\n' +
        'Asistente: Aplica caldo bordelés cada 15 días.\n' +
        'Usuario: ¿cómo la controlo?',
      query: '¿cómo la controlo?',
    });
    expect(prompt).toContain('CONTEXTO DE LA CONVERSACIÓN');
    expect(prompt).toContain('Cultivo: café');
    expect(prompt).toContain('Variedad: Colombia');
    expect(prompt).toContain('Problema previo: roya');
    expect(prompt).toContain('REGLA PROBLEMA-PRIMERO');
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
    expect(prompt).toContain('PROHIBIDO re-presentarte');
    expect(prompt).toContain('Resuelve los pronombres ("la"/"lo")');
  });

  it('con historial de papa+gota y query anafórica "lo": inyecta pin con cultivo y problema', () => {
    const prompt = buildBasePrompt({
      ...BASE,
      query: '¿cómo lo evito?',
      contextMemory:
        'Usuario: Mi papa tiene gota.\n' +
        'Asistente: Gota es Phytophthora infestans.\n' +
        'Usuario: ¿cómo lo evito?',
    });
    expect(prompt).toContain('Cultivo: papa');
    expect(prompt).toContain('Problema previo: gota');
    expect(prompt).toContain('REGLA PROBLEMA-PRIMERO');
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
  });

  it('query anafórica sin problema previo en historial NO dispara PROBLEMA-PRIMERO', () => {
    const prompt = buildBasePrompt({
      ...BASE,
      query: '¿cómo lo abono?',
      contextMemory:
        'Usuario: Tengo café.\n' +
        'Asistente: Buen cultivo.\n' +
        'Usuario: ¿cómo lo abono?',
    });
    expect(prompt).toContain('CONTEXTO DE LA CONVERSACIÓN');
    expect(prompt).not.toContain('Problema previo');
    expect(prompt).not.toContain('REGLA PROBLEMA-PRIMERO');
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
  });

  it('no se re-presenta cuando contextMemory tiene historial de seguimiento', () => {
    const prompt = buildBasePrompt({
      ...BASE,
      query: '¿y para la variedad qué recomiendas?',
      contextMemory:
        'Usuario: Tengo café a 1800 msnm variedad Castillo.\n' +
        'Asistente: Buen café. ¿Qué problema tienes?\n' +
        'Usuario: ¿y para la variedad qué recomiendas?',
    });
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
    expect(prompt).toContain('PROHIBIDO re-presentarte');
    expect(prompt).not.toContain('REGLA PROBLEMA-PRIMERO');
  });

  it('mantiene coherencia en cadena de 3+ turnos (café→roya→tratamiento→seguimiento)', () => {
    const history =
      'Usuario: Café variedad Colombia con roya.\n' +
      'Asistente: Aplica caldo bordelés.\n' +
      'Usuario: ¿cada cuánto?';
    const prompt = buildBasePrompt({
      ...BASE,
      query: '¿cada cuánto?',
      contextMemory: history,
    });
    expect(prompt).toContain('Cultivo: café');
    expect(prompt).toContain('Variedad: Colombia');
    expect(prompt).toContain('Problema previo: roya');
    expect(prompt).toContain('COHERENCIA MULTITURNO');
    expect(prompt).toContain('REGLA CONTINUIDAD DE HILO');
  });

  it('respeta altitud dicha en T1 aunque query T2 no la repita', () => {
    const prompt = buildBasePrompt({
      ...BASE,
      query: '¿qué variedad me recomiendas?',
      contextMemory:
        'Usuario: Tengo café a 2000 msnm.\n' +
        'Asistente: Excelente.\n' +
        'Usuario: ¿qué variedad me recomiendas?',
    });
    expect(prompt).toContain('CONTEXTO DE LA CONVERSACIÓN');
    expect(prompt).toContain('2000 msnm');
  });
});

describe('buildCampesinoModeBlock', () => {
  it('exporta buildCampesinoModeBlock', () => {
    expect(typeof buildCampesinoModeBlock).toBe('function');
  });

  it('buildCampesinoModeBlock genera bloque con registro campesino colombiano', () => {
    const block = buildCampesinoModeBlock();

    expect(block).toContain('MODO CAMPESINO');
    expect(block).toContain('campesino colombiano');
    expect(block).toContain('tú/usted');
    expect(block).toContain('NEVER vos/tenés/querés');
    expect(block).toContain('cuadra');
    expect(block).toContain('arroba');
    expect(block).toContain('luna');
    expect(block).toContain('NO uses binomios científicos');
    expect(block).toContain('PRINCIPIO FUNDAMENTAL');
    expect(block).toContain('NO sacrificas');
  });

  it('buildCampesinoModeBlock prohíbe voseo argentino explícitamente', () => {
    const block = buildCampesinoModeBlock();

    // Verifica que el bloque contine advertencias explícitas contra voseo argentino
    expect(block).toMatch(/vos|tenés|querés|dale|acá|che/i);
    // Debe mencionar que NO se debe usar voseo argentino
    expect(block).toContain('NEVER vos');
    expect(block).toContain('argentino');
  });
});
