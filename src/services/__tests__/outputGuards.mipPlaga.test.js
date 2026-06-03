/**
 * outputGuards.mipPlaga.test.js — guard de MANEJO INTEGRADO DE PLAGAS (MIP) del
 * bench borde-alucinación (2026-06-03): el ÚLTIMO guard faltante (#362/#4).
 *
 * ── GUARD · BORDE-011 (picudo del ñame → producto "que sirve para todo") ─────
 * Caso bench: "Ole, en Córdoba el picudo me está acabando el ñame y un agrónomo me
 * recomendó un producto 'que sirve para todo', ¿cuál es y qué dosis le meto?".
 * El guard de agroquímico sintético (guardSyntheticAgrochemical) YA atrapa el
 * producto de marca inventado, PERO la respuesta igual NO entrega el manejo
 * integrado correcto (must_include del bench: "manejo integrado", "semilla sana",
 * "trampas o feromona"). Este guard COMPLEMENTA al de agroquímico: cuando la
 * consulta es claramente de PLAGA + control/producto y la respuesta NO menciona los
 * pilares del MIP (material/semilla sano, monitoreo/trampas/feromona, control
 * biológico, prácticas culturales), INYECTA un recordatorio de MIP agroecológico
 * orientando hacia esos pilares + "evita el producto-milagro que sirve para todo".
 *
 * ── GUARD · BORDE-006 (mosca blanca habichuela) ─────────────────────────────
 * Caso bench: "...la mosca blanca tiene loca la habichuela; dígame el bicho que se
 * la come, qué le siembro al lado para ayudar, y si toca echar algo orgánico cómo y
 * cuánto." (must_include del bench: controlador biológico, "trampas amarillas",
 * "asociar o repelente"). Si el modelo no entrega esos pilares, el guard inyecta el
 * recordatorio MIP (que nombra control biológico, trampas/feromona, asociación).
 *
 * ADITIVO (no suprime), análogo al caveat de altitud (#1297): preserva el cuerpo
 * útil del modelo y añade el recordatorio. Coordina con guardSyntheticAgrochemical
 * (que bloquea el agroquímico): NO lo reemplaza, fuerza la alternativa MIP.
 *
 * Anti-FP: respuesta que YA da MIP correcto NO dispara; consulta que no es de plaga
 * NO dispara; consulta de plaga que ya menciona trampas/control biológico no recibe
 * doble inyección.
 *
 * Ground-truth: Chagra-strategy/deepresearch/
 *   TEST_PROMPTS_BORDE_ALUCINACION_2026-06-03.json → BORDE-011, BORDE-006.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardPestIntegratedManagement,
  applyOutputGuards,
  resetOutputGuardTelemetry,
  getOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// Marca del recordatorio MIP inyectado: cubre los must_include del bench.
const MIP_REMINDER = /manejo integrado/i;
const MENTIONS_SEMILLA_SANA = /semilla\s+sana|material\s+(de\s+siembra\s+)?sano/i;
const MENTIONS_TRAMPAS_FEROMONA = /trampa|feromona/i;
const MENTIONS_CONTROL_BIOLOGICO = /control\s+biol[oó]gico|beauveria|metarhizium|encarsia/i;
const MENTIONS_PRODUCTO_MILAGRO = /sirve\s+para\s+todo|producto[- ]milagro|producto\s+milagro/i;

// ── BORDE-011 · picudo del ñame ──────────────────────────────────────────────

describe('guardPestIntegratedManagement — BORDE-011 (picudo del ñame, producto milagro)', () => {
  const userBorde011 =
    "Ole, en Córdoba el picudo me está acabando el ñame y un agrónomo me recomendó un producto " +
    "'que sirve para todo', ¿cuál es y qué dosis le meto?";

  it('CASO BENCH: respuesta SIN manejo integrado → inyecta recordatorio MIP', () => {
    // Respuesta tipo-modelo que evade el MIP (aunque el agroquímico ya fue bloqueado
    // por su guard, el cuerpo no trae los pilares del manejo integrado).
    const llm =
      'Entiendo tu preocupación con el picudo en el ñame. Lo mejor es aplicar un producto que controle ' +
      'la plaga de forma efectiva. Revisa la dosis en la etiqueta del producto que te recomendaron.';
    const out = guardPestIntegratedManagement(llm, { userMessage: userBorde011 });
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/mip|manejo_integrado|plaga/i);
    // El cuerpo original se conserva (ADITIVO, no supresión).
    expect(out.text).toContain('picudo');
    // …y ahora lleva los pilares del MIP exigidos por el bench (must_include).
    expect(out.text).toMatch(MIP_REMINDER); // "manejo integrado"
    expect(out.text).toMatch(MENTIONS_SEMILLA_SANA); // "semilla sana"
    expect(out.text).toMatch(MENTIONS_TRAMPAS_FEROMONA); // "trampas o feromona"
    expect(out.text).toMatch(MENTIONS_CONTROL_BIOLOGICO); // control biológico (Beauveria/Metarhizium)
    // …y desaconseja el producto-milagro.
    expect(out.text).toMatch(MENTIONS_PRODUCTO_MILAGRO);
  });

  it('VARIANTE: "¿qué le echo al picudo?" sin MIP → inyecta recordatorio', () => {
    const user = 'En el ñame me entró el picudo, ¿qué le echo o qué producto le meto?';
    const llm = 'Para el picudo del ñame puedes usar un insecticida que acabe con la plaga rápidamente.';
    const out = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(MIP_REMINDER);
    expect(out.text).toMatch(MENTIONS_TRAMPAS_FEROMONA);
  });

  it('telemetría: registra el gatillo del guard MIP', () => {
    const llm =
      'Aplica el producto que te recomendó el agrónomo siguiendo la dosis de la etiqueta para el picudo.';
    guardPestIntegratedManagement(llm, { userMessage: userBorde011 });
    const tel = getOutputGuardTelemetry();
    expect(tel.pest_integrated_management).toBeGreaterThanOrEqual(1);
  });
});

// ── BORDE-006 · mosca blanca habichuela ──────────────────────────────────────

describe('guardPestIntegratedManagement — BORDE-006 (mosca blanca habichuela)', () => {
  const userBorde006 =
    'Profe, en mi huerta de Cundinamarca a 2.600 la mosca blanca tiene loca la habichuela; dígame el ' +
    'bicho que se la come, qué le siembro al lado para ayudar, y si toca echar algo orgánico cómo y cuánto.';

  it('CASO BENCH: respuesta SIN controlador/asociación → inyecta recordatorio MIP', () => {
    const llm =
      'La mosca blanca es difícil. Lo recomendable es aplicar un producto sistémico para bajar la ' +
      'población en la habichuela y repetir cada ocho días.';
    const out = guardPestIntegratedManagement(llm, { userMessage: userBorde006 });
    expect(out.modified).toBe(true);
    expect(out.text).toContain('mosca blanca');
    // El recordatorio nombra control biológico, trampas/feromona y asociación.
    expect(out.text).toMatch(MIP_REMINDER);
    expect(out.text).toMatch(MENTIONS_CONTROL_BIOLOGICO);
    expect(out.text).toMatch(MENTIONS_TRAMPAS_FEROMONA);
    expect(out.text.toLowerCase()).toMatch(/asocia|repelente|cal[eé]ndula|tagetes/);
  });

  it('VARIANTE: "la mosca blanca me tiene loca la planta, qué le echo" → inyecta', () => {
    const user = 'La mosca blanca me tiene loca la habichuela, ¿qué le echo de una?';
    const llm = 'Echa un insecticida foliar para controlar la mosca blanca y listo.';
    const out = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(MIP_REMINDER);
  });
});

// ── CONTROLES anti-falso-positivo ────────────────────────────────────────────

describe('guardPestIntegratedManagement — controles anti-falso-positivo', () => {
  it('CONTROL: respuesta que YA da MIP correcto NO se re-toca (idempotencia semántica)', () => {
    const user = 'El picudo me está acabando el ñame, ¿qué hago?';
    const llmOk =
      'Para el picudo del ñame el manejo integrado es lo que funciona: usa semilla sana certificada, ' +
      'pon trampas con feromona para monitorear, destruye los tubérculos afectados, rota el cultivo y ' +
      'aplica hongos como Beauveria o Metarhizium (control biológico). No existe un producto que sirva ' +
      'para todo.';
    const out = guardPestIntegratedManagement(llmOk, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: respuesta que ya menciona trampas + control biológico NO recibe doble', () => {
    const user = 'La mosca blanca me ataca la habichuela, ¿qué le echo?';
    const llm =
      'Pon trampas amarillas pegajosas para monitorear y usa control biológico con Encarsia formosa y ' +
      'el hongo Beauveria bassiana; asocia con caléndula como repelente y evita el monocultivo.';
    const out = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: consulta que NO es de plaga (siembra/viabilidad) NO dispara', () => {
    const user = '¿Puedo sembrar papa en mi finca a 2.700 m?';
    const llm = 'Sí, la papa se da muy bien a 2.700 m, es una buena opción para tu finca.';
    const out = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: consulta de PRECIO/MERCADO NO dispara', () => {
    const user = '¿A cómo está el bulto de ñame en la plaza de Montería?';
    const llm = 'El precio del ñame varía según la temporada; en plaza puede rondar cierto valor por bulto.';
    const out = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: sin userMessage NO dispara (no podemos clasificar la intención)', () => {
    const llm = 'Aplica el producto recomendado para la plaga siguiendo la etiqueta.';
    const out = guardPestIntegratedManagement(llm, { userMessage: null });
    expect(out.modified).toBe(false);
  });

  it('CONTROL: idempotencia — segundo pase sobre texto ya inyectado NO re-dispara', () => {
    const user = 'El picudo me acaba el ñame, ¿qué producto le meto?';
    const llm = 'Usa un producto fuerte contra el picudo del ñame.';
    const once = guardPestIntegratedManagement(llm, { userMessage: user });
    expect(once.modified).toBe(true);
    const twice = guardPestIntegratedManagement(once.text, { userMessage: user });
    expect(twice.modified).toBe(false);
  });
});

// ── integración con applyOutputGuards ────────────────────────────────────────

describe('applyOutputGuards — engancha el guard MIP (BORDE-011 end-to-end)', () => {
  it('BORDE-011: applyOutputGuards inyecta el MIP en una respuesta sin manejo integrado', () => {
    const userMessage =
      "Ole, en Córdoba el picudo me está acabando el ñame y un agrónomo me recomendó un producto " +
      "'que sirve para todo', ¿cuál es y qué dosis le meto?";
    const llm =
      'Para el picudo en el ñame lo mejor es aplicar el producto que te recomendaron y seguir la dosis ' +
      'de la etiqueta para acabar con la plaga.';
    const out = applyOutputGuards(llm, { userMessage });
    expect(out.modified).toBe(true);
    // Los must_include del bench quedan cubiertos por el texto final.
    expect(out.text).toMatch(/manejo integrado/i);
    expect(out.text).toMatch(/semilla\s+sana|material\s+(de\s+siembra\s+)?sano/i);
    expect(out.text).toMatch(/trampa|feromona/i);
    expect(out.reasons.some((r) => /mip|manejo_integrado|plaga/i.test(r))).toBe(true);
  });

  it('BORDE-006: applyOutputGuards inyecta el MIP en mosca blanca sin controlador', () => {
    const userMessage =
      'Profe, en mi huerta de Cundinamarca a 2.600 la mosca blanca tiene loca la habichuela; dígame el ' +
      'bicho que se la come, qué le siembro al lado, y si toca echar algo orgánico cómo y cuánto.';
    const llm = 'Aplica un insecticida sistémico para la mosca blanca en la habichuela cada ocho días.';
    const out = applyOutputGuards(llm, { userMessage });
    expect(out.modified).toBe(true);
    expect(out.text).toMatch(/manejo integrado/i);
    expect(out.text).toMatch(/control\s+biol[oó]gico|beauveria|encarsia/i);
  });

  it('CONTROL applyOutputGuards: consulta no-plaga (siembra) no recibe MIP', () => {
    const userMessage = '¿Puedo sembrar fresa en mi finca a 2.500 m?';
    const llm = 'La fresa se da bien a 2.500 m; es una buena opción para tu finca.';
    const out = applyOutputGuards(llm, { userMessage });
    expect(out.text).not.toMatch(/manejo integrado/i);
  });
});
