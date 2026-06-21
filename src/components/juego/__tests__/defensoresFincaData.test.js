import { describe, expect, it } from 'vitest';
import {
  CULTIVOS,
  PARES_CONTROL,
  BENEFICO_CONTROLA,
  NIVEL_1,
  NIVEL_2,
  NIVEL_3,
  NIVEL_4,
  NIVELES,
  getNivel,
  nivelDesbloqueado,
  PROGRESO_KEY,
} from '../defensoresFincaData';

// ── CULTIVOS ────────────────────────────────────────────────────────

describe('CULTIVOS — shape y unicidad', () => {
  it('cada cultivo tiene id, nombre y emoji', () => {
    for (const c of CULTIVOS) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('nombre');
      expect(c).toHaveProperty('emoji');
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.nombre).toBe('string');
      expect(c.nombre.length).toBeGreaterThan(0);
      expect(typeof c.emoji).toBe('string');
      expect(c.emoji.length).toBeGreaterThan(0);
    }
  });

  it('todos los ids de cultivos son únicos', () => {
    const ids = CULTIVOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ningún cultivo tiene campos undefined', () => {
    for (const c of CULTIVOS) {
      expect(c.id).not.toBeUndefined();
      expect(c.nombre).not.toBeUndefined();
      expect(c.emoji).not.toBeUndefined();
    }
  });
});

// ── PARES_CONTROL ───────────────────────────────────────────────────

describe('PARES_CONTROL — shape, unicidad y relaciones', () => {
  it('cada par tiene id, plaga completa y benéfico completo', () => {
    const camposPlaga = ['id', 'nombre', 'cientifico', 'emoji', 'dano'];
    const camposBenefico = ['id', 'nombre', 'cientifico', 'emoji', 'como'];

    for (const par of PARES_CONTROL) {
      expect(par).toHaveProperty('id');
      expect(par).toHaveProperty('leccion');
      expect(typeof par.id).toBe('string');
      expect(par.id.length).toBeGreaterThan(0);

      for (const campo of camposPlaga) {
        expect(par.plaga).toHaveProperty(campo);
        expect(par.plaga[campo]).not.toBeUndefined();
      }
      for (const campo of camposBenefico) {
        expect(par.benefico).toHaveProperty(campo);
        expect(par.benefico[campo]).not.toBeUndefined();
      }
      // La lección no debe ser cadena vacía.
      expect(par.leccion.length).toBeGreaterThan(0);
    }
  });

  it('los ids de par, plaga y benéfico son únicos', () => {
    const parIds = PARES_CONTROL.map((p) => p.id);
    const plagaIds = PARES_CONTROL.map((p) => p.plaga.id);
    const beneficoIds = PARES_CONTROL.map((p) => p.benefico.id);

    expect(new Set(parIds).size).toBe(parIds.length);
    expect(new Set(plagaIds).size).toBe(plagaIds.length);
    expect(new Set(beneficoIds).size).toBe(beneficoIds.length);
  });

  it('BENEFICO_CONTROLA mapea cada benéfico a su plaga correcta', () => {
    expect(Object.keys(BENEFICO_CONTROLA)).toHaveLength(PARES_CONTROL.length);

    for (const par of PARES_CONTROL) {
      expect(BENEFICO_CONTROLA).toHaveProperty(par.benefico.id);
      expect(BENEFICO_CONTROLA[par.benefico.id]).toBe(par.plaga.id);
    }
  });

  it('BENEFICO_CONTROLA está congelado (immutable)', () => {
    expect(Object.isFrozen(BENEFICO_CONTROLA)).toBe(true);
  });
});

// ── NIVELES — forma y progresión ───────────────────────────────────

describe('NIVELES — campos obligatorios sin undefined', () => {
  const camposNivel = [
    'id', 'numero', 'nombre', 'subtitulo', 'energiaInicial',
    'energiaMax', 'metaCultivos', 'mundoAncho', 'paresIds',
    'escena', 'plataformas', 'huecos', 'jefe',
  ];
  const camposEscena = [
    'id', 'cieloTop', 'cieloBottom', 'montana',
    'sueloTop', 'sueloBottom', 'pasto', 'astro',
  ];

  for (const nivel of NIVELES) {
    it(`nivel ${nivel.numero} (${nivel.id}) tiene todos los campos definidos`, () => {
      for (const campo of camposNivel) {
        expect(nivel).toHaveProperty(campo);
        if (campo === 'jefe') continue; // puede ser null
        expect(nivel[campo]).not.toBeUndefined();
      }
      for (const campo of camposEscena) {
        expect(nivel.escena).toHaveProperty(campo);
        expect(nivel.escena[campo]).not.toBeUndefined();
        expect(typeof nivel.escena[campo]).toBe('string');
        expect(nivel.escena[campo].length).toBeGreaterThan(0);
      }
    });

    it(`nivel ${nivel.numero} tiene energía y cultivos positivos`, () => {
      expect(nivel.energiaInicial).toBeGreaterThan(0);
      expect(nivel.energiaMax).toBeGreaterThan(0);
      expect(nivel.energiaInicial).toBeLessThanOrEqual(nivel.energiaMax);
      expect(nivel.metaCultivos).toBeGreaterThan(0);
      expect(nivel.mundoAncho).toBeGreaterThan(0);
    });

    it(`nivel ${nivel.numero} tiene paresIds no vacíos`, () => {
      expect(nivel.paresIds.length).toBeGreaterThan(0);
    });

    it(`nivel ${nivel.numero} todos sus paresIds existen en PARES_CONTROL`, () => {
      const ids = new Set(PARES_CONTROL.map((p) => p.id));
      for (const pid of nivel.paresIds) {
        expect(ids.has(pid)).toBe(true);
      }
    });
  }

  it('NIVEL_1 no tiene jefe ni huecos ni plataformas', () => {
    expect(NIVEL_1.jefe).toBeNull();
    expect(NIVEL_1.huecos).toEqual([]);
    expect(NIVEL_1.plataformas).toEqual([]);
  });

  it('NIVEL_2 tiene jefe, huecos y plataformas', () => {
    expect(NIVEL_2.jefe).toBeTruthy();
    expect(NIVEL_2.huecos.length).toBeGreaterThan(0);
    expect(NIVEL_2.plataformas.length).toBeGreaterThan(0);
  });

  it('NIVEL_3 tiene jefe con vida mayor que el jefe del nivel 2', () => {
    expect(NIVEL_3.jefe).toBeTruthy();
    expect(NIVEL_2.jefe).toBeTruthy();
    expect(NIVEL_3.jefe.vida).toBeGreaterThan(NIVEL_2.jefe.vida);
  });

  it('NIVEL_4 tiene jefe con vida mayor que el jefe del nivel 3', () => {
    expect(NIVEL_4.jefe).toBeTruthy();
    expect(NIVEL_3.jefe).toBeTruthy();
    expect(NIVEL_4.jefe.vida).toBeGreaterThan(NIVEL_3.jefe.vida);
  });

  it('cada jefe referencia una plaga que existe en PARES_CONTROL', () => {
    for (const nivel of NIVELES) {
      if (!nivel.jefe) continue;
      const existe = PARES_CONTROL.some((p) => p.plaga.id === nivel.jefe.plagaId);
      expect(existe).toBe(true);
    }
  });
});

// ── Progresión entre niveles ───────────────────────────────────────

describe('progresión de niveles — coherencia de dificultad', () => {
  it('crece el mundo (mundoAncho) con cada nivel', () => {
    expect(NIVEL_2.mundoAncho).toBeGreaterThan(NIVEL_1.mundoAncho);
    expect(NIVEL_3.mundoAncho).toBeGreaterThan(NIVEL_2.mundoAncho);
    expect(NIVEL_4.mundoAncho).toBeGreaterThan(NIVEL_3.mundoAncho);
  });

  it('crece la meta de cultivos con cada nivel', () => {
    expect(NIVEL_2.metaCultivos).toBeGreaterThan(NIVEL_1.metaCultivos);
    expect(NIVEL_3.metaCultivos).toBeGreaterThan(NIVEL_2.metaCultivos);
    expect(NIVEL_4.metaCultivos).toBeGreaterThan(NIVEL_3.metaCultivos);
  });

  it('crece o se mantiene la energía con cada nivel', () => {
    expect(NIVEL_2.energiaInicial).toBeGreaterThanOrEqual(NIVEL_1.energiaInicial);
    expect(NIVEL_3.energiaInicial).toBeGreaterThanOrEqual(NIVEL_2.energiaInicial);
    expect(NIVEL_4.energiaInicial).toBeGreaterThanOrEqual(NIVEL_3.energiaInicial);
  });

  it('crece el número de pares plaga/benéfico con cada nivel', () => {
    expect(NIVEL_2.paresIds.length).toBeGreaterThan(NIVEL_1.paresIds.length);
    expect(NIVEL_3.paresIds.length).toBeGreaterThan(NIVEL_2.paresIds.length);
    expect(NIVEL_4.paresIds.length).toBeGreaterThan(NIVEL_3.paresIds.length);
  });

  it('cada nivel tiene una escena distinta (paleta)', () => {
    const escenas = NIVELES.map((n) => n.escena.id);
    expect(new Set(escenas).size).toBe(NIVELES.length);
  });

  it('las plataformas y los huecos aumentan con la dificultad', () => {
    expect(NIVEL_2.plataformas.length).toBeGreaterThan(NIVEL_1.plataformas.length);
    expect(NIVEL_3.plataformas.length).toBeGreaterThan(NIVEL_2.plataformas.length);
    expect(NIVEL_4.plataformas.length).toBeGreaterThan(NIVEL_3.plataformas.length);
    expect(NIVEL_2.huecos.length).toBeGreaterThan(NIVEL_1.huecos.length);
    expect(NIVEL_3.huecos.length).toBeGreaterThan(NIVEL_2.huecos.length);
    expect(NIVEL_4.huecos.length).toBeGreaterThan(NIVEL_3.huecos.length);
  });
});

// ── Funciones auxiliares ────────────────────────────────────────────

describe('getNivel y nivelDesbloqueado', () => {
  it('getNivel devuelve el nivel correcto por número', () => {
    expect(getNivel(1)).toBe(NIVEL_1);
    expect(getNivel(2)).toBe(NIVEL_2);
    expect(getNivel(3)).toBe(NIVEL_3);
    expect(getNivel(4)).toBe(NIVEL_4);
  });

  it('getNivel devuelve NIVEL_1 para números inexistentes', () => {
    expect(getNivel(0)).toBe(NIVEL_1);
    expect(getNivel(-1)).toBe(NIVEL_1);
    expect(getNivel(99)).toBe(NIVEL_1);
    expect(getNivel(undefined)).toBe(NIVEL_1);
  });

  it('nivelDesbloqueado: nivel 1 siempre está desbloqueado', () => {
    expect(nivelDesbloqueado(1, [])).toBe(true);
    expect(nivelDesbloqueado(0, [])).toBe(true);
    expect(nivelDesbloqueado(-5, [])).toBe(true);
  });

  it('nivelDesbloqueado exige el anterior superado', () => {
    expect(nivelDesbloqueado(2, [])).toBe(false);
    expect(nivelDesbloqueado(2, [1])).toBe(true);
    expect(nivelDesbloqueado(2, [2])).toBe(false);
    expect(nivelDesbloqueado(2, [1, 3])).toBe(true);
    expect(nivelDesbloqueado(3, [1])).toBe(false);
    expect(nivelDesbloqueado(3, [1, 2])).toBe(true);
    expect(nivelDesbloqueado(4, [1, 2])).toBe(false);
    expect(nivelDesbloqueado(4, [1, 2, 3])).toBe(true);
  });

  it('nivelDesbloqueado: superados por defecto es []', () => {
    expect(nivelDesbloqueado(4)).toBe(false);
  });
});

// ── PROGRESO_KEY ────────────────────────────────────────────────────

describe('PROGRESO_KEY', () => {
  it('es un string no vacío con namespace del juego', () => {
    expect(PROGRESO_KEY).toBe('chagra:defensores-finca:progreso');
  });
});
