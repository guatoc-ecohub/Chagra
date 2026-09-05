/*
 * PASO 4 — sus DOS PUERTAS, medidas.
 *
 * Puerta 1: con fase Niño viva, la niebla de la banda 4 SUBE y se ADELGAZA, y
 *           el piso frío recibe la advertencia de HELADA, no la de calor.
 * Puerta 2: al terminar el descenso, el compai del usuario es EL MISMO, y
 *           `compai:companero` NO cambió — comprobado en el storage, no a ojo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ANFITRIONES,
  anfitrionDeBanda,
  companeroDelUsuario,
  faseEnsoViva,
  lineaEnsoPorPiso,
  resolverAterrizaje,
} from '../sierra/aterrizajeDescenso.js';
import { franjaCondensacion, opticaEnMsnm } from '../sierra/descensoSierra.js';
import { LLAVE_COMPANERO, escribirCompanero } from '../../../compai/nucleo/elenco.js';
import { clearEnsoPhase, recordLiveEnsoStatus, setEnsoPhase } from '../../../services/ensoService.js';

beforeEach(() => {
  window.localStorage.clear();
  clearEnsoPhase();
});

describe('🚪 PUERTA 1 — El Niño: la niebla y el consejo', () => {
  it('la franja de niebla del bosque de niebla SUBE y se ADELGAZA', () => {
    const neutral = franjaCondensacion('neutral');
    const nino = franjaCondensacion('el_nino');
    expect(nino.cota).toBeGreaterThan(neutral.cota);
    expect(nino.sigma).toBeLessThan(neutral.sigma);
    // Y a la cota de la banda 4, se queda literalmente sin niebla.
    const antes = opticaEnMsnm(2500, { fase: 'neutral' }).niebla;
    const durante = opticaEnMsnm(2500, { fase: 'el_nino' }).niebla;
    expect(durante).toBeLessThan(antes * 0.75);
  });

  it('🔴 el piso FRÍO recibe la advertencia de HELADA, no la de calor', () => {
    const frio = lineaEnsoPorPiso({ fase: 'el_nino', pisoId: 'frio' });
    expect(frio.esPisoFrio).toBe(true);
    expect(frio.titular.toLowerCase()).toMatch(/hela/);
    expect(frio.titular.toLowerCase()).not.toMatch(/más calor/);
    expect(frio.accion.toLowerCase()).toMatch(/agua/);
  });

  it('🔴 páramo y superpáramo también son piso frío (la paradoja aplica)', () => {
    for (const pisoId of ['paramo', 'superparamo', 'nival']) {
      expect(lineaEnsoPorPiso({ fase: 'el_nino', pisoId }).titular.toLowerCase()).toMatch(/hela/);
    }
  });

  it('el piso templado/cálido SÍ recibe la de calor, y NO la de helada', () => {
    for (const pisoId of ['templado', 'calido']) {
      const l = lineaEnsoPorPiso({ fase: 'el_nino', pisoId });
      expect(l.esPisoFrio).toBe(false);
      expect(l.titular.toLowerCase()).toMatch(/calor/);
      expect(l.titular.toLowerCase()).not.toMatch(/hela/);
    }
  });

  it('el respaldo NO se inventa: sale literal del corpus regional del DR', () => {
    const l = lineaEnsoPorPiso({ fase: 'el_nino', pisoId: 'frio', region: 'andina' });
    expect(l.respaldo).toMatch(/IDEAM\/Cenicafé/);
    expect(l.respaldo).toMatch(/25\.000 t de papa/);
    expect(l.respaldo).toMatch(/MÁS heladas, no menos/);
  });

  it('bajo La Niña se invierte, y en frío avisa del hongo, no de la helada', () => {
    const l = lineaEnsoPorPiso({ fase: 'la_nina', pisoId: 'frio' });
    expect(l.familia).toBe('nina');
    expect(l.titular.toLowerCase()).toMatch(/lluvia|saturado/);
    expect(`${l.accion} ${l.mecanismo}`.toLowerCase()).toMatch(/gota|hongo|drenaje/);
  });

  it('en fase neutral NO se fuerza ruido: sin titular, con vigilancia de respaldo', () => {
    const l = lineaEnsoPorPiso({ fase: 'neutral', pisoId: 'frio' });
    expect(l.titular).toBe('');
    expect(l.respaldo).toMatch(/vigilancia de Niño/i);
  });
});

describe('🔴 la fase se lee VIVA, nunca de la constante', () => {
  it('`faseEnsoViva` sigue al servicio, no a `ENSO_WATCH_2026`', () => {
    setEnsoPhase('el_nino');
    expect(faseEnsoViva()).toBe('el_nino');
    setEnsoPhase('la_nina');
    expect(faseEnsoViva()).toBe('la_nina');
    clearEnsoPhase();
    expect(faseEnsoViva()).toBe('neutral');
  });

  it('el feed en vivo del sidecar manda cuando no hay override', () => {
    recordLiveEnsoStatus({ phase: 'el_nino' });
    expect(faseEnsoViva()).toBe('el_nino');
  });

  it('si el servicio revienta, cae a neutral — nunca a una fase inventada', async () => {
    vi.resetModules();
    vi.doMock('../../../services/ensoService.js', () => ({
      getEnsoPhase: () => {
        throw new Error('sidecar caído');
      },
    }));
    const mod = await import('../sierra/aterrizajeDescenso.js');
    expect(mod.faseEnsoViva()).toBe('neutral');
    vi.doUnmock('../../../services/ensoService.js');
    vi.resetModules();
  });
});

describe('🚪 PUERTA 2 — el compai del usuario sigue siendo el suyo', () => {
  it('leer NO escribe: el storage queda exactamente igual', () => {
    escribirCompanero('jaguar');
    const antes = JSON.stringify({ ...window.localStorage });
    // El descenso entero, banda por banda, en modo lectura.
    const suyo = companeroDelUsuario();
    for (const banda of Object.keys(ANFITRIONES)) anfitrionDeBanda(banda, suyo);
    const despues = JSON.stringify({ ...window.localStorage });
    expect(suyo).toBe('jaguar');
    expect(despues).toBe(antes);
    expect(window.localStorage.getItem(LLAVE_COMPANERO)).toBe('jaguar');
  });

  it('sin compañero guardado, el fallback es Angelita y NO se persiste', () => {
    expect(companeroDelUsuario()).toBe('angelita');
    expect(window.localStorage.getItem(LLAVE_COMPANERO)).toBeNull();
  });

  it('el módulo no puede escribir el compañero ni por accidente', () => {
    const aqui = dirname(fileURLToPath(import.meta.url));
    const fuente = readFileSync(resolve(aqui, '../sierra/aterrizajeDescenso.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '') // fuera los comentarios de bloque
      .replace(/\/\/[^\n]*/g, ''); //        fuera los de línea
    // Ni lo importa ni lo llama: la prohibición es estructural, no de disciplina.
    expect(fuente).not.toMatch(/escribirCompanero/);
    expect(fuente).not.toMatch(/setItem\s*\(/);
  });
});

describe('anfitriones por banda (§8.4, con las decisiones del operador)', () => {
  it('la banda 4 la hospeda `chivito-punk`, NO `angelita`', () => {
    expect(ANFITRIONES.frio).toBe('chivito-punk');
    const r = anfitrionDeBanda('frio', 'angelita');
    expect(r.anfitrion).toBe('chivito-punk');
    expect(r.rotulo).toContain('Chivito');
  });

  it('las bandas nival y superpáramo NO tienen anfitrión: ahí no vive nadie', () => {
    for (const banda of ['nival', 'superparamo']) {
      const r = anfitrionDeBanda(banda, 'angelita');
      expect(r.anfitrion).toBeNull();
      expect(r.hayRelevo).toBe(false);
      expect(r.companero).toBe('angelita'); // el suyo NO desaparece
    }
  });

  it('regla de colisión: nadie se presenta como visita ante su propio compai', () => {
    const r = anfitrionDeBanda('calido_seco', 'jaguar'); // el jaguar hospeda esa banda
    expect(r.anfitrion).toBeNull();
    expect(r.hayRelevo).toBe(false);
    expect(r.companero).toBe('jaguar');
  });

  it('todos los anfitriones existen en el elenco canónico', async () => {
    const { ELENCO } = await import('../../../compai/nucleo/elenco.js');
    for (const slug of Object.values(ANFITRIONES)) {
      if (slug) expect(Object.keys(ELENCO)).toContain(slug);
    }
  });

  it('cada banda con anfitrión entrega UNA idea causal, no una postal', () => {
    for (const banda of ['paramo', 'frio', 'templado', 'calido_seco']) {
      const r = anfitrionDeBanda(banda, 'angelita');
      expect(r.idea.length).toBeGreaterThan(20);
      expect(r.idea).toMatch(/[Pp]or eso|[Aa]quí|aprendió/);
    }
  });
});

describe('el aterrizaje no inventa nada', () => {
  it('con cota real frena ahí y nombra el piso', () => {
    const a = resolverAterrizaje({ msnmUsuario: 2640, fase: 'neutral' });
    expect(a.conUbicacion).toBe(true);
    expect(a.cota).toBe(2640);
    expect(a.pisoId).toBe('frio');
    expect(a.lineaCota).toMatch(/2\.640 m/);
    expect(a.lineaPiso.toLowerCase()).toContain('frío');
  });

  it('sin ubicación para en la banda templada y LO DICE', () => {
    const a = resolverAterrizaje({ msnmUsuario: null });
    expect(a.conUbicacion).toBe(false);
    expect(a.cota).toBe(1500);
    expect(a.lineaCota.toLowerCase()).toContain('ubicaci');
    expect(a.lineaClima).toBe(''); // NUNCA un clima inventado
    expect(a.lineaPiso).toBe('');
  });

  it('sin dato de clima no se describe un clima, aunque haya ubicación', () => {
    expect(resolverAterrizaje({ msnmUsuario: 2640, clima: null }).lineaClima).toBe('');
    expect(resolverAterrizaje({ msnmUsuario: 2640, clima: {} }).lineaClima).toBe('');
  });

  it('con dato real de clima sí lo dice, con su temperatura', () => {
    const a = resolverAterrizaje({
      msnmUsuario: 2640,
      clima: { descripcion: 'llovizna', temperatura: 14.2 },
    });
    expect(a.lineaClima).toBe('Hoy en su predio: llovizna, 14°.');
  });

  it('el aterrizaje de una finca a 2 200 m bajo El Niño avisa de HELADA', () => {
    // El caso del diseño: el consejo naif habría sido peligroso.
    const a = resolverAterrizaje({ msnmUsuario: 2200, fase: 'el_nino' });
    expect(a.pisoId).toBe('frio');
    expect(a.enso.titular.toLowerCase()).toMatch(/hela/);
  });
});
