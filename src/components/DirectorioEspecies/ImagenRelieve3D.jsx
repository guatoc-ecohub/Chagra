import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { crearGeometriaRelieveImagen } from '../../visual/mundo3d/kit/relieveImagen.js';

/**
 * Convierte una foto de referencia en un relieve visual pequeño para la
 * lámina. No muta catálogo, Assets ni Logs. Si el origen no permite CORS o no
 * se puede leer como pixels, simplemente no añade la malla.
 */
export default function ImagenRelieve3D({
  src,
  position = [0, -0.9, 0],
  ancho = 2.8,
  fondo = 1.9,
  profundidad = 0.14,
}) {
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!src || typeof Image === 'undefined' || typeof document === 'undefined') return undefined;

    let active = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context || !canvas.width || !canvas.height) return;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        if (active) setSource({ data, image, src });
      } catch {
        // La imagen se sigue mostrando en la portada. El relieve es opcional.
      }
    };
    image.src = src;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  const geometry = useMemo(() => {
    if (!source || source.src !== src) return null;
    return crearGeometriaRelieveImagen({
      data: source.data.data,
      width: source.data.width,
      height: source.data.height,
      ancho,
      fondo,
      profundidad,
      segmentsX: 32,
      segmentsZ: 24,
      contrast: 1.15,
    });
  }, [ancho, fondo, profundidad, source, src]);

  const texture = useMemo(() => {
    if (!source || source.src !== src) return null;
    const nextTexture = new THREE.Texture(source.image);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [source, src]);

  useEffect(() => () => {
    geometry?.dispose();
  }, [geometry]);

  useEffect(() => () => {
    texture?.dispose();
  }, [texture]);

  if (!geometry || !texture) return null;

  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial
        map={texture}
        color="#dce7bd"
        roughness={0.92}
        metalness={0}
        transparent
        opacity={0.86}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
