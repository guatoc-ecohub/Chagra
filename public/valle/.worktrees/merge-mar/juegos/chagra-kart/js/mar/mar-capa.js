// ── mar-capa.js — la capa de mar compartida del chagra-kart REAL en el mar ──
// Un solo swell (SwellGLSL) + un solo sampler CPU (WaveSampler) + un solo
// reloj, compartidos entre:
//   · el vertex shader del mar (MarMesh) — misma fase GPU↔CPU garantizada,
//   · la PIEL de todos los karts (modelos.js): el mesh sube/baja y se ladea
//     con la ola, mientras los HUESOS (fisica.js) corren sobre el plano 0,
//   · las boyas que bobean en entorno-mar.js,
//   · el control negativo del gate anti-mareo (?mareo=1) en main.js.
//
// 🔴 DOCTRINA "huesos reales, piel dibujada": la física del kart NO se toca.
// pista.alturaMundo devuelve 0 (plano del mar), así que colisiones, vueltas,
// derrapes, poderes y multijugador son EXACTAMENTE el juego ya probado. La
// ola existe solo en el render — y la cámara del kart, que sigue s.y físico
// (plano), queda anclada al nivel del mar sin ver jamás el vaivén: el
// horizonte no baila por construcción.

import { crearSwellUniforms } from './ocean/SwellGLSL.js';
import { crearWaveSampler } from './ocean/WaveSampler.js';

const capa = {
  activo: false,
  t: 0,
  seaLevel: 0,
  swellU: null,
  sampler: null,
  // atenuación del ladeo visual por ola (≈ fisica-naval: 50%, filtrado lento)
  atenPitch: 0.5,
  atenRoll: 0.55,
};

export function iniciarCapaMar(THREE) {
  if (capa.activo) return capa;
  capa.swellU = crearSwellUniforms(THREE);
  capa.sampler = crearWaveSampler(capa.swellU);
  capa.activo = true;
  return capa;
}

export function capaMar() { return capa; }

export function tickCapaMar(dt) {
  if (!capa.activo) return;
  capa.t += dt;
  capa.swellU.uSwellT.value = capa.t;
}

/** Altura visual de la ola (m) bajo (x,z) ahora mismo. 0 si no hay mar. */
export function olaAltura(x, z) {
  return capa.activo ? capa.sampler.altura(x, z, capa.t) : 0;
}

/** Pendiente (dY/dx, dY/dz) de la ola bajo (x,z). */
export function olaPendiente(x, z, out) {
  if (!capa.activo) { out.x = 0; out.z = 0; return out; }
  return capa.sampler.pendiente(x, z, capa.t, out);
}
