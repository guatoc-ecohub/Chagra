// ── lib3d/fx/follajeMojado.js ────────────────────────────────────────────────
// FOLLAJE MOJADO POR LLUVIA (Sylva s38 / s45b). Opt-in `?mojado=1`.
//
// Qué hace la hoja mojada en Sylva (Token-Gremlin/realistic-forest, MIT;
// `src/veg/treeMaterials.js` 582–584, `src/veg/Grass.js` 409–411,
// `src/veg/clutterMaterials.js` 289–377, `src/director/Weather.js` 155–159):
//   · albedo `× mix(1.0, 0.72, wet)` — la hoja mojada es más oscura y saturada;
//   · rugosidad `mix(rough, 0.14, wet·0.7)` desde una base de 0,44–0,70 → la hoja
//     mojada ATERRIZA en ~0,25–0,40 (no en 0,14);
//   · `wetness` sigue a la lluvia con retardo: sube con rate 0,22, seca con 0,045
//     (`lerp(cur, tgt, 1 − exp(−dt·rate))`);
//   · la hojarasca casi no se moja (`rough − wet·0.06`, piso 0,68): «the living-leaf
//     wet path made these plastic» — el brillo uniforme sobre una superficie plana
//     lee como plástico.
//
// Qué se adapta al valle (forward `MeshStandardMaterial` r160, cards con alphaTest +
// núcleo de masa con color por vértice, sin envMap):
//   · el brillo de Sylva lo cierra su IBL/SSR; aquí, sin envMap, `indirectSpecular`
//     es 0 y una rugosidad baja solo se ve en el lóbulo del sol (que bajo lluvia
//     está a 0,7). Se suma un REFLEJO DE CIELO analítico: la luz hemisférica
//     (sky/ground) por el término de Fresnel integrado `DFGApprox` de three, en
//     DOS ganancias: `cielo` = F0·fab.x (velo de incidencia normal) y `rasante` =
//     F90·fab.y (Fresnel en siluetas). MEDIDO (2026-09-02, héroe de masa, lluvia y
//     sol): el velo a 1 sube la luma +5 %, baja la saturación −0,04 y APLANA la
//     cola especular (×0,95) — un cielo hemisférico uniforme reflejado es un velo
//     gris, lee como escarcha, no como agua → `cielo` default 0 (opt-in);
//     `rasante` queda (sheen solo donde la vista es rasante);
//   · anti-plástico: el agua se queda en las caras que miran ARRIBA
//     (`smoothstep(−0.35, 0.55, n·up)`) y la película se rompe en PARCHES
//     (value-noise 3D en espacio mundo, `uMojadoEscala`): la rugosidad varía
//     0,30…~0,8 dentro de la misma copa en vez de un espejo uniforme;
//   · la base del valle es rugosidad 1,0 → se fija el ATERRIZAJE (0,30,
//     `?mojadoRug=`) en vez de copiar la fórmula (que daría 0,40 y casi nada).
//
// Parche `onBeforeCompile` ENCADENADO (mismo patrón que `aplicarOclusionHorneada`):
// se conservan todos los anclajes `#include <…>` para que los parches previos
// (anti-centelleo, backlight, masaTipo, viento, AO horneada) sigan aplicando.
// `customProgramCacheKey` incluye el hash del `onBeforeCompile` previo: three
// solo mira el `toString()` del envoltorio EXTERIOR y dos cadenas distintas con
// el mismo exterior compartirían programa.
//
// Con `uMojado = 0` la salida es EXACTAMENTE el baseline (`mix(x, y, 0) = x`, el
// reflejo de cielo se multiplica por 0) → control del gate en la misma carga.
//
// Hook de gate: `window.__mojado = { activa, set(k|null), estado(), ajustar({…}),
// ocultar(v), update({ lluvia }) }`.

const VERT_COMMON = /* glsl */ `
#include <common>
varying vec3 vMojadoW;`;

// posición MUNDO del vértice (tras viento e instancia) para el ruido de parches
const VERT_WORLDPOS = /* glsl */ `
#include <worldpos_vertex>
{
  vec4 _mw = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    _mw = instanceMatrix * _mw;
  #endif
  vMojadoW = ( modelMatrix * _mw ).xyz;
}`;

const FRAG_COMMON = /* glsl */ `
#include <common>
uniform float uMojado, uMojadoOscurece, uMojadoRugosidad, uMojadoCielo, uMojadoRasante, uMojadoParche, uMojadoArriba, uMojadoEscala;
varying vec3 vMojadoW;
float mojadoHash( vec3 p ) {
  p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
  p += dot( p, p.yxz + 33.33 );
  return fract( ( p.x + p.y ) * p.z );
}
// value-noise 3D (8 hashes): la película de agua que se rompe en parches
float mojadoRuido( vec3 p ) {
  vec3 i = floor( p ), f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  float a = mojadoHash( i ),                          b = mojadoHash( i + vec3( 1.0, 0.0, 0.0 ) );
  float c = mojadoHash( i + vec3( 0.0, 1.0, 0.0 ) ), d = mojadoHash( i + vec3( 1.0, 1.0, 0.0 ) );
  float e = mojadoHash( i + vec3( 0.0, 0.0, 1.0 ) ), g = mojadoHash( i + vec3( 1.0, 0.0, 1.0 ) );
  float h = mojadoHash( i + vec3( 0.0, 1.0, 1.0 ) ), k = mojadoHash( i + vec3( 1.0, 1.0, 1.0 ) );
  return mix( mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y ),
              mix( mix( e, g, f.x ), mix( h, k, f.x ), f.y ), f.z );
}`;

// tras <normal_fragment_maps>: `normal` (view space, ya volteada en back faces) y
// `roughnessFactor` existen; `diffuseColor` ya lleva map/vertexColor/masaTipo.
const FRAG_MOJADO = /* glsl */ `
#include <normal_fragment_maps>
float mojadoK = 0.0;
{
  vec3 _arribaV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float _cielo = smoothstep( -0.35, 0.55, dot( normal, _arribaV ) );      // el agua se queda en las caras que miran arriba
  float _parche = mojadoRuido( vMojadoW * uMojadoEscala );                 // 0..1, película rota en parches
  float _cob = mix( 1.0, 0.25 + 0.75 * smoothstep( 0.25, 0.75, _parche ), uMojadoParche );
  float _wet = clamp( uMojado, 0.0, 1.0 );
  // núcleo de masa (esfera lisa de relleno, no hoja): se oscurece con la copa pero NO recibe
  // lóbulo especular — medido en el Pixel 2026-09-02: a rugosidad 0,3 la esfera daba un brillo
  // alargado de bola plástica. MOJADO_NUCLEO = material de núcleo entero; vMasaTipo = masa
  // fusionada (núcleo + cards en un material, flora.js).
  float _nucleo = 0.0;
  #ifdef MOJADO_NUCLEO
    _nucleo = 1.0;
  #endif
  #ifdef MOJADO_MASATIPO
    _nucleo = max( _nucleo, vMasaTipo < 0.5 ? 1.0 : 0.0 );
  #endif
  mojadoK = _wet * mix( 1.0, _cielo, uMojadoArriba ) * _cob * ( 1.0 - 0.9 * _nucleo );   // el BRILLO sigue a las caras al cielo y a los parches
  float _osc = _wet * mix( 1.0, _cielo, 0.35 );                            // el agua escurre: casi toda la hoja se oscurece
  diffuseColor.rgb *= mix( 1.0, uMojadoOscurece, _osc );                   // Sylva: alb *= mix(1, 0.72, wet)
  roughnessFactor = mix( roughnessFactor, uMojadoRugosidad, mojadoK );     // aterrizaje de Sylva (0,25–0,40), roto en parches
}`;

// la translucidez ilustrada (emissiveMap = map) se oscurece con la hoja
const FRAG_EMISIVO = /* glsl */ `
#include <emissivemap_fragment>
totalEmissiveRadiance *= mix( 1.0, uMojadoOscurece, clamp( uMojado, 0.0, 1.0 ) * mix( 1.0, smoothstep( -0.35, 0.55, dot( normal, normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) ) ), 0.35 ) );`;

// reflejo de cielo: sustituye la IBL de Sylva. Fresnel integrado (DFGApprox) sobre la
// luz hemisférica → sheen en las caras al cielo y en rasantes; la AO horneada lo
// atenúa después (su parche va en <aomap_fragment>, posterior a este anclaje).
const FRAG_CIELO = /* glsl */ `
#include <lights_fragment_end>
#if NUM_HEMI_LIGHTS > 0
if ( mojadoK > 0.0 && ( uMojadoCielo > 0.0 || uMojadoRasante > 0.0 ) ) {
  vec2 _fab = DFGApprox( geometryNormal, geometryViewDir, material.roughness );
  float _hemiW = 0.5 + 0.5 * dot( geometryNormal, hemisphereLights[ 0 ].direction );
  vec3 _rad = mix( hemisphereLights[ 0 ].groundColor, hemisphereLights[ 0 ].skyColor, _hemiW );
  // velo (incidencia normal, F0·fab.x): medido 2026-09-02 → lava el color y aplana la cola especular
  // (luma +5 %, saturación −0,04, cola ×0,95): lee como escarcha, no como agua → default 0.
  // rasante (Fresnel, F90·fab.y): sheen solo en las siluetas y caras rasantes al cielo.
  reflectedLight.indirectSpecular += _rad * ( material.specularColor * _fab.x * uMojadoCielo + material.specularF90 * _fab.y * uMojadoRasante ) * mojadoK;
}
#endif`;

function hashTexto(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export const DEFAULTS_MOJADO = Object.freeze({
  rugosidad: 0.30,   // aterrizaje de la hoja mojada de Sylva (mix(0.44…0.70, 0.14, 0.63))
  oscurece: 0.72,    // Sylva: alb *= mix(1, 0.72, wet)
  cielo: 0.0,        // velo de cielo (F0, incidencia normal): medido → lava el color (luma +5 %, sat −0,04); opt-in `?mojadoCielo=`
  rasante: 0.0,      // Fresnel rasante (F90·fab.y) sobre la luz hemisférica. MEDIDO (copa verde de
                     // masa, 42 % del cuadro): a 0,5 sube la luma +3 % y baja la cola especular de
                     // ×1,08 a ×0,91 (lluvia) / ×1,24 a ×1,04 (sol); en la copa rosada a ≥1 sale
                     // escarcha blanca en la parte alta → opt-in `?mojadoRasante=`.
  parche: 1.0,       // 0 = película uniforme (plástico), 1 = parches
  arriba: 0.75,      // peso de "las caras al cielo se mojan más"
  escala: 1.6,       // ciclos/m del ruido de parches (~0,6 m)
});

// `?mojado=1` (+ mojadoK, mojadoRug, mojadoOsc, mojadoCielo, mojadoParche, mojadoArriba, mojadoEscala)
export function leerParamsMojado(search) {
  const q = new URLSearchParams(search || '');
  if (q.get('mojado') !== '1') return null;
  const num = (k, d) => { const v = Number(q.get(k)); return q.get(k) !== null && Number.isFinite(v) ? v : d; };
  const clima = q.get('clima');
  return {
    // sin clima de lluvia el drive queda FIJO en 1 (gate A/B); con `?clima=lluvia`
    // sigue el factor del clima con el retardo de Sylva; `?mojadoK=` fuerza.
    fijo: q.get('mojadoK') !== null ? num('mojadoK', 1) : (clima === 'lluvia' ? null : 1),
    rugosidad: num('mojadoRug', DEFAULTS_MOJADO.rugosidad),
    oscurece: num('mojadoOsc', DEFAULTS_MOJADO.oscurece),
    cielo: num('mojadoCielo', DEFAULTS_MOJADO.cielo),
    rasante: num('mojadoRasante', DEFAULTS_MOJADO.rasante),
    parche: num('mojadoParche', DEFAULTS_MOJADO.parche),
    arriba: num('mojadoArriba', DEFAULTS_MOJADO.arriba),
    escala: num('mojadoEscala', DEFAULTS_MOJADO.escala),
  };
}

export function crearUniformesMojado(p = {}) {
  return {
    uMojado: { value: 0 },
    uMojadoRugosidad: { value: p.rugosidad ?? DEFAULTS_MOJADO.rugosidad },
    uMojadoOscurece: { value: p.oscurece ?? DEFAULTS_MOJADO.oscurece },
    uMojadoCielo: { value: p.cielo ?? DEFAULTS_MOJADO.cielo },
    uMojadoRasante: { value: p.rasante ?? DEFAULTS_MOJADO.rasante },
    uMojadoParche: { value: p.parche ?? DEFAULTS_MOJADO.parche },
    uMojadoArriba: { value: p.arriba ?? DEFAULTS_MOJADO.arriba },
    uMojadoEscala: { value: p.escala ?? DEFAULTS_MOJADO.escala },
  };
}

// Filtro por defecto: follaje = cards con alphaTest (FollajeMasa, héroes de masa,
// impostores) o núcleo de masa (vertexColors, normales suaves, sin map, rough 1).
// Quedan fuera a propósito: frailejón (tomentoso; flatShading), palmas/helechos
// low-poly (facetas grandes → plástico), troncos (Sylva: la corteza en pie sigue mate).
export function esMaterialFollaje(mat) {
  if (!mat || !mat.isMeshStandardMaterial) return false;
  if (mat.map && mat.alphaTest > 0 && !mat.transparent) return true;
  return !!mat.vertexColors && !mat.flatShading && !mat.map && mat.roughness >= 0.99 && (mat.metalness ?? 0) === 0;
}

// Parchea UN material (comparte los uniforms por referencia). Idempotente.
export function aplicarFollajeMojado(THREE, mat, U) {
  if (!mat || mat.userData?.__mojado) return mat;
  mat.userData = mat.userData || {};
  mat.userData.__mojado = true;
  const prev = mat.onBeforeCompile;
  const firmaPrev = prev ? hashTexto(prev.toString()) : '0';
  const prevKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey.bind(mat) : null;
  const esNucleo = !mat.map && !!mat.vertexColors;   // materialNucleo de FollajeMasa (sin map)
  mat.onBeforeCompile = (shader) => {
    if (prev) prev(shader);   // la cadena previa primero: conserva anclajes y deja ver qué declara
    Object.assign(shader.uniforms, U);
    const defs = (esNucleo ? '#define MOJADO_NUCLEO\n' : '') + (/varying float vMasaTipo;/.test(shader.fragmentShader) ? '#define MOJADO_MASATIPO\n' : '');
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERT_COMMON)
      .replace('#include <worldpos_vertex>', VERT_WORLDPOS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', defs + FRAG_COMMON)
      .replace('#include <normal_fragment_maps>', FRAG_MOJADO)
      .replace('#include <emissivemap_fragment>', FRAG_EMISIVO)
      .replace('#include <lights_fragment_end>', FRAG_CIELO);
  };
  mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|mojado:${firmaPrev}`;
  mat.needsUpdate = true;
  return mat;
}

/**
 * Parchea todo el follaje bajo `raiz` y devuelve el controlador (+ `window.__mojado`).
 * `params` = leerParamsMojado(); `filtro(mat, mesh)` opcional.
 */
export function crearFollajeMojado(THREE, { raiz, params = {}, filtro = null } = {}) {
  const U = crearUniformesMojado(params);
  const acepta = filtro || ((mat) => esMaterialFollaje(mat));
  const materiales = new Set();
  const mallas = [];
  if (raiz) {
    raiz.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      let alguno = false;
      for (const m of mats) {
        if (!acepta(m, o)) continue;
        aplicarFollajeMojado(THREE, m, U);
        materiales.add(m);
        alguno = true;
      }
      if (alguno) mallas.push(o);
    });
  }

  let fijo = params.fijo ?? 1;   // null = sigue la lluvia con retardo
  let drive = fijo ?? 0;
  let ultimo = null;
  U.uMojado.value = drive;

  // retardo de Sylva (Weather.js 155–159): sube con 0,22, seca con 0,045
  function update({ lluvia = 0 } = {}) {
    const ahora = performance.now();
    const dt = ultimo === null ? 0 : Math.min((ahora - ultimo) / 1000, 0.25);
    ultimo = ahora;
    if (fijo !== null && fijo !== undefined) { drive = fijo; }
    else {
      const meta = Math.min(1, Math.max(0, lluvia * 1.25));
      const rate = drive < meta ? 0.22 : 0.045;
      drive += (meta - drive) * (1 - Math.exp(-dt * rate));
    }
    U.uMojado.value = drive;
    return drive;
  }

  const api = {
    activa: materiales.size > 0,
    uniforms: U,
    materiales: materiales.size,
    mallas: mallas.map((m) => m.name || m.type),
    // set(k): fija el drive (0 = baseline exacto, 1 = mojado pleno); set(null) → sigue la lluvia
    set(k) {
      fijo = k === null || k === undefined ? null : Math.min(1, Math.max(0, Number(k)));
      if (fijo !== null) { drive = fijo; U.uMojado.value = drive; }
      return api.estado();
    },
    ajustar(o = {}) {
      if (o.rugosidad !== undefined) U.uMojadoRugosidad.value = o.rugosidad;
      if (o.oscurece !== undefined) U.uMojadoOscurece.value = o.oscurece;
      if (o.cielo !== undefined) U.uMojadoCielo.value = o.cielo;
      if (o.rasante !== undefined) U.uMojadoRasante.value = o.rasante;
      if (o.parche !== undefined) U.uMojadoParche.value = o.parche;
      if (o.arriba !== undefined) U.uMojadoArriba.value = o.arriba;
      if (o.escala !== undefined) U.uMojadoEscala.value = o.escala;
      return api.estado();
    },
    // oculta/muestra las mallas parcheadas (máscara exacta del follaje para el gate)
    ocultar(v) { for (const m of mallas) m.visible = !v; return mallas.length; },
    estado() {
      return {
        activa: api.activa, drive: +drive.toFixed(4), fijo, materiales: materiales.size, mallas: api.mallas.length,
        params: { rugosidad: U.uMojadoRugosidad.value, oscurece: U.uMojadoOscurece.value, cielo: U.uMojadoCielo.value, rasante: U.uMojadoRasante.value,
          parche: U.uMojadoParche.value, arriba: U.uMojadoArriba.value, escala: U.uMojadoEscala.value },
      };
    },
    update,
  };
  if (typeof window !== 'undefined') window.__mojado = api;
  return api;
}

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
