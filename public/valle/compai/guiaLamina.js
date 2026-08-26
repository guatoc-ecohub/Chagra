// ── guía 2.5D opt-in del valle ─────────────────────────────────────────────
// El recorte, el alfa y la orientación vienen del mismo montador que usa
// Chagra Kart. Este módulo sólo aporta el ancla del valle: no redibuja arte ni
// mantiene un registry paralelo.
import * as THREE from 'three';
import { height } from '../terrain.js';
import { LAMINAS, montarPilotoLamina } from '../juegos/chagra-kart/js/piloto-lamina.js';

const TIPO = 'oso';
const PUESTO = { x: -58, z: -96 };

/**
 * Monta una sola guía de lámina cuando el operador la habilita explícitamente.
 * El default apagado vive en esta firma para que ningún llamador sin opciones
 * pueda publicar la dosis completa por accidente.
 */
export function crearCompaiGuia({ scene, camera, activo = false } = {}) {
  const qs = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
  if (!activo || !qs || qs.get('compai') !== '1') return null;
  if (!scene || !camera || !LAMINAS[TIPO]) return null;

  // En el modo opt-in la lámina reemplaza la guía DOM del valle, para que el
  // cuadro siga mostrando UN solo compai. La URL pelada nunca entra aquí.
  const guiaDom = document.getElementById('guiaV');
  if (guiaDom) guiaDom.hidden = true;

  const soporte = new THREE.Group();
  soporte.name = 'compai-guia-lamina-oso';
  soporte.userData.id = 'compai-guia-valle';
  soporte.position.set(PUESTO.x, height(PUESTO.x, PUESTO.z), PUESTO.z);
  // El registro del kart permite que el montador funcione sin fabricar un
  // segundo sistema de planos.  1.2 × 0.78 u ≈ 0.94 u: tamaño de una persona
  // de 1,6 m a la escala K=0.6 del valle, no de un árbol.
  soporte.scale.setScalar(1.2);
  scene.add(soporte);

  const lamina = montarPilotoLamina(THREE, soporte, { tipo: TIPO });
  if (!lamina) {
    scene.remove(soporte);
    if (guiaDom) guiaDom.hidden = false;
    return null;
  }

  soporte.userData.compaiGuia = { tipo: TIPO, puesto: { ...PUESTO }, lamina };
  window.__compaiGuia2d = {
    activo: true,
    tipo: TIPO,
    puesto: { ...PUESTO },
    alturaTerreno: soporte.position.y,
    lamina,
  };

  return {
    grupo: soporte,
    lamina,
    tipo: TIPO,
    update() {},
  };
}
