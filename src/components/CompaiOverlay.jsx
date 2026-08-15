/*
 * i18n (ADR-050): CompaiOverlay.jsx contiene strings en español Colombia
 * (hints, títulos, descripciones de pantallas…) pendientes de migrar a
 * src/config/messages.js. La regla chagra-i18n es soft (warn); se desactiva a
 * nivel de archivo para no bloquear el pre-commit con deuda preexistente.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { X, Volume2 } from 'lucide-react';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import useCompaiElegido from '../visual/mundo3d/escenas/useCompaiElegido.js';
import useCompaiRoam from '../hooks/useCompaiRoam.js';
import { AVATAR_NOMBRE, DEFAULT_AVATAR_TYPE } from '../hooks/useAgentAvatarType.js';

/**
 * CompaiOverlay — el compai elegido, minimizable y contextual en todas las rutas 2D.
 *
 * Un componente global que monta UNA sola vez en el layout raíz (App.jsx),
 * visible en todas las rutas 2D (Home, Perfil, Catálogo, Mapa, etc.).
 *
 * Estados:
 *   - Minimizado (por defecto): el compai a fondo TRANSPARENTE (sin disco de
 *     color detrás — un felino realista se veía aplastado en el círculo verde),
 *     con tamaño legible y sombra suave, que DEAMBULA por la franja inferior
 *     (~30% del ancho) para leerse vivo (useCompaiRoam).
 *   - Expandido: panel con guía contextual, botón de voz.
 *
 * Comportamiento:
 *   - Toque en el compai → abre panel (toggle); mientras el panel está abierto
 *     el compai vuelve a casa y se queda quieto (no se corre bajo la guía).
 *   - El compai camina de un lado a otro con cadencia lenta y se espeja hacia
 *     donde anda; el jaguar corre su marcha real ('caminando') al desplazarse.
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

/**
 * Mapa ruta → hint contextual. Extensible:
 *   - Añadir rutas nuevas
 *   - Cambiar hints según feedback del operador
 *   - Soporta fallback a 'default' si la ruta no está en el mapa
 */
const RUTA_HINTS = {
  dashboard: {
    titulo: 'Bienvenido a su finca',
    descripcion: 'Toque en el Mapa para ubicar su finca, o explore el Catálogo de plantas y plagas de su región.',
  },
  perfil: {
    titulo: 'Su perfil de la finca',
    descripcion: 'Aquí puede actualizar su ubicación, el tipo de finca, y sus preferencias de Chagra.',
  },
  mapa: {
    titulo: 'Su finca en el mapa',
    descripcion: 'Toque en un lugar para ver el piso térmico, las plantas recomendadas, y la lluvia del mes.',
  },
  historial: {
    titulo: 'Registro de su finca',
    descripcion: 'Aquí están anotadas todas las acciones que ha hecho en Chagra: siembras, cosechas, observaciones.',
  },
  catalogo: {
    titulo: 'Catálogo de plantas',
    descripcion: 'Busque plantas, plagas y enemigos naturales de su región. Toque para más detalles.',
  },
  plantas: {
    titulo: 'Sus plantas',
    descripcion: 'El registro de lo que cultiva en su finca. Toque una planta para ver su ciclo y cuidados.',
  },
  animales: {
    titulo: 'Sus animales',
    descripcion: 'Gallinas, cerdos, ganado y abejas. Aquí pueden anotar las observaciones de cada uno.',
  },
  default: {
    titulo: 'Su compai está aquí',
    descripcion: 'Su compai le acompaña en Chagra. Toque para obtener ayuda en esta pantalla.',
  },
};

/**
 * Obtiene el hint para una ruta dada.
 */
function getHintForRuta(ruta, nombreCompai = 'Angelita') {
  const hintDefault = {
    ...RUTA_HINTS.default,
    titulo: `${nombreCompai} está aquí`,
    descripcion: `Soy ${nombreCompai}, su compañero en Chagra. Toque para obtener ayuda en esta pantalla.`,
  };

  if (!ruta) {
    return hintDefault;
  }

  // Busca exacta
  if (ruta === 'default') {
    return hintDefault;
  }
  if (RUTA_HINTS[ruta]) {
    return RUTA_HINTS[ruta];
  }

  // Fallback: si es una subruta (p. ej. 'mapa.detalles'), intenta prefijo
  const prefijo = ruta.split('_')[0];
  if (RUTA_HINTS[prefijo]) {
    return RUTA_HINTS[prefijo];
  }

  // Fallback absoluto
  return hintDefault;
}

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

  // El compai DEAMBULA por la franja inferior (~30% del ancho): se pausa (y
  // vuelve a casa) mientras el panel está abierto para que no se corra bajo la
  // guía. El regreso es la misma caminata (nunca un salto). Ver useCompaiRoam.
  const roamRef = useRef(null);
  const { caminando, hacia } = useCompaiRoam(roamRef, { pausado: isOpen });

  const hint = useMemo(() => getHintForRuta(currentView, nombreCompai), [currentView, nombreCompai]);

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

  // Un felino/animal realista (jaguar) NO cabe digno en un disco chico: se le
  // da más tamaño para que se LEA. Los compai chicos (abeja, luciérnaga…) van
  // en un tamaño intermedio, cómodo, sin disco de color detrás.
  const esRealista = avatarType === 'jaguar';
  const avatarSize = esRealista ? 112 : 84;

  // Mientras deambula, el jaguar corre su MARCHA real ('caminando'); el resto
  // conserva su estado (no tienen pose de marcha) y solo se espejan. Un estado
  // conversacional (hablar/escuchar/pensar) siempre gana a la caminata.
  const estadoAvatar = esRealista && caminando && compaiState === 'idle'
    ? 'caminando'
    : compaiState;

  // Los compai miran a la IZQUIERDA por defecto (la lámina del jaguar tiene la
  // testa a la izquierda); al volver hacia la derecha se espejan. GATE GPU: si
  // el sentido sale invertido para algún compai, es voltear este mapeo.
  const espejo = hacia === 'derecha' ? 'scaleX(-1)' : 'none';

  return (
    <div
      className="fixed bottom-4 right-4 z-40 pointer-events-none"
      data-testid="compai-overlay-container"
    >
      {/* El compai que deambula (roamRef desplaza SOLO este nodo por la franja;
          el panel queda anclado a la esquina). */}
      <div ref={roamRef} className="will-change-transform">
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
          <span
            className="inline-flex"
            style={{
              transform: espejo,
              transition: 'transform 0.35s ease',
              filter: 'drop-shadow(0 6px 9px rgba(0, 0, 0, 0.34))',
            }}
          >
            <ChagraAgentAvatar
              size={avatarSize}
              state={estadoAvatar}
              ariaLabel={`${nombreCompai}, asistente de Chagra`}
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
