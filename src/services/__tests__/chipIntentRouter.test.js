import { describe, it, expect } from 'vitest';
import {
  CHIP_INTENTS,
  CHIP_DEFS,
  planForcedIntent,
  isStubIntent,
  isDeepResearchIntent,
} from '../chipIntentRouter.js';

/**
 * Tests del router de CHIPS DE MODO (A3/A4). Decisión operador 2026-06-02:
 * los chips fuerzan la intención y rutean DIRECTO a la capacidad
 * determinística, SALTANDO el NLU planner (que es el que misroutea, ej.
 * el bug "papa precio"). Este módulo es PURO y testeable sin red ni montar
 * el componente.
 *
 * Contrato:
 *   planForcedIntent(intent, text, opts) → {
 *     intent, tool, args, stub, stubMessage, prompt, skipNlu: true,
 *   } | null  (null si intent desconocido o text vacío)
 */

describe('chipIntentRouter — enum y definiciones', () => {
  it('expone los 17 intents del enum (incluye restauración, silvopastoreo, páramo, incendio, grounding oscuro)', () => {
    expect(CHIP_INTENTS).toEqual({
      siembro: 'siembro',
      plaga: 'plaga',
      biopreparado: 'biopreparado',
      clima: 'clima',
      precio: 'precio',
      calendario: 'calendario',
      deep: 'deep',
      restauracion: 'restauracion',
      silvopastoreo: 'silvopastoreo',
      paramo: 'paramo',
      incendio: 'incendio',
      // Grounding oscuro (2026-07-01): consultas puntuales del grafo, ahora
      // discutibles vía el grupo "Más" del ChipsToolbar.
      toxicidad: 'toxicidad',
      saberes_tradicionales: 'saberes_tradicionales',
      alerta_paramo: 'alerta_paramo',
      variedades: 'variedades',
      polinizacion: 'polinizacion',
      fenologia: 'fenologia',
    });
  });

  it('CHIP_DEFS tiene los 17 chips con label en español colombiano (sin voseo)', () => {
    const ids = CHIP_DEFS.map((c) => c.intent);
    expect(ids).toEqual([
      'siembro',
      'plaga',
      'biopreparado',
      'clima',
      'precio',
      'calendario',
      'deep',
      'restauracion',
      'silvopastoreo',
      'paramo',
      'incendio',
      'toxicidad',
      'saberes_tradicionales',
      'alerta_paramo',
      'variedades',
      'polinizacion',
      'fenologia',
    ]);
    // Labels presentes y emoji declarado
    for (const def of CHIP_DEFS) {
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.emoji).toBe('string');
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(typeof def.placeholder).toBe('string');
    }
  });

  it('ningún string del chip usa voseo argentino', () => {
    // tú/usted colombiano — NUNCA escribí/tomá/tienes/quieres/elegí/dale/aquí.
    const VOSEO = /\b(escrib[íi]|tom[áa]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|dale|sab[ée]s|and[áa]|fij[áa]te)\b/i;
    for (const def of CHIP_DEFS) {
      expect(def.label).not.toMatch(VOSEO);
      expect(def.placeholder).not.toMatch(VOSEO);
      if (def.stubMessage) expect(def.stubMessage).not.toMatch(VOSEO);
    }
  });
});

describe('chipIntentRouter — entradas inválidas', () => {
  it('retorna null para intent desconocido', () => {
    expect(planForcedIntent('xxx', 'hola')).toBeNull();
    expect(planForcedIntent(null, 'hola')).toBeNull();
    expect(planForcedIntent(undefined, 'hola')).toBeNull();
  });

  it('retorna null para texto vacío', () => {
    expect(planForcedIntent('siembro', '')).toBeNull();
    expect(planForcedIntent('siembro', '   ')).toBeNull();
    expect(planForcedIntent('siembro', null)).toBeNull();
  });

  it('retorna null para opts null/undefined explícito', () => {
    // opts default es {} pero si se pasa null/undefined debe sobrevivir
    expect(planForcedIntent('siembro', 'hola', null)).not.toBeNull();
    expect(planForcedIntent('siembro', 'hola', undefined)).not.toBeNull();
  });

  it('retorna stub no_municipio para opts.municipio vacío/null en clima', () => {
    const emptyMunicipio = planForcedIntent('clima', '¿lloverá?', { municipio: '' });
    expect(emptyMunicipio.stub).toBe(true);
    expect(emptyMunicipio.stubResult.reason).toBe('no_municipio');

    const nullMunicipio = planForcedIntent('clima', '¿lloverá?', { municipio: null });
    expect(nullMunicipio.stub).toBe(true);
    expect(nullMunicipio.stubResult.reason).toBe('no_municipio');
  });

  it('retorna plan normal para texto con solo caracteres especiales', () => {
    const emoji = planForcedIntent('siembro', '🌱🌿');
    expect(emoji).not.toBeNull();
    expect(emoji.tool).toBe('get_species');
    expect(emoji.args).toEqual({ query: '🌱🌿' });
    expect(emoji.prompt).toBe('🌱🌿');
  });
});

describe('chipIntentRouter — intents con tool determinístico (saltan NLU)', () => {
  it('siembro → get_species con query del texto + skipNlu', () => {
    const plan = planForcedIntent('siembro', '¿qué tal el aguacate?');
    expect(plan.intent).toBe('siembro');
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: '¿qué tal el aguacate?' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('plaga → get_pest_controllers con pest_id_or_name del texto + skipNlu', () => {
    // El tool del sidecar EXIGE `pest_id_or_name` (NO `pest`): antes el chip
    // mandaba `{pest}` → `missing_pest` y el chip insignia no groundeaba
    // (fix grounding P0 2026-06-24).
    const plan = planForcedIntent('plaga', 'broca del café');
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest_id_or_name: 'broca del café' });
    expect(plan.args).not.toHaveProperty('pest');
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('biopreparado → get_biopreparados con query del texto + skipNlu', () => {
    const plan = planForcedIntent('biopreparado', 'algo para hongos en tomate');
    expect(plan.tool).toBe('get_biopreparados');
    expect(plan.args).toEqual({ query: 'algo para hongos en tomate' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima → get_clima_ideam (action monthly_avg) con municipio del opts + skipNlu', () => {
    const plan = planForcedIntent('clima', '¿va a llover?', { municipio: 'Choachí' });
    expect(plan.tool).toBe('get_clima_ideam');
    expect(plan.args.action).toBe('monthly_avg');
    expect(plan.args.municipio).toBe('Choachí');
    expect(plan.args.metric).toBe('precipitation');
    // desde debe ser fecha ISO YYYY-MM-DD de hace ~30 días
    expect(plan.args.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('clima con opts.municipio trimmeado funciona (espacios alrededor se limpian)', () => {
    const plan = planForcedIntent('clima', 'lluvias?', { municipio: '  Choachí  ' });
    expect(plan.args.municipio).toBe('Choachí');
    expect(plan.stub).toBe(false);
  });

  it('clima sin municipio → evidence stub no_municipio (pide municipio, NO inventa)', () => {
    const plan = planForcedIntent('clima', '¿va a llover?');
    expect(plan.tool).toBe('get_clima_ideam');
    // sin municipio NO se llama el tool: evidence sintética que pide municipio
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_municipio' });
    expect(plan.skipNlu).toBe(true);
  });

  it('calendario → get_calendario_siembra con piso_termico del perfil + skipNlu', () => {
    // El tool get_calendario_siembra SÍ está vivo en el sidecar (fix grounding
    // P0 2026-06-24); antes routeaba a get_species por un comentario stale.
    // EXIGE `piso_termico` (enum frio|templado|calido), que se aporta desde el
    // perfil/finca (opts.pisoTermico) o se deriva de la altitud.
    const plan = planForcedIntent('calendario', '¿qué siembro este mes?', { pisoTermico: 'frío' });
    expect(plan.tool).toBe('get_calendario_siembra');
    expect(plan.args.piso_termico).toBe('frio'); // normalizado sin tilde
    expect(plan.args).not.toHaveProperty('mes'); // sin mes en el texto → tool usa el actual
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('calendario deriva el piso_termico de la altitud cuando no hay pisoTermico explícito', () => {
    expect(planForcedIntent('calendario', 'qué siembro', { altitud: 2580 }).args.piso_termico).toBe('frio');
    expect(planForcedIntent('calendario', 'qué siembro', { altitud: 1500 }).args.piso_termico).toBe('templado');
    expect(planForcedIntent('calendario', 'qué siembro', { altitud: 500 }).args.piso_termico).toBe('calido');
  });

  it('calendario mapea piso páramo → frio (el tool no soporta paramo en su enum)', () => {
    const plan = planForcedIntent('calendario', 'qué siembro', { pisoTermico: 'páramo' });
    expect(plan.args.piso_termico).toBe('frio');
  });

  it('calendario infiere el mes del texto cuando el usuario lo nombra (1..12)', () => {
    expect(planForcedIntent('calendario', '¿qué siembro en septiembre?', { pisoTermico: 'templado' }).args.mes).toBe(9);
    expect(planForcedIntent('calendario', 'qué sembrar en enero', { pisoTermico: 'calido' }).args.mes).toBe(1);
    expect(planForcedIntent('calendario', 'siembra de diciembre', { pisoTermico: 'frio' }).args.mes).toBe(12);
  });

  it('calendario SIN piso ni altitud → stub no_piso_termico (pide el dato, NO inventa fechas)', () => {
    const plan = planForcedIntent('calendario', '¿qué siembro este mes?');
    expect(plan.tool).toBe('get_calendario_siembra');
    expect(plan.stub).toBe(true);
    expect(plan.args).toBeNull();
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_piso_termico' });
    expect(plan.skipNlu).toBe(true);
  });
});

describe('chipIntentRouter — chips de diseño (capacidades antes dark)', () => {
  it('restauración → get_diseno_restauracion objetivo=bosque por defecto + altitud del perfil', () => {
    const plan = planForcedIntent('restauracion', 'quiero recuperar este lote', { altitud: 2600 });
    expect(plan.tool).toBe('get_diseno_restauracion');
    expect(plan.args.objetivo).toBe('bosque');
    expect(plan.args.altitud_msnm).toBe(2600);
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('restauración infiere objetivo del texto (ribera / quemado / cortafuegos / páramo)', () => {
    expect(planForcedIntent('restauracion', 'la orilla de la quebrada').args.objetivo).toBe('ribera');
    expect(planForcedIntent('restauracion', 'un sitio que se quemó').args.objetivo).toBe('post_incendio');
    expect(planForcedIntent('restauracion', 'quiero un cortafuego vivo').args.objetivo).toBe('cortafuegos');
    expect(planForcedIntent('restauracion', 'restaurar el páramo').args.objetivo).toBe('paramo');
  });

  it('restauración pasa invasora_mencionada cuando el usuario la nombra (retamo/eucalipto)', () => {
    const plan = planForcedIntent('restauracion', 'tengo retamo espinoso, ¿qué hago?');
    expect(plan.args.invasora_mencionada).toBe('retamo');
  });

  it('restauración sin altitud NO incluye altitud_msnm (la tool la trata como opcional)', () => {
    const plan = planForcedIntent('restauracion', 'recuperar bosque');
    expect(plan.tool).toBe('get_diseno_restauracion');
    expect(plan.args).not.toHaveProperty('altitud_msnm');
  });

  it('páramo → get_diseno_restauracion objetivo=paramo SIN pasar la altura de la finca', () => {
    // La altura de la finca puede estar por debajo del páramo; el objetivo
    // 'paramo' ya fuerza ≥3000 msnm en la tool. No la pasamos para no vaciar.
    const plan = planForcedIntent('paramo', 'especies de páramo', { altitud: 2600 });
    expect(plan.tool).toBe('get_diseno_restauracion');
    expect(plan.args).toEqual({ objetivo: 'paramo' });
    expect(plan.skipNlu).toBe(true);
  });

  it('incendio → localGrounding client-side (sin tool sidecar) + altura del perfil', () => {
    // Riesgo de incendio se calcula en el cliente (incendioRiskService); NO hay
    // tool de alerta en tiempo real. El plan lleva localGrounding:'incendio'.
    const plan = planForcedIntent('incendio', '¿estoy en riesgo de incendio?', { altitud: 2400 });
    expect(plan.tool).toBeNull();
    expect(plan.localGrounding).toBe('incendio');
    expect(plan.args).toEqual({ altitud: 2400 });
    expect(plan.skipNlu).toBe(true);
  });

  it('incendio sin altura → localGrounding con args vacíos (el servicio deriva del perfil)', () => {
    const plan = planForcedIntent('incendio', 'riesgo de incendio');
    expect(plan.localGrounding).toBe('incendio');
    expect(plan.args).toEqual({});
  });

  it('silvopastoreo → get_diseno_silvopastoril con altura + piso del perfil', () => {
    const plan = planForcedIntent('silvopastoreo', 'forraje para mis vacas', {
      altitud: 1800,
      pisoTermico: 'templado',
    });
    expect(plan.tool).toBe('get_diseno_silvopastoril');
    expect(plan.args.altitud_msnm).toBe(1800);
    expect(plan.args).not.toHaveProperty('altitud'); // #193: el schema renombró altitud→altitud_msnm
    expect(plan.args.piso_termico).toBe('templado');
    expect(plan.args.animal).toBe('bovino');
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('silvopastoreo normaliza el piso con tilde del perfil (frío→frio, páramo→paramo)', () => {
    expect(planForcedIntent('silvopastoreo', 'forraje', { altitud: 2500, pisoTermico: 'frío' }).args.piso_termico).toBe('frio');
    expect(planForcedIntent('silvopastoreo', 'forraje', { altitud: 3100, pisoTermico: 'páramo' }).args.piso_termico).toBe('paramo');
  });

  it('silvopastoreo detecta el animal del texto (oveja→ovino, cabra→caprino)', () => {
    expect(planForcedIntent('silvopastoreo', 'forraje para ovejas', { altitud: 2500 }).args.animal).toBe('ovino');
    expect(planForcedIntent('silvopastoreo', 'sombra para mis cabras', { altitud: 1500 }).args.animal).toBe('caprino');
  });

  it('silvopastoreo SIN altura → stub no_altitud (pide la altura, NO inventa)', () => {
    const plan = planForcedIntent('silvopastoreo', 'forraje para el ganado');
    expect(plan.tool).toBe('get_diseno_silvopastoril');
    expect(plan.stub).toBe(true);
    expect(plan.stubResult).toMatchObject({ available: false, reason: 'no_altitud' });
    expect(plan.skipNlu).toBe(true);
  });

  it('silvopastoreo acepta altitud como string del perfil (coerción a número)', () => {
    const plan = planForcedIntent('silvopastoreo', 'forraje', { altitud: '2100' });
    expect(plan.args.altitud_msnm).toBe(2100);
  });
});

describe('chipIntentRouter — grounding oscuro (chips antes SOLO alcanzables por texto libre)', () => {
  it('toxicidad → get_toxicidad con species_id_or_name del texto + skipNlu', () => {
    const plan = planForcedIntent('toxicidad', 'ruda');
    expect(plan.tool).toBe('get_toxicidad');
    expect(plan.args).toEqual({ species_id_or_name: 'ruda' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('saberes_tradicionales → get_saberes_tradicionales con termino del texto + skipNlu', () => {
    const plan = planForcedIntent('saberes_tradicionales', 'bocashi');
    expect(plan.tool).toBe('get_saberes_tradicionales');
    expect(plan.args).toEqual({ termino: 'bocashi' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('alerta_paramo → get_alerta_normativa_paramo con contexto del texto + skipNlu', () => {
    const plan = planForcedIntent('alerta_paramo', 'tengo tierra en el páramo');
    expect(plan.tool).toBe('get_alerta_normativa_paramo');
    expect(plan.args).toEqual({ contexto: 'tengo tierra en el páramo' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('variedades → get_variedades_cultivo con cultivo del texto + skipNlu', () => {
    const plan = planForcedIntent('variedades', 'papa criolla');
    expect(plan.tool).toBe('get_variedades_cultivo');
    expect(plan.args).toEqual({ cultivo: 'papa criolla' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('polinizacion → get_polinizacion con species_id del texto + skipNlu', () => {
    const plan = planForcedIntent('polinizacion', 'fresa');
    expect(plan.tool).toBe('get_polinizacion');
    expect(plan.args).toEqual({ species_id: 'fresa' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('fenologia → get_fenologia con species_id del texto + skipNlu', () => {
    const plan = planForcedIntent('fenologia', 'café');
    expect(plan.tool).toBe('get_fenologia');
    expect(plan.args).toEqual({ species_id: 'café' });
    expect(plan.stub).toBe(false);
    expect(plan.skipNlu).toBe(true);
  });

  it('los 6 chips de grounding oscuro son kind:tool en CHIP_DEFS (no stub)', () => {
    const groundingIntents = [
      'toxicidad', 'saberes_tradicionales', 'alerta_paramo',
      'variedades', 'polinizacion', 'fenologia',
    ];
    for (const intent of groundingIntents) {
      const def = CHIP_DEFS.find((d) => d.intent === intent);
      expect(def).toBeTruthy();
      expect(def.kind).toBe('tool');
      expect(def.moreGroup).toBe(true);
    }
  });
});

describe('chipIntentRouter — intents local y stub', () => {
  it('precio → localGrounding de referencia real (NO inventa backend de precio)', () => {
    const plan = planForcedIntent('precio', 'papa');
    expect(plan.intent).toBe('precio');
    expect(plan.tool).toBeNull();
    expect(plan.stub).toBe(false);
    expect(plan.localGrounding).toBe('precio_referencia');
    expect(plan.args).toEqual({ producto: 'papa' });
    expect(plan.stubMessage).toBeNull();
    expect(plan.skipNlu).toBe(true);
  });

  it('isStubIntent reconoce solo deep como stub (precio ya es local)', () => {
    expect(isStubIntent('precio')).toBe(false);
    // B14: investigacion profunda aun NO esta servible — es stub honesto
    expect(isStubIntent('deep')).toBe(true);
    expect(isStubIntent('siembro')).toBe(false);
    expect(isStubIntent('plaga')).toBe(false);
    expect(isStubIntent('clima')).toBe(false);
    expect(isStubIntent('xxx')).toBe(false);
  });
});

describe('chipIntentRouter — Deep Research (B14: stub honesto, backend no servible)', () => {
  it('deep → stub claro "aún no disponible" + skipNlu + tool null (NO path live)', () => {
    // B14: la investigacion profunda no tiene backend servible en prod (el job
    // async vive detras de VITE_DEEP_RESEARCH_ENABLED, off por defecto). El chip
    // NO routea a un path "live": devuelve un stub honesto propio.
    const plan = planForcedIntent('deep', 'sistema agroforestal cacao');
    expect(plan.intent).toBe('deep');
    expect(plan.stub).toBe(true);
    expect(/** @type {any} */ (plan).deep).toBeUndefined();
    expect(plan.tool).toBeNull();
    expect(typeof plan.stubMessage).toBe('string');
    expect(plan.stubMessage.toLowerCase()).toContain('no está disponible');
    expect(plan.skipNlu).toBe(true);
    expect(plan.prompt).toBe('sistema agroforestal cacao');
  });

  it('isDeepResearchIntent devuelve false para deep (ya no es path live) y para todo intent', () => {
    // El path live (job async) esta detras de la flag; mientras deep sea kind
    // 'stub' en el manifiesto, ningun chip lo dispara. La funcion se conserva
    // como gancho para reactivar volviendo deep a kind:'deep'.
    expect(isDeepResearchIntent('deep')).toBe(false);
    expect(isDeepResearchIntent('precio')).toBe(false);
    expect(isDeepResearchIntent('siembro')).toBe(false);
    expect(isDeepResearchIntent('plaga')).toBe(false);
    expect(isDeepResearchIntent('clima')).toBe(false);
    expect(isDeepResearchIntent('xxx')).toBe(false);
    expect(isDeepResearchIntent(null)).toBe(false);
    expect(isDeepResearchIntent(undefined)).toBe(false);
  });

  it('deep chip tiene kind=stub en CHIP_DEFS con stubMessage honesto', () => {
    const deepDef = CHIP_DEFS.find((d) => d.intent === 'deep');
    expect(deepDef).toBeTruthy();
    expect(deepDef.kind).toBe('stub');
    // Como stub, EXPONE stubMessage honesto.
    expect(typeof deepDef.stubMessage).toBe('string');
    expect(deepDef.stubMessage.length).toBeGreaterThan(0);
  });
});

describe('chipIntentRouter — contrato de orden y consistencia del índice', () => {
  it('CHIP_DEFS mantiene el orden de render estable (chips base + restauración/silvopastoreo/páramo/incendio + grounding oscuro al final)', () => {
    const order = CHIP_DEFS.map((d) => d.intent);
    expect(order).toEqual([
      'siembro', 'plaga', 'biopreparado', 'clima', 'precio', 'calendario', 'deep',
      'restauracion', 'silvopastoreo', 'paramo', 'incendio',
      'toxicidad', 'saberes_tradicionales', 'alerta_paramo', 'variedades', 'polinizacion', 'fenologia',
    ]);
  });

  it('DEF_BY_INTENT indexa todos los intents sin entradas extra', () => {
    // DEF_BY_INTENT no es exportado, así que verificamos indirectamente:
    // isStubIntent e isDeepResearchIntent cubren todos los intents sin error.
    for (const intent of Object.keys(CHIP_INTENTS)) {
      expect(() => {
        // Estos son los únicos consumers del índice interno
        const plan = planForcedIntent(intent, 'test');
        expect(plan).not.toBeNull();
      }).not.toThrow();
    }
  });
});

describe('chipIntentRouter — opts ruidosos no contaminan los args', () => {
  it('siembro ignora opts.municipio cuando se pasa por error', () => {
    const plan = planForcedIntent('siembro', 'aguacate', { municipio: 'Bogotá' });
    expect(plan.tool).toBe('get_species');
    expect(plan.args).toEqual({ query: 'aguacate' });
    expect(plan.args).not.toHaveProperty('municipio');
  });

  it('plaga ignora opts no relacionados', () => {
    const plan = planForcedIntent('plaga', 'broca', /** @type {any} */ ({ foo: 'bar' }));
    expect(plan.tool).toBe('get_pest_controllers');
    expect(plan.args).toEqual({ pest_id_or_name: 'broca' });
  });

  it('precio conserva el texto como producto candidato y no depende de opts', () => {
    const plan = planForcedIntent('precio', 'papa', { municipio: 'Choachí' });
    expect(plan.tool).toBeNull();
    expect(plan.stub).toBe(false);
    expect(plan.localGrounding).toBe('precio_referencia');
    expect(plan.args).toEqual({ producto: 'papa' });
  });

  it('deep ignora opts completamente (es stub)', () => {
    const plan = planForcedIntent('deep', 'abonos verdes', { municipio: 'Choachí' });
    expect(plan.stub).toBe(true);
    expect(plan.tool).toBeNull();
    expect(/** @type {any} */ (plan).deep).toBeUndefined();
  });
});

describe('chipIntentRouter — cross-reference con ALLOWED_TOOLS del sidecar', () => {
  it('todas las tools de CHIP_DEFS kind:tool existen en ALLOWED_TOOLS', async () => {
    const { __TEST__ } = await import('../sidecarClient.js');
    const allowed = __TEST__.ALLOWED_TOOLS;
    const toolIntents = CHIP_DEFS.filter((d) => d.kind === 'tool');
    for (const def of toolIntents) {
      // planForcedIntent revela el tool name real
      const plan = planForcedIntent(def.intent, 'test query', { municipio: 'Choachí' });
      expect(plan.tool).not.toBeNull();
      expect(allowed.has(plan.tool)).toBe(true);
    }
  });

  it('ningún kind:stub o kind:deep tiene tool en ALLOWED_TOOLS', () => {
    const nonToolIntents = CHIP_DEFS.filter((d) => d.kind !== 'tool');
    for (const def of nonToolIntents) {
      const plan = planForcedIntent(def.intent, 'test');
      // Ningún stub/deep debe tener un tool asignado (ni siquiera por error)
      expect(plan.tool).toBeNull();
    }
  });
});

describe('chipIntentRouter — el prompt se preserva tal cual lo escribió el usuario', () => {
  it('plan.prompt es el texto original trimmeado para todos los intents', () => {
    for (const intent of Object.keys(CHIP_INTENTS)) {
      const plan = planForcedIntent(intent, '  tomate cherry  ', { municipio: 'Choachí' });
      expect(plan.prompt).toBe('tomate cherry');
    }
  });
});
