/*
 * SombraContacto — la sombra de contacto FALSA (AO barato) del framework 3D.
 *
 * Los DRs de auditoría 3D (B5/B6, 2026-07-11) piden que los mundos dejen de
 * verse "a la deriva" SIN pagar shadow-maps reales en teléfono. Esto es el
 * truco claymation clásico: un plano horizontal con un degradado radial que
 * se desvanece a transparente. Una sola CanvasTexture (128px, cacheada a nivel
 * de módulo, blanca → tintable con `color`) sirve para TODO: la alfombra de
 * suelo bajo el diorama, el anillo de sombra que lo "posa", y la sombrita que
 * persigue a la abeja. Cero luces extra, cero render targets, cero por-frame
 * (salvo quien mueva el mesh vía `refExt`, como hace useEntradaAbeja).
 *
 * `depthWrite: false` + `renderOrder` para que los velos se apilen sin pelear
 * por el z-buffer; el depth-TEST queda activo, así el diorama los ocluye
 * correctamente cuando corresponde.
 */
import * as THREE from 'three';

let _tex = null;
function texturaRadial() {
  if (!_tex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    _tex = new THREE.CanvasTexture(c);
  }
  return _tex;
}

export function SombraContacto({
  refExt, pos = [0, 0, 0], radio = 0.5, color = '#2e2012', opacidad = 0.35, orden = 2,
}) {
  return (
    <mesh ref={refExt} position={/** @type {[number, number, number]} */ (pos)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={orden}>
      <planeGeometry args={[radio * 2, radio * 2]} />
      <meshBasicMaterial
        map={texturaRadial()}
        color={color}
        transparent
        opacity={opacidad}
        depthWrite={false}
      />
    </mesh>
  );
}
