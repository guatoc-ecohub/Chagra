/*
 * materialValle — LA FAMILIA ÚNICA DE SHADER del valle (fábrica three).
 *
 * Corrección #1 de AUDITORIA-VALLE.md: cuatro modelos de material (Standard,
 * Lambert, Basic, Phong) competían en el mismo cuadro. Aquí queda UNO:
 *
 *   · Todo material físico opaco → MeshToonMaterial con LA MISMA rampa de
 *     tres bandas (RAMPA_BANDAS de paletaValle). La variación entre piezas
 *     es el COLOR de la muestra aprobada, nunca el modelo de respuesta.
 *   · flatShading: false SIEMPRE. La banda es el lenguaje; el relieve es
 *     geometría (regla heredada de EntQuenua y ahora ley del valle).
 *   · El agua es el único material transparente (toon + opacity 0.85).
 *   · MeshBasicMaterial queda reservado a EMISIVOS (ventana, candela, luna,
 *     portal) y al cielo. Nada físico se dibuja sin responder a la luz.
 *
 * TIER: la rampa toon cuesta lo mismo que Lambert (una lectura de textura
 * 16×1). Por eso la familia NO cambia por tier — ese era exactamente el
 * origen de la deriva (rico→Standard, humilde→Lambert: dos películas). El
 * tier sigue mandando en dpr, sombras, fog y densidad, no en el sombreado.
 *
 * USO (los creadores son PUROS; la escena memoiza y libera):
 *   const mat = useMemo(() => crearMaterialValle('teja'), []);
 *   useEffect(() => () => mat.dispose(), [mat]);
 *
 * El contorno tinta (habitantes e interactivos) es casco invertido:
 *   <mesh geometry={geo} material={mat} />
 *   <mesh geometry={geo} material={materialContorno()} scale={escalaCasco} />
 * con escala derivada de grosorContornoMundo (≈1.5 px de pantalla).
 */
import * as THREE from 'three';
import {
  MUESTRAS,
  EMISIVOS,
  RAMPA_BANDAS,
  REGLA_BORDE,
  RELACION_LUZ,
  COMPENSACION_CLAVE,
  REPARTO_RELLENO,
} from './paletaValle.js';

/* ------------------------------------------------------------------ */
/* La rampa: UNA DataTexture de 16×1 con tres escalones duros.         */
/* Singleton de módulo: todos los materiales comparten la textura.     */
/* ------------------------------------------------------------------ */
let rampaCompartida = null;

export function rampaValle() {
  if (rampaCompartida) return rampaCompartida;
  const ancho = 16;
  const datos = new Uint8Array(ancho * 4);
  for (let i = 0; i < ancho; i += 1) {
    const t = i / (ancho - 1);
    /* tres bandas parejas: [0, 1/3) sombra, [1/3, 2/3) media, [2/3, 1] luz */
    const banda = t < 1 / 3 ? RAMPA_BANDAS[0] : t < 2 / 3 ? RAMPA_BANDAS[1] : RAMPA_BANDAS[2];
    const v = Math.round(banda * 255);
    datos.set([v, v, v, 255], i * 4);
  }
  const tex = new THREE.DataTexture(datos, ancho, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  rampaCompartida = tex;
  return tex;
}

/**
 * EL material del valle. `nombre` es una muestra aprobada de paletaValle
 * ('teja', 'follajeCerca', 'agua'…). No existe otro camino legal para crear
 * un material físico en el valle.
 *
 * @param {keyof typeof MUESTRAS} nombre  muestra aprobada
 * @param {object} [extra]  overrides finales (p. ej. { color } SOLO si el hex
 *                          viene de la paleta madre — corteza de especie)
 * @returns {THREE.MeshToonMaterial}
 */
export function crearMaterialValle(nombre, extra = {}) {
  const muestra = MUESTRAS[nombre];
  if (!muestra) throw new Error(`materialValle: muestra desconocida '${nombre}'`);
  const props = {
    color: muestra.hex,
    gradientMap: rampaValle(),
    ...(nombre === 'agua' ? { transparent: true, opacity: 0.85 } : {}),
    ...extra,
  };
  return new THREE.MeshToonMaterial(props);
}

/**
 * Variante para mallas fusionadas con color por vértice (el patrón de
 * siembra/terreno horneado): un material, los colores en la geometría.
 * Los colores de vértice TAMBIÉN deben salir de las muestras aprobadas.
 * @returns {THREE.MeshToonMaterial}
 */
export function crearMaterialValleVertexColors() {
  return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: rampaValle() });
}

/**
 * Material emisivo con permiso (ventana, candela, luna, portal). Cualquier
 * otro brillo sin fuente diegética se apaga en origen (auditoría 4.2).
 * @param {keyof typeof EMISIVOS} nombre
 * @returns {THREE.MeshBasicMaterial}
 */
export function crearMaterialEmisivo(nombre, extra = {}) {
  const hex = EMISIVOS[nombre];
  if (!hex) throw new Error(`materialValle: emisivo sin permiso '${nombre}'`);
  return new THREE.MeshBasicMaterial({ color: hex, toneMapped: false, ...extra });
}

/**
 * El material del contorno tinta (casco invertido, BackSide). Uno solo,
 * compartible entre todos los habitantes e interactivos de una escena.
 * @returns {THREE.MeshBasicMaterial}
 */
export function crearMaterialContorno() {
  return new THREE.MeshBasicMaterial({
    color: REGLA_BORDE.habitante.color,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

/* ------------------------------------------------------------------ */
/* La luz de la ley: colores y posición del sol vienen del preset       */
/* aprobado (CIELOS_HORA); las INTENSIDADES aplican la relación         */
/* relleno/clave de la franja (auditoría 4.1: el 90% fijo aplanaba      */
/* todas las horas). Datos puros: la escena monta las cuatro luces.     */
/* ------------------------------------------------------------------ */

/**
 * Deriva el rig de luz de la ley para un preset de CIELOS_HORA.
 * @param {object} preset  CIELOS_HORA[franja]
 * @param {keyof typeof RELACION_LUZ} franja
 * @returns {{ clave: number, hemisferio: number, ambiente: number, contra: number }}
 */
export function intensidadesDeLey(preset, franja) {
  const relacion = RELACION_LUZ[franja] ?? 0.5;
  const clave = preset.sol * preset.intensidad * COMPENSACION_CLAVE;
  const relleno = clave * relacion;
  return {
    clave,
    hemisferio: relleno * REPARTO_RELLENO.hemisferio,
    ambiente: relleno * REPARTO_RELLENO.ambiente,
    contra: relleno * REPARTO_RELLENO.contra,
  };
}
