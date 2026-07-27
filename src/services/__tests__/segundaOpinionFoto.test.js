import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pedirSegundaOpinion,
  redactarSegundaOpinion,
  coincidenLasLecturas,
  puedeCorrerSegundoPaso,
  habilitarSegundaOpinion,
  extraerDeRevision,
  lecturaDesdeHallazgo,
} from '../segundaOpinionFoto';

/**
 * El diagnóstico en dos pasos: el primero contesta de una, el segundo revisa
 * en segundo plano y habla SÓLO si encuentra algo que el otro pasó por alto.
 * Lo que hay que proteger con tests no es el código — es la VOZ.
 */
beforeEach(() => habilitarSegundaOpinion(true));

describe('coincidenLasLecturas — cuándo callar', () => {
  it('mismo veredicto con otras palabras NO es discrepancia', () => {
    expect(coincidenLasLecturas(
      'ENFERMA. Tiene manchas en la hoja.',
      'Se ve una plaga en el follaje.',
    )).toBe(true);
  });

  it('sana contra sana, callado', () => {
    expect(coincidenLasLecturas('SANA, se ve bien', 'No se aprecia ningún problema')).toBe(true);
  });

  it('detecta la discrepancia REAL (el caso que motivó todo: la broca)', () => {
    // qwen3.5 dijo "es una semilla o fruto, no una plaga"; el segundo la vio.
    expect(coincidenLasLecturas(
      'SANA. El objeto es una semilla o fruto, no una plaga ni enfermedad.',
      'ENFERMA. El fruto está perforado, parece broca.',
    )).toBe(false);
  });

  it('ante un parseo dudoso CALLA — un aviso por un parseo fallido asusta sin motivo', () => {
    expect(coincidenLasLecturas('SANA', '')).toBe(true);
    expect(coincidenLasLecturas('SANA', 'mmm')).toBe(true);
    expect(coincidenLasLecturas(null, undefined)).toBe(true);
  });
});

describe('redactarSegundaOpinion — duda, no corrige', () => {
  const texto = redactarSegundaOpinion({
    hallazgo: 'El fruto está perforado, puede ser broca',
    queMirar: 'ábrale un grano y mire si tiene un huequito con polvillo',
    confianza: 'media',
  });

  it('abre dudando en primera persona', () => {
    expect(texto).toMatch(/^Me quedé mirando otra vez su foto/);
  });

  it('NUNCA desmiente al primero', () => {
    // Las fórmulas prohibidas: son las que convierten al compañero en corrector.
    expect(texto).not.toMatch(/me equivoqu|en realidad|estaba mal|corrijo|error/i);
  });

  it('termina en QUÉ MIRAR — un diagnóstico sin seña no es accionable', () => {
    expect(texto).toMatch(/Para salir de dudas/);
    expect(texto).toMatch(/huequito con polvillo/);
  });

  it('la confianza baja suena a duda, no a veredicto', () => {
    const t = redactarSegundaOpinion({ hallazgo: 'hay mancha', confianza: 'baja' });
    expect(t).toMatch(/no estoy segura/);
  });

  it('sin hallazgo no inventa nada', () => {
    expect(redactarSegundaOpinion({ hallazgo: '' })).toBe('');
    expect(redactarSegundaOpinion({})).toBe('');
  });

  it('sin seña concreta, igual invita a observar antes de aplicar nada', () => {
    const t = redactarSegundaOpinion({ hallazgo: 'se ve algo raro' });
    expect(t).toMatch(/antes de aplicar nada/);
  });
});

describe('pedirSegundaOpinion — cuándo habla y cuándo no', () => {
  it('si coincide con la primera, NO avisa (nada de "revisé otra vez y sí")', async () => {
    const avisar = vi.fn();
    const r = await pedirSegundaOpinion({
      primeraLectura: 'ENFERMA, tiene roya',
      mirarDeNuevo: async () => 'Se ve una enfermedad en las hojas',
      avisar,
    });
    expect(r.razon).toBe('coinciden');
    expect(r.aviso).toBeNull();
    expect(avisar).not.toHaveBeenCalled();
  });

  it('si discrepa, avisa POR EL MISMO CANAL', async () => {
    const avisar = vi.fn();
    const r = await pedirSegundaOpinion({
      primeraLectura: 'SANA, es solo un fruto',
      mirarDeNuevo: async () => 'ENFERMA: el grano está perforado',
      avisar,
      canal: 'voz',
      extraer: () => ({ hallazgo: 'el grano está perforado', queMirar: 'ábralo', confianza: 'media' }),
    });
    expect(r.razon).toBe('discrepa');
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0][1]).toEqual({ canal: 'voz' });
  });

  it('SIN SEÑAL no corre ni promete nada', async () => {
    const avisar = vi.fn();
    const r = await pedirSegundaOpinion({
      primeraLectura: 'SANA',
      mirarDeNuevo: async () => 'ENFERMA',
      avisar,
      guardas: { enLinea: () => false },
    });
    expect(r.razon).toBe('sin-senal');
    expect(avisar).not.toHaveBeenCalled();
  });

  it('si el modelo de chat ya NO está residente, no empuja el desalojo', async () => {
    // Reproducido en alpha: la segunda opinión en paralelo con el embebedor
    // del RAG desalojó el chat pineado y costó 8,56 s de recarga.
    const r = await pedirSegundaOpinion({
      primeraLectura: 'SANA',
      mirarDeNuevo: async () => 'ENFERMA',
      avisar: vi.fn(),
      guardas: { modelosResidentes: async () => ['qwen3-vl:4b'], modeloChat: 'qwen3.5:4b' },
    });
    expect(r.razon).toBe('gpu-apretada');
  });

  it('un solo vuelo: la segunda llamada simultánea se rechaza', async () => {
    let soltar;
    const lento = new Promise((res) => { soltar = res; });
    const p1 = pedirSegundaOpinion({
      primeraLectura: 'SANA', avisar: vi.fn(),
      mirarDeNuevo: async () => { await lento; return 'ENFERMA'; },
    });
    const r2 = await pedirSegundaOpinion({
      primeraLectura: 'SANA', avisar: vi.fn(), mirarDeNuevo: async () => 'ENFERMA',
    });
    expect(r2.razon).toBe('ya-hay-una');
    soltar();
    await p1;
  });

  it('si el segundo paso revienta, degrada en silencio (la 1ª ya cumplió)', async () => {
    const avisar = vi.fn();
    const r = await pedirSegundaOpinion({
      primeraLectura: 'SANA',
      mirarDeNuevo: async () => { throw new Error('ollama caído'); },
      avisar,
    });
    expect(r.razon).toBe('error');
    expect(avisar).not.toHaveBeenCalled();
  });

  it('se puede apagar entero', async () => {
    habilitarSegundaOpinion(false);
    const r = await puedeCorrerSegundoPaso();
    expect(r.puede).toBe(false);
    expect(r.razon).toBe('apagada');
  });
});

describe('lecturaDesdeHallazgo — el JSON del paso 1, en prosa comparable', () => {
  it('con issues, dice ENFERMA y los enumera', () => {
    const t = lecturaDesdeHallazgo({ score: 40, issues: ['mancha foliar', 'clorosis'] });
    expect(t).toMatch(/^ENFERMA/);
    expect(t).toMatch(/mancha foliar/);
  });

  it('sin issues, dice SANA — que es lo que el paso 1 está afirmando', () => {
    expect(lecturaDesdeHallazgo({ score: 95, issues: [] })).toMatch(/^SANA/);
  });

  it('sin hallazgo devuelve vacío (y entonces el paso 2 calla por parseo dudoso)', () => {
    expect(lecturaDesdeHallazgo(null)).toBe('');
    expect(coincidenLasLecturas(lecturaDesdeHallazgo(null), 'ENFERMA, tiene broca')).toBe(true);
  });
});

describe('extraerDeRevision — de la respuesta cruda a lo que el compAI dice', () => {
  it('⚠️ TIRA EL BLOQUE <think>: el modelo razona aunque se le pida que no', () => {
    // Medido: qwen3-vl:4b IGNORA `think:false`. Si ese monólogo se colara, el
    // compAI le leería al campesino su propio razonamiento en voz alta.
    const r = extraerDeRevision(
      '<think>El usuario quiere saber si la planta está enferma. Veamos...</think>\n'
      + 'ENFERMA\nLas hojas tienen manchas negras.\nFíjese si las manchas tienen borde amarillo.',
    );
    expect(r.hallazgo).not.toMatch(/think|usuario quiere|Veamos/i);
    expect(r.hallazgo).toMatch(/manchas negras/);
  });

  it('aguanta un <think> SIN CERRAR (respuesta truncada)', () => {
    const r = extraerDeRevision('<think>me quedé sin presupuesto a mitad de');
    expect(r.hallazgo).toBe('');
  });

  it('separa las tres líneas: veredicto fuera, qué ve, y la seña de campo', () => {
    const r = extraerDeRevision(
      'ENFERMA\nSe observa un objeto oscuro e irregular sobre el fruto.\n'
      + 'Fíjese si el grano tiene un huequito con polvillo alrededor.',
    );
    expect(r.hallazgo).toBe('Se observa un objeto oscuro e irregular sobre el fruto.');
    expect(r.queMirar).toMatch(/^fíjese si el grano/);
    // El veredicto suelto NO se repite: ya lo dice la frase de apertura.
    expect(r.hallazgo).not.toMatch(/^ENFERMA/);
  });

  it('si contesta todo en un párrafo, igual encuentra la seña', () => {
    const r = extraerDeRevision(
      'La hoja presenta manchas concéntricas. Revise el envés para ver si hay polvillo naranja.',
    );
    expect(r.hallazgo).toMatch(/manchas concéntricas/);
    expect(r.queMirar).toMatch(/revise el envés/);
  });

  it('quita las etiquetas "Línea N:" que a veces repite del prompt', () => {
    const r = extraerDeRevision('Línea 1: ENFERMA\nLínea 2: hay clorosis\nLínea 3: Mire las nervaduras');
    expect(r.hallazgo).toBe('hay clorosis');
    expect(r.queMirar).toMatch(/^mire las nervaduras/);
  });

  it('sin seña, no la inventa', () => {
    const r = extraerDeRevision('ENFERMA\nHay algo raro en el tallo.');
    expect(r.queMirar).toBeNull();
  });

  it('la confianza sale de SUS palabras, no de la nada', () => {
    expect(extraerDeRevision('Posiblemente sea un hongo').confianza).toBe('baja');
    expect(extraerDeRevision('No estoy seguro de lo que veo').confianza).toBe('baja');
    expect(extraerDeRevision('Se ve claramente una perforación').confianza).toBe('alta');
    expect(extraerDeRevision('Hay manchas en la hoja').confianza).toBe('media');
  });
});

describe('el caso REAL de la broca, extremo a extremo', () => {
  // Es la corrida verificada contra alpha (bitácora compai-unificado §19):
  // el paso 1 dijo SANA, el paso 2 vio el daño.
  const CRUDO_PASO2 = 'ENFERMA\nSe observa un objeto oscuro e irregular en el fruto, '
    + 'posiblemente una perforación.\nFíjese si el grano tiene un huequito con polvillo.';

  it('habla, y habla como el operador mandó', async () => {
    const avisar = vi.fn();
    const r = await pedirSegundaOpinion({
      primeraLectura: lecturaDesdeHallazgo({ score: 90, issues: [] }), // el paso 1 la vio SANA
      mirarDeNuevo: async () => CRUDO_PASO2,
      extraer: extraerDeRevision,
      avisar,
      canal: 'texto',
    });
    expect(r.razon).toBe('discrepa');
    const dicho = avisar.mock.calls[0][0];
    // Duda en primera persona…
    expect(dicho).toMatch(/^Me quedé mirando otra vez su foto/);
    // …NUNCA corrige…
    expect(dicho).not.toMatch(/me equivoqu|en realidad|estaba mal|corrijo|error/i);
    // …dice qué mirar…
    expect(dicho).toMatch(/huequito con polvillo/);
    // …y NO le lee al campesino el veredicto crudo en mayúsculas.
    expect(dicho).not.toMatch(/ENFERMA/);
  });

  it('con la confianza baja del propio modelo, suena todavía más prudente', async () => {
    const avisar = vi.fn();
    await pedirSegundaOpinion({
      primeraLectura: 'SANA. No se observa problema.',
      mirarDeNuevo: async () => CRUDO_PASO2,
      extraer: extraerDeRevision,
      avisar,
    });
    // "posiblemente" en la respuesta del modelo ⇒ confianza baja ⇒ duda explícita.
    expect(avisar.mock.calls[0][0]).toMatch(/no estoy segura/);
  });
});
