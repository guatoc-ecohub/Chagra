/**
 * climaBoletines.test.js — guard mecánico anti-alucinación de la integración
 * clima MTA + ENSO mes a mes (feat/clima-mta-ventana-siembra-enso).
 *
 * Contrato dominio-clima (CERO invención): lo coyuntural (ventana de siembra
 * vigente, probabilidades ENSO exactas) es grounded_pendiente o foto FECHADA que
 * remite a la fuente; lo durable (forma del calendario, régimen bimodal, quién
 * emite el boletín) va citado. Los enlaces apuntan a secciones EN VIVO, no a
 * snapshots. Este test bloquea que alguien meta un número inventado sin fecha ni
 * fuente, o rompa la deflección honesta de la ventana de siembra.
 *
 * Grounding: Chagra-strategy/ops/deepresearch/2026-08-23-MTA-andina-ventana-
 * siembra.md y 2026-08-23-enso-mes-a-mes-2026-2027.md.
 */
import { describe, it, expect } from 'vitest';
import {
  FUENTES_VIVAS,
  ENSO_CALENDARIO_2026_27,
  ENSO_TRANSICION,
  MTA_VENTANA_SIEMBRA,
  BOLETINES_IDEAM,
  ESTADO_GROUNDED_PENDIENTE,
  faseCalendarioActual,
} from '../climaBoletines.js';

const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

describe('FUENTES_VIVAS — enlaces a secciones en vivo', () => {
  it('cada fuente (menos actualizado) es una URL http(s) válida', () => {
    for (const [k, v] of Object.entries(FUENTES_VIVAS)) {
      if (k === 'actualizado') continue;
      expect(isHttp(v), `${k} debe ser URL http(s)`).toBe(true);
    }
  });

  it('trae las fuentes clave: IDEAM, MTA (MADR), Agronet, NOAA, CIIFEN', () => {
    expect(FUENTES_VIVAS.ideam_bsa_semanal).toMatch(/ideam\.gov\.co/i);
    expect(FUENTES_VIVAS.mta_region_andina).toMatch(/minagricultura\.gov\.co/i);
    expect(FUENTES_VIVAS.agronet_agroclima).toMatch(/agronet\.gov\.co/i);
    expect(FUENTES_VIVAS.noaa_enso_disc).toMatch(/noaa\.gov/i);
    expect(FUENTES_VIVAS.ciifen).toMatch(/ciifen/i);
  });
});

describe('ENSO_CALENDARIO_2026_27 — timeline mes a mes', () => {
  it('cubre las 4 fases del ciclo en orden', () => {
    expect(ENSO_CALENDARIO_2026_27.map((p) => p.id)).toEqual([
      'fortalecimiento', 'pico', 'persistencia', 'transicion',
    ]);
  });

  it('cada fila tiene narrativa durable + acción por cultivo del piso frío', () => {
    for (const p of ENSO_CALENDARIO_2026_27) {
      expect(typeof p.periodo).toBe('string');
      expect(p.periodo.length).toBeGreaterThan(0);
      expect(p.narrativa.length).toBeGreaterThan(20);
      expect(p.accionCultivo.length).toBeGreaterThan(20);
      expect(['nino', 'nina', 'neutral']).toContain(p.fase);
    }
  });

  it('la probabilidad es foto FECHADA con fuente, o null (grounded_pendiente): nunca un número suelto', () => {
    for (const p of ENSO_CALENDARIO_2026_27) {
      if (p.probFoto === null) continue; // grounded_pendiente
      expect(p.probFoto).toHaveProperty('texto');
      expect(p.probFoto.boletinFecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.probFoto.fuente).toMatch(/NOAA|IDEAM|CIIFEN|IRI/i);
    }
  });

  it('el pico cita El Niño muy fuerte y la transición NO inventa cifra (grounded_pendiente)', () => {
    const pico = ENSO_CALENDARIO_2026_27.find((p) => p.id === 'pico');
    expect(pico.probFoto.texto).toMatch(/muy fuerte|hist[oó]rico/i);
    const trans = ENSO_CALENDARIO_2026_27.find((p) => p.id === 'transicion');
    expect(trans.fase).toBe('neutral');
    expect(trans.probFoto).toBeNull();
  });
});

describe('ENSO_TRANSICION — cuándo se alivia', () => {
  it('pico a fin de 2026, alivio y transición a Neutral en 2027, sin La Niña confirmada', () => {
    expect(ENSO_TRANSICION.pico).toMatch(/2026/);
    expect(ENSO_TRANSICION.aliviaDesde).toMatch(/2027/);
    expect(ENSO_TRANSICION.transicionNeutral).toMatch(/2027/);
    expect(ENSO_TRANSICION.laNinaConfirmada).toBe(false);
    expect(ENSO_TRANSICION.fuente).toMatch(/NOAA|IDEAM|CIIFEN/i);
  });
});

describe('MTA_VENTANA_SIEMBRA — deflección honesta (patrón SIPSA)', () => {
  it('la ventana vigente es grounded_pendiente y NO trae valor inventado', () => {
    expect(MTA_VENTANA_SIEMBRA.ventanaVigente.estado).toBe(ESTADO_GROUNDED_PENDIENTE);
    expect(MTA_VENTANA_SIEMBRA.ventanaVigente.valor).toBeNull();
  });

  it('cita el emisor institucional real y enlaza al boletín en vivo', () => {
    expect(MTA_VENTANA_SIEMBRA.emisor).toMatch(/MADR/i);
    expect(MTA_VENTANA_SIEMBRA.emisor).toMatch(/IDEAM/i);
    expect(MTA_VENTANA_SIEMBRA.emisor).toMatch(/UPRA/i);
    expect(isHttp(MTA_VENTANA_SIEMBRA.urlVivo)).toBe(true);
  });

  it('lista productos oficiales existentes, cada uno con enlace en vivo', () => {
    expect(MTA_VENTANA_SIEMBRA.productos.length).toBeGreaterThan(0);
    for (const prod of MTA_VENTANA_SIEMBRA.productos) {
      expect(prod.nombre.length).toBeGreaterThan(0);
      expect(isHttp(prod.url)).toBe(true);
    }
  });
});

describe('BOLETINES_IDEAM — enlaces afinados a la sección vigente', () => {
  it('ya no apuntan al portal genérico: son secciones de ideam.gov.co', () => {
    for (const b of BOLETINES_IDEAM) {
      expect(isHttp(b.url)).toBe(true);
      expect(b.url).toMatch(/ideam\.gov\.co\/web\//i);
    }
  });
});

describe('faseCalendarioActual — período vigente por fecha (determinístico)', () => {
  // Constructor local (año, mesIndex0, día) — evita el desfase UTC de los
  // strings ISO date-only y refleja el `new Date()` local que usa producción.
  it('ubica cada mes en su fase', () => {
    expect(faseCalendarioActual(new Date(2026, 7, 15))).toBe('fortalecimiento');
    expect(faseCalendarioActual(new Date(2026, 10, 20))).toBe('pico');
    expect(faseCalendarioActual(new Date(2027, 1, 10))).toBe('persistencia');
    expect(faseCalendarioActual(new Date(2027, 4, 1))).toBe('transicion');
  });

  it('devuelve null fuera del rango cubierto', () => {
    expect(faseCalendarioActual(new Date(2026, 6, 1))).toBeNull();
    expect(faseCalendarioActual(new Date(2027, 6, 1))).toBeNull();
    expect(faseCalendarioActual(new Date(2028, 0, 1))).toBeNull();
  });
});
