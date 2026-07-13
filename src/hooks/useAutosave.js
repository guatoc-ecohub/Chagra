import { useState, useEffect, useRef, useCallback } from 'react';

export function useAutosave(storageKey, initialState = {}) {
  if (!storageKey) throw new Error('[useAutosave] storageKey is required');
  const key = 'chagra:autosave:' + storageKey;
  const submitted = useRef(false);
  const timer = useRef(null);
  const latest = useRef(initialState);
  const [state, setState] = useState(() => {
    try { const r = localStorage.getItem(key); if (!r) return initialState; const p = JSON.parse(r); return p?.__submitted__ ? initialState : { ...initialState, ...p }; }
    catch { return initialState; }
  });
  const save = useCallback((partial) => {
    latest.current = { ...latest.current, ...partial };
    setState(prev => ({ ...prev, ...partial }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (submitted.current) return;
      try { const p = { ...latest.current }; delete /** @type {any} */ (p).__submitted__; localStorage.setItem(key, JSON.stringify(p)); } catch {}
    }, 2000);
  }, [key]);
  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
    latest.current = initialState; setState(initialState);
    if (timer.current) clearTimeout(timer.current);
  }, [key, initialState]);
  const markDone = useCallback(() => {
    submitted.current = true;
    if (timer.current) clearTimeout(timer.current);
    try { localStorage.removeItem(key); } catch {}
  }, [key]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { savedState: state, save, clearAutosave: clear, markSubmitted: markDone };
}
