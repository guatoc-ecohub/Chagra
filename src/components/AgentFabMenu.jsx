import React, { useEffect, useRef } from 'react';
import { Mic, Camera, MoonStar, Volume2, Images } from 'lucide-react';

/**
 * AgentFabMenu — el menú flotante del TOQUE CORTO sobre el personaje
 * (#66/#70, 2026-07-30). Tres opciones, siempre las mismas tres:
 *
 *   1. Hablar        → activa el micrófono (mismo trigger que el gesto largo).
 *   2. Enviar foto    → abre el agente con la cámara ya disparada.
 *   3. Que se quede callado hoy → "hoy no" (#107): descansa el RESTO DEL DÍA,
 *      se resetea solo a medianoche — el interruptor manual indefinido
 *      (#101/#103) sigue viviendo aparte, en el botón 🔔/🔕 del FAB.
 *
 * Se ancla junto al personaje (mismo `bottom-right` del puesto del FAB, el
 * menú crece hacia arriba para no salirse de la pantalla en el corte de
 * campo). Cierra con Escape, con un click/touch afuera, o al elegir una
 * opción — cualquier cierre SIN elegir cuenta como señal de "cerró sin leer"
 * (`onCerrar`, el AgentFab que lo monta decide qué hacer con eso).
 *
 * Español de Colombia (usted), sin voseo. Reduced-motion: sin transiciones
 * con `prefers-reduced-motion` (transform/opacity a secas, ya son baratas).
 */
export default function AgentFabMenu({ abierto, onEscuchar, onHablar, onFoto, onFotos, onHoyNo, onCerrar }) {
  const menuRef = useRef(null);
  const primerBotonRef = useRef(null);

  // Cierra con Escape y mueve el foco al primer ítem al abrir — la
  // interacción por teclado no puede ser peor que la táctil.
  useEffect(() => {
    if (!abierto) return undefined;
    primerBotonRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <>
      {/* Backdrop invisible: cualquier toque fuera del menú lo cierra. Vive
          DEBAJO del propio FAB (que sigue en pointer-events:auto) pero por
          ENCIMA de todo lo demás — z-index alto a propósito. */}
      <div
        onClick={onCerrar}
        onTouchStart={onCerrar}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 39, pointerEvents: 'auto' }}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label="Menú de Chagra IA"
        style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 10,
          zIndex: 41,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 208,
          padding: 8,
          borderRadius: 16,
          background: 'rgb(var(--c-surface-card, 15 23 42) / 0.97)',
          border: '1px solid rgb(var(--c-surface-border, 51 65 85) / 0.8)',
          boxShadow: '0 10px 28px rgb(var(--scrim-bg, 0 0 0) / 0.5)',
        }}
      >
        <button
          ref={primerBotonRef}
          type="button"
          role="menuitem"
          onClick={onEscuchar}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
          <span>Escuchar</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onHablar}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Mic size={18} strokeWidth={2} aria-hidden="true" />
          <span>Hablar</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onFoto}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Camera size={18} strokeWidth={2} aria-hidden="true" />
          <span>Enviar una foto</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onFotos}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Images size={18} strokeWidth={2} aria-hidden="true" />
          <span>Ver fotos</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onHoyNo}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <MoonStar size={18} strokeWidth={2} aria-hidden="true" />
          <span>Que se quede callado hoy</span>
        </button>
      </div>
    </>
  );
}

const itemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: 14,
  fontWeight: 500,
  textAlign: 'left',
  cursor: 'pointer',
};
