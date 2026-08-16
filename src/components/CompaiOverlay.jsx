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
 * Mapa ruta → hint contextual. La CLAVE es el `path` de la ruta 2D (o su alias)
 * del manifiesto `config/rutasProdChagraApp.js` — así el hint que muestra el
 * compai al PARAR en esa pantalla explica de verdad QUÉ hay ahí. Extensible:
 *   - Añadir rutas nuevas (usar el `path` real del manifiesto, o su alias)
 *   - Cambiar hints según feedback del operador
 *   - `getHintForRuta` cae a un prefijo (`animales_gallinas` → `animales`) y,
 *     si nada calza, al hint 'default'.
 *
 * NOTA: los mensajes son la capa BASE (qué es cada pantalla). Los tips VIVOS de
 * finca+pendientes (datos reales del usuario) son una capa ADITIVA aparte — ver
 * el gancho `// TODO: inyectar tips vivos` en el componente. Aquí NO se inventan
 * datos del usuario.
 */
// Objetos reusados por rutas que son la misma pantalla vía alias del manifiesto.
const HINT_CATALOGO = {
  titulo: 'Catálogo de especies',
  descripcion: 'Busque plantas, plagas y enemigos naturales de su región. Toque una ficha para ver cuidados, asociaciones y cómo manejarla.',
};
const HINT_HISTORIAL = {
  titulo: 'Registro de su finca',
  descripcion: 'Aquí están anotadas todas las acciones de su finca: siembras, cosechas, insumos y observaciones, ordenadas por fecha.',
};
const HINT_CULTIVOS = {
  titulo: 'Sus cultivos',
  descripcion: 'Explore por cultivo (café, cacao, plátano, frutales…) y vea el manejo recomendado para su piso térmico.',
};
const RUTA_HINTS = {
  // ── Inicio / agente / perfil ───────────────────────────────────
  dashboard: {
    titulo: 'Bienvenido a su finca',
    descripcion: 'Este es su tablero: aquí ve el clima de hoy, las tareas pendientes y accesos rápidos al Mapa, al Catálogo y a registrar lo que hizo en la finca.',
  },
  agente: {
    titulo: 'Pregúntele a su compai',
    descripcion: 'Escriba o hable y le respondo sobre cultivos, plagas, clima y manejo de su finca. Toque el micrófono para preguntar con la voz.',
  },
  perfil: {
    titulo: 'Su perfil de la finca',
    descripcion: 'Aquí actualiza su ubicación, el tipo de finca, el compai que le acompaña y preferencias como la letra grande.',
  },
  // ── Hoy / evolución ────────────────────────────────────────────
  hoy_finca: {
    titulo: 'Hoy en la finca',
    descripcion: 'Lo que importa hoy: el clima, las alertas de plagas de su zona y las tareas que conviene hacer en estos días.',
  },
  evolucion: {
    titulo: 'Cómo va su finca',
    descripcion: 'Vea la evolución de sus cultivos y registros en el tiempo: qué ha sembrado, cosechado y observado mes a mes.',
  },
  // ── Catálogo / especies ────────────────────────────────────────
  directorio: HINT_CATALOGO,
  especies: HINT_CATALOGO,
  plagas: HINT_CATALOGO,
  catalogo: HINT_CATALOGO,
  defensores: {
    titulo: 'Defensores naturales',
    descripcion: 'Los enemigos naturales de las plagas: insectos y aves que le ayudan a cuidar sus cultivos sin químicos.',
  },
  asociaciones: {
    titulo: 'Asociaciones de cultivos',
    descripcion: 'Qué plantas se ayudan entre sí y cuáles no conviene juntar. Para sembrar mejor.',
  },
  // ── Registro de finca ──────────────────────────────────────────
  registro_unificado: {
    titulo: 'Registrar en su finca',
    descripcion: 'Desde aquí anota siembras, cosechas, insumos u observaciones, todo en un solo lugar.',
  },
  sembrar: {
    titulo: 'Registrar una siembra',
    descripcion: 'Anote qué sembró, cuándo y dónde. Queda en el historial de su finca y ayuda a calcular la cosecha.',
  },
  cosechar: {
    titulo: 'Registrar una cosecha',
    descripcion: 'Anote lo que cosechó y cuánto. Así lleva la cuenta de la producción de su finca.',
  },
  insumos: {
    titulo: 'Registrar insumos',
    descripcion: 'Anote los abonos, biopreparados o materiales que aplicó, con la fecha y el lote.',
  },
  observacion: {
    titulo: 'Anotar una observación',
    descripcion: '¿Vio una plaga, una enfermedad o algo raro en un cultivo? Anótelo aquí, con foto si quiere.',
  },
  voz: {
    titulo: 'Registrar con la voz',
    descripcion: 'Hable y yo anoto por usted. Diga qué hizo en la finca y lo guardo en el registro.',
  },
  // ── Mapa / clima / suelo / agua ────────────────────────────────
  mapa: {
    titulo: 'Su finca en el mapa',
    descripcion: 'Toque un lugar para ver el piso térmico, las plantas recomendadas y la lluvia del mes en ese punto.',
  },
  clima_boletin: {
    titulo: 'El clima de su zona',
    descripcion: 'El boletín del tiempo para su finca: lluvia, temperatura y qué esperar los próximos días.',
  },
  agua: {
    titulo: 'El agua de su finca',
    descripcion: 'Aquí ve y anota lo del agua: lluvias, riego y fuentes de su finca.',
  },
  suelo: {
    titulo: 'Su suelo',
    descripcion: 'Información y registros del suelo de su finca: tipo, salud y qué le conviene para mejorarlo.',
  },
  // ── Cultivos / calendario / germinación ────────────────────────
  mundo_cultivos: HINT_CULTIVOS,
  plantas: HINT_CULTIVOS,
  calendario_finca: {
    titulo: 'Calendario de la finca',
    descripcion: 'Vea por fechas qué conviene sembrar, abonar o cosechar según el clima y sus cultivos.',
  },
  germinacion: {
    titulo: 'Germinación',
    descripcion: 'Guía y registro de sus germinadores: qué sembró, cuándo y cómo va cada semilla.',
  },
  // ── Animales / biopreparados ───────────────────────────────────
  animales: {
    titulo: 'Sus animales',
    descripcion: 'Gallinas, cerdos, ganado y abejas. Aquí anota las observaciones y el manejo de cada uno.',
  },
  biopreparados: {
    titulo: 'Biopreparados',
    descripcion: 'Recetas de caldos, biofertilizantes y bioinsumos para su finca, con sus ingredientes y modo de uso.',
  },
  // ── Registro histórico / informes / aprender ───────────────────
  historial: HINT_HISTORIAL,
  bitacora: HINT_HISTORIAL,
  informes: {
    titulo: 'Informes de su finca',
    descripcion: 'Resúmenes de lo que ha registrado: producción, insumos y actividad de su finca.',
  },
  aprende: {
    titulo: 'Aprenda con Chagra',
    descripcion: 'Cursos, juegos y guías sobre agroecología y el manejo de su finca. A su ritmo.',
  },
  default: {
    titulo: 'Su compai está aquí',
    descripcion: 'Su compai le acompaña en Chagra. Toque para obtener ayuda en esta pantalla.',
  },
};

/**
 * Zonas de aparición del compai. Son una capa paralela a RUTA_HINTS: el texto
 * sigue resolviéndose igual, pero el modo místico sabe qué sección vertical
 * está explicando cuando reaparece.
 */
const ZONAS_MISTICAS = ['abajo', 'medio', 'arriba'];
const HINTS_POR_ZONA = {
  arriba: 'Estoy en la parte de arriba de la pantalla, junto al encabezado y la información principal.',
  medio: 'Estoy en la parte del medio de la pantalla, donde puede explorar el contenido principal.',
  abajo: 'Estoy en la parte de abajo de la pantalla, junto a las acciones y controles para avanzar.',
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

/** Resuelve el orden vertical del modo místico sin tocar RUTA_HINTS. */
function getZonasForRuta() {
  return ZONAS_MISTICAS;
}

/** Agrega al hint de ruta el contexto de la zona donde está el compai. */
function getHintForZona(ruta, zona, nombreCompai = 'Angelita') {
  const hintBase = getHintForRuta(ruta, nombreCompai);
  const contexto = HINTS_POR_ZONA[zona] || HINTS_POR_ZONA.abajo;
  return {
    ...hintBase,
    descripcion: `${contexto} ${hintBase.descripcion}`,
  };
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

  // El compai camina horizontalmente por la franja inferior (~30% del ancho)
  // y, en modo místico, cambia de sección vertical con fade. Se pausa (y
  // vuelve a casa) mientras el panel está abierto. Ver useCompaiRoam.
  // `parada` se incrementa cada vez que LLEGA a un punto de su paseo — con eso
  // hacemos el "moverse-para-explicar" (ver la burbuja de parada más abajo).
  const roamRef = useRef(null);
  const efectoMisticoRef = useRef(null);
  const zonas = useMemo(() => getZonasForRuta(currentView), [currentView]);
  const { caminando, hacia, zona = 'abajo', parada } = useCompaiRoam(roamRef, {
    pausado: isOpen,
    mistico: true,
    zonas,
    efectoMisticoRef,
  });

  // El mensaje contextual de la pantalla actual (capa BASE: qué es esta
  // pantalla). El compai lo muestra al parar y al abrir el panel.
  // TODO: inyectar tips vivos de finca+pendientes (datos reales del usuario) —
  // p.ej. "hoy toca regar el lote 2" o "tiene 3 registros sin sincronizar" —
  // como capa ADITIVA sobre este hint, leyendo del store de pendientes + perfil
  // de finca. Es un gancho: NO inventar datos aquí; la fuente se cablea aparte.
  const hint = useMemo(
    () => getHintForZona(currentView, zona, nombreCompai),
    [currentView, nombreCompai, zona],
  );

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
      {/* El compai que deambula (roamRef desplaza SOLO este nodo por la pantalla;
          el panel queda anclado a la esquina). La burbuja de parada viaja
          DENTRO de este nodo → se queda pegada al compai donde se detuvo. */}
      <div ref={roamRef} className="will-change-transform relative">
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
          <span
            className="inline-flex"
            style={{
              transform: espejo,
              transition: 'transform 0.35s ease',
              filter: 'drop-shadow(0 6px 9px rgba(0, 0, 0, 0.34))',
            }}
          >
            <span ref={efectoMisticoRef} className="inline-flex will-change-transform" data-testid="compai-dissolve">
              <ChagraAgentAvatar
                size={avatarSize}
                state={estadoAvatar}
                ariaLabel={`${nombreCompai}, asistente de Chagra`}
              />
            </span>
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
