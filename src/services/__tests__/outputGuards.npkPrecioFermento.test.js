/**
 * outputGuards.npkPrecioFermento.test.js — fixes confirmados por E2E de
 * seguridad (Playwright real contra prod, juez mistral-nemo) 2026-06-03.
 *
 * Tres casos seguían MAL en prod pese a los guards previos (#1280/#1281):
 *
 *   (#351) guardSyntheticAgrochemical NO disparaba con las SIGLAS de fertilizante
 *          mineral usadas en campo —DAP, MAP, KCl— cuando el modelo las nombra
 *          sin el nombre largo ("aplica DAP", "agrega KCl"). El nombre largo
 *          ("fosfato diamónico", "cloruro de potasio") sí estaba; la sigla no.
 *
 *   (#347) classifyQueryIntent debe clasificar consultas con UNIDAD DE MERCADO
 *          (bulto/arroba/carga) como 'precio' para NO inyectar perfil de finca
 *          (altitud/clima) ni inventario en una consulta de precio. Regresión
 *          lock del fix de #1280.
 *
 *   (#1281) guardFermentoRecipeSafety daba FALSO-POSITIVO: una receta de
 *           fertilizante de síntesis cuyo texto contenía un token de fermento
 *           ("biofermento", "encurtido", "fermentada") disparaba el caveat de
 *           inocuidad INVIMA, mezclando dos dominios. Una consulta de
 *           fertilizante sintético NUNCA es un fermento alimentario.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardSyntheticAgrochemical,
  classifyQueryIntent,
  guardFermentoRecipeSafety,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => {
  resetOutputGuardTelemetry();
});

// ──────────────────────────────────────────────────────────────────────────
// #351 — siglas de fertilizante mineral (DAP / MAP / KCl) + NPK formulado
// ──────────────────────────────────────────────────────────────────────────
describe('#351 guardSyntheticAgrochemical — siglas de fertilizante mineral', () => {
  it('CASO REAL: "abono completo NPK 10-10-10 a 250 g/planta" → redirige a orgánico', () => {
    const llmFail = 'Aplica un abono completo NPK 10-10-10 a 250 g/planta cada mes para que produzca.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/npk|10-10-10/i);
    expect(out.text).toMatch(/agroecológico/i);
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('CASO REAL: "mezcla urea con fosfato triple y sulfato de potasio" → bloquea y redirige', () => {
    const llmFail = 'Cómo mezclo urea con fosfato triple y sulfato de potasio en partes iguales.';
    const out = guardSyntheticAgrochemical(llmFail);
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/urea|fosfato triple|sulfato de potasio/i);
    expect(out.text).toMatch(/compost|bocashi|biol|humus/i);
  });

  it('sigla DAP (fosfato diamónico) sola → dispara', () => {
    const out = guardSyntheticAgrochemical('Para el arranque aplica DAP al fondo del surco.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/dap/i);
  });

  it('sigla MAP (fosfato monoamónico) sola → dispara', () => {
    const out = guardSyntheticAgrochemical('El MAP es buena fuente de fósforo arrancador.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/map/i);
  });

  it('sigla KCl (cloruro de potasio) sola → dispara', () => {
    const out = guardSyntheticAgrochemical('Agrega 50 kg de KCl por hectárea para el potasio.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/kcl/i);
  });

  it('DAP y MAP juntos en la misma frase → dispara', () => {
    const out = guardSyntheticAgrochemical('Puedes usar DAP y MAP combinados al suelo.');
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/dap|map/i);
  });

  it('CONTROL: NO dispara con biopreparados/abonos orgánicos legítimos', () => {
    const ok =
      'Para nutrir tu cultivo usa compost bien maduro, bocashi, humus de lombriz y biol; ' +
      'alimentan el suelo vivo sin acidificarlo.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
    expect(out.text).toBe(ok);
  });

  it('CONTROL: "map" NO debe aparecer como subcadena de palabras comunes (mapa, mapeo)', () => {
    // El sigla MAP es palabra-aislada; "mapa"/"mapear" no deben dispararla.
    const ok = 'Haz un mapa de tu finca y un mapeo de las zonas húmedas antes de sembrar.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
  });

  it('CONTROL: un par numérico (no triplete) NO se confunde con formulación NPK', () => {
    const ok = 'Siembra las matas a 30-40 cm entre plantas para buena aireación.';
    const out = guardSyntheticAgrochemical(ok);
    expect(out.modified).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #347 — unidades de mercado = intención de PRECIO (no inyectar perfil finca)
// ──────────────────────────────────────────────────────────────────────────
describe('#347 classifyQueryIntent — unidades de mercado = precio', () => {
  it('"a cómo está el bulto de papa" → precio', () => {
    expect(classifyQueryIntent('a cómo está el bulto de papa')).toBe('precio');
  });

  it('"arroba de cebolla a cómo" → precio', () => {
    expect(classifyQueryIntent('arroba de cebolla a cómo')).toBe('precio');
  });

  it('"cuánto cuesta el bulto de papa" → precio', () => {
    expect(classifyQueryIntent('cuánto cuesta el bulto de papa')).toBe('precio');
  });

  it('"precio del bulto de papa" → precio', () => {
    expect(classifyQueryIntent('precio del bulto de papa')).toBe('precio');
  });

  it('"cuánto vale la carga de papa" → precio', () => {
    expect(classifyQueryIntent('cuánto vale la carga de papa')).toBe('precio');
  });

  it('CONTROL: una consulta de siembra normal sigue siendo siembra', () => {
    expect(classifyQueryIntent('qué puedo sembrar en mi finca a 1923 msnm')).toBe('siembra');
    expect(classifyQueryIntent('es viable la papa a esta altura')).toBe('siembra');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// #1281 — falso-positivo de fermento sobre receta de fertilizante sintético
// ──────────────────────────────────────────────────────────────────────────
describe('#1281 guardFermentoRecipeSafety — NO falso-positivo sobre fertilizante', () => {
  it('FALSO-POSITIVO FIX: receta de urea+sulfato con "biofermento" NO antepone caveat de fermento', () => {
    const out = guardFermentoRecipeSafety(
      'Prepara un biofermento mineral mezclando urea y sulfato de potasio, deja fermentar 7 días.',
      { userMessage: 'cómo preparo un biofermento con urea y sulfato' },
    );
    expect(out.modified).toBe(false);
  });

  it('FALSO-POSITIVO FIX: "encurtido" + urea/sulfato (contexto fertilizante) NO antepone caveat', () => {
    const out = guardFermentoRecipeSafety(
      'Para el encurtido mezcla urea con sulfato y deja fermentar.',
      { userMessage: 'mezclo urea para encurtir' },
    );
    expect(out.modified).toBe(false);
  });

  it('FALSO-POSITIVO FIX: "mezclo urea con sulfato … solución fermentada" NO antepone caveat', () => {
    const out = guardFermentoRecipeSafety(
      'Mezcla urea con sulfato de potasio; deja reposar la solución fermentada antes de aplicar.',
      { userMessage: 'cómo mezclo urea con sulfato' },
    );
    expect(out.modified).toBe(false);
  });

  it('CONTROL: kombucha SIGUE disparando el caveat de inocuidad (no romper #345)', () => {
    const out = guardFermentoRecipeSafety(
      'Para hacer kombucha necesitas té, azúcar y un scoby. Deja fermentar 7 días en un frasco limpio.',
      { userMessage: 'cómo preparo kombucha' },
    );
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/receta_fermento/);
    expect(out.text).toMatch(/INVIMA/);
  });

  it('CONTROL: receta de masato SIGUE disparando el caveat', () => {
    const out = guardFermentoRecipeSafety(
      'El masato se prepara con arroz cocido y panela, se deja fermentar varios días.',
      { userMessage: 'dame la receta del masato' },
    );
    expect(out.modified).toBe(true);
    expect(out.reason).toMatch(/receta_fermento/);
  });
});
