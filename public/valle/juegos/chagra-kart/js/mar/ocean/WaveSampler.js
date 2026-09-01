// ── WaveSampler.js — sonda CPU del mar (espejo EXACTO de SWELL_GLSL) ────────
// Altura y pendiente del swell analítico en un punto del mundo. Lo usan las 4
// sondas de flotación del bote (proa/popa/babor/estribor). CERO readPixels:
// el FFT es solo visual; el bote flota sobre estas mismas olas que el vertex
// shader suma al mar, con la misma fase.
//
// La inversión exacta de Gerstner (el punto de la superficie sobre x,z pide
// resolver dónde ESTABA antes del empuje horizontal) se omite a propósito:
// con Q·A·k ≤ 0.02 el error es de centímetros y el calado del casco lo tapa.

import { SWELL_OLAS } from './SwellGLSL.js';

export function crearWaveSampler(swellUniforms) {
  const olas = SWELL_OLAS;

  /** Altura del swell (m) en (x, z) al tiempo t (s). */
  function altura(x, z, t) {
    const amp = swellUniforms.uSwellAmp.value;
    let y = 0;
    for (let i = 0; i < olas.length; i++) {
      const w = olas[i];
      const ph = w.k * (w.dirX * x + w.dirZ * z) - w.omega * t;
      y += w.A * Math.cos(ph);
    }
    return y * amp;
  }

  /** Pendiente (dY/dx, dY/dz) — por si la física quiere empuje por gravedad. */
  function pendiente(x, z, t, out = { x: 0, z: 0 }) {
    const amp = swellUniforms.uSwellAmp.value;
    let gx = 0;
    let gz = 0;
    for (let i = 0; i < olas.length; i++) {
      const w = olas[i];
      const ph = w.k * (w.dirX * x + w.dirZ * z) - w.omega * t;
      const s = Math.sin(ph);
      gx -= w.dirX * w.A * w.k * s;
      gz -= w.dirZ * w.A * w.k * s;
    }
    out.x = gx * amp;
    out.z = gz * amp;
    return out;
  }

  return { altura, pendiente };
}
