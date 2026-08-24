/* Harness del gate de arte de patas — NO versionado (vive en _gate/).
 *
 * Dos modos:
 *   ?fase=0.56   → fotograma DETERMINISTA de marcha: monta el compai con
 *                  animated=false (cero animación CSS/rAF) y escribe a mano
 *                  las vars --jlv-anda-* con poseMarcha(fase). Mismo encuadre,
 *                  misma fase ⇒ A/B válido antes/después del arte.
 *   (sin fase)   → estado vivo normal (?estado=caminando por defecto).
 * ?anim=0 = control negativo del medidor de movimiento.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import JaguarLaminaViva from '/src/visual/creatures/JaguarLaminaViva.jsx';
import { poseMarcha } from '/src/visual/creatures/jaguarLamina/marcha.js';
import { ANCHO } from '/src/visual/creatures/jaguarLamina/anatomia.js';

const q = new URLSearchParams(location.search);
const fase = q.get('fase') !== null ? Number(q.get('fase')) : null;
const size = Number(q.get('size') || 560);
const estado = q.get('estado') || 'caminando';
const animated = fase === null && q.get('anim') !== '0';
const plano = q.get('plano') === '1';

/* ?plano=1 → SOLO la lámina aprobada, en la MISMA geometría de stage que usa
   el componente (mismo tamaño/posición) — el lado B del diff de reposo. */
const ASPECTO = 705 / 394;
const contenido = plano
  ? React.createElement(
    'div',
    { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }, 'data-plano': '1' },
    React.createElement('img', {
      src: '/compai/laminas/jaguar-natural.png',
      style: { width: size, height: size / ASPECTO, display: 'block' },
      alt: '',
    }),
  )
  : React.createElement(JaguarLaminaViva, {
    estado: fase === null ? estado : 'idle',
    size,
    animated,
    tier: 'alto',
  });

createRoot(document.getElementById('root')).render(
  React.createElement(
    'div',
    { style: { display: 'grid', placeItems: 'center', height: '100vh', background: '#e9e4d6' } },
    contenido,
  ),
);

if (fase !== null) {
  // Congela la pose: escribe las vars que el CSS de los pivotes ya consume.
  const escala = size / ANCHO;
  const aplicar = () => {
    const raiz = document.querySelector('[data-creature="jaguar"]');
    if (!raiz) return;
    const pose = poseMarcha(fase, 1, 1); // ciclo = fase (T=1, t=fase)
    raiz.style.setProperty('--jlv-anda-bob', `${(pose.bob * escala).toFixed(2)}px`);
    for (const [clave, ang] of Object.entries(pose.patas)) {
      raiz.style.setProperty(`--jlv-anda-${clave}-cadera`, `${ang.cadera.toFixed(2)}deg`);
      raiz.style.setProperty(`--jlv-anda-${clave}-rodilla`, `${ang.rodilla.toFixed(2)}deg`);
    }
    raiz.setAttribute('data-fase-aplicada', String(fase));
  };
  aplicar();
  const timer = setInterval(aplicar, 120); // idempotente; re-aplica tras montar capas
  setTimeout(() => clearInterval(timer), 15000);
}
