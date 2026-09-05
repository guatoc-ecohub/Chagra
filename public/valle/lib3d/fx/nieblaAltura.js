// ── nieblaAltura.js — niebla estratificada por ALTURA (Sylva s18) ───────────
//
// Port de la idea de `src/shaders/volumetrics.js` de Sylva
// (github.com/Token-Gremlin/realistic-forest — MIT License, Copyright (c) 2026
// Token Gremlin; el notice completo va al pie de este archivo). Sylva marcha el
// medio participante a media resolución (32 pasos + reproyección temporal +
// cascadas de sombra) sobre un pipeline deferred. El valle es forward, sin
// depth-texture barato, y su destino es un Mali-G78: acá se porta la FÍSICA
// (densidad exponencial con la altura, `hfog = uFog.x * exp(-(p.y - g) * uFog.y)`)
// resuelta en FORMA CERRADA a lo largo del rayo cámara→fragmento — cero pasos
// de marcha, una varying extra, ~12 ALU por fragmento.
//
// Cómo se cuela en TODOS los materiales: three resuelve `#include <fog_*>` en
// el momento de compilar contra `THREE.ShaderChunk`. Reemplazando esas cuatro
// entradas ANTES del primer render, terreno, farallón, flora, agua y jirones
// (todo material con `fog: true`) heredan la capa sin tocar un solo módulo.
// El FogExp2 de la escena (aire uniforme, medido contra fotos) se conserva y
// la capa se le SUMA; `fogDensity` sigue siendo la única densidad viva, así que
// clima.js / clima-vivo.js / noche.js siguen mandando sin cambios.
//
// Modelo:  D(y) = fogDensity · K · exp( -(y - y0) / H )
//   K   factor sobre la densidad de la escena (cuánta capa; adimensional)
//   H   altura de escala en unidades de escena (K_terreno = 0,6 u/m → 45 u ≈ 75 m:
//       una capa delgada que se queda en el cañón; con 130 u la pared media se lava)
//   y0  cota de referencia donde D = fogDensity·K. Va al PISO del cañón (-75 u,
//       ~2390 msnm; el piso medido está en -65), NO a la loma del sitio (-8): la
//       cámara del domo tiene que mirar la niebla DESDE ARRIBA. Medido 2026-09-01:
//       con y0=-8 la cámara queda dentro de la capa a densidad plena y el plano
//       medio pierde 37 % de contraste; con -75/45 pierde 13 % y la cresta lee
//       2× más limpia que la base (ver ops/specs/2026-09-01-sylva-s18-niebla-altura).
// Integral a lo largo del rayo (ro = cámara, rd unitario, t = distancia):
//   τ   = D(ro.y) · (1 - exp(-rd.y·t/H)) / (rd.y/H)   (→ D(ro.y)·t si rd.y → 0)
//   fog = 1 - (1 - fogExp2) · exp(-τ)
// Mirar hacia ABAJO mete el rayo en aire más denso (el fondo del cañón se
// baña); mirar hacia ARRIBA lo saca (la cresta lee limpia a igual distancia).
// Eso es la estratificación: capas que separan el paisaje por ALTURA, no una
// cortina por distancia.
//
// El rayo en mundo sale sin matriz inversa: la parte rotacional de viewMatrix
// es ortonormal (R⁻¹ = Rᵀ), así que  mundo - cámara = Rᵀ · mvPosition.xyz.
//
// Contrato para shaders que NO usan `#include <fog_vertex>` y escriben
// `vFogDepth` a mano (p. ej. el impostor de lib3d/flora/arbolesAltoandinos.js):
// el chunk define `NIEBLA_ALTURA` y declara `varying highp vec3 vNieblaRayo`
// (rayo mundo cámara→vértice). Si no la escriben, el fragmento la lee
// INDEFINIDA (garbage en Mali). Escribirla así, sin romper el caso sin capa:
//   #ifdef NIEBLA_ALTURA
//     vNieblaRayo = posicionMundo.xyz - cameraPosition;
//   #endif
//
// Preajustes medidos (lab determinista, cam=guatoc): default 1,5/45/-75 = «banco en el
// cañón, pared legible»; `?niebla=1&nieblaK=1.5&nieblaH=60&nieblaY=-60` = «más niebla»
// (ladera +17 L, pared +20 L, contraste medio 0,78). Opt-in por página: nada cambia
// hasta llamar `instalarNieblaAltura(THREE, …)`.

const CLAVES = ['fog_pars_vertex', 'fog_vertex', 'fog_pars_fragment', 'fog_fragment'];
const ORIGINALES = {};
let instalada = null;

// null/undefined/'' = ausente → default (Number(null) es 0, NO un valor pedido)
const num = (v, def) => {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
// literal GLSL float: 130 → "130.0", -8 → "( -8.0 )", 1.5 → "1.5"
const glslF = (x) => {
  const n = Number(x);
  let s = String(Math.abs(n));
  if (!/[.e]/.test(s)) s += '.0';
  return n < 0 ? `( -${s} )` : s;
};

/**
 * Lee los parámetros de la URL. `?niebla=1` enciende (opt-in); `?nieblaK=`,
 * `?nieblaH=`, `?nieblaY=` afinan factor / altura de escala / cota base.
 * Devuelve null si no está pedida (= baseline intacto).
 */
export function leerParamsNieblaAltura(search = globalThis.location?.search ?? '', defaults = {}) {
  const q = new URLSearchParams(search);
  const on = q.get('niebla');
  if (on === null || on === '0' || on === 'off' || on === 'false') return null;
  return {
    factor: num(q.get('nieblaK'), defaults.factor ?? 1.5),
    escala: num(q.get('nieblaH'), defaults.escala ?? 45),
    base: num(q.get('nieblaY'), defaults.base ?? -75),
  };
}

function chunksGLSL({ factor, escala, base }) {
  const NA_K = glslF(factor), NA_H = glslF(escala), NA_Y0 = glslF(base);
  return {
    fog_pars_vertex: /* glsl */`
#ifdef USE_FOG
	#define NIEBLA_ALTURA 1
	varying float vFogDepth;
	varying highp vec3 vNieblaRayo;
#endif`,
    fog_vertex: /* glsl */`
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vNieblaRayo = vec3(
		dot( viewMatrix[0].xyz, mvPosition.xyz ),
		dot( viewMatrix[1].xyz, mvPosition.xyz ),
		dot( viewMatrix[2].xyz, mvPosition.xyz ) );
#endif`,
    fog_pars_fragment: /* glsl */`
#ifdef USE_FOG
	#define NIEBLA_ALTURA 1
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying highp vec3 vNieblaRayo;
	const float NA_K = ${NA_K};
	const float NA_H = ${NA_H};
	const float NA_Y0 = ${NA_Y0};
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,
    fog_fragment: /* glsl */`
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		{
			// capa estratificada por altura (Sylva s18): integral cerrada del rayo
			float naT = length( vNieblaRayo );
			float naRy = vNieblaRayo.y / max( naT, 1e-3 );
			float naE = naRy / NA_H;
			float naD0 = fogDensity * NA_K * exp( clamp( - ( cameraPosition.y - NA_Y0 ) / NA_H, -30.0, 30.0 ) );
			float naTau = ( abs( naE ) > 1e-6 )
				? naD0 * ( 1.0 - exp( clamp( - naE * naT, -60.0, 60.0 ) ) ) / naE
				: naD0 * naT;
			fogFactor = 1.0 - ( 1.0 - fogFactor ) * exp( - max( naTau, 0.0 ) );
		}
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,
  };
}

/**
 * Instala la capa en `THREE.ShaderChunk`. Llamar ANTES del primer render
 * (los programas ya compilados no se recompilan solos). Idempotente: una
 * segunda llamada reemplaza los parámetros. Devuelve el hook que el gate
 * lee en `window.__nieblaAltura` y un `desinstalar()` que restaura three.
 * @param {object} THREE  el módulo three de la página
 * @param {{factor?:number, escala?:number, base?:number}} opts
 */
export function instalarNieblaAltura(THREE, opts = {}) {
  const params = {
    factor: num(opts.factor, 1.5),
    escala: Math.max(1, num(opts.escala, 45)),
    base: num(opts.base, -75),
  };
  const SC = THREE.ShaderChunk;
  if (!instalada) for (const k of CLAVES) ORIGINALES[k] = SC[k];
  Object.assign(SC, chunksGLSL(params));
  instalada = params;
  const hook = {
    activa: true,
    params,
    fuente: 'Sylva s18 (Token-Gremlin/realistic-forest, MIT) — integral cerrada',
    desinstalar() {
      if (!instalada) return;
      Object.assign(SC, ORIGINALES);
      instalada = null;
      hook.activa = false;
    },
  };
  return hook;
}

export function nieblaAlturaInstalada() { return instalada ? { ...instalada } : null; }

/*
MIT License

Copyright (c) 2026 Token Gremlin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
