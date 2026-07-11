/*
 * vozViva.js — la parte VIVA (y sin React) de IrisVoz: geometría determinista
 * de los anillos + simulación orgánica de nivel. Separado del componente para
 * que IrisVoz.jsx solo exporte componentes (react-refresh) y para poder
 * testear/reusar la matemática sin montar nada.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- 'reposo'/'escuchando'/
   'pensando'/'hablando' son TOKENS de estado del primitivo (API interna),
   no copy de UI; el texto visible vive en el consumidor. */

export const ESTADOS_VOZ = ['reposo', 'escuchando', 'pensando', 'hablando'];

export const IRIS_VB = 200;              // lado del viewBox
export const IRIS_C = IRIS_VB / 2;       // centro
export const N_ANILLOS = 6;              // anillos de agua/tronco
const N_PTS = 72;                        // puntos por anillo (denso = suave)

/* PRNG determinista (misma receta que el resto del repo visual). */
const azar = (i, sal) => {
  const x = Math.sin(i * 127.1 + sal * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* Anillos precomputados UNA vez: cada uno es un path cerrado cuyo radio
 * ondula con dos senos de baja amplitud — el temblor de mano que separa un
 * anillo de tronco de un círculo de compás. El de afuera tiembla más (la
 * onda se deshace al alejarse de la brasa), y cada anillo trae su amplitud
 * de reacción a la voz (`amp`) y su opacidad base (`base`). */
export const ANILLOS_IRIS = Array.from({ length: N_ANILLOS }, (_, k) => {
  const R = 30 + k * 11.4;                       // 30 → 87 (dentro de VB=200)
  const w1 = 0.016 + azar(k, 1) * 0.016 + k * 0.0045;
  const w2 = 0.009 + azar(k, 2) * 0.012;
  const f1 = 3 + (k % 3);
  const f2 = 6 + (k % 4);
  const p1 = azar(k, 3) * Math.PI * 2;
  const p2 = azar(k, 4) * Math.PI * 2;
  let d = '';
  for (let j = 0; j < N_PTS; j++) {
    const a = (j / N_PTS) * Math.PI * 2;
    const r = R * (1 + w1 * Math.sin(f1 * a + p1) + w2 * Math.sin(f2 * a + p2));
    d += `${j === 0 ? 'M' : 'L'}${(IRIS_C + Math.cos(a) * r).toFixed(1)} ${(IRIS_C + Math.sin(a) * r).toFixed(1)}`;
  }
  return {
    d: `${d}Z`,
    amp: 0.05 + k * 0.016,          // cuánto se hincha con la voz
    base: 0.5 - k * 0.055,          // opacidad base (se desvanece hacia afuera)
    grosor: 1.9 - k * 0.18,         // trazo (grueso adentro, fino afuera)
  };
});

/* ── Simulación orgánica de nivel (para mockups/demos) ───────────────────────
 * Pseudo-habla determinista: una envolvente de FRASES (con pausas de aire),
 * modulada por PALABRAS y SÍLABAS (senos incongruentes = cadencia creíble).
 * `hablando` es un pelo más parejo (Chagra no duda); `pensando` es un pulso
 * interior bajito; `reposo` es silencio. */
export function nivelSimulado(t, estado) {
  if (estado === 'escuchando' || estado === 'hablando') {
    const lento = estado === 'hablando' ? 0.62 : 0.78;
    const frase = Math.sin(t * lento + 0.6) * 0.5 + 0.5;      // 0..1, respiración de frase
    if (frase < 0.22) return 0.04;                            // pausa para tomar aire
    const palabra = 0.62 + 0.38 * Math.sin(t * 5.9) * Math.sin(t * 2.31 + 1.7);
    const silaba = 0.78 + 0.22 * Math.sin(t * 13.7 + 0.4);
    const piso = estado === 'hablando' ? 0.3 : 0.22;
    return Math.max(0, Math.min(1, piso + 0.62 * frase * palabra * silaba));
  }
  if (estado === 'pensando') return 0.1 + 0.06 * Math.sin(t * 1.5);
  return 0;
}
