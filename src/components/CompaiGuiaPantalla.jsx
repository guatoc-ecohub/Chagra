import { useCallback } from 'react';
import useCompaiGuiaPantalla from '../hooks/useCompaiGuiaPantalla.js';
import useAgentAvatarType, { AVATAR_NOMBRE, DEFAULT_AVATAR_TYPE } from '../hooks/useAgentAvatarType.js';

/**
 * CompaiGuiaPantalla — la guía de la pantalla actual, ESCRITA EN LA PIZARRA.
 *
 * RECABLEADO 2026-09-03 (decisión del operador: el texto de explicación de la
 * pantalla SALE EN LA PIZARRA SIEMPRE; regla dura, commit 3233f7f06: la
 * pizarra es el ÚNICO aviso del compai). Este componente NACIÓ como una
 * burbuja auto-pop (BurbujaAngelita) que se pintaba sola al entrar a la
 * pantalla — ese comportamiento quedó PROHIBIDO porque competía con la
 * pizarra. Hoy es un BLOQUE DE LA PIZARRA: se monta DENTRO del panel "Ver"
 * del AgentFab (al que se llega tocando el compai: toque → peek → Ver) y
 * escribe qué es la pantalla, qué se puede hacer en ella (chips de funciones
 * del manifiesto `compaiExplicaPantallas`) y el botón para llevar la pregunta
 * al agente. Nada se monta solo: sin toque no hay guía.
 *
 * La voz no se duplica aquí: el "Escuchar" de la propia pizarra lee el mismo
 * texto (peek y panel leen `contenidoPanel`, que con este cableado ES la
 * explicación del manifiesto).
 *
 * Si la pantalla no está en el manifiesto, el bloque no dice nada (mejor
 * callado que inventado).
 *
 * Accesibilidad: region con aria-label del compAI; el botón lleva nombre
 * accesible propio.
 *
 * @param {Object} props
 * @param {string|null} props.pantalla — currentView del shell (AgentFab lo pasa).
 * @param {Function} [props.onNavigate] — mismo contrato de navegación del AgentFab.
 */
export default function CompaiGuiaPantalla({ pantalla, onNavigate }) {
  const explicacion = useCompaiGuiaPantalla(pantalla);
  const [avatarType] = useAgentAvatarType();
  const nombre = AVATAR_NOMBRE[avatarType] || AVATAR_NOMBRE[DEFAULT_AVATAR_TYPE];

  const preguntar = useCallback(() => {
    if (!onNavigate) return;
    const contexto = pantalla
      ? { desdePantalla: pantalla, spatialContext: { pantalla } }
      : {};
    onNavigate('agente', contexto);
  }, [pantalla, onNavigate]);

  if (!explicacion) return null;

  return (
    <div className="compai-guia" role="region" aria-label={`Guía de ${nombre}`}>
      <p style={textoGuia}>{explicacion.texto}</p>
      {explicacion.funciones.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {explicacion.funciones.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 12,
                lineHeight: 1,
                padding: '6px 9px',
                borderRadius: 999,
                background: 'rgb(var(--c-surface-card, 15 23 42) / 0.92)',
                border: '1px solid rgb(var(--c-surface-border, 51 65 85) / 0.8)',
                color: '#dbeafe',
              }}
            >
              {f}
            </span>
          ))}
        </div>
      )}
      {onNavigate && (
        <button
          type="button"
          onClick={preguntar}
          aria-label={`Preguntar sobre ${explicacion.titulo} a ${nombre}`}
          style={botonPrimario}
        >
          Preguntarme sobre esto
        </button>
      )}
    </div>
  );
}

const textoGuia = {
  fontSize: 13,
  color: '#cbd5e1',
  lineHeight: 1.5,
  margin: 0,
};

const botonPrimario = {
  marginTop: 10,
  padding: '8px 14px',
  borderRadius: 12,
  border: 'none',
  background: 'rgb(var(--c-accent, 16 163 127) / 0.95)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgb(var(--scrim-bg, 0 0 0) / 0.35)',
};
