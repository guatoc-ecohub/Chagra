import { useCallback, useEffect, useRef } from 'react';
import BurbujaAngelita from '../visual/agente/BurbujaAngelita.jsx';
import useCompaiGuiaPantalla from '../hooks/useCompaiGuiaPantalla.js';
import useCompaiElegido from '../visual/mundo3d/escenas/useCompaiElegido.js';
import { AVATAR_NOMBRE, DEFAULT_AVATAR_TYPE } from '../hooks/useAgentAvatarType.js';
import { speakSentences } from '../services/ttsService.js';
import usePrefsStore from '../store/usePrefsStore.js';

/**
 * CompaiGuiaPantalla — el compAI ELEGIDO explica la pantalla al entrar.
 *
 * Capa de "bienvenida contextual" que se monta DENTRO del AgentFab (la única
 * presencia global del compAI — regla UNO SOLO por pantalla): al entrar a una
 * pantalla cubierta por `compaiExplicaPantallas`, el compAI se presenta con
 * una burbuja corta (qué hay ahí + qué puede hacer) y la LEE en voz alta con
 * el TTS local de Chagra (kokoro, 100% local — la burbuja y la voz van
 * juntas, sincronizadas por el mismo instante de visibilidad).
 *
 * Responder agro NO se re-implementa aquí: el botón «Preguntarme» abre el
 * agente existente (`onNavigate('agente', { desdePantalla, spatialContext })`)
 * — AgentScreen/agentService + agro-MCP. El compAI de esta guía es la cara y
 * la voz de ESE agente, no un motor nuevo.
 *
 * Decisión de aparición: la toma `useCompaiGuiaPantalla` (pura, testeable) —
 * una vez por pantalla por sesión, cede si la pantalla tiene su propia guía
 * (paradas de paseo), respeta el silencio manual y a quien está escribiendo.
 *
 * Accesibilidad: region con aria-label del compAI; la burbuja es role=status.
 * Cierra con la ×, con un toque afuera, o sola a los pocos segundos.
 *
 * @param {Object} props
 * @param {string|null} props.pantalla — currentView del shell (AgentFab lo pasa).
 * @param {Function} props.onNavigate — mismo contrato de navegación del AgentFab.
 */
export default function CompaiGuiaPantalla({ pantalla, onNavigate }) {
  const { explicacion, visible, descartar } = useCompaiGuiaPantalla(pantalla);
  const { avatarType } = useCompaiElegido();
  const nombre = AVATAR_NOMBRE[avatarType] || AVATAR_NOMBRE[DEFAULT_AVATAR_TYPE];
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const raizRef = useRef(null);

  // Voz: la burbuja y el audio arrancan en el MISMO instante — el texto es el
  // que se escucha. Si el TTS está apagado o falla, la burbuja queda igual.
  useEffect(() => {
    if (!visible || !explicacion) return undefined;
    if (!ttsEnabled) return undefined;
    speakSentences(explicacion.texto).catch(() => {});
    return undefined;
  }, [visible, explicacion, ttsEnabled]);

  // Toque afuera = "ya entendí": cierra la guía sin abrir nada.
  useEffect(() => {
    if (!visible) return undefined;
    const onToqueFuera = (ev) => {
      if (ev.target?.closest?.('.compai-guia')) return;
      descartar();
    };
    document.addEventListener('pointerdown', onToqueFuera, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', onToqueFuera, { capture: true });
  }, [visible, descartar]);

  const preguntar = useCallback(() => {
    const contexto = pantalla
      ? { desdePantalla: pantalla, spatialContext: { pantalla } }
      : {};
    onNavigate('agente', contexto);
    descartar();
  }, [pantalla, onNavigate, descartar]);

  if (!visible || !explicacion) return null;

  return (
    <div
      ref={raizRef}
      className="compai-guia"
      role="region"
      aria-label={`Guía de ${nombre}`}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 14px)',
        right: 0,
        width: 'min(320px, calc(100vw - 28px))',
        zIndex: 41,
        pointerEvents: 'auto',
      }}
    >
      <BurbujaAngelita mensaje={explicacion.texto} tipo="informativa" className="compai-guia__burbuja" />
      {explicacion.funciones.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'flex-end',
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
      <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={preguntar}
          aria-label={`Preguntar sobre ${explicacion.titulo} a ${nombre}`}
          style={botonPrimario}
        >
          Preguntarme sobre esto
        </button>
        <button
          type="button"
          onClick={descartar}
          aria-label={`Cerrar la guía de ${nombre}`}
          style={botonCerrar}
        >
          ×
        </button>
      </div>
    </div>
  );
}

const botonPrimario = {
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

const botonCerrar = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: '1px solid rgb(var(--c-surface-border, 51 65 85) / 0.8)',
  background: 'rgb(var(--c-surface-card, 15 23 42) / 0.92)',
  color: '#e2e8f0',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
};
