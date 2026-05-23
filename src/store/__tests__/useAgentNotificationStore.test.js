/**
 * useAgentNotificationStore — task #122.
 *
 * Cubre el bus global de notificaciones del avatar colibrí:
 *   - setResponseReady toggle correctamente
 *   - setLastMessage acepta strings no vacíos, descarta tipos inválidos
 *   - markRead apaga responseReady sin tocar lastAssistantMessage
 *     (porque queremos retener el texto para replayLast aún tras "leer")
 */
import { describe, it, expect, beforeEach } from 'vitest';
import useAgentNotificationStore from '../useAgentNotificationStore';

const resetStore = () => {
  useAgentNotificationStore.setState({
    responseReady: false,
    lastAssistantMessage: null,
  });
};

describe('useAgentNotificationStore', () => {
  beforeEach(resetStore);

  it('arranca con responseReady=false y lastAssistantMessage=null', () => {
    const s = useAgentNotificationStore.getState();
    expect(s.responseReady).toBe(false);
    expect(s.lastAssistantMessage).toBeNull();
  });

  it('setResponseReady acepta truthy/falsy y normaliza a Boolean', () => {
    const { setResponseReady } = useAgentNotificationStore.getState();
    setResponseReady(true);
    expect(useAgentNotificationStore.getState().responseReady).toBe(true);
    setResponseReady(false);
    expect(useAgentNotificationStore.getState().responseReady).toBe(false);
    setResponseReady('yes');
    expect(useAgentNotificationStore.getState().responseReady).toBe(true);
    setResponseReady(0);
    expect(useAgentNotificationStore.getState().responseReady).toBe(false);
  });

  it('setLastMessage guarda strings no vacíos', () => {
    const { setLastMessage } = useAgentNotificationStore.getState();
    setLastMessage('respuesta del agente');
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBe('respuesta del agente');
  });

  it('setLastMessage descarta strings vacíos y tipos no-string', () => {
    const { setLastMessage } = useAgentNotificationStore.getState();
    setLastMessage('hola');
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBe('hola');
    setLastMessage('');
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBeNull();
    setLastMessage(123);
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBeNull();
    setLastMessage({ x: 1 });
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBeNull();
  });

  it('markRead apaga responseReady pero retiene lastAssistantMessage', () => {
    const { setResponseReady, setLastMessage, markRead } =
      useAgentNotificationStore.getState();
    setResponseReady(true);
    setLastMessage('respuesta cacheada');
    expect(useAgentNotificationStore.getState().responseReady).toBe(true);
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBe('respuesta cacheada');

    markRead();

    expect(useAgentNotificationStore.getState().responseReady).toBe(false);
    // El mensaje se conserva — el replayLast debe poder seguir funcionando
    // aún después de que el operador "lea" la respuesta visualmente.
    expect(useAgentNotificationStore.getState().lastAssistantMessage).toBe('respuesta cacheada');
  });
});
