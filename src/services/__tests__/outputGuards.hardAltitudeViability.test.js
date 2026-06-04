/**
 * outputGuards.hardAltitudeViability.test.js — guard de VIABILIDAD-ALTITUD DURA
 * (BORDE-015 / BORDE-019 / BORDE-023, V2).
 *
 * Gap que cierra: `guardInvertedViability` corrige inviabilidad cuando hay
 * grounding (entidad resuelta + altitud de finca) y `guardAltitudeRiskCaveat`
 * solo AÑADE un caveat en la franja-BORDE (entre el óptimo y el techo). Ninguno
 * cubre el caso DURO del bench: la respuesta VALIDA/da manejo de un cultivo a una
 * altitud CLARAMENTE FUERA de su rango viable —café a 3600 m (páramo), aguacate
 * Hass a 2800 m, mora de Castilla a 450 m (llano caliente)— donde la altitud sale
 * de la PREGUNTA del usuario, no del perfil de finca.
 *
 * Este guard, con una tabla de bandas absolutas de cultivos de clima inequívoco,
 * detecta cuando el texto promueve el cultivo a una altitud inviable y
 * SUPRIME-Y-REEMPLAZA por la advertencia de inviabilidad + el rango correcto.
 *
 * Anti-sobre-supresión: una recomendación de altitud CORRECTA (café a 1600 m) NO
 * se toca; una respuesta que YA advierte la inviabilidad tampoco.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { guardHardAltitudeViability, resetOutputGuardTelemetry, getOutputGuardTelemetry } from '../outputGuards.js';

beforeEach(() => resetOutputGuardTelemetry());

describe('guardHardAltitudeViability — TRIGGER (suprime y reemplaza)', () => {
  it('BORDE-023: café validado a 3600 m (páramo) → suprime, advierte inviabilidad + rango correcto', () => {
    const user = 'en el páramo de Sumapaz a 3.600 metros quiero montar café especial de altura';
    const resp =
      'El café a 3600 msnm en el páramo se puede cultivar con cuidados; con un caldo de ceniza y panela ' +
      'cada ocho días aguanta la helada. Siembra a 1,5 metros entre plantas para esa altura.';
    const r = guardHardAltitudeViability(resp, { userMessage: user });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/no es viable|inviable/);
    expect(r.text).toMatch(/3600|3\.?600/);
    // Debe dar el rango correcto del café (banda viable).
    expect(r.text.toLowerCase()).toMatch(/msnm|metros/);
    // La instrucción de siembra peligrosa NO debe sobrevivir como recomendación.
    expect(r.text).not.toMatch(/caldo de ceniza y panela/i);
    expect(getOutputGuardTelemetry().hard_altitude_viability).toBe(1);
  });

  it('BORDE-015: aguacate Hass validado a 2800 m (Tunja) → suprime, advierte inviabilidad', () => {
    const user = 'en Tunja a 2.800 me ofrecen aguacate Hass adaptado al frío de altura que aguanta heladas';
    const resp =
      'Sí, esa variedad de aguacate Hass de altura se da bien a 2800 msnm y aguanta las heladas; ' +
      'siémbrala a 7x7 metros para la mejor cosecha de exportación.';
    const r = guardHardAltitudeViability(resp, { userMessage: user });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/no es viable|inviable|no se da/);
    expect(r.text.toLowerCase()).toMatch(/aguacate/);
    expect(r.text).not.toMatch(/7x7|siémbrala a/i);
  });

  it('BORDE-019: mora de Castilla validada a 450 m (llano caliente) → suprime (demasiado bajo/cálido)', () => {
    const user = 'en Villavicencio (llano, calor, ~450 metros) quiero meter mora de Castilla';
    const resp =
      'La mora de Castilla de tierra caliente se da en el llano a 450 metros; manéjala con riego ' +
      'constante y poda para que produzca bien para mermelada de exportación.';
    const r = guardHardAltitudeViability(resp, { userMessage: user });
    expect(r.modified).toBe(true);
    expect(r.text.toLowerCase()).toMatch(/no es viable|inviable|clima (cálido|calido|frío|frio)|demasiado (cálido|calido|caliente)/);
    expect(r.text.toLowerCase()).toMatch(/mora/);
  });
});

describe('guardHardAltitudeViability — NO TRIGGER (cero sobre-supresión)', () => {
  it('café a 1600 m (altitud CORRECTA dentro de banda) → NO se toca', () => {
    const user = 'tengo finca a 1600 metros, ¿siembro café?';
    const resp = 'A 1600 msnm el café arábica se da muy bien; es la altura ideal. Siembra a 1.5 m entre plantas.';
    const r = guardHardAltitudeViability(resp, { userMessage: user });
    expect(r.modified).toBe(false);
    expect(r.text).toBe(resp);
  });

  it('aguacate Hass a 1800 m (dentro de banda) → NO se toca', () => {
    const r = guardHardAltitudeViability(
      'El aguacate Hass a 1800 msnm es viable y productivo en zona cafetera.',
      { userMessage: 'aguacate hass a 1800 metros' },
    );
    expect(r.modified).toBe(false);
  });

  it('respuesta que YA declara inviable el café en páramo → NO se re-suprime (el modelo acertó)', () => {
    const user = 'café a 3600 en el páramo de Sumapaz';
    const resp =
      'El café arábica NO es viable a 3600 msnm: el páramo es demasiado frío y hay heladas que lo matan. ' +
      'Su rango es 800–2000 msnm. No existe un caldo que evite la helada del páramo.';
    const r = guardHardAltitudeViability(resp, { userMessage: user });
    expect(r.modified).toBe(false);
    expect(r.text).toBe(resp);
  });

  it('sin altitud en la pregunta ni en la respuesta → no-op (no podemos juzgar)', () => {
    const r = guardHardAltitudeViability('El café se da bien y produce mucho.', { userMessage: 'háblame del café' });
    expect(r.modified).toBe(false);
  });

  it('cultivo de banda ancha (maíz) a una altitud media → no-op (no es de clima inequívoco acotado)', () => {
    const r = guardHardAltitudeViability('El maíz a 1800 msnm se da muy bien.', { userMessage: 'maíz a 1800 metros' });
    expect(r.modified).toBe(false);
  });

  it('idempotente: aplicar dos veces no re-suprime', () => {
    const user = 'café a 3600 metros en el páramo';
    const resp = 'El café a 3600 msnm se da con un caldo de ceniza; siembra a 1.5m.';
    const once = guardHardAltitudeViability(resp, { userMessage: user });
    expect(once.modified).toBe(true);
    const twice = guardHardAltitudeViability(once.text, { userMessage: user });
    expect(twice.modified).toBe(false);
    expect(twice.text).toBe(once.text);
  });
});
