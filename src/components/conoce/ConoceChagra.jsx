/**
 * ConoceChagra — el RECORRIDO guiado "Conoce Chagra" (tour opt-in).
 *
 * QUÉ ES: 7 escenas cinematográficas de pantalla completa que le muestran a
 * una campesina (o a un visitante/donante) qué es Chagra y qué puede hacer,
 * sin que tenga que explorar la app. Doble uso: bienvenida de primera vez
 * (auto-oferta vía ConoceChagraInvite) y "muéstrame Chagra" (botón en el
 * Manual y en el Perfil, y deep-link #conoce para compartir).
 *
 * QUÉ NO ES: NO es el onboarding de perfil (#2078 / onboarding-perfil) ni lo
 * reemplaza — no pide datos, no configura nada. Solo cuenta el alma.
 *
 * HONESTIDAD (anti-sobrepromesa):
 *   - "IA en infraestructura propia con energía solar" — NO "on-device".
 *   - datos "local-first" (viven primero en el teléfono y se sincronizan) —
 *     NO "todo funciona sin internet": la escena off-grid aclara que el
 *     agente sí necesita señal; los registros no.
 *   - la escena de mundos pinta los MUNDOS REALES (mundosFinca.js): si un
 *     mundo se renombra o se va, el tour lo refleja solo.
 *
 * ACCESIBILIDAD: skippeable siempre (Saltar arriba, Escape), navegable con
 * flechas del teclado y con swipe; prefers-reduced-motion apaga toda la
 * animación en CSS y el tour funciona completo quieto; el semáforo no es
 * color-only (texto en cada fila); fondos opacos legibles al sol.
 *
 * El guion (escenas + visuales) vive en escenasConoce.jsx; la huella
 * persistente en conoceVisto.js (compartida con el invite de primera vez).
 *
 * Props:
 *   - onClose():           cerrar/terminar (vuelve a donde estaba el usuario).
 *   - onNavigate(view):    abrir una pantalla real al cierre ("Ver todo lo
 *                          que Chagra hace" → ayuda).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { ESCENAS } from './escenasConoce.jsx';
import { CONOCE_VISTO_KEY, marcarConoceVisto } from './conoceVisto.js';
import './conoce-chagra.css';

export default function ConoceChagra({ onClose, onNavigate = null }) {
  const [paso, setPaso] = useState(0);
  const total = ESCENAS.length;
  const esUltima = paso === total - 1;
  const escena = ESCENAS[paso];
  const { Visual } = escena;

  const terminar = (destino) => {
    marcarConoceVisto('1');
    if (destino && typeof onNavigate === 'function') {
      onNavigate(destino);
      return;
    }
    if (typeof onClose === 'function') onClose();
  };

  const avanzar = () => {
    if (esUltima) { terminar(); return; }
    setPaso((p) => Math.min(p + 1, total - 1));
  };
  const retroceder = () => setPaso((p) => Math.max(p - 1, 0));

  // Teclado: flechas navegan, Escape salta. (El tour es un overlay modal.)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); avanzar(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); retroceder(); }
      else if (e.key === 'Escape') { e.preventDefault(); terminar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  // Swipe horizontal (umbral 48px; el vertical se ignora para no pelear con
  // el scroll del stage en pantallas bajitas).
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    const t = e.changedTouches?.[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) avanzar(); else retroceder();
  };

  // Al montar, dejamos huella de que el recorrido ya se ofreció/abrió (el
  // invite no vuelve a insistir aunque lo abandonen a mitad de camino).
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONOCE_VISTO_KEY)) marcarConoceVisto('abierto');
    } catch (_) { /* noop */ }
  }, []);

  // Cinturón del overflow:clip: al cambiar de escena, el scroller interno
  // (.cnc-stage) vuelve arriba — cada escena arranca desde su comienzo.
  const stageRef = useRef(null);
  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0;
  }, [paso]);

  const titleId = 'cnc-titulo';
  const dots = useMemo(() => ESCENAS.map((e) => e.id), []);

  return (
    <div
      className="cnc-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="conoce-chagra"
      data-escena={escena.id}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="cnc-top">
        <div className="cnc-dots" role="tablist" aria-label={`Escena ${paso + 1} de ${total}`}>
          {dots.map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              className="cnc-dot"
              aria-current={i === paso}
              aria-label={`Ir a la escena ${i + 1}`}
              onClick={() => setPaso(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="cnc-skip"
          onClick={() => terminar()}
          data-testid="cnc-saltar"
        >
          <span className="inline-flex items-center gap-1">
            Saltar <X size={14} aria-hidden="true" />
          </span>
        </button>
      </header>

      {/* key={paso} re-monta la escena → re-dispara la animación de entrada
          (que reduced-motion apaga en CSS; el contenido queda igual). */}
      <main className="cnc-stage" ref={stageRef}>
        <section key={paso} className="cnc-scene" aria-live="polite">
          <div className="cnc-visual"><Visual /></div>
          <div className="cnc-copy">
            <p className="cnc-kicker">{escena.kicker}</p>
            <h2 className="cnc-title" id={titleId}>{escena.titulo}</h2>
            <p className="cnc-sub">{escena.sub}</p>
          </div>
        </section>
      </main>

      <footer className="cnc-foot">
        <button
          type="button"
          className="cnc-next agent-send-accent"
          onClick={avanzar}
          data-testid="cnc-siguiente"
        >
          {esUltima ? 'Empezar a andar mi finca' : 'Siguiente'}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        {esUltima && (
          <button
            type="button"
            className="cnc-secondary"
            onClick={() => terminar('ayuda')}
            data-testid="cnc-ver-todo"
          >
            Ver todo lo que Chagra hace
          </button>
        )}
      </footer>
    </div>
  );
}
