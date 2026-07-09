/**
 * semaforoConfianza.test.js — contrato del SEMÁFORO DE CONFIANZA por-respuesta
 * y de los helpers del PANEL DE PROCEDENCIA por-afirmación.
 *
 * Invariantes clave:
 *   1. El semáforo del sidecar (grounding_semaphore) es la BASE — el refine
 *      client-side por curaduría (validation_level) solo DEGRADA, nunca sube.
 *   2. VERDE exige curaduría verificada (expert_reviewed / OpenAlex / POWO /
 *      Agrosavia / published); claude_draft y disputed bajan a ámbar.
 *   3. Sin ninguna señal de grounding → null (mensajes viejos no pintan nada).
 *   4. Todo es total/defensivo: NaN, null, tipos raros no lanzan jamás.
 */
import { describe, it, expect } from 'vitest';
import {
  computeSemaforoTurno,
  nivelDeProvenance,
  describeFuente,
  nivelValidacionInfo,
  humanizarEntidad,
  confianzaPorcentaje,
  SEMAFORO_COPY,
  MOTIVO_COPY,
} from '../semaforoConfianza';

const item = (overrides = {}) => ({
  entity_id: 'coffea-arabica',
  confidence: 0.9,
  source: 'Agrosavia',
  validation_level: 'expert_reviewed',
  ...overrides,
});

describe('nivelDeProvenance — primer paso client-side por curaduría', () => {
  it('todo expert_reviewed → verde', () => {
    expect(nivelDeProvenance([item(), item({ entity_id: 'musa-paradisiaca' })]))
      .toEqual({ nivel: 'verde', motivo: 'verificado' });
  });

  it('cada nivel verificado del enum canónico cuenta como verde', () => {
    for (const vl of ['expert_reviewed', 'published', 'agrosavia_verified', 'powo_validated']) {
      expect(nivelDeProvenance([item({ validation_level: vl })]).nivel).toBe('verde');
    }
  });

  it('verificado_openalex (boolean de arista) cuenta como verde', () => {
    const res = nivelDeProvenance([item({ validation_level: null, verificado_openalex: true })]);
    expect(res.nivel).toBe('verde');
  });

  it('claude_draft → ámbar (borrador en revisión)', () => {
    expect(nivelDeProvenance([item({ validation_level: 'claude_draft' })]))
      .toEqual({ nivel: 'ambar', motivo: 'borrador_en_revision' });
  });

  it('cualquier item disputado manda a ámbar aunque el resto sea verde', () => {
    const res = nivelDeProvenance([
      item(),
      item({ entity_id: 'broca', disputed: true }),
    ]);
    expect(res).toEqual({ nivel: 'ambar', motivo: 'fuentes_en_disputa' });
  });

  it('mezcla verificado + borrador → ámbar (verificación parcial)', () => {
    const res = nivelDeProvenance([item(), item({ validation_level: 'claude_draft' })]);
    expect(res).toEqual({ nivel: 'ambar', motivo: 'verificacion_parcial' });
  });

  it('sin revisión pero con fuente trazable → ámbar (una sola fuente)', () => {
    const res = nivelDeProvenance([item({ validation_level: null, source: 'SIPSA-DANE 2025' })]);
    expect(res).toEqual({ nivel: 'ambar', motivo: 'una_sola_fuente' });
  });

  it('sin revisión ni fuente → rojo (sin verificar)', () => {
    const res = nivelDeProvenance([item({ validation_level: null, source: null })]);
    expect(res).toEqual({ nivel: 'rojo', motivo: 'sin_verificar' });
  });

  it('vacío / no-array / basura → rojo sin lanzar', () => {
    expect(nivelDeProvenance([]).nivel).toBe('rojo');
    expect(nivelDeProvenance(null).nivel).toBe('rojo');
    expect(nivelDeProvenance('x').nivel).toBe('rojo');
    expect(nivelDeProvenance([null, 42, 'y']).nivel).toBe('rojo');
  });
});

describe('computeSemaforoTurno — semáforo del turno completo', () => {
  it('sin ninguna señal de grounding → null (mensajes viejos, offline)', () => {
    expect(computeSemaforoTurno({})).toBeNull();
    expect(computeSemaforoTurno(null)).toBeNull();
    expect(computeSemaforoTurno({ grounded: true, tool_used: 'get_species' })).toBeNull();
  });

  it('sidecar verde + procedencia verificada → verde (origen sidecar)', () => {
    const res = computeSemaforoTurno({
      grounding_semaphore: 'verde',
      grounding_policy: 'answer',
      grounding_provenance: [item()],
    });
    expect(res.nivel).toBe('verde');
    expect(res.origen).toBe('sidecar');
    expect(res.motivo).toBe('verificado');
  });

  it('sidecar verde + procedencia claude_draft → DEGRADA a ámbar (peor-de-los-dos)', () => {
    const res = computeSemaforoTurno({
      grounding_semaphore: 'verde',
      grounding_policy: 'answer',
      grounding_provenance: [item({ validation_level: 'claude_draft' })],
    });
    expect(res.nivel).toBe('ambar');
    expect(res.motivo).toBe('borrador_en_revision');
    expect(res.origen).toBe('sidecar+cliente');
  });

  it('sidecar rojo + procedencia verificada → NUNCA sube: sigue rojo', () => {
    const res = computeSemaforoTurno({
      grounding_semaphore: 'rojo',
      grounding_policy: 'abstain',
      grounding_provenance: [item()],
    });
    expect(res.nivel).toBe('rojo');
  });

  it('sin semáforo del sidecar, deriva de la policy (hedge → ámbar)', () => {
    const res = computeSemaforoTurno({ grounding_policy: 'hedge' });
    expect(res.nivel).toBe('ambar');
  });

  it('sin sidecar: computa client-side puro desde la procedencia', () => {
    const res = computeSemaforoTurno({ grounding_provenance: [item()] });
    expect(res.nivel).toBe('verde');
    expect(res.origen).toBe('cliente');
  });

  it('semáforo basura del sidecar se ignora y cae al cómputo cliente', () => {
    const res = computeSemaforoTurno({
      grounding_semaphore: 'morado',
      grounding_provenance: [item({ validation_level: 'claude_draft' })],
    });
    expect(res.nivel).toBe('ambar');
  });

  it('expone provenance y reason para el panel', () => {
    const res = computeSemaforoTurno({
      grounding_semaphore: 'rojo',
      grounding_policy: 'abstain',
      grounding_reason: 'sin anclaje en el grafo → no inventar',
      grounding_provenance: [],
    });
    expect(res.provenance).toEqual([]);
    expect(res.reason).toContain('no inventar');
  });

  it('todo nivel tiene copy cálido definido (verde/ámbar/rojo)', () => {
    for (const nivel of ['verde', 'ambar', 'rojo']) {
      expect(SEMAFORO_COPY[nivel].label.length).toBeGreaterThan(0);
      expect(SEMAFORO_COPY[nivel].explica.length).toBeGreaterThan(0);
    }
    // El rojo se lee como honestidad, no como error del sistema.
    expect(SEMAFORO_COPY.rojo.label).toMatch(/de frente/i);
  });

  it('todo motivo emitible tiene copy en MOTIVO_COPY', () => {
    const emitibles = [
      'verificado', 'verificacion_parcial', 'borrador_en_revision',
      'fuentes_en_disputa', 'una_sola_fuente', 'respaldo_parcial',
      'sin_respaldo', 'sin_verificar',
    ];
    for (const m of emitibles) {
      expect(typeof MOTIVO_COPY[m]).toBe('string');
      expect(MOTIVO_COPY[m].length).toBeGreaterThan(0);
    }
  });
});

describe('describeFuente — chips de fuente del panel', () => {
  it('vacío/null → Catálogo Chagra sin link', () => {
    expect(describeFuente(null)).toEqual({ label: 'Catálogo Chagra (grafo)', url: null });
    expect(describeFuente('  ')).toEqual({ label: 'Catálogo Chagra (grafo)', url: null });
  });

  it('DOI crudo → link a doi.org', () => {
    const res = describeFuente('10.1016/j.cropro.2020.105123');
    expect(res.url).toBe('https://doi.org/10.1016/j.cropro.2020.105123');
    expect(res.label).toContain('DOI');
  });

  it('URL con DOI embebido también resuelve a doi.org', () => {
    const res = describeFuente('https://doi.org/10.5555/abc123');
    expect(res.url).toBe('https://doi.org/10.5555/abc123');
  });

  it('URL institucional → label del hostname + link', () => {
    const res = describeFuente('https://repository.agrosavia.co/handle/20.500.12324/999');
    expect(res.label).toBe('Agrosavia');
    expect(res.url).toMatch(/^https:\/\/repository\.agrosavia\.co/);
  });

  it('texto libre institucional matchea el mapa (SIPSA/DANE, OpenAlex)', () => {
    expect(describeFuente('SIPSA-DANE boletín 2025').label).toBe('SIPSA · DANE');
    expect(describeFuente('verificado openalex W12345').label).toBe('Verificado OpenAlex');
  });

  it('texto libre desconocido se muestra tal cual, sin link', () => {
    expect(describeFuente('Cartilla campesina 1998')).toEqual({
      label: 'Cartilla campesina 1998',
      url: null,
    });
  });
});

describe('nivelValidacionInfo / humanizarEntidad / confianzaPorcentaje', () => {
  it('mapea el enum canónico a etiquetas humanas con nivel', () => {
    expect(nivelValidacionInfo('expert_reviewed')).toEqual({ label: 'Revisado por experto', nivel: 'verde' });
    expect(nivelValidacionInfo('claude_draft').nivel).toBe('ambar');
    expect(nivelValidacionInfo('disputed').label).toMatch(/desacuerdo/i);
    expect(nivelValidacionInfo(null)).toEqual({ label: 'Aún sin revisión', nivel: 'ambar' });
  });

  it('humaniza slugs del grafo', () => {
    expect(humanizarEntidad('coffea-arabica')).toBe('Coffea arabica');
    expect(humanizarEntidad('tomate_de_arbol')).toBe('Tomate de arbol');
    expect(humanizarEntidad('')).toBe('Dato del turno');
    expect(humanizarEntidad(undefined)).toBe('Dato del turno');
  });

  it('confianza a porcentaje con clamp defensivo', () => {
    expect(confianzaPorcentaje(0.87)).toBe(87);
    expect(confianzaPorcentaje(1.7)).toBe(100);
    expect(confianzaPorcentaje(-2)).toBe(0);
    expect(confianzaPorcentaje(NaN)).toBeNull();
    expect(confianzaPorcentaje('x')).toBeNull();
    expect(confianzaPorcentaje(null)).toBeNull();
  });
});
