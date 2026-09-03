/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/flora/vientoMundos.js` (valle). Se trae al bundle
 * de la PWA para el descenso por la Sierra.
 *
 * Licencia: MIT (Sylva / Token-Gremlin), notice completo al pie del archivo.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
// ── VIENTO COMPARTIDO PARA MUNDOS AUTÓNOMOS ──────────────────────────────────
// Regla dura del operador: en TODOS los mundos los árboles se MUEVEN — prohibido
// que parezcan un muerto.
//
// Los mundos autónomos (bosque.js, cafetal.js, aguacatal.js, papa.js, mercado.js,
// ceiba.js, abejas.js, invernadero.js, ...) NO usan `materialFoliaje` de
// ArbolFabrica: arman su follaje con geometría procedural low-poly (color por
// vértice, flat shading Ghibli) y un `MeshStandardMaterial` plano. Ese material
// no lee `uTiempoFol`, así que sus copas quedaban CLAVADAS (uniforme de tiempo = 0).
//
// Este módulo parchea CUALQUIER material (vía onBeforeCompile) con un meneo de
// copa barato: desplaza los vértices ALTOS en XZ según una onda de tiempo; la base
// (Y bajo) queda quieta → el tronco no se dobla, la copa se bambolea. Funciona con
// InstancedMesh (desfasa por origen de instancia) y con mallas sueltas (Ent).
//
// VIENTO COHERENTE (upgrade 2026-08-10): adaptado de three-stylized
// (Steve245270533, MIT; vía cortiz2894/stylized-components — el material de
// pasto del que se adaptó). La clave del original: como cada instancia tiene
// rotación Y aleatoria y escala no uniforme, el viento se calcula en ESPACIO
// MUNDO y se PROYECTA sobre los ejes de la instancia. Sin esa proyección cada
// hoja/copa se mueve para su lado y el campo tiembla como estática en vez de
// ondular. Dos ondas co-primas: la secundaria perpendicular a 1,7× la frecuencia
// y 0,73× la velocidad (no se repite a la vista). Acá el `tipMask` sigue siendo
// por ALTURA local del vértice (uv.y de las cards de FollajeMasa no es altura),
// como en la versión previa: base quieta, copa que se dobla hacia la punta.
//
// El mismo bloque se inyecta en la pasada de PROFUNDIDAD (sombra): si solo se
// parcheara el material visible, la hoja se dobla y su sombra se queda clavada en
// la pose de reposo (bug de sombra, ver ff70733). Misma ecuación y mismos
// uniforms en ambos pasos = la sombra ondula con la planta.
//
// No hay atributo `aViento` horneado en estos mundos, así que el PESO del meneo lo
// da la altura LOCAL del vértice sobre un umbral (uVientoPiso): follaje bajo casi
// no se mueve, copas altas sí. Un solo uniform de tiempo GLOBAL compartido por
// referencia entre todos los materiales parcheados → basta llamar tickVientoMundos(t)
// una vez por frame en el loop de cada mundo.
import * as THREE from 'three';

// uniform de tiempo GLOBAL (compartido por referencia por todos los materiales)
export const uniformesVientoMundo = {
  uTiempoVM: { value: 0 },
  uFuerzaVM: { value: 1.0 },
  // dirección MUNDO del viento (XZ normalizado) + turbulencia + frecuencia espacial
  uDirVM: { value: new THREE.Vector2(0.82, 0.57).normalize() },
  uTurbVM: { value: 0.42 },
  uFrecVM: { value: 0.55 },
};

// avanza el reloj del viento de mundos. Llamar 1×/frame en el loop de cada mundo,
// con t = clock.getElapsedTime() (segundos). Ráfagas de dos ondas co-primas para
// que respire (calmas y vendavales), igual que el valle principal.
export function tickVientoMundos(t) {
  uniformesVientoMundo.uTiempoVM.value = t;
  const rafaga = 0.55 * Math.sin(t * 0.061) + 0.30 * Math.sin(t * 0.148 + 1.7);
  uniformesVientoMundo.uFuerzaVM.value = 0.95 + rafaga * 0.42; // ~0.53–1.37
  // hook de gate: la sonda funcional lee window.__vientoVM.t para confirmar que el
  // reloj del viento AVANZA (no clavado en 0 = árbol muerto).
  if (typeof window !== 'undefined') {
    window.__vientoVM = { t: uniformesVientoMundo.uTiempoVM.value, f: uniformesVientoMundo.uFuerzaVM.value };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  BLOQUE COMPARTIDO visible/profundidad — la deformación de viento coherente.
//  Se inyecta en `#include <begin_vertex>` de MeshStandardMaterial (visible) y
//  de MeshDepthMaterial (sombra): los dos pasos usan EXACTAMENTE la misma
//  ecuación, o la sombra queda clavada en la pose de reposo.
//  Requiere los uniforms del `bloqueUniformesVM` de abajo (uTiempoVM, uFuerzaVM,
//  uAmpVM, uPisoVM, uVelVM, uDirVM, uTurbVM, uFrecVM).
// ═════════════════════════════════════════════════════════════════════════════
const BLOQUE_VIENTO_COHERENTE = /* glsl */ `
  {
    // origen MUNDO de la instancia (o del modelo) → la onda viaja por el mundo,
    // no por el espacio local de cada árbol: es lo que hace el viento COHERENTE.
    vec3 _oInst = vec3(0.0);
    #ifdef USE_INSTANCING
      _oInst = instanceMatrix[3].xyz;
    #endif
    vec3 _mInst = (modelMatrix * vec4(_oInst, 1.0)).xyz;
    vec2 _dirW = normalize(uDirVM);
    vec2 _perpW = vec2(-_dirW.y, _dirW.x);
    // onda primaria en la dirección del viento + secundaria perpendicular a
    // 1,7× la frecuencia y 0,73× la velocidad (no se repite a la vista).
    float _ondaP = sin(dot(_mInst.xz, _dirW) * uFrecVM + uTiempoVM * uVelVM);
    float _ondaS = sin(dot(_mInst.xz, _perpW) * uFrecVM * 1.7 + uTiempoVM * uVelVM * 0.73) * uTurbVM;
    vec3 _vientoMundo = vec3(_dirW.x, 0.0, _dirW.y) * (_ondaP + _ondaS);
    // ejes MUNDO de la instancia → proyección del viento a espacio LOCAL.
    // La instancia tiene rotación Y aleatoria y escala no uniforme; proyectar
    // sobre sus ejes convierte el viento mundial coherente en desplazamiento
    // local que, transformado, reproduce el mismo viento en el mundo.
    mat3 _eje;
    #ifdef USE_INSTANCING
      _eje = mat3(modelMatrix * instanceMatrix);
    #else
      _eje = mat3(modelMatrix);
    #endif
    vec3 _vientoLocal = vec3(
      dot(_vientoMundo, _eje[0]) / max(dot(_eje[0], _eje[0]), 1e-5),
      dot(_vientoMundo, _eje[1]) / max(dot(_eje[1], _eje[1]), 1e-5),
      dot(_vientoMundo, _eje[2]) / max(dot(_eje[2], _eje[2]), 1e-5)
    );
    // máscara de punta: base quieta (lo que quede bajo uPisoVM sobre el eje de
    // peso no se mueve), la copa/hoja se dobla hacia la punta. El eje del peso
    // es configurable (uEjePesoVM): las copas pesan por Y local, pero la hoja
    // de roseta del frailejón crece a lo largo de +X local.
    float _peso = max(dot(transformed, uEjePesoVM) - uPisoVM, 0.0);
    transformed += _vientoLocal * (uAmpVM * _peso * uFuerzaVM);
  }
`;

// uniforms que el bloque necesita (para inyectar en un material o depth material)
const UNIFORMS_VIENTO_BLOQUE = /* glsl */ `
  uniform float uTiempoVM, uFuerzaVM, uAmpVM, uPisoVM, uVelVM;
  uniform vec2 uDirVM;
  uniform float uTurbVM, uFrecVM;
  uniform vec3 uEjePesoVM;
`;

/**
 * Parchea un material para menear la copa con el viento global COHERENTE.
 * @param {THREE.Material} mat  material a animar (se muta in-place; devuelve el mismo)
 * @param {object} opts
 *   amplitud    {number}  desplazamiento máx en unidades de mundo por 1 de altura (def 0.10)
 *   piso        {number}  altura LOCAL (Y del vértice) bajo la cual NO hay meneo (def 1.2)
 *   velocidad   {number}  velocidad de la onda (def 1.05)
 *   direccion   {[x,z]}   dirección MUNDO del viento, XZ sin normalizar (def global uDirVM)
 *   turbulencia {number}  fuerza de la onda secundaria perpendicular (def 0.42)
 *   frecuencia  {number}  frecuencia espacial de la onda (rad/und. de mundo, def 0.55)
 *   ejePeso     {[x,y,z]} eje LOCAL del peso del meneo (def [0,1,0] = por altura);
 *                         la hoja de roseta del frailejón pesa por [1,0,0]
 * @returns {THREE.Material}
 */
export function aplicarVientoMundo(mat, opts = {}) {
  const amplitud = opts.amplitud ?? 0.10;
  const piso = opts.piso ?? 1.2;
  const velocidad = opts.velocidad ?? 1.05;
  const direccion = opts.direccion;
  const turbulencia = opts.turbulencia ?? uniformesVientoMundo.uTurbVM.value;
  const frecuencia = opts.frecuencia ?? uniformesVientoMundo.uFrecVM.value;
  const ejePeso = opts.ejePeso ?? [0, 1, 0];
  if (mat.userData && mat.userData.__vientoMundo) return mat; // idempotente
  mat.userData = mat.userData || {};
  mat.userData.__vientoMundo = true;
  mat.userData.__vientoMundoOpciones = { amplitud, piso, velocidad, direccion, turbulencia, frecuencia, ejePeso };

  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempoVM = uniformesVientoMundo.uTiempoVM;
    shader.uniforms.uFuerzaVM = uniformesVientoMundo.uFuerzaVM;
    shader.uniforms.uDirVM = uniformesVientoMundo.uDirVM;
    shader.uniforms.uTurbVM = uniformesVientoMundo.uTurbVM;
    shader.uniforms.uFrecVM = uniformesVientoMundo.uFrecVM;
    shader.uniforms.uAmpVM = { value: amplitud };
    shader.uniforms.uPisoVM = { value: piso };
    shader.uniforms.uVelVM = { value: velocidad };
    shader.uniforms.uEjePesoVM = { value: new THREE.Vector3(ejePeso[0], ejePeso[1], ejePeso[2]) };
    if (direccion) shader.uniforms.uDirVM = { value: new THREE.Vector2(direccion[0], direccion[1]).normalize() };
    if (turbulencia !== uniformesVientoMundo.uTurbVM.value) shader.uniforms.uTurbVM = { value: turbulencia };
    if (frecuencia !== uniformesVientoMundo.uFrecVM.value) shader.uniforms.uFrecVM = { value: frecuencia };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        ${UNIFORMS_VIENTO_BLOQUE}`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${BLOQUE_VIENTO_COHERENTE}`
      );
    if (prev) prev(shader);
  };
  mat.needsUpdate = true;
  return mat;
}

// El shadow pass no reutiliza el material visible: Three.js renderiza
// `customDepthMaterial` con su propio vertex shader. Si solo se parchea el
// material visible, el follaje se mueve pero la sombra conserva la pose de
// reposo. Este helper copia la MISMA ecuación y los mismos uniforms al depth
// material de una malla que efectivamente proyecta sombra — incluyendo el
// viento COHERENTE, para que la sombra ondula con la planta.
export function aplicarVientoSombra(mesh, opts = {}) {
  if (!mesh || !mesh.castShadow) return mesh;
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const guardadas = material?.userData?.__vientoMundoOpciones;
  const amplitud = opts.amplitud ?? guardadas?.amplitud;
  const piso = opts.piso ?? guardadas?.piso;
  const velocidad = opts.velocidad ?? guardadas?.velocidad;
  const direccion = opts.direccion ?? guardadas?.direccion;
  const turbulencia = opts.turbulencia ?? guardadas?.turbulencia ?? uniformesVientoMundo.uTurbVM.value;
  const frecuencia = opts.frecuencia ?? guardadas?.frecuencia ?? uniformesVientoMundo.uFrecVM.value;
  const ejePeso = opts.ejePeso ?? guardadas?.ejePeso ?? [0, 1, 0];
  if (amplitud == null || piso == null || velocidad == null) return mesh;
  if (mesh.customDepthMaterial?.userData?.__vientoMundoSombra) return mesh;

  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaTest: material?.alphaTest ?? 0,
    side: material?.side ?? THREE.FrontSide,
    map: material?.map ?? null,
    alphaMap: material?.alphaMap ?? null,
  });
  depth.userData.__vientoMundoSombra = true;
  depth.userData.__vientoMundoOpciones = { amplitud, piso, velocidad, direccion, turbulencia, frecuencia, ejePeso };
  depth.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempoVM = uniformesVientoMundo.uTiempoVM;
    shader.uniforms.uFuerzaVM = uniformesVientoMundo.uFuerzaVM;
    shader.uniforms.uDirVM = uniformesVientoMundo.uDirVM;
    shader.uniforms.uTurbVM = uniformesVientoMundo.uTurbVM;
    shader.uniforms.uFrecVM = uniformesVientoMundo.uFrecVM;
    shader.uniforms.uAmpVM = { value: amplitud };
    shader.uniforms.uPisoVM = { value: piso };
    shader.uniforms.uVelVM = { value: velocidad };
    shader.uniforms.uEjePesoVM = { value: new THREE.Vector3(ejePeso[0], ejePeso[1], ejePeso[2]) };
    if (direccion) shader.uniforms.uDirVM = { value: new THREE.Vector2(direccion[0], direccion[1]).normalize() };
    if (turbulencia !== uniformesVientoMundo.uTurbVM.value) shader.uniforms.uTurbVM = { value: turbulencia };
    if (frecuencia !== uniformesVientoMundo.uFrecVM.value) shader.uniforms.uFrecVM = { value: frecuencia };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        ${UNIFORMS_VIENTO_BLOQUE}`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${BLOQUE_VIENTO_COHERENTE}`
      );
  };
  mesh.customDepthMaterial = depth;
  return mesh;
}

// ── auto-tick idempotente del reloj de viento global ─────────────────────────
// (subido desde quickGrass.js para que TODA la flora lo comparta.) Si el host
// NO llama tickVientoMundos en su loop, el reloj uTiempoVM se queda en 0 y la
// planta no se mece (árbol muerto). Arrancamos un rAF único (una sola vez por
// página) que avanza el reloj SOLO si nadie más lo tocó en el último frame.
// Así la flora respira aunque el host la ignore, y si el host SÍ avanza el
// reloj, nos hacemos a un lado (no duplicamos el tiempo).
let _autoTickOn = false;
export function asegurarRelojViento() {
  if (_autoTickOn || typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
  _autoTickOn = true;
  const reloj = new THREE.Clock();
  let ultimoVisto = uniformesVientoMundo.uTiempoVM.value;
  const paso = () => {
    const actual = uniformesVientoMundo.uTiempoVM.value;
    // si el reloj no avanzó desde el frame pasado, lo empujamos nosotros
    if (Math.abs(actual - ultimoVisto) < 1e-6) {
      tickVientoMundos(reloj.getElapsedTime());
    } else {
      reloj.getElapsedTime(); // mantener el clock sincronizado sin pisar al host
    }
    ultimoVisto = uniformesVientoMundo.uTiempoVM.value;
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
