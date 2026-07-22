/**
 * T45 — Indicador de batería y conexión para modo campo.
 *
 * Muestra nivel de batería (lleno/medio/vacío) + intensidad de señal (4 barras).
 * APIs estándar: navigator.getBattery() + navigator.connection.effectiveType.
 * Solo visible en mobile (media query o userAgent).
 */
import { useState, useEffect } from 'react';

export default function BateriaConexionIndicator() {
  const [bateria, setBateria] = useState(/** @type {number|null} */ (null));
  const [cargando, setCargando] = useState(false);
  const [tipoRed, setTipoRed] = useState(/** @type {string} */ ('desconocido'));

  useEffect(() => {
    // Batería
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        setBateria(b.level);
        setCargando(b.charging);
        b.addEventListener('levelchange', () => setBateria(b.level));
        b.addEventListener('chargingchange', () => setCargando(b.charging));
      }).catch(() => {});
    }
    // Conexión
    const conn = navigator.connection;
    if (conn) {
      setTipoRed(conn.effectiveType || 'desconocido');
      conn.addEventListener('change', () => setTipoRed(conn.effectiveType || 'desconocido'));
    }
  }, []);

  if (bateria === null && tipoRed === 'desconocido') return null;

  const nivel = bateria !== null ? (bateria > 0.66 ? 'lleno' : bateria > 0.33 ? 'medio' : 'vacio') : null;
  const senal = tipoRed === '4g' ? 4 : tipoRed === '3g' ? 3 : tipoRed === '2g' ? 2 : tipoRed === 'slow-2g' ? 1 : 0;

  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500" title={`Batería: ${bateria !== null ? Math.round(bateria * 100) + '%' : '?'} · Red: ${tipoRed}`}>
      {nivel && (
        <span className={`${cargando ? 'text-emerald-400' : nivel === 'vacio' ? 'text-rose-400' : 'text-slate-400'}`}>
          {nivel === 'lleno' ? '🔋' : nivel === 'medio' ? '🪫' : '🪫'}
        </span>
      )}
      {senal > 0 && (
        <span className="text-slate-500" title={tipoRed}>
          {'📶'.substring(0, 1)}{'▁▃▅▇'.substring(0, senal)}
        </span>
      )}
    </span>
  );
}
