import init, { NeedleWasm } from './vendor/needle_wasm.js';

let engine;
let loading;

const tools = {
  cosecha: JSON.stringify([{
    name: 'registrar_cosecha',
    description: 'Registrar una cosecha de un cultivo',
    parameters: {
      type: 'object',
      properties: {
        cantidad: { type: 'number' },
        unidad: { type: 'string' },
        cultivo: { type: 'string' },
      },
    },
  }]),
  plaga: JSON.stringify([{
    name: 'consultar_control_plaga',
    description: 'Consultar qué biopreparado controla una plaga',
    parameters: {
      type: 'object',
      properties: { plaga: { type: 'string' } },
    },
  }]),
  control: JSON.stringify([{
    name: 'book_flight',
    description: 'Book a flight from one city to another',
    parameters: {
      type: 'object',
      properties: {
        origin: { type: 'string' },
        destination: { type: 'string' },
      },
    },
  }]),
};

async function loadEngine() {
  if (engine) return { loadMs: 0 };
  if (!loading) {
    loading = (async () => {
      const started = performance.now();
      await init(new URL('./vendor/needle_wasm_bg.wasm', import.meta.url));
      const [weights, vocab] = await Promise.all([
        fetch('./weights/needle.safetensors').then((response) => {
          if (!response.ok) throw new Error(`pesos HTTP ${response.status}`);
          return response.arrayBuffer();
        }),
        fetch('./weights/vocab.txt').then((response) => {
          if (!response.ok) throw new Error(`vocabulario HTTP ${response.status}`);
          return response.text();
        }),
      ]);
      engine = NeedleWasm.load(new Uint8Array(weights), vocab);
      if (!engine) throw new Error('NeedleWasm.load devolvió un motor vacío');
      return { loadMs: performance.now() - started };
    })();
  }
  return loading;
}

self.addEventListener('message', async (event) => {
  const { id, type, query, toolSet } = event.data;
  try {
    if (type === 'load') {
      self.postMessage({ id, type: 'loaded', ...(await loadEngine()) });
      return;
    }
    if (type !== 'run') throw new Error(`tipo de mensaje desconocido: ${type}`);
    await loadEngine();
    const started = performance.now();
    const result = engine.run(query, tools[toolSet]);
    self.postMessage({ id, type: 'result', query, toolSet, result, callMs: performance.now() - started });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, type: 'error', error: message });
  }
});
