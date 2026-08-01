/*
 * kit/bandas — el COLOR POR BANDAS de la toma B (toon de N pasos), compartido.
 *
 * La toma B del bosque (#2510) probó la clave estilizada Switch/BOTW: UN
 * gradientMap escalonado (NearestFilter) compartido por todos los materiales
 * toon de la escena — las bandas de luz + el color por vértice = ilustración
 * en movimiento, silueta fuerte, cero texturas externas. Aquí vive la textura
 * canónica para que cafetal, cacaotal y quien venga bandeen IGUAL (mismos
 * escalones = misma familia visual), en vez de que cada escena hornee la suya.
 *
 * Uso (en la escena, con material JSX de r3f — r3f ya gestiona el dispose):
 *   const bandas = useGradienteBandas();
 *   <meshToonMaterial vertexColors gradientMap={bandas} />
 *
 * Importa three (DataTexture) → solo para archivos de escena (chunk
 * vendor-three), como el resto del kit.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/* Los escalones canónicos de la toma B: 4 pasos, del hueco de sombra (70) al
   plano al sol (255). Menos pasos = más cartel; más pasos = más suave. */
const PASOS_TAKE_B = [70, 128, 192, 255];

/**
 * Crea el gradientMap escalonado (pura, three-core; el llamador es dueño de la
 * textura y de su dispose). Con `pasos` distinto de 4 interpola linealmente
 * entre los extremos canónicos.
 *
 * @param {number} [pasos=4]  número de bandas de luz.
 * @returns {THREE.DataTexture} textura 1×N lista como `gradientMap`.
 */
export function crearGradienteBandas(pasos = 4) {
  const datos =
    pasos === PASOS_TAKE_B.length
      ? new Uint8Array(PASOS_TAKE_B)
      : new Uint8Array(
          Array.from({ length: pasos }, (_, i) =>
            Math.round(70 + (185 * i) / Math.max(1, pasos - 1)),
          ),
        );
  const tex = new THREE.DataTexture(datos, pasos, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Hook: EL gradiente de bandas de la escena, memoizado y con dispose al
 * desmontar. Compártalo entre TODOS los `<meshToonMaterial>` de la escena
 * (esa unidad es el look).
 *
 * @param {number} [pasos=4]
 * @returns {THREE.DataTexture}
 */
export function useGradienteBandas(pasos = 4) {
  const tex = useMemo(() => crearGradienteBandas(pasos), [pasos]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
