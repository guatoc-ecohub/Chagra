/*
 * CondorBillboard — EL CÓNDOR PLANEANDO EN CUALQUIER CIELO 3D.
 *
 * El emblema del páramo como billboard <Html> del SVG rubber-hose de la casa
 * (Condor.jsx — el estándar de calidad: el SVG le gana a cualquier low-poly,
 * decisión del operador en FaunaBosque). REUTILIZABLE: cualquier escena con
 * <Canvas> lo monta y tiene el cielo vivo — el bosque, el valle, la sierra.
 *
 * Dos modos de vuelo (los dos del cóndor real):
 *   · 'orbita' (default) — la TÉRMICA: círculos amplios y pacientes sobre un
 *     centro, con deriva de altura (remonta y baja) y banqueo hacia adentro
 *     del giro. Una vuelta cada ~70 s: paciencia de cóndor, siempre presente.
 *   · 'cruce'  — EL CRUCE ÉPICO: atraviesa el cielo de lado a lado y se
 *     pierde; reaparece un buen rato después por donde quiera. La vida es
 *     aparición y desaparición (patrón VenadoCruzante/QuetzalFugaz).
 *
 * El SVG es la vista VENTRAL (alas abiertas, de frente/abajo) — exactamente
 * como se ve un cóndor planeando desde la finca. El banqueo del vuelo se
 * escribe como rotate en el div (mutación por ref, cero re-renders, cero
 * toques al SVG). El aleteo raro, las plumas-dedo y el resto del idle ya
 * viven DENTRO del componente Condor (creatures.css).
 *
 * Tier-safe / reduced-motion: sin animación queda FIJO en un punto alto del
 * cielo, digno (animated=false también congela el SVG). Android barato: un
 * solo <Html>, matemática O(1) por frame, cero geometría.
 *
 * Importa three/@react-three → montar SOLO dentro de un <Canvas>.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Condor } from '../creatures/index.js';

const azar = (a, b) => a + Math.random() * (b - a);

const ESTILO_CONDOR = {
  filter: 'drop-shadow(0 2px 3px rgba(25, 32, 28, 0.3))',
  pointerEvents: 'none',
  willChange: 'transform',
};

/**
 * @param {Object} props
 * @param {[number,number,number]} [props.centro=[0,11,0]] centro del vuelo (la térmica u
 *   origen del cruce). La Y es la altura de crucero.
 * @param {number} [props.radio=14]   radio de la órbita / media-luz del cruce.
 * @param {number} [props.velocidad=0.09] rad/s de la órbita (~70 s la vuelta).
 * @param {number} [props.px=64]      tamaño del SVG en px (nitidez del billboard).
 * @param {number} [props.factor=16]  distanceFactor del <Html> (escala en mundo).
 * @param {'orbita'|'cruce'} [props.modo='orbita']
 * @param {boolean} [props.animated=true] false = fijo y digno (tier bajo / RM).
 * @param {string}  [props.tier]      device-tier, se pasa al SVG (gates CSS).
 */
export default function CondorBillboard({
  centro = [0, 11, 0],
  radio = 14,
  velocidad = 0.09,
  px = 64,
  factor = 16,
  modo = 'orbita',
  animated = true,
  tier,
}) {
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const st = useRef({
    fase: azar(0, Math.PI * 2),   // cada cóndor arranca en SU punto del giro
    activo: modo === 'orbita',    // el cruce empieza esperando su momento
    prox: azar(3, 8),             // primer cruce pronto (la vida se nota)
    t0: 0,
    dur: 14,
    dir: 1,
  });

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || !animated) return;
    const t = clock.getElapsedTime();
    const s = st.current;

    if (modo === 'cruce') {
      // EL CRUCE: aparece por un costado, atraviesa el cielo, se pierde.
      if (!s.activo) {
        g.visible = false;
        if (t >= s.prox) {
          s.activo = true;
          s.t0 = t;
          s.dir = Math.random() < 0.5 ? -1 : 1;
          s.dur = azar(13, 18);
        }
        return;
      }
      const p = (t - s.t0) / s.dur;
      if (p >= 1) {
        s.activo = false;
        s.prox = t + azar(30, 75); // no vuelve en un rato: verlo es suerte
        g.visible = false;
        return;
      }
      g.visible = true;
      g.position.set(
        centro[0] + (-radio + 2 * radio * p) * s.dir,
        centro[1] + Math.sin(p * Math.PI) * 1.6 + Math.sin(t * 0.35) * 0.3,
        centro[2] + Math.sin(p * Math.PI * 2) * 1.2,
      );
      if (capa.current) {
        // banqueo leve sostenido en el rumbo del cruce
        const banco = (6 + Math.sin(t * 0.5) * 3) * s.dir;
        capa.current.style.transform = `rotate(${banco.toFixed(1)}deg)`;
      }
      return;
    }

    // LA TÉRMICA (default): círculos pacientes con deriva de altura.
    const a = t * velocidad + s.fase;
    const r = radio + Math.sin(t * 0.05) * radio * 0.14;
    g.position.set(
      centro[0] + Math.cos(a) * r,
      centro[1] + Math.sin(t * 0.21) * 0.8 + Math.sin(t * 0.047) * 1.4, // remonta y baja
      centro[2] + Math.sin(a) * r,
    );
    if (capa.current) {
      // banqueo hacia ADENTRO del giro (el ala interior baja), respirado
      const banco = 9 + Math.sin(t * 0.13) * 4;
      capa.current.style.transform = `rotate(${banco.toFixed(1)}deg)`;
    }
  });

  const posInicial = /** @type {[number,number,number]} */ (
    modo === 'cruce'
      ? [centro[0], centro[1], centro[2]]
      : [centro[0] + radio, centro[1], centro[2]]
  );

  return (
    <group ref={grupo} position={posInicial} visible={modo === 'orbita' || !animated}>
      <Html center distanceFactor={factor} zIndexRange={[6, 0]} pointerEvents="none">
        <div ref={capa} aria-hidden="true" data-vecino="condor" style={ESTILO_CONDOR}>
          <Condor size={px} animated={animated} tier={tier} />
        </div>
      </Html>
    </group>
  );
}
