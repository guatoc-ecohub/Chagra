import { describe, it, expect, beforeEach } from 'vitest';
import useAgentQueueStore, { DEFAULT_EMA_MS, QUEUE_MAX } from '../useAgentQueueStore';

function resetStore() {
  useAgentQueueStore.setState({
    processing: null,
    pending: [],
    latencyEma: Object.assign({}, DEFAULT_EMA_MS),
    rejectedCount: 0,
  });
}

describe('useAgentQueueStore', function () {
  beforeEach(resetStore);

  it('arranca con processing=null', function () {
    var s = useAgentQueueStore.getState();
    expect(s.processing).toBeNull();
    expect(s.pending).toEqual([]);
    expect(s.rejectedCount).toBe(0);
  });

  it('latencyEma defaults', function () {
    var s = useAgentQueueStore.getState();
    expect(s.latencyEma.chat).toBe(12900);
    expect(s.latencyEma.chat_complex).toBe(24700);
  });

  it('rechaza prompt vacio', function () {
    var store = useAgentQueueStore.getState();
    expect(store.enqueue('').status).toBe('rejected');
    expect(store.enqueue(null).status).toBe('rejected');
  });

  it('enqueue arranca con status=started', function () {
    var r = useAgentQueueStore.getState().enqueue('p1', 'chat');
    expect(r.status).toBe('started');
    expect(r.item.prompt).toBe('p1');
    expect(useAgentQueueStore.getState().processing).not.toBeNull();
  });

  it('enqueue encola segunda pregunta', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    var r = useAgentQueueStore.getState().enqueue('p2', 'chat');
    expect(r.status).toBe('queued');
    expect(useAgentQueueStore.getState().pending.length).toBe(1);
  });

  it('rechaza tercera pregunta con QUEUE_MAX=2', function () {
    useAgentQueueStore.getState().enqueue('p1');
    useAgentQueueStore.getState().enqueue('p2');
    var r = useAgentQueueStore.getState().enqueue('p3');
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('queue_full');
    expect(useAgentQueueStore.getState().rejectedCount).toBe(1);
  });

  it('completeProcessing sin processing no explota', function () {
    expect(useAgentQueueStore.getState().completeProcessing()).toBeNull();
  });

  it('completeProcessing sin pending libera', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    useAgentQueueStore.getState().completeProcessing();
    expect(useAgentQueueStore.getState().processing).toBeNull();
  });

  it('completeProcessing promueve pending', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    useAgentQueueStore.getState().enqueue('p2', 'chat');
    var next = useAgentQueueStore.getState().completeProcessing();
    expect(next.prompt).toBe('p2');
  });

  it('failed=true preserva EMA', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    var oldEma = useAgentQueueStore.getState().latencyEma.chat;
    useAgentQueueStore.getState().completeProcessing({ failed: true });
    expect(useAgentQueueStore.getState().latencyEma.chat).toBe(oldEma);
  });

  it('updateProcessingRoute cambia model', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    var id = useAgentQueueStore.getState().processing.id;
    useAgentQueueStore.getState().updateProcessingRoute(id, 'chat_complex');
    expect(useAgentQueueStore.getState().processing.model).toBe('chat_complex');
  });

  it('getRemainingMs null sin processing', function () {
    expect(useAgentQueueStore.getState().getRemainingMs()).toBeNull();
  });

  it('getRemainingMs positivo con processing', function () {
    useAgentQueueStore.getState().enqueue('p1', 'chat');
    expect(typeof useAgentQueueStore.getState().getRemainingMs()).toBe('number');
  });

  it('reset limpia todo', function () {
    useAgentQueueStore.getState().enqueue('p1');
    useAgentQueueStore.getState().enqueue('p2');
    useAgentQueueStore.getState().reset();
    var s = useAgentQueueStore.getState();
    expect(s.processing).toBeNull();
    expect(s.pending).toEqual([]);
    expect(s.rejectedCount).toBe(0);
  });
});
