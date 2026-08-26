import React, { useEffect, useRef } from 'react';
import { Eye, Volume2, Camera, MoonStar, Bell } from 'lucide-react';

/**
 * AgentFabMenu — el menú compacto del TOQUE sobre el FAB del compai (R4 del
 * diseño aprobado, `ops/COMPAI-MENU-DISENO-2026-08-25.md` §1.2 + auditoría
 * `ops/AUDITORIA-COMPAI-MENSAJES-2D-3D-2026-08-23.md`). Portado del worktree
 * `fix/compai-caminar-huesos-20260825` (`AgentFabMenu.jsx`, versión con "Ver")
 * — no reinventado — y recortado a lo que `main` puede cablear hoy sin
 * infraestructura ausente (sin "Hablar"/"Ver fotos": el tap-to-talk queda
 * DESHABILITADO por decisión del operador 2026-07-07, "modo campo = solo
 * wake-word", `App.jsx:3931-3937`; sin galería local de fotos en main).
 *
 * Cuatro opciones, siempre las mismas:
 *
 *   1. Ver       → lee el aviso/mensaje actual de Angelita EN PANTALLA (panel
 *      anclado junto al FAB, sin salto pesado a otra pantalla).
 *   2. Escuchar   → lee ESE MISMO contenido en voz alta (TTS) — nunca una
 *      frase enlatada distinta de lo que "Ver" muestra.
 *   3. Enviar foto → abre el agente con la cámara ya disparada.
 *   4. Callar hoy / 🔔 → una sola fila con DOS estados (silencio indefinido,
 *      `useAngelitaStore.silenciar()`): si NO está silenciada ofrece "Que se
 *      quede callada hoy"; si YA está silenciada, ofrece "Reactivar los
 *      avisos". Es el mismo interruptor, solo cambia el rótulo/ícono según
 *      `silenciado` — no dos controles separados.
 *
 * Se ancla junto al personaje (mismo `bottom-right` del puesto del FAB, el
 * menú crece hacia arriba para no salirse de la pantalla en el corte de
 * campo). Cierra con Escape, con un click/touch afuera, o al elegir una
 * opción.
 *
 * Español de Colombia (usted), sin voseo. Reduced-motion: sin transiciones
 * con `prefers-reduced-motion` (transform/opacity a secas, ya son baratas).
 */
export default function AgentFabMenu({
  abierto,
  onVer,
  onEscuchar,
  onHablar,
  onFoto,
  onFotos,
  onHoyNo,
  silenciado = false,
  onAlternarSilencio,
  onToggleSusurroNocturno,
  susurroNocturnoTts = false,
  onCerrar,
}) {
  const menuRef = useRef(null);
  const primerBotonRef = useRef(null);

  // Cierra con Escape y mueve el foco al primer ítem al abrir.
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
          onClick={onVer}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Eye size={18} strokeWidth={2} aria-hidden="true" />
          <span>Ver</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={onEscuchar}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
          <span>Escuchar</span>
        </button>
        {onHablar && (
          <button
            type="button"
            role="menuitem"
            onClick={onHablar}
            className="agt-fab-menu-item"
            style={itemStyle}
          >
            <span aria-hidden="true">🎙️</span>
            <span>Hablar</span>
          </button>
        )}
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
          onClick={onAlternarSilencio}
          className="agt-fab-menu-item"
          style={itemStyle}
        >
          {silenciado ? (
            <Bell size={18} strokeWidth={2} aria-hidden="true" />
          ) : (
            <MoonStar size={18} strokeWidth={2} aria-hidden="true" />
          )}
          <span>{silenciado ? 'Reactivar los avisos' : 'Que se quede callada hoy'}</span>
        </button>
        {onFotos && (
          <button
            type="button"
            role="menuitem"
            onClick={onFotos}
            className="agt-fab-menu-item"
            style={itemStyle}
          >
            <span aria-hidden="true">🖼️</span>
            <span>Ver fotos</span>
          </button>
        )}
        {onHoyNo && (
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
        )}
        {onToggleSusurroNocturno && (
          <button
            type="button"
            role="menuitem"
            onClick={onToggleSusurroNocturno}
            className="agt-fab-menu-item"
            style={itemStyle}
            aria-pressed={susurroNocturnoTts}
          >
            <MoonStar size={18} strokeWidth={2} aria-hidden="true" />
            <span>{susurroNocturnoTts ? 'Voz nocturna: activada' : 'Activar voz nocturna'}</span>
          </button>
        )}
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
