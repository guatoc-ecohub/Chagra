import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pedirSegundaOpinion,
  redactarSegundaOpinion,
  coincidenLasLecturas,
  puedeCorrerSegundoPaso,
  habilitarSegundaOpinion,
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
