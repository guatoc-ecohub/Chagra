/**
 * Tests del UX de queueing del AgentScreen (task #121, 2026-05-24).
 *
 * Cubrimos la máquina de estados `useAgentQueueStore` que orquesta el
 * queue de preguntas al agente con capacidad max 2, ETA visible y
 * EMA de latencia por modelo.
 *
 * Foco unit-puro sobre el store (sin renderear el AgentScreen completo
 * — eso requeriría stubbing de ~25 servicios y traería tests frágiles).
 * El store es la lógica testable, AgentScreen.jsx es orquestación de UI
 * alrededor del store.
 *
 * Archivo ubicado en src/components/AgentScreen/__tests__/ por cohesión
 * semántica (es el UX queueing del AgentScreen) y por el path pedido
 * explícitamente en el task brief.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useAgentQueueStore, {
  DEFAULT_EMA_MS,
  QUEUE_MAX,
} from '../../../store/useAgentQueueStore';

describe('useAgentQueueStore — queue UX agente (task #121)', () => {
  beforeEach(() => {
    useAgentQueueStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('Caso 1: 1 pregunta → goes to processing, pending vacío', () => {
    const result = useAgentQueueStore.getState().enqueue('cómo combato la broca', 'chat');
    expect(result.status).toBe('started');
    expect(result.item.prompt).toBe('cómo combato la broca');
    expect(result.item.model).toBe('chat');
    expect(result.item.startedAt).toBeTypeOf('number');
    expect(result.item.expectedEtaMs).toBe(DEFAULT_EMA_MS.chat);

    const s = useAgentQueueStore.getState();
    expect(s.processing).not.toBeNull();
    expect(s.processing.id).toBe(result.item.id);
    expect(s.pending).toEqual([]);
    expect(s.rejectedCount).toBe(0);
  });

  it('Caso 2: 2 preguntas rápidas → primera processing, segunda pending', () => {
    const r1 = useAgentQueueStore.getState().enqueue('pregunta uno', 'chat');
    const r2 = useAgentQueueStore.getState().enqueue('pregunta dos', 'chat');

    expect(r1.status).toBe('started');
    expect(r2.status).toBe('queued');
    expect(r2.item.prompt).toBe('pregunta dos');

    const s = useAgentQueueStore.getState();
    expect(s.processing.prompt).toBe('pregunta uno');
    expect(s.pending).toHaveLength(1);
    expect(s.pending[0].prompt).toBe('pregunta dos');
    expect(s.rejectedCount).toBe(0);
  });

  it('Caso 3: 3ra pregunta rechazada con mensaje "espera"', () => {
    useAgentQueueStore.getState().enqueue('uno', 'chat');
    useAgentQueueStore.getState().enqueue('dos', 'chat');
    const r3 = useAgentQueueStore.getState().enqueue('tres', 'chat');

    expect(r3.status).toBe('rejected');
    expect(r3.reason).toBe('queue_full');
    expect(r3.message).toMatch(/espera/i);
    expect(r3.message).toMatch(/dos|2/);
    // No voseo argentino (regla CLAUDE.md): no debe aparecer "tenés", "esperá", "querés".
    expect(r3.message).not.toMatch(/tenés|esperá|querés|elegí/i);

    const s = useAgentQueueStore.getState();
    expect(s.processing.prompt).toBe('uno');
    expect(s.pending).toHaveLength(1);
    expect(s.pending[0].prompt).toBe('dos');
    expect(s.rejectedCount).toBe(1);
  });

  it('Caso 4: completeProcessing promueve pending → processing y actualiza EMA', () => {
    // Fake clock para controlar `elapsed` exacto.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T10:00:00Z'));

    const r1 = useAgentQueueStore.getState().enqueue('primera', 'chat');
    expect(r1.status).toBe('started');
    useAgentQueueStore.getState().enqueue('segunda', 'chat');

    // Avanzar 10s (elapsed=10000ms para la primera).
    vi.advanceTimersByTime(10000);

    const promoted = useAgentQueueStore.getState().completeProcessing();

    expect(promoted).not.toBeNull();
    expect(promoted.prompt).toBe('segunda');
    expect(promoted.startedAt).toBeTypeOf('number');

    const s = useAgentQueueStore.getState();
    expect(s.processing.prompt).toBe('segunda');
    expect(s.pending).toEqual([]);

    // EMA actualizado: oldEma=12900, elapsed=10000, alpha=0.3
    // newEma = round(12900*0.7 + 10000*0.3) = round(9030 + 3000) = 12030
    expect(s.latencyEma.chat).toBe(12030);
  });

  it('Caso 5: completeProcessing(failed=true) NO contamina el EMA', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T10:00:00Z'));

    useAgentQueueStore.getState().enqueue('primera', 'chat');
    // Latencia absurda 60s simulando un timeout / cold-start fallido.
    vi.advanceTimersByTime(60000);

    useAgentQueueStore.getState().completeProcessing({ failed: true });

    const s = useAgentQueueStore.getState();
    expect(s.processing).toBeNull();
    // EMA preservado en el default original.
    expect(s.latencyEma.chat).toBe(DEFAULT_EMA_MS.chat);
  });

  it('Caso 6: getRemainingMs decrementa con el tiempo (ETA countdown)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T10:00:00Z'));

    useAgentQueueStore.getState().enqueue('test', 'chat');

    const r0 = useAgentQueueStore.getState().getRemainingMs();
    expect(r0).toBe(DEFAULT_EMA_MS.chat);

    vi.advanceTimersByTime(5000);
    const r1 = useAgentQueueStore.getState().getRemainingMs();
    expect(r1).toBe(DEFAULT_EMA_MS.chat - 5000);

    vi.advanceTimersByTime(10000);
    const r2 = useAgentQueueStore.getState().getRemainingMs();
    expect(r2).toBe(DEFAULT_EMA_MS.chat - 15000);
  });

  it('Caso 7: updateProcessingRoute recalcula expectedEtaMs cuando el router decide chat_complex', () => {
    const r = useAgentQueueStore.getState().enqueue('plan multi-aspecto para asocios de aguacate', 'chat');
    expect(r.item.expectedEtaMs).toBe(DEFAULT_EMA_MS.chat);

    useAgentQueueStore.getState().updateProcessingRoute(r.item.id, 'chat_complex');

    const s = useAgentQueueStore.getState();
    expect(s.processing.model).toBe('chat_complex');
    expect(s.processing.expectedEtaMs).toBe(DEFAULT_EMA_MS.chat_complex);
  });

  it('Caso 8: enqueue("") devuelve rejected reason="empty"', () => {
    const r = useAgentQueueStore.getState().enqueue('   ', 'chat');
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('empty');
    expect(useAgentQueueStore.getState().processing).toBeNull();
  });

  it('Caso 9: completeProcessing sin pending deja processing=null', () => {
    useAgentQueueStore.getState().enqueue('única', 'chat');
    const promoted = useAgentQueueStore.getState().completeProcessing();
    expect(promoted).toBeNull();
    const s = useAgentQueueStore.getState();
    expect(s.processing).toBeNull();
    expect(s.pending).toEqual([]);
  });

  it('Caso 10: latencia anómala (>120s) NO actualiza el EMA (clamp defensivo)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T10:00:00Z'));

    useAgentQueueStore.getState().enqueue('q', 'chat');
    // 130s simula un cuelgue raro que no debería envenenar la EMA.
    vi.advanceTimersByTime(130000);
    useAgentQueueStore.getState().completeProcessing();

    expect(useAgentQueueStore.getState().latencyEma.chat).toBe(DEFAULT_EMA_MS.chat);
  });

  it('Caso 11: capacidad QUEUE_MAX exportada como 2 (acoplada al brief)', () => {
    expect(QUEUE_MAX).toBe(2);
  });

  it('Caso 12: reset() restaura defaults incluyendo latencyEma', () => {
    useAgentQueueStore.getState().enqueue('uno', 'chat');
    useAgentQueueStore.getState().enqueue('dos', 'chat');
    useAgentQueueStore.getState().enqueue('tres', 'chat'); // rejected → rejectedCount=1
    useAgentQueueStore.getState().reset();

    const s = useAgentQueueStore.getState();
    expect(s.processing).toBeNull();
    expect(s.pending).toEqual([]);
    expect(s.rejectedCount).toBe(0);
    expect(s.latencyEma).toEqual(DEFAULT_EMA_MS);
  });
});
