import { openDB, STORES } from '../db/dbCore';

const TELEMETRY_STORES = [
  STORES.VOICE_TELEMETRY,
  STORES.LLM_TELEMETRY,
  STORES.RAG_TELEMETRY,
];

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getEvents() {
  const events = [];
  const db = await openDB();

  for (const storeName of TELEMETRY_STORES) {
    if (!db.objectStoreNames.contains(storeName)) continue;

    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const rows = await getAllFromStore(store);
    events.push(...rows.map((event) => ({ ...event, _source: storeName })));
  }

  events.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return events;
}

export default {
  getEvents,
};
