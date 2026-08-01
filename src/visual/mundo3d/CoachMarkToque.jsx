/*
 * CoachMarkToque — el onboarding de 3 segundos SIN voz (B2/B3 del DR de juego,
 * SPEC-UX-04 del DR de UX campesino).
 *
 * Hoy toda la guía del primer ingreso va por `speechSynthesis`, que iOS Safari
 * bloquea sin gesto de usuario (y que cualquier teléfono en silencio no suena).
 * Este coach-mark es la pista VISUAL que no depende del audio: un pulso sobre
 * la zona de los lugares + "Toque un lugar para entrar".
 *
 *   · Solo el PRIMER ingreso (localStorage `chagra:coach:valle-toque:v1`).
 *   · Se descarta al primer toque/tecla o solo, a los ~4 s.
 *   · `prefers-reduced-motion` (o la prop) → anillo ESTÁTICO, sin pulso.
 *   · `pointer-events: none`: jamás roba el toque que está invitando a dar.
 *   · Autocontenido y three-free: DOM + CSS propio, cero assets remotos.
 *
 * Copy en español Colombia (usted); si se productiza, migra a messages.js
 * (ADR-050).
 */
import { useEffect, useState } from 'react';
import './coachMark.css';

const LS_KEY = 'chagra:coach:valle-toque:v1';
export const COACH_TOQUE_MS = 4200;

function yaVisto() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false; // sin storage (modo privado): mostrarlo igual, es efímero
  }
}

function marcarVisto() {
  try {
    window.localStorage.setItem(LS_KEY, '1');
  } catch {
    /* sin storage no pasa nada: solo se repetiría la próxima vez */
  }
}

export default function CoachMarkToque({
  reducedMotion = false,
  texto = 'Toque un lugar para entrar',
}) {
  const [visible, setVisible] = useState(() => !yaVisto());

  useEffect(() => {
    if (!visible) return undefined;
    const cerrar = () => {
      marcarVisto();
      setVisible(false);
    };
    // El primer gesto (el que el propio coach pide) lo descarta; si no llega,
    // se despide solo — es una pista, no un tutorial que estorba.
    const t = setTimeout(cerrar, COACH_TOQUE_MS);
    window.addEventListener('pointerdown', cerrar, { capture: true });
    window.addEventListener('keydown', cerrar, { capture: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', cerrar, { capture: true });
      window.removeEventListener('keydown', cerrar, { capture: true });
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`coach-toque${reducedMotion ? ' coach-toque--calmo' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="coach-toque__pulso" aria-hidden="true" />
      <p className="coach-toque__txt">{texto}</p>
    </div>
  );
}
