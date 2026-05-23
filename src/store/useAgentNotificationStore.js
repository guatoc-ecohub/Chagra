import { create } from 'zustand';

/**
 * useAgentNotificationStore — bus global de notificaciones del agente.
 *
 * Operator decisión 2026-05-23 (task #122): el colibrí Chagra es el avatar
 * del agente y vive global (AgentFab) en TODA la app. Cuando AgentScreen
 * termina un stream LLM, marcamos `responseReady=true` y el AgentFab
 * arranca a brillar (glow drop-shadow amber) en cualquier pantalla. Al
 * volver a AgentScreen → `markRead()` apaga el brillo.
 *
 * `lastAssistantMessage` se usa para el doble-click del avatar global:
 * si TTS está silenciado, re-reproducir el último mensaje del agente.
 *
 * Tono: honesto, sin confetti ni bouncing. El glow es señal sutil de
 * "hay algo nuevo para ti sin gritarlo".
 *
 * No persistimos en localStorage: la noción de "respuesta lista no leída"
 * tiene sentido SOLO dentro de la sesión activa (post-reload nada nuevo
 * te espera, salvo que el agente esté streameando).
 */
const useAgentNotificationStore = create((set) => ({
  responseReady: false,
  lastAssistantMessage: null,

  setResponseReady: (flag) => set({ responseReady: Boolean(flag) }),
  setLastMessage: (text) =>
    set({ lastAssistantMessage: typeof text === 'string' && text.length > 0 ? text : null }),
  markRead: () => set({ responseReady: false }),
}));

export default useAgentNotificationStore;
