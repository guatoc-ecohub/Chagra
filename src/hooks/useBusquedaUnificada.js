/**
 * useBusquedaUnificada.js — Búsqueda instantánea local en todo el catálogo.
 *
 * Busca en: especies, biopreparados, cultivos, plagas, mundos 3D.
 * Todo local: catálogo SQLite + IndexedDB. Sin backend.
 * Atajo: / o Ctrl+K.
 */
import { useState, useCallback, useEffect } from 'react';

/** @typedef {{ id: string, titulo: string, tipo: string, subtipo: string, ruta: string }} Resultado */

/**
 * @returns {{ resultados: Resultado[], buscar: (q: string) => void, abierto: boolean, toggle: () => void }}
 */
export function useBusquedaUnificada() {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState(/** @type {Resultado[]} */ ([]));

  const toggle = useCallback(() => setAbierto((v) => !v), []);

  const buscar = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) { setResultados([]); return; }

    const lower = q.toLowerCase();
    /** @type {Resultado[]} */
    const res = [];

    // Buscar en el catálogo de especies (desde el manifiesto + taxonomy)
    try {
      const { CROP_TAXONOMY } = await import('../../config/taxonomy.js');
      for (const [grupo, data] of Object.entries(CROP_TAXONOMY)) {
        for (const sp of data.species || []) {
          const nombre = sp.commonName || sp.id || '';
          if (nombre.toLowerCase().includes(lower)) {
            res.push({ id: sp.id, titulo: nombre, tipo: 'especie', subtipo: grupo, ruta: 'directorio' });
          }
          if (res.length > 8) break;
        }
        if (res.length > 8) break;
      }
    } catch {}

    // Buscar mundos 3D
    try {
      const { MUNDO } = await import('../../visual/mundo3d/mundoData.js');
      for (const m of (MUNDO || [])) {
        if ((m.titulo || m.id || '').toLowerCase().includes(lower)) {
          res.push({ id: m.id, titulo: m.titulo || m.id, tipo: 'mundo', subtipo: m.pisoTermico || '', ruta: 'mundo' });
        }
        if (res.length > 12) break;
      }
    } catch {}

    // Buscar biopreparados
    try {
      const { BIOPREPARADOS } = await import('../../data/biopreparadosCatalog.js');
      for (const b of (BIOPREPARADOS || [])) {
        if ((b.nombre || '').toLowerCase().includes(lower)) {
          res.push({ id: b.id || b.nombre, titulo: b.nombre, tipo: 'biopreparado', subtipo: b.tipo || '', ruta: 'biopreparados' });
        }
        if (res.length > 15) break;
      }
    } catch {}

    setResultados(res.slice(0, 12));
  }, []);

  // Atajo de teclado: / o Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement === document.body) ||
          (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && abierto) setAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, toggle]);

  return { resultados, buscar, abierto, toggle, query };
}
