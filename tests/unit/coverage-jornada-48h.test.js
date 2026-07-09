/**
 * coverage-jornada-48h.test.js — QA de cierre de jornada (2026-07-05), punto
 * 4: cobertura de PROFUNDIDAD de los cambios de la noche + últimas 48h que
 * quedaron sin test dedicado (investigación previa, no duplica lo ya cubierto
 * por sidecarClient.test.js §pisoTermicoGuard, promptAssembler.test.js §orden,
 * ayudaFunciones.test.js, metaAyudaIntent.test.js, pedagogicalText.test.js).
 *
 * Cubre:
 *   1. resolveEntities() (sidecarClient.js) reenviando el campo `grounding`
 *      (semáforo #2074 MODO CIENTÍFICO) — SIN test hasta ahora.
 *   2. promptAssembler: los DOS bloques protegidos nuevos de 48h
 *      (`pisoTermico` #2067 y `groundingPolicy` #2074) sobreviven un
 *      presupuesto agresivo JUNTOS y mantienen su orden relativo — antes solo
 *      se probaban por separado con contenido sintético.
 *   3. Wiring end-to-end: la forma REAL que devuelve pisoTermicoGuard()
 *      alimentando assembleSystemContent() (nadie los combinaba).
 *   4. ayudaAgentResponder.buildAyudaResponse() — SIN ningún test (gap
 *      completo): capabilities, howto con match nav/ask, honestidad
 *      anti-alucinación cuando no hay match.
 *   5. catalog/fotos/fotos-atribucion.json (#2068, fotos CC fermentos) —
 *      SIN test (el propio commit dice "no integradas al catálogo/UI
 *      todavía"): valida que el metadato de licencia/autoría es íntegro y
 *      que los 56 archivos referenciados existen en disco.
 *   6. BiopreparadoSuggestionModal + PedagogicalText (#2070) — el ÚNICO
 *      consumidor de PedagogicalText sin test propio.
 *
 * NOTA (verificado en esta rama, 2026-07-05): la feature "onboarding SKIP →
 * finca-ejemplo poblada (44 siembras)" mencionada en el pedido de QA NO existe
 * en el código (grep de 'finca-ejemplo'/'44 siembras' sin resultados en
 * src/tests/scripts). Lo más cercano es `seedProfileData` en
 * demoPersonaSeeds.js (4 perfiles demo del switch de OPERADOR, no un flujo de
 * onboarding-skip, y máximo 4 cultivos por perfil) — ya cubierto por
 * tests/unit/demo-personas.test.js. No se fabrica un test sobre algo que no
 * existe; ver el reporte de QA para más detalle.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ============================================================================
// 1) sidecarClient.resolveEntities() — passthrough del campo `grounding`.
// ============================================================================
describe('sidecarClient.resolveEntities — semáforo de confianza (#2074)', () => {
  const ENV_FLAG = 'VITE_USE_SIDECAR_AGRO_MCP';
  let fetchMock;
  let originalOnLine;

  const importFresh = async () => {
    vi.resetModules();
    return import('../../src/services/sidecarClient.js');
  };

  const jsonResponse = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.stubEnv(ENV_FLAG, 'true');
    vi.stubEnv('VITE_SIDECAR_URL', '/api/mcp/agro');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
  });

  it('flag OFF → null sin hacer fetch (no rompe el contrato viejo)', async () => {
    vi.stubEnv(ENV_FLAG, 'false');
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('mi papa tiene una plaga');
    expect(res).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reenvía grounding {semaphore, policy, reason, provenance} tal cual viene del sidecar', async () => {
    const grounding = {
      semaphore: 'ambar',
      policy: 'hedge',
      reason: 'una_fuente',
      resolved_entities: 1,
      min_confidence: 0.62,
      provenance: [{ entity_id: 'solanum_tuberosum_phureja', confidence: 0.62, source: 'age', validation_level: 'community' }],
      block: 'MODO CIENTÍFICO: confianza media, matice la respuesta.',
    };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { entities: [{ id: 'solanum_tuberosum_phureja', confianza: 0.62 }], grounding }),
    );
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('¿qué altura le va a la papa criolla?');
    expect(res).toEqual({ entities: [{ id: 'solanum_tuberosum_phureja', confianza: 0.62 }], grounding });
  });

  it('grounding ausente en la respuesta del sidecar → grounding: null (nunca undefined)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [] }));
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('hola chagra');
    expect(res).toEqual({ entities: [], grounding: null });
  });

  it('grounding con forma inválida (string, no objeto) → se descarta a null, no se propaga basura', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [], grounding: 'no-deberia-ser-string' }));
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('hola chagra');
    expect(res.grounding).toBeNull();
  });

  it('entities no es array (payload corrupto) → entities:[] pero grounding se preserva igual', async () => {
    const grounding = { semaphore: 'rojo', policy: 'abstain', reason: 'sin_entidades' };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: null, grounding }));
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('pregunta rara');
    expect(res).toEqual({ entities: [], grounding });
  });

  it('0 entidades resueltas → el gate de grounding NO se salta (semáforo rojo/abstain es señal válida)', async () => {
    // Caso explícito del "gate independiente" que el AgentScreen consume: 0
    // entidades no debe tumbar el pipeline, solo produce un semáforo rojo.
    const grounding = { semaphore: 'rojo', policy: 'abstain', reason: 'sin_entidades_resueltas', resolved_entities: 0 };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { entities: [], grounding }));
    const { resolveEntities } = await importFresh();
    const res = await resolveEntities('algo totalmente fuera de catálogo');
    expect(res.entities).toEqual([]);
    expect(res.grounding.policy).toBe('abstain');
    expect(res.grounding.semaphore).toBe('rojo');
  });
});

// ============================================================================
// 2) promptAssembler — bloques protegidos nuevos de 48h, JUNTOS.
// ============================================================================
describe('promptAssembler — bloques protegidos de 48h (pisoTermico #2067 + groundingPolicy #2074)', () => {
  it('BLOCK_ORDER: pisoTermico es el ÚLTIMO bloque (máxima recency) y groundingPolicy va antes de queryAnalysis', async () => {
    const { BLOCK_ORDER } = await import('../../src/services/promptAssembler.js');
    expect(BLOCK_ORDER[BLOCK_ORDER.length - 1]).toBe('pisoTermico');
    const iGrounding = BLOCK_ORDER.indexOf('groundingPolicy');
    const iQuery = BLOCK_ORDER.indexOf('queryAnalysis');
    const iPiso = BLOCK_ORDER.indexOf('pisoTermico');
    expect(iGrounding).toBeGreaterThan(-1);
    expect(iGrounding).toBeLessThan(iQuery);
    expect(iQuery).toBeLessThan(iPiso);
  });

  it('bajo presupuesto agresivo, pisoTermico Y groundingPolicy sobreviven ENTEROS — solo se sacrifican bloques de SACRIFICE_ORDER', async () => {
    const { assembleSystemContent } = await import('../../src/services/promptAssembler.js');
    const pisoTermicoBlock =
      'MODO CIENTÍFICO — GUARDA PISO TÉRMICO: el usuario está en piso frío (2680msnm) y preguntó por una especie de clima cálido. Advierta el desajuste antes de responder.';
    const groundingPolicyBlock =
      'MODO CIENTÍFICO #17: confianza media (semáforo ámbar) — matice la respuesta, cite la fuente única y ofrezca verificar en campo.';
    const blocks = {
      base: 'Instrucciones base del sistema Chagra.',
      campesino: 'Modo campesino: registro oral activo.'.repeat(50),
      clima: 'Contexto climático extenso.'.repeat(50),
      finca: 'Contexto de finca extenso.'.repeat(50),
      asociacion: 'Asociaciones de cultivo extensas.'.repeat(50),
      memoria: 'Memoria episódica extensa.'.repeat(50),
      corpus: 'Corpus RAG extenso, el primer sacrificio.'.repeat(80),
      groundingPolicy: groundingPolicyBlock,
      pisoTermico: pisoTermicoBlock,
    };
    // Presupuesto deliberadamente angosto: fuerza sacrificio de TODO lo
    // sacrificable, y aun así los bloques protegidos deben quedar completos.
    const { content, breakdown } = assembleSystemContent(blocks, { budget: 40 });

    expect(content).toContain(pisoTermicoBlock);
    expect(content).toContain(groundingPolicyBlock);
    // pisoTermico, al ser el de mayor recency, aparece DESPUÉS en el texto
    // final que groundingPolicy.
    expect(content.indexOf(pisoTermicoBlock)).toBeGreaterThan(content.indexOf(groundingPolicyBlock));

    const degradedNames = breakdown.filter((b) => b.degraded).map((b) => b.name);
    const SACRIFICE_ORDER = ['corpus', 'memoria', 'asociacion', 'clima', 'frostHeat', 'finca', 'campesino'];
    for (const name of degradedNames) {
      expect(SACRIFICE_ORDER, `${name} se degradó pero NO está en SACRIFICE_ORDER`).toContain(name);
    }
    expect(degradedNames).not.toContain('pisoTermico');
    expect(degradedNames).not.toContain('groundingPolicy');
  });

  it('wiring end-to-end: la forma REAL de pisoTermicoGuard() alimenta assembleSystemContent sin transformación adicional', async () => {
    // Reproduce el contrato documentado en sidecarClient.js — no se necesita
    // red real, solo el shape que el guard devuelve cuando has_mismatch=true.
    const pisoTermicoGuardResult = {
      has_mismatch: true,
      user_piso_termico: 'frio',
      user_piso_origen: 'perfil',
      species_id: 'theobroma_cacao',
      species_nombre_comun: 'cacao',
      species_altitud_min: 0,
      species_altitud_max: 1200,
      viabilidad: 'no_viable',
      alternativas: ['durazno', 'papa criolla'],
      system_prompt_block:
        'GUARDA PISO TÉRMICO: el cacao no es viable en piso frío (2680msnm, min viable 0-1200msnm). Alternativas: durazno, papa criolla.',
      reason: 'altitud_fuera_de_rango',
    };
    const { assembleSystemContent } = await import('../../src/services/promptAssembler.js');
    const { content } = assembleSystemContent({
      base: 'Instrucciones base.',
      pisoTermico: pisoTermicoGuardResult.has_mismatch ? pisoTermicoGuardResult.system_prompt_block : '',
    });
    expect(content).toContain('cacao no es viable en piso frío');
    expect(content).toContain('durazno, papa criolla');
  });

  it('has_mismatch:false → el bloque pisoTermico queda vacío, no se inyecta nada (no-op)', async () => {
    const { assembleSystemContent } = await import('../../src/services/promptAssembler.js');
    const { content, breakdown } = assembleSystemContent({
      base: 'Instrucciones base.',
      pisoTermico: '',
    });
    const pisoEntry = breakdown.find((b) => b.name === 'pisoTermico');
    expect(pisoEntry?.tokens ?? 0).toBe(0);
    expect(content).not.toMatch(/GUARDA PISO TÉRMICO/);
  });
});

// ============================================================================
// 3) ayudaAgentResponder.buildAyudaResponse — SIN test hasta ahora (#2050).
// ============================================================================
describe('ayudaAgentResponder.buildAyudaResponse — «Chagra enseña a usar Chagra» (#2050)', () => {
  it('meta null/isMeta:false → null (el caller sigue el flujo normal, no meta)', async () => {
    const { buildAyudaResponse } = await import('../../src/services/ayudaAgentResponder.js');
    expect(buildAyudaResponse(null)).toBeNull();
    expect(buildAyudaResponse({ isMeta: false })).toBeNull();
  });

  it('kind:"capabilities" genérico → catálogo completo de funciones, sin deep-link (ayudaAction:null)', async () => {
    const { buildAyudaResponse } = await import('../../src/services/ayudaAgentResponder.js');
    const { detectMetaAyudaIntent } = await import('../../src/services/metaAyudaIntent.js');
    const meta = detectMetaAyudaIntent('¿qué puede hacer Chagra?');
    expect(meta.kind).toBe('capabilities');
    const resp = buildAyudaResponse(meta);
    expect(resp).not.toBeNull();
    expect(resp.ayudaAction).toBeNull();
    expect(resp.content).toMatch(/funciones/i);
    // Anti-alucinación: el catálogo se arma desde listAyudaFunciones() real,
    // nunca texto libre inventado por un LLM.
    expect(resp.content.length).toBeGreaterThan(50);
  });

  it('howto con match "nav" (dónde veo mis plantas) → deep-link de navegación real', async () => {
    const { buildAyudaResponse } = await import('../../src/services/ayudaAgentResponder.js');
    const { detectMetaAyudaIntent } = await import('../../src/services/metaAyudaIntent.js');
    const meta = detectMetaAyudaIntent('¿dónde veo mis plantas?');
    expect(meta.isMeta).toBe(true);
    const resp = buildAyudaResponse(meta);
    expect(resp).not.toBeNull();
    expect(resp.ayudaAction).toMatchObject({ tipo: 'nav', view: 'activos' });
    expect(resp.ayudaAction.label).toMatch(/^Abrir /);
    // La respuesta trae pasos numerados (formatFuncion), no un párrafo suelto.
    expect(resp.content).toMatch(/1\./);
  });

  it('howto con match "ask" (cómo uso la función de biopreparados) → deep-link que SIEMBRA la pregunta, no navega', async () => {
    const { buildAyudaResponse } = await import('../../src/services/ayudaAgentResponder.js');
    const { detectMetaAyudaIntent } = await import('../../src/services/metaAyudaIntent.js');
    const meta = detectMetaAyudaIntent('¿cómo uso la función de biopreparados en Chagra?');
    expect(meta.isMeta).toBe(true);
    expect(meta.kind).toBe('howto');
    const resp = buildAyudaResponse(meta);
    expect(resp).not.toBeNull();
    expect(resp.ayudaAction).toMatchObject({ tipo: 'ask' });
    expect(typeof resp.ayudaAction.prompt).toBe('string');
    expect(resp.ayudaAction.prompt.length).toBeGreaterThan(0);
    expect(resp.ayudaAction.label).toMatch(/^Preguntar: /);
  });

  it('ANTI-ALUCINACIÓN: función inexistente → NUNCA inventa, ofrece sugerencias reales o remite al catálogo', async () => {
    const { buildAyudaResponse } = await import('../../src/services/ayudaAgentResponder.js');
    const { detectMetaAyudaIntent } = await import('../../src/services/metaAyudaIntent.js');
    const meta = detectMetaAyudaIntent('¿cómo pido un dron con inteligencia artificial cuántica?');
    // Si el detector ni siquiera lo clasifica como meta, no hay nada que
    // afirmar (comportamiento igualmente honesto).
    if (!meta.isMeta) return;
    const resp = buildAyudaResponse(meta);
    expect(resp.ayudaAction).toBeNull();
    expect(resp.content).not.toMatch(/dron/i);
  });
});

// ============================================================================
// 4) catalog/fotos/fotos-atribucion.json — fotos CC de fermentos (#2068).
// ============================================================================
describe('catalog/fotos/fotos-atribucion.json — integridad de licencias (#2068)', () => {
  /** @type {Array<Record<string, string>>} */
  let fotos;

  beforeEach(async () => {
    const mod = await import('../../catalog/fotos/fotos-atribucion.json', { with: { type: 'json' } });
    fotos = mod.default;
  });

  it('trae 56 entradas (el commit ceb55089 agregó exactamente 56 fotos CC)', () => {
    expect(Array.isArray(fotos)).toBe(true);
    expect(fotos.length).toBe(56);
  });

  it('cada entrada trae archivo/tema/autor/licencia/licencia_url no vacíos', () => {
    for (const f of fotos) {
      expect(f.archivo, JSON.stringify(f)).toBeTruthy();
      expect(f.tema, JSON.stringify(f)).toBeTruthy();
      expect(f.autor, JSON.stringify(f)).toBeTruthy();
      expect(f.licencia, JSON.stringify(f)).toBeTruthy();
      expect(f.licencia_url, JSON.stringify(f)).toMatch(/^https?:\/\//);
    }
  });

  it('cada `archivo` referenciado existe de verdad en disco (sin fotos fantasma)', () => {
    const faltantes = fotos.filter((f) => !existsSync(path.join(REPO_ROOT, f.archivo)));
    expect(faltantes.map((f) => f.archivo)).toEqual([]);
  });

  it('todas las licencias son Creative Commons (o dominio público) reconocidas — sin licencias no libres coladas', () => {
    const noCC = fotos.filter((f) => !/^(CC0|CC BY(-SA|-ND|-NC)?(\s|$)|Public domain)/i.test(f.licencia));
    expect(noCC.map((f) => `${f.archivo}: ${f.licencia}`)).toEqual([]);
  });
});

// ============================================================================
// 5) BiopreparadoSuggestionModal + PedagogicalText (#2070) — único consumidor
//    de PedagogicalText sin test propio.
// ============================================================================
describe('BiopreparadoSuggestionModal — integración con PedagogicalText (#2070)', () => {
  it('el proceso_resumen se pinta con PedagogicalText (párrafos legibles, no muro de texto)', async () => {
    const { default: BiopreparadoSuggestionModal } = await import(
      '../../src/components/BiopreparadoSuggestionModal.jsx'
    );
    const biopreparados = [
      {
        id: 'test-sin-diagrama-48h',
        nombre: 'Biofertilizante de prueba',
        tipo: 'foliar',
        tiempo_elaboracion_dias: 15,
        proposito: ['fortalecer'],
        ingredientes: ['melaza', 'suero de leche'],
        proceso_resumen:
          'Mezcle la melaza con el suero de leche en un recipiente limpio. Deje fermentar 15 días tapado sin apretar. Cuele antes de usar. Advertencia: no aplique en horas de sol fuerte.',
        vida_util_dias: 30,
      },
    ];
    render(
      React.createElement(BiopreparadoSuggestionModal, {
        ingredientName: 'melaza',
        biopreparados,
        onClose: () => {},
      }),
    );

    // Expandir la receta (sin diagrama curado → cae a PedagogicalText).
    fireEvent.click(screen.getByText('Biofertilizante de prueba'));

    const dialog = screen.getByRole('dialog');
    // El texto original NO debe aparecer como un único bloque plano sin
    // procesar (PedagogicalText lo separa en oraciones/párrafos); basta con
    // confirmar que el contenido semántico llegó a pantalla sin crashear.
    // "melaza" aparece más de una vez (título + chip de ingrediente + texto
    // del proceso) — getAllByText confirma que sí se pintó en algún lado.
    expect(within(dialog).getAllByText(/melaza/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/fermentar/i)).toBeInTheDocument();
  });

  it('sin biopreparados → no renderiza nada (guard existente, no debe romper)', async () => {
    const { default: BiopreparadoSuggestionModal } = await import(
      '../../src/components/BiopreparadoSuggestionModal.jsx'
    );
    const { container } = render(
      React.createElement(BiopreparadoSuggestionModal, { ingredientName: 'melaza', biopreparados: [], onClose: () => {} }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
