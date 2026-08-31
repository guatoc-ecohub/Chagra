import React, { useEffect, useRef } from 'react';
import { Mic, Camera, MoonStar, Volume2, Images, Eye } from 'lucide-react';

/**
 * AgentFabMenu — el menú flotante del TOQUE CORTO sobre el personaje
 * (#66/#70, 2026-07-30). Opciones:
 *
 *   0. Ver (opcional, política R4) → abre el panel para LEER el mensaje/hint de
 *      esta pantalla. Sólo aparece si el FAB pasa `onVer`.
 *   1. Escuchar      → lee el contexto/aviso en voz alta (TTS).
 *   2. Hablar        → activa el micrófono (mismo trigger que el gesto largo).
 *   3. Enviar foto    → abre el agente con la cámara ya disparada.
 *   4. Ver fotos      → abre las fotos locales disponibles.
 *   5. Que se quede callado hoy → "hoy no" (#107, la opción "Callar" de R4):
 *      descansa el RESTO DEL DÍA, se resetea solo a medianoche — el interruptor
 *      manual indefinido (#101/#103) sigue viviendo aparte, en el botón 🔔/🔕
 *      del FAB. Ver/Escuchar/Callar = las tres claras que pide la política R4.
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
export default function AgentFabMenu({ abierto, onVer, onEscuchar, onHablar, onFoto, onFotos, onHoyNo, onCerrar }) {
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
        {/* "Ver" (política R4): leer el mensaje/panel de esta pantalla. Opcional
            —sólo aparece si el FAB pasa `onVer`— para no romper otros usos. */}
        {onVer && (
          <button
            ref={primerBotonRef}
            type="button"
            role="menuitem"
            onClick={onVer}
            className="agt-fab-menu-item"
            style={itemStyle}
          >
            <Eye size={18} strokeWidth={2} aria-hidden="true" />
            <span>Ver</span>
          </button>
        )}
        <button
          ref={onVer ? undefined : primerBotonRef}
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
