/**
 * exampleQuestions.entrypoint.test.jsx — TEST PERMANENTE del PUNTO DE ACCESO #1.
 *
 * Las PREGUNTAS-EJEMPLO (chips/sugerencias que el usuario solo clickea) son la
 * primera interacción del campesino con el agente. Si un chip de ejemplo
 * produce respuesta vacía, burbuja de error o alucinación, perdemos al usuario
 * en el primer toque. Política del operador: "esto debe probarse cada vez que
 * valga la pena" → este test corre en CADA PR (job vitest, sin GPU).
 *
 * ── DOS CAPAS ─────────────────────────────────────────────────────────────
 *  (a) FUENTE ÚNICA ⇄ UI : los chips se definen en src/data/exampleQuestions.js
 *      (consumido por QuickChipsBar, SuggestedActions y AgentHero) y este test
 *      importa el MISMO módulo. La lista no puede divergir entre UI y test. El
 *      test verifica además que el componente PINTA cada pregunta canónica.
 *
 *  (b) WIRING DEL CLICK : QuickChipsBar y SuggestedActions disparan onSelect con
 *      el texto EXACTO del chip (lo que AgentScreen pasa a handleSubmit).
 *
 *  (c) PIPELINE DE SALIDA : para CADA pregunta-ejemplo corremos una respuesta
 *      representativa del modelo por la MISMA cadena de post-proceso que
 *      AgentScreen aplica en producción (AgentScreen.jsx ~L1565-1625):
 *          stripRoleLeak → applyVoseoFilter → applyOutputGuards
 *      y asertamos que la respuesta renderizada:
 *        · NO está vacía,
 *        · NO es la burbuja de error/fallback ("No recibí respuesta…",
 *          "No pude conectarme…"),
 *        · NO contiene patrones prohibidos (voseo argentino, "Corrección
 *          importante" duplicada, fuga de rol "Usuario:"/"Asistente:").
 *      El sidecar/LLM va MOCKEADO (texto fijo) — cero GPU, cero red.
 *
 * El smoke contra el agente REAL (chromium del nix-store) vive aparte y
 * marcado @real (tests/e2e-real/example-questions-real.smoke.mjs): se corre a
 * mano, NO en cada CI, porque es GPU-pesado.
 *
 * Convenciones: Vitest + @testing-library/react, patrón tests/unit/setup.js.
 */
import { describe, it, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import QuickChipsBar from '../../src/components/QuickChipsBar.jsx';
import SuggestedActions from '../../src/components/AgentScreen/SuggestedActions.jsx';

import { applyVoseoFilter, stripRoleLeak } from '../../src/services/agentService.js';
import { applyOutputGuards } from '../../src/services/outputGuards.js';
import { filterVoseo } from '../../src/services/voseoFilter.js';

// FUENTE ÚNICA: tanto los componentes de UI como este test importan estos
// arrays del mismo módulo de datos, así que la lista de chips NO puede divergir
// entre la pantalla y el test (no hay "registro paralelo" que mantener).
import {
  ALL_EXAMPLE_QUESTIONS,
  QUICK_CHIPS_BAR_QUESTIONS,
  SUGGESTED_ACTIONS_QUESTIONS,
  AGENT_HERO_QUESTIONS,
} from '../../src/data/exampleQuestions.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * runProductionTail — replica EXACTA de la cadena de post-proceso que
 * AgentScreen.jsx corre sobre la respuesta cruda del LLM antes de pintarla
 * (stripRoleLeak → applyVoseoFilter(usted) → applyOutputGuards). Sin grounding
 * (resolvedEntities=null) corre tal cual el peor caso "RAG-only / sidecar caído",
 * que es justamente cuando un chip degrada. Devuelve el texto final renderizado.
 */
function runProductionTail(rawResponse, opts = {}) {
  const deLeaked = stripRoleLeak(rawResponse);
  const voseoSafe = applyVoseoFilter(deLeaked, { formality: 'usted', region: null });
  const guarded = applyOutputGuards(voseoSafe, {
    resolvedEntities: opts.resolvedEntities ?? null,
    fincaAltitud: opts.fincaAltitud ?? null,
    hadVision: false,
    visionConfidence: null,
    profileName: opts.profileName ?? null,
    forecastTempMin: null,
    forecastTempMax: null,
    userMessage: opts.userMessage ?? null,
  });
  return guarded.text;
}

/** Burbuja de error / fallback que el usuario NUNCA debe ver como "respuesta". */
const ERROR_BUBBLE_PATTERNS = [
  /No recibí respuesta del asistente/i, // ChatBubble fallback vacío (#339)
  /No pude conectarme al asistente/i, // setError() de handleSubmit
  /Error al transcribir/i,
  /^\s*undefined\s*$/i,
  /^\s*null\s*$/i,
];

/** Marcadores de fuga de rol que stripRoleLeak debe haber cortado. */
const ROLE_LEAK_PATTERNS = [
  /^\s*Usuario:\s/m,
  /^\s*Asistente:\s/m,
  /<\|im_start\|>/,
  /<\|user\|>/,
];

/**
 * assertHealthyAnswer — el corazón del test: una respuesta de chip es SANA si
 * no está vacía, no es burbuja de error y no tiene patrones prohibidos. Falla
 * RUIDOSAMENTE (mensaje con la pregunta y el snippet) si algo de eso ocurre.
 */
function assertHealthyAnswer(question, finalText) {
  const snippet = (finalText || '').slice(0, 200);

  // 1) NO vacía.
  expect(
    typeof finalText === 'string' && finalText.trim().length > 0,
    `CHIP "${question}" → respuesta VACÍA tras el pipeline (regresión crítica del punto de acceso #1). snippet="${snippet}"`,
  ).toBe(true);

  // 2) NO burbuja de error / fallback.
  for (const re of ERROR_BUBBLE_PATTERNS) {
    expect(
      re.test(finalText),
      `CHIP "${question}" → renderizó burbuja de ERROR/fallback (${re}). snippet="${snippet}"`,
    ).toBe(false);
  }

  // 3) NO fuga de rol.
  for (const re of ROLE_LEAK_PATTERNS) {
    expect(
      re.test(finalText),
      `CHIP "${question}" → fuga de rol no truncada (${re}). snippet="${snippet}"`,
    ).toBe(false);
  }

  // 4) NO voseo argentino residual (re-aplica el filtro: si cambia algo, había voseo).
  const reFiltered = filterVoseo(finalText, { formality: 'usted', region: null });
  expect(
    reFiltered,
    `CHIP "${question}" → quedó voseo argentino tras el filtro. snippet="${snippet}"`,
  ).toBe(finalText);

  // 5) "Corrección importante" no debe aparecer DUPLICADA (cascada de guards).
  const correcciones = (finalText.match(/Corrección importante/gi) || []).length;
  expect(
    correcciones <= 1,
    `CHIP "${question}" → "Corrección importante" duplicada x${correcciones} (cascada de guards). snippet="${snippet}"`,
  ).toBe(true);
}

// ── Respuestas representativas del modelo por pregunta-ejemplo ───────────────
// Texto fijo curado (NO inferencia real): simula lo que el agente devolvería
// para cada chip. Redactado en español colombiano (tú/usted), grounded y sano.
// El propósito NO es validar el contenido del modelo, sino que la cadena de
// post-proceso del AgentScreen no convierta una respuesta sana en vacía/error.
const MODEL_ANSWERS = Object.freeze({
  '¿Qué siembro este mes?':
    'En tu zona, este mes va bien sembrar frijol, maíz y hortalizas de hoja como acelga y lechuga. ' +
    'Si me dices tu municipio y altitud te afino la lista.',
  'Tengo plaga en mis plantas':
    'Para ayudarte necesito un par de datos: ¿qué planta es y qué daño ves (hojas comidas, manchas, ' +
    'insectos visibles)? Con eso te recomiendo un control agroecológico concreto.',
  'Receta de biopreparado para tomate':
    'Un biopreparado útil para tomate es el caldo de ceniza: 1 kg de ceniza cernida en 10 L de agua, ' +
    'reposar 24 horas, colar y aplicar foliar cada 8 días. Ayuda contra hongos y aporta potasio.',
  'Cuándo planto tomates?':
    'El tomate se siembra en almácigo y se trasplanta a los 25-30 días. En clima medio se puede sembrar ' +
    'casi todo el año evitando los picos de lluvia. ¿En qué municipio estás?',
  'Mi planta tiene manchas amarillas':
    'Las manchas amarillas pueden venir de varias cosas: falta de nutrientes, exceso o falta de riego, o ' +
    'un hongo. ¿Qué planta es y me puedes enviar una foto de la hoja? ¿La mancha está por encima o por debajo?',
  'Registra que regué las lechugas':
    'Listo, registro un riego para tus lechugas con la fecha de hoy. ¿Quieres anotar cuánta agua aplicaste ' +
    'o alguna observación?',
  'Consejos para el invernadero':
    'Para el invernadero cuida tres cosas: ventilación diaria para bajar humedad, riego por la mañana, y ' +
    'monitoreo de plagas en el envés de las hojas. ¿Qué cultivo tienes adentro?',
  '¿Qué puedo sembrar este mes en mi zona?':
    'Depende de tu altitud y clima. En tierra fría van bien papa, arveja y cebolla; en tierra media, frijol, ' +
    'maíz y tomate. Dime tu municipio y te concreto.',
  '¿Cómo controlo plagas sin químicos?':
    'Hay varias opciones agroecológicas: trampas cromáticas, extractos de ají y ajo, caldo de ceniza, y ' +
    'plantas repelentes como la caléndula. ¿Qué plaga y qué cultivo tienes?',
  'Dame el reporte del clima de mi zona.':
    'Para darte el clima de tu zona necesito tu municipio. Con eso consulto el pronóstico del IDEAM y te ' +
    'digo lluvia y temperatura de los próximos días.',
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPA (a): los chips REALES (renderizados) muestran la pregunta canónica.
// Las constantes vienen de la fuente única src/data/exampleQuestions.js, que
// los propios componentes consumen — así que esto verifica que el componente
// efectivamente PINTA cada pregunta (no que solo importe el array).
// ─────────────────────────────────────────────────────────────────────────────
describe('Preguntas-ejemplo — los chips renderizan la pregunta canónica', () => {
  test('QuickChipsBar pinta las 3 preguntas rápidas', () => {
    render(<QuickChipsBar onSelect={() => {}} />);
    for (const q of QUICK_CHIPS_BAR_QUESTIONS) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  test('SuggestedActions pinta las 4 sugerencias', () => {
    render(<SuggestedActions onSelect={() => {}} />);
    for (const q of SUGGESTED_ACTIONS_QUESTIONS) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  test('toda pregunta-ejemplo tiene una respuesta-modelo curada en el fixture', () => {
    const sinCobertura = ALL_EXAMPLE_QUESTIONS.filter((q) => !(q in MODEL_ANSWERS));
    expect(
      sinCobertura,
      `Estos chips no tienen respuesta-modelo curada (agregala a MODEL_ANSWERS): ${JSON.stringify(sinCobertura)}`,
    ).toEqual([]);
  });

  test('ninguna pregunta-ejemplo tiene voseo argentino', () => {
    for (const q of ALL_EXAMPLE_QUESTIONS) {
      const filtrada = filterVoseo(q, { formality: 'usted', region: null });
      expect(filtrada, `La pregunta-ejemplo "${q}" contiene voseo argentino`).toBe(q);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPA (b): el click del chip dispara el turno con el texto EXACTO.
// ─────────────────────────────────────────────────────────────────────────────
describe('Preguntas-ejemplo — el click del chip dispara el turno (wiring)', () => {
  test('QuickChipsBar: cada chip llama onSelect con su texto exacto', () => {
    const onSelect = vi.fn();
    render(<QuickChipsBar onSelect={onSelect} />);
    for (const q of QUICK_CHIPS_BAR_QUESTIONS) {
      fireEvent.click(screen.getByText(q));
    }
    expect(onSelect).toHaveBeenCalledTimes(QUICK_CHIPS_BAR_QUESTIONS.length);
    for (const q of QUICK_CHIPS_BAR_QUESTIONS) {
      expect(onSelect).toHaveBeenCalledWith(q);
    }
  });

  test('SuggestedActions: cada chip llama onSelect con su texto exacto', () => {
    const onSelect = vi.fn();
    render(<SuggestedActions onSelect={onSelect} />);
    for (const q of SUGGESTED_ACTIONS_QUESTIONS) {
      fireEvent.click(screen.getByText(q));
    }
    expect(onSelect).toHaveBeenCalledTimes(SUGGESTED_ACTIONS_QUESTIONS.length);
    for (const q of SUGGESTED_ACTIONS_QUESTIONS) {
      expect(onSelect).toHaveBeenCalledWith(q);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPA (c): la respuesta de CADA pregunta-ejemplo sobrevive sana al pipeline.
// ─────────────────────────────────────────────────────────────────────────────
describe('Preguntas-ejemplo — la respuesta sobrevive sana al pipeline de salida', () => {
  it.each(ALL_EXAMPLE_QUESTIONS)('chip "%s" → respuesta no vacía / no error / sin patrones prohibidos', (question) => {
    const raw = MODEL_ANSWERS[question];
    expect(typeof raw === 'string' && raw.length > 0, `falta MODEL_ANSWERS["${question}"]`).toBe(true);
    const finalText = runProductionTail(raw, { userMessage: question });
    assertHealthyAnswer(question, finalText);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAPA (c-bis): respuestas MALAS del modelo para los chips. Aquí simulamos lo
// que un modelo real DEVUELVE mal en producción (los bugs recurrentes del
// stack) y verificamos que la cadena de guards las SANEA — y, sobre todo, que
// NUNCA convierte la respuesta del chip en una burbuja vacía. Si un guard
// borrara la respuesta entera, el chip del punto de acceso #1 quedaría en
// blanco: eso es exactamente lo que este bloque previene.
// ─────────────────────────────────────────────────────────────────────────────
describe('Preguntas-ejemplo — guards sanean respuestas MALAS sin blanquear el chip', () => {
  test('voseo argentino en la respuesta del chip "Tengo plaga" → se normaliza a usted, no vacío', () => {
    const malo =
      'Vos tenés que revisar el envés de las hojas. Si querés, te ayudo a identificar la plaga.';
    const finalText = runProductionTail(malo, { userMessage: 'Tengo plaga en mis plantas' });
    assertHealthyAnswer('Tengo plaga en mis plantas', finalText);
    // El filtro normaliza los marcadores fuertes (pronombre + morfología voseo).
    expect(finalText).not.toMatch(/\bvos\b/i);
    expect(finalText).not.toMatch(/tenés|querés/i);
    // NOTA (hallazgo): el filtro NO cubre el imperativo enclítico voseante
    // ("mandame", "contame", "fijate"). Ver voseoFilter.js — gap conocido, no
    // bloquea este test (lo dejamos documentado para un fix futuro del filtro).
  });

  test('fuga de rol en respuesta del chip "Cuándo planto tomates" → se trunca, no vacío', () => {
    const malo =
      'El tomate se trasplanta a los 25-30 días.\nUsuario: gracias, y el maíz?\nAsistente: el maíz...';
    const finalText = runProductionTail(malo, { userMessage: 'Cuándo planto tomates?' });
    assertHealthyAnswer('Cuándo planto tomates?', finalText);
    expect(finalText).toContain('El tomate se trasplanta');
  });

  test('binomio inventado de plaga (chiza) en respuesta del chip de plagas → respuesta sigue no vacía', () => {
    // El guard de nombres inventados / taxonomía no debe vaciar la respuesta;
    // como mínimo, el pipeline la deja renderizable y sin error.
    const malo =
      'La chiza (Neolepidopteron daquila) se controla con hongos entomopatógenos. Aplica Beauveria al suelo.';
    const finalText = runProductionTail(malo, { userMessage: '¿Cómo controlo plagas sin químicos?' });
    assertHealthyAnswer('¿Cómo controlo plagas sin químicos?', finalText);
  });

  test('preámbulo de inventario fuera de lugar en chip de siembra → respuesta sigue sana', () => {
    const malo =
      'Usted tiene 21 fresas y 4 caléndulas. En tu zona puedes sembrar frijol, maíz y hortalizas de hoja este mes.';
    const finalText = runProductionTail(malo, { userMessage: '¿Qué siembro este mes?' });
    assertHealthyAnswer('¿Qué siembro este mes?', finalText);
    expect(finalText).toMatch(/sembrar/i);
  });

  test('viabilidad invertida con grounding "inviable" → corrige UNA vez, no duplica, no vacío', () => {
    // Caso #1240/#1237: el guard REEMPLAZA texto. Verificamos que corrige
    // (una sola "Corrección importante") y deja respuesta renderizable.
    const entities = [
      {
        kind: 'species',
        nombre_comun: 'curuba',
        viabilidad: 'inviable',
        altitud_min: 1800,
        altitud_max: 2600,
        alternativas_viables: ['lulo', 'mora'],
      },
    ];
    const malo = 'La curuba es excelente para tu finca, puedes sembrarla este invierno sin problema.';
    const finalText = runProductionTail(malo, {
      userMessage: '¿Qué puedo sembrar este mes en mi zona?',
      resolvedEntities: entities,
      fincaAltitud: 300,
    });
    assertHealthyAnswer('¿Qué puedo sembrar este mes en mi zona?', finalText);
    expect(finalText).toMatch(/Corrección importante/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// META: el test DEBE fallar ruidosamente ante respuesta vacía/error. Probamos
// que assertHealthyAnswer detecta los tres modos de fallo — si esta protección
// se rompiera, el test entero dejaría de proteger el punto de acceso #1.
// ─────────────────────────────────────────────────────────────────────────────
describe('Preguntas-ejemplo — el detector de fallos funciona (auto-test)', () => {
  test('detecta respuesta VACÍA', () => {
    expect(() => assertHealthyAnswer('Q', runProductionTail('', { userMessage: 'Q' }))).toThrow();
  });

  test('detecta burbuja de ERROR', () => {
    expect(() =>
      assertHealthyAnswer('Q', runProductionTail('No pude conectarme al asistente. Intenta de nuevo.', { userMessage: 'Q' })),
    ).toThrow();
  });

  test('detecta fuga de rol Usuario:/Asistente: (post stripRoleLeak)', () => {
    // stripRoleLeak corta el rol al inicio de línea; pero si una versión futura
    // dejara pasar el marcador, assertHealthyAnswer lo atrapa. Forzamos el caso
    // saltándonos stripRoleLeak para validar el detector.
    const leaked = 'Respuesta real.\nAsistente: turno falso inventado por el modelo.';
    expect(() => assertHealthyAnswer('Q', leaked)).toThrow();
  });
});
