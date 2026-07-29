/*
 * TransicionNewDonk — la entrada a un mundo como MURAL New Donk, en el flujo
 * vivo valle → mundo. NO es un velo plano: durante el primer tramo el overlay
 * es TRANSPARENTE y lo que se ve es la cámara del valle 3D haciendo dolly +
 * aplane casi ortográfico hacia el lugar del mundo (CamaraNewDonk, montada
 * dentro del Canvas de Valle3D). Solo cuando la cámara ya "cayó" dentro del
 * lugar, un DESTELLO con la luz del mundo destino crece desde el centro,
 * cubre el intercambio de escena y se disuelve revelando el mundo.
 *
 * Anatomía del viaje (fracciones de ND_VIAJE_MS):
 *   0%        → overlay transparente: el 3D del valle A LA VISTA, aplanándose
 *               (el dolly dura ND_APLANE_MS; la abeja se lanza adelante);
 *   ~42%–64%  → el destello (radial con el tinte del mundo) crece del centro;
 *   64%–76%   → pantalla 100% cubierta (meseta de intercambio);
 *   ~70%      → `onMitad`: el host intercambia la escena DEBAJO
 *               (via useNavegacionMundos.completarViaje);
 *   100%      → destello disuelto, el mundo revelado; `onFin`: desmontar.
 *
 * CONTRATO TEMPORAL (misma filosofía que TransicionMundo/TransicionMundoKit):
 * los callbacks los disparan timers JS deterministas, NUNCA `animationend`.
 * El CSS anima con la misma duración via `--tnd-ms` pero es decorativo.
 * Cada callback se llama a lo sumo UNA vez por montaje.
 *
 * `prefers-reduced-motion`: corte directo sin dolly — un tinte plano cubre al
 * instante, `onMitad` enseguida y un desvanecer corto (ND_REDUCIDA_MS total).
 * (En el flujo vivo normalmente ni se monta: el hook salta las fases.)
 *
 * Overlay DOM puro (CERO three): seguro en el bundle base. La mitad 3D del
 * efecto vive aparte en escenas/CamaraNewDonk.jsx (chunk vendor-three).
 */
import { useEffect, useRef } from 'react';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import { tinteDeMundo, tituloDeMundo } from './resolverMundo.js';

/** Duración total del viaje New Donk (ms). */
export const ND_VIAJE_MS = 1500;
/** Momento de `onMitad` (ms): centro de la meseta cubierta (64%–76%). */
export const ND_MITAD_MS = 1050;
/** Duración del dolly+aplane de la cámara del valle (CamaraNewDonk). */
export const ND_APLANE_MS = 950;
/** Con reduced-motion TODO colapsa a un corte simple de esta duración. */
export const ND_REDUCIDA_MS = 200;
/** `onMitad` bajo reduced-motion (la cubierta es instantánea). */
export const ND_MITAD_REDUCIDA_MS = 60;

const CSS_TND = `
.tnd {
  position: fixed;
  inset: 0;
  z-index: 44;
  overflow: hidden;
  pointer-events: auto; /* escudo: nada de toques a mitad de la caída */
}
/* Viñeta que abraza los bordes mientras el valle se aplana: el 3D sigue a la
   vista por el centro — la velocidad se siente en el marco, no en un telón. */
.tnd__vineta {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    120% 92% at 50% 46%,
    rgba(0, 0, 0, 0) 52%,
    color-mix(in srgb, var(--tnd-b) 68%, #10230f) 100%
  );
  opacity: 0;
  animation: tndVineta var(--tnd-ms) linear both;
}
/* El destello: la luz del mundo destino crece desde el punto de la caída,
   cubre el intercambio y se disuelve sobre el mundo ya montado. */
.tnd__destello {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 175vmax;
  height: 175vmax;
  margin: -87.5vmax 0 0 -87.5vmax;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--tnd-a) 72%, #ffffff) 0%,
    var(--tnd-a) 36%,
    color-mix(in srgb, var(--tnd-b) 82%, #17301a) 80%
  );
  transform: scale(0.04);
  opacity: 0;
  animation: tndDestello var(--tnd-ms) linear both;
}
/* La abeja se LANZA adentro (se encoge hacia el punto de fuga, delante suyo). */
.tnd__abeja {
  position: absolute;
  left: 50%;
  top: 46%;
  opacity: 0;
  filter: drop-shadow(0 8px 10px rgba(16, 35, 15, 0.35));
  animation: tndAbeja var(--tnd-ms) ease-in both;
}
.tnd__txt {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 9vh;
  margin: 0;
  text-align: center;
  color: #f4ffe6;
  font-size: clamp(14px, 2.4vw, 18px);
  font-weight: 700;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 10px rgba(16, 35, 15, 0.7);
  opacity: 0;
  animation: tndTxt var(--tnd-ms) linear both;
}
@keyframes tndVineta {
  0% { opacity: 0; }
  18% { opacity: 0.35; }
  55% { opacity: 0.8; }
  70% { opacity: 1; }
  86% { opacity: 0.4; }
  100% { opacity: 0; }
}
@keyframes tndDestello {
  0% { opacity: 0; transform: scale(0.04); }
  40% { opacity: 0; transform: scale(0.05); }
  52% { opacity: 0.85; transform: scale(0.4); }
  64% { opacity: 1; transform: scale(1); }
  76% { opacity: 1; transform: scale(1.04); }
  100% { opacity: 0; transform: scale(1.1); }
}
@keyframes tndAbeja {
  0% { opacity: 0; transform: translate(-50%, 30vh) scale(1); }
  10% { opacity: 1; }
  46% { opacity: 1; }
  58% { opacity: 0; transform: translate(-50%, -2vh) scale(0.26); }
  100% { opacity: 0; transform: translate(-50%, -2vh) scale(0.26); }
}
@keyframes tndTxt {
  0% { opacity: 0; }
  14% { opacity: 1; }
  60% { opacity: 1; }
  74% { opacity: 0; }
  100% { opacity: 0; }
}
/* Corte reduced-motion: tinte plano, sin dolly ni coreografía. */
.tnd--corte {
  background: linear-gradient(160deg, var(--tnd-a), var(--tnd-b) 70%);
  animation: tndCorte var(--tnd-ms) linear both;
}
@keyframes tndCorte {
  0% { opacity: 1; }
  55% { opacity: 1; }
  100% { opacity: 0; }
}
`;

/**
 * @param {object} props
 * @param {string}  props.mundoId        mundo destino (tinte + título).
 * @param {string}  [props.animo]        ánimo de Angelita (estado real de la finca).
 * @param {number}  [props.energia]      energía de Angelita.
 * @param {boolean} [props.reducedMotion] corte directo, sin dolly.
 * @param {() => void} [props.onMitad]   pantalla cubierta: intercambie la escena.
 * @param {() => void} [props.onFin]     mundo revelado: desmonte el overlay.
 */
export default function TransicionNewDonk({
  mundoId,
  animo = 'sereno',
  energia = 1,
  reducedMotion = false,
  onMitad,
  onFin,
}) {
  const mitadRef = useRef(onMitad);
  const finRef = useRef(onFin);
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los timers llamen siempre al callback más fresco sin re-armarse.
  useEffect(() => {
    mitadRef.current = onMitad;
    finRef.current = onFin;
  });

  useEffect(() => {
    let hechoMitad = false;
    let hechoFin = false;
    const tMitad = setTimeout(
      () => {
        if (!hechoMitad) {
          hechoMitad = true;
          mitadRef.current?.();
        }
      },
      reducedMotion ? ND_MITAD_REDUCIDA_MS : ND_MITAD_MS,
    );
    const tFin = setTimeout(
      () => {
        if (!hechoFin) {
          hechoFin = true;
          finRef.current?.();
        }
      },
      reducedMotion ? ND_REDUCIDA_MS : ND_VIAJE_MS,
    );
    return () => {
      hechoMitad = true;
      hechoFin = true;
      clearTimeout(tMitad);
      clearTimeout(tFin);
    };
  }, [mundoId, reducedMotion]);

  const tinte = tinteDeMundo(mundoId);
  const estilo = {
    '--tnd-a': tinte[1], // el tono claro del mundo, al centro del destello
    '--tnd-b': tinte[0], // el tono profundo, hacia el borde
    '--tnd-ms': `${reducedMotion ? ND_REDUCIDA_MS : ND_VIAJE_MS}ms`,
  };

  if (reducedMotion) {
    return (
      <div className="tnd tnd--corte" style={estilo} role="status" aria-live="polite" data-testid="tnd">
        <style>{CSS_TND}</style>
        <p className="tnd__txt" style={{ opacity: 1, animation: 'none' }}>
          {`Angelita lo lleva a ${tituloDeMundo(mundoId)}…`}
        </p>
      </div>
    );
  }

  return (
    <div className="tnd" style={estilo} role="status" aria-live="polite" data-testid="tnd">
      <style>{CSS_TND}</style>
      <div className="tnd__vineta" aria-hidden="true" />
      <div className="tnd__destello" aria-hidden="true" />
      <div className="tnd__abeja" aria-hidden="true">
        <AbejaAngelita size={76} animo={animo} energia={energia} animated />
      </div>
      <p className="tnd__txt">{`Angelita lo lleva a ${tituloDeMundo(mundoId)}…`}</p>
    </div>
  );
}
