/*
 * i18n (ADR-050): los strings es-CO que vivían aquí (mapa ruta→hint) se
 * movieron a src/config/compaiHints.js (unificación 2026-08-23). Lo que queda
 * en este archivo no dispara la regla chagra-i18n, así que ya no necesita el
 * eslint-disable a nivel de archivo.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { X, Volume2 } from 'lucide-react';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import useCompaiElegido from '../visual/mundo3d/escenas/useCompaiElegido.js';
import useCompaiRoam from '../hooks/useCompaiRoam.js';
import { AVATAR_NOMBRE, DEFAULT_AVATAR_TYPE } from '../hooks/useAgentAvatarType.js';
// El hint por ruta se PLEGÓ a src/config/compaiHints.js (unificación 2026-08-23):
// el AgentFab canónico lo usa como enseñanza en idle. Este overlay ya no se monta
// en la PWA 2D; se conserva leyendo del MISMO mapa para no duplicar contenido.
import { getHintForRuta } from '../config/compaiHints.js';

/**
 * CompaiOverlay — el compai elegido, minimizable y contextual en todas las rutas 2D.
 *
 * Un componente global que monta UNA sola vez en el layout raíz (App.jsx),
 * visible en todas las rutas 2D (Home, Perfil, Catálogo, Mapa, etc.).
 *
 * Estados:
 *   - Minimizado (por defecto): el compai a fondo TRANSPARENTE, con tamaño
 *     legible y sombra suave, que recorre la pantalla actual y conserva la
 *     posición elegida (useCompaiRoam).
 *   - Expandido: panel con guía contextual, botón de voz.
 *
 * Comportamiento:
 *   - Toque en el compai → abre panel (toggle); mientras el panel está abierto
 *     el compai vuelve a casa y se queda quieto (no se corre bajo la guía).
 *   - El compai se desplaza según su especie y cambia de punto con aparición
 *     mística, sin girar ni espejarse.
 *   - El hint cambia según la ruta actual (mapa ruta→hint, extensible)
 *   - Botón "Escuchar" usa TTS (kokoro, fail-silent si no hay saldo)
 *   - Respeta preferencias del usuario (avatar seleccionado en AvatarSelector)
 *
 * Props:
 *   - currentView (string): ruta actual (dashboard, perfil, mapa, etc.)
 *     Viene de App.jsx currentView state.
 *
 * Nota: el cuerpo pasa por ChagraAgentAvatar, que resuelve el mismo compai que
 * el resto de la aplicación. El selector vive en onboarding y Perfil.
 */

/* Compai con MARCHA real: al deambular corren su ciclo de andar ('caminando')
   en vez de quedarse en idle. El jaguar (rig de perfil #jaguarLado),
   el oso del bastón (pose 'camina' de la piel-lámina musculosa) y la zarigüeya
   (marcha bípeda de la piel AUTO-TRAZADA sobre huesos, zariguyaHuesos.css). */
const CON_MARCHA = new Set(['jaguar', 'oso-baston', 'zariguya']);

/**
 * Escucha el texto en voz alta (TTS kokoro, fail-silent).
 */
function escucharTexto(texto) {
  import('../services/ttsService')
    .then((m) => m.speakSentences(texto).catch(() => {}))
    .catch(() => {});
}

/**
 * CompaiOverlay — el componente principal.
 */
export default function CompaiOverlay({ currentView = 'dashboard' }) {
  const { avatarType } = useCompaiElegido();
  const nombreCompai = AVATAR_NOMBRE[avatarType] || AVATAR_NOMBRE[DEFAULT_AVATAR_TYPE];
  const [isOpen, setIsOpen] = useState(false);
  const [compaiState, setCompaiState] = useState('idle'); // idle, thinking, speaking, listening
  const [lastView, setLastView] = useState(currentView);

  // Tamaño del avatar — se declara ANTES del roam porque useCompaiRoam lo recibe
  // como `escala` para acoplar la velocidad al pie (#3054). Debe quedar arriba:
  // usarlo antes de su declaración `const` rompe con TDZ ("Cannot access
  // 'avatarSize' before initialization") al montar el overlay tras el login.
  // Un felino/animal realista (jaguar) NO cabe digno en un disco chico: se le da
  // más tamaño para que se LEA. Los compai chicos (abeja, luciérnaga…) van en un
  // tamaño intermedio, cómodo, sin disco de color detrás.
  const esRealista = avatarType === 'jaguar';
  const avatarSize = esRealista ? 112 : 84;

  // El compai recorre la pantalla actual y conserva la posición elegida por la
  // persona. Ver useCompaiRoam.
  // `parada` se incrementa cada vez que LLEGA a un punto de su paseo — con eso
  // hacemos el "moverse-para-explicar" (ver la burbuja de parada más abajo).
  const roamRef = useRef(null);
  const { caminando, parada, handlers: comportamientoHandlers } = useCompaiRoam(roamRef, {
    escala: avatarSize,
    pausado: false,
    especie: avatarType,
    soloX: false,
    superficie: currentView,
    contentAware: true,
  });

  // El mensaje contextual de la pantalla actual (capa BASE: qué es esta
  // pantalla). El compai lo muestra al parar y al abrir el panel.
  // TODO: inyectar tips vivos de finca+pendientes (datos reales del usuario) —
  // p.ej. "hoy toca regar el lote 2" o "tiene 3 registros sin sincronizar" —
  // como capa ADITIVA sobre este hint, leyendo del store de pendientes + perfil
  // de finca. Es un gancho: NO inventar datos aquí; la fuente se cablea aparte.
  const hint = useMemo(() => getHintForRuta(currentView, nombreCompai), [currentView, nombreCompai]);

  // Burbuja de PARADA ("moverse-para-explicar"): el compai camina, llega a un
  // punto y —mientras descansa ahí (unos segundos)— muestra el mensaje de esta
  // pantalla; al reanudar la caminata desaparece sola. Se DERIVA del render (sin
  // timers ni setState en effect): visible cuando ya paró al menos una vez
  // (parada > 0), está quieto (!caminando) y el panel no está abierto.
  const mostrarBurbujaParada = parada > 0 && !caminando && !isOpen;

  // Al cambiar de ruta, cierra el panel (UX: no queda abierto entre pantallas).
  // Detecta el cambio comparando lastView ≠ currentView; luego actualiza ambos.
  // Esto evita llamar setState en el effect (react-hooks/set-state-in-effect).
  if (lastView !== currentView) {
    setIsOpen(false);
    setLastView(currentView);
  }

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleEscuchar = useCallback(() => {
    const textoCompleto = `${hint.titulo}. ${hint.descripcion}`;
    setCompaiState('speaking');
    escucharTexto(textoCompleto);
    // Restaurar a idle después de un tiempo (estimate: 3-5s)
    setTimeout(() => setCompaiState('idle'), 4000);
  }, [hint]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Mientras deambula, los compai CON MARCHA real corren su ciclo de andar
  // ('caminando'): el jaguar (JaguarTrazado, la lámina auto-trazada, su marcha
  // de perfil vive en jaguarHuesos.css) y el oso del bastón (la marcha
  // plantígrada de la piel-lámina musculosa). El resto conserva su
  // estado natural. Un estado
  // conversacional (hablar/escuchar/pensar) siempre gana a la caminata.
  const conMarcha = CON_MARCHA.has(avatarType);
  const estadoAvatar = conMarcha && caminando && compaiState === 'idle'
    ? 'caminando'
    : compaiState;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 pointer-events-none"
      data-testid="compai-overlay-container"
    >
      {/* El compai que deambula (roamRef desplaza SOLO este nodo;
          el panel queda anclado a la posición del compai). La burbuja de parada viaja
          DENTRO de este nodo → se queda pegada al compai donde se detuvo. */}
      <div
        ref={roamRef}
        className="will-change-transform relative"
        onPointerEnter={comportamientoHandlers.onPointerEnter}
        onPointerLeave={comportamientoHandlers.onPointerLeave}
        onPointerDown={comportamientoHandlers.onPointerDown}
        onPointerMove={comportamientoHandlers.onPointerMove}
        onPointerUp={comportamientoHandlers.onPointerUp}
        onPointerCancel={comportamientoHandlers.onPointerCancel}
      >
        {/* Burbuja de PARADA: al detenerse en su paseo, el compai "enuncia por
            mensaje" qué hay en esta pantalla (el hint de la ruta). Toque = abre
            el panel para leer más / escuchar. Solo cuando no está abierto el
            panel (ver mostrarBurbujaParada). */}
        {mostrarBurbujaParada && (
          <button
            type="button"
            onClick={handleToggle}
            className="pointer-events-auto absolute bottom-full mb-2 right-0 w-56 text-left bg-slate-900/95 border border-slate-700 rounded-2xl rounded-br-sm px-3 py-2 shadow-xl backdrop-blur-sm animate-fadeIn"
            aria-live="polite"
            aria-label={`${hint.titulo}. ${hint.descripcion}. Toque para ampliar.`}
            data-testid="compai-burbuja"
          >
            <span className="block text-sm font-bold text-slate-100 leading-snug">
              {hint.titulo}
            </span>
            <span className="mt-0.5 block text-xs text-slate-300 leading-snug line-clamp-2">
              {hint.descripcion}
            </span>
          </button>
        )}
        {/* Presencia flotante SIN disco de color: el compai a fondo transparente,
            con una sombra suave que lo asienta sobre cualquier pantalla. */}
        <button
          type="button"
          onClick={handleToggle}
          className="pointer-events-auto relative inline-flex items-center justify-center bg-transparent border-none p-0 hover:scale-105 transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 rounded-2xl"
          aria-label={`Abrir ayuda de ${nombreCompai}`}
          aria-expanded={isOpen}
          data-testid="compai-bubble"
        >
          <span className="inline-flex" style={{ filter: 'drop-shadow(0 6px 9px rgba(0, 0, 0, 0.34))' }}>
            <ChagraAgentAvatar
              size={avatarSize}
              state={estadoAvatar}
              ariaLabel={`${nombreCompai}, asistente de Chagra`}
              reaccionaPresencia
            />
          </span>
        </button>
      </div>

      {/* Panel expandido (solo si isOpen) */}
      {isOpen && (
        <div
          className="pointer-events-auto absolute bottom-full mb-3 right-0 w-80 bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-sm"
          data-testid="compai-panel"
        >
          {/* Header: título + cerrar */}
          <div className="flex items-start justify-between mb-4 gap-3">
            <h2 className="text-base font-bold text-slate-100 leading-snug">
              {hint.titulo}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label={`Cerrar panel de ${nombreCompai}`}
              data-testid="compai-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Descripción contextual */}
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {hint.descripcion}
          </p>

          {/* Botón Escuchar */}
          <button
            type="button"
            onClick={handleEscuchar}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors active:scale-95"
            aria-label="Escuchar esta guía en voz alta"
            data-testid="compai-listen-btn"
          >
            <Volume2 size={16} aria-hidden="true" />
            Escuchar
          </button>
        </div>
      )}
    </div>
  );
}
