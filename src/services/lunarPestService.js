/**
 * lunarPestService.js — Ventana de monitoreo de plagas nocturnas según fase lunar.
 *
 * EVIDENCIA — Nivel 2 entomológica robusta:
 *   Yela & Holyoak 1997 *Environmental Entomology* — capturas en trampas de luz
 *   nocturna son 2-4× mayores en luna nueva vs luna llena. La luz lunar reduce
 *   la atracción relativa de la trampa (la luna compite con la fuente artificial).
 *
 *   Dacke et al. 2003 *Nature* — polarización lunar en insectos.
 *   Foster 2019, Freas 2024 — replicación robusta en escarabajos / hormigas
 *   nocturnas.
 *
 * USO AGRONÓMICO:
 *   Esta ventana NO es recomendación de tratamiento. Es información de muestreo:
 *   si el operador YA tiene trampa de luz nocturna instalada (o quiere instalar
 *   una temporalmente para sampling), la ventana de luna nueva ± 3 días captura
 *   2-4× más individuos → mejor estimación de presión de plaga.
 *
 *   Operadores SIN trampa de luz: la información es neutra, no obliga.
 *
 * POLÍTICA — ADR-033 Opción C estricta:
 *   - Esta es la ÚNICA feature lunar habilitada en Chagra
 *   - Solo Nivel 2 evidencia (entomológica, no agroecológica genérica)
 *   - NO sugiere "siembre/coseche/podar en X fase" (eso es Nivel 3 folclore)
 *   - NO emite badge "🌙 saber tradicional"
 *
 * REFS: ADR-033, dr-033-mistral-tiebreak.md
 */

const NEW_MOON_WINDOW_DAYS = 3; // ±3 días alrededor de luna nueva

/**
 * Determina si estamos en ventana óptima de muestreo nocturno con trampa de luz.
 *
 * @param {{ daysSinceNewMoon: number, daysToNewMoon: number, fraction: number }} lunar
 *   Output de `lunarPhase()` de skyEphemeris.
 * @returns {{
 *   inWindow: boolean,
 *   daysToCenter: number,        // días al centro de la ventana (0 = luna nueva exacta)
 *   centerDirection: 'past'|'future'|'now',
 *   captureMultiplier: string,   // texto descriptivo "2-4×"
 *   evidenceLevel: 2,
 *   evidenceCitation: string,
 * }}
 */
export function pestMonitoringWindow(lunar) {
  if (!lunar || typeof lunar.daysSinceNewMoon !== 'number') {
    return null;
  }

  const daysSince = lunar.daysSinceNewMoon;
  const daysTo = lunar.daysToNewMoon;

  // Distancia al centro (luna nueva). Tomar el menor entre "días desde la última"
  // y "días hasta la próxima".
  const distanceFromNewMoon = Math.min(daysSince, daysTo);

  const inWindow = distanceFromNewMoon <= NEW_MOON_WINDOW_DAYS;

  let centerDirection = 'now';
  if (daysSince < daysTo) centerDirection = 'past';
  else if (daysTo < daysSince) centerDirection = 'future';

  return {
    inWindow,
    daysToCenter: distanceFromNewMoon,
    centerDirection,
    captureMultiplier: '2-4×',
    evidenceLevel: 2,
    evidenceCitation: 'Yela & Holyoak 1997 Environmental Entomology',
  };
}

/**
 * Construye el mensaje informativo (corto) cuando estamos en ventana.
 * Devuelve null si NO estamos en ventana.
 */
export function pestMonitoringMessage(lunar) {
  const w = pestMonitoringWindow(lunar);
  if (!w?.inWindow) return null;

  const daysRounded = Math.round(w.daysToCenter);
  const phaseHint =
    w.centerDirection === 'now' || daysRounded === 0
      ? 'Luna nueva esta noche'
      : w.centerDirection === 'past'
        ? `${daysRounded} ${daysRounded === 1 ? 'día' : 'días'} después de luna nueva`
        : `Luna nueva en ${daysRounded} ${daysRounded === 1 ? 'día' : 'días'}`;

  return {
    headline: '🌑 Ventana de muestreo nocturno',
    sub: phaseHint,
    body:
      'Si tiene trampa de luz nocturna instalada o quiere instalarla temporalmente, ' +
      'esta ventana captura 2-4× más individuos. Mejor estimación de presión de plaga.',
    caveat: 'No es recomendación de tratamiento — es muestreo. Si no tiene trampa, ignore.',
    citation: w.evidenceCitation,
  };
}
