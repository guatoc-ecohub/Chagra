/**
 * GlaciarHistorialScreen — pantalla de historial de reportes glaciares.
 *
 * Muestra la lista de reportes guardados (db/glaciarReportes.js) con:
 * - Montaña
 * - Fecha
 * - Estado (semáforo color)
 * - PuntoId
 *
 * Al tocar un reporte, muestra el detalle read-only.
 * Offline-first (IndexedDB).
 *
 * Ruta gateada con tieneAccesoGlaciar (src/config/glaciarAccess.js).
 *
 * Español Colombia (usted/tú, SIN voseo).
 */
import { useState, useEffect, useCallback } from 'react';
import { List, Snowflake, MapPin, Loader2, AlertCircle, Trash2, Download, CheckCircle2 } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { glaciarReportes } from '../db/glaciarReportes';
import { MSG } from '../config/messages.js';
import { downloadGeoJSON, downloadReporteGeoJSON } from '../services/glaciarExport';
import {
  MONTANA_BY_KEY,
  ESTADOS_SEGURIDAD,
  SUPERFICIE_BY_KEY,
  DUREZA_BY_CODIGO,
  PELIGRO_BY_KEY,
} from '../data/glaciar-schema.js';

const ESTADO_BG = {
  estable: 'glaciar-estado-estable',
  precaucion: 'glaciar-estado-precaucion',
  peligro: 'glaciar-estado-peligro',
  observacion: 'glaciar-estado-observacion',
};

const ESTADO_EMOJI = {
  estable: '🟢',
  precaucion: '🟡',
  peligro: '🔴',
  observacion: '🔵',
};

/**
 * GlaciarHistorialScreen — pantalla principal del historial.
 */
/** @param {{ onBack: () => void, onHome?: () => void }} props */
export default function GlaciarHistorialScreen({ onBack, onHome }) {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Exportación GeoJSON (de reportes YA guardados): estado in-flight + feedback.
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const cargarReportes = useCallback(async () => {
    setLoading(true);
    try {
      const all = await glaciarReportes.getAll();
      setReportes(all);
    } catch (e) {
      console.error('[GlaciarHistorial] error cargando reportes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial al montar. cargarReportes hace su propio setState de forma
    // asíncrona (await IndexedDB); el disable es para el patrón establecido de
    // "cargar al montar", no un setState síncrono que dispare renders en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarReportes();
  }, [cargarReportes]);

  const handleExportarTodos = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    setExportResult(null);
    try {
      const result = await downloadGeoJSON();
      setExportResult({
        success: true,
        message: `Exportados ${result.featureCount} reportes (${(result.sizeBytes / 1024).toFixed(1)} kB).`,
      });
    } catch (err) {
      console.error('[GlaciarHistorial] error exportando GeoJSON:', err);
      setExportResult({
        success: false,
        message: err.message || 'No se pudo exportar el archivo.',
      });
    } finally {
      setExporting(false);
      setTimeout(() => setExportResult(null), 4000);
    }
  }, [exporting]);

  const handleExportarReporte = useCallback((reporte) => {
    try {
      downloadReporteGeoJSON(reporte);
    } catch (err) {
      console.error('[GlaciarHistorial] error exportando reporte:', err);
      alert(err.message || 'No se pudo exportar el reporte.');
    }
  }, []);

  const handleEliminar = useCallback(async (id) => {
    if (deleting) return;
    if (!confirm(MSG.ui.confirmarEliminar)) return;
    
    setDeleting(true);
    try {
      await glaciarReportes.remove(id);
      setReportes((prev) => prev.filter((r) => r.id !== id));
      if (selectedReporte?.id === id) {
        setSelectedReporte(null);
      }
    } catch (e) {
      console.error('[GlaciarHistorial] error eliminando reporte:', e);
      alert('No se pudo eliminar el reporte');
    } finally {
      setDeleting(false);
    }
  }, [deleting, selectedReporte]);

  // Si hay un reporte seleccionado, mostramos el detalle
  if (selectedReporte) {
    return (
      <DetalleReporte
        reporte={selectedReporte}
        onBack={() => setSelectedReporte(null)}
        onEliminar={() => handleEliminar(selectedReporte.id)}
        onExportar={() => handleExportarReporte(selectedReporte)}
        onHome={onHome}
        deleting={deleting}
      />
    );
  }

  // Empty state
  if (!loading && reportes.length === 0) {
    return (
      <ScreenShell
        title="Historial de reportes"
        icon={List}
        onBack={onBack}
        onHome={onHome}
      >
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Snowflake size={64} className="text-slate-600 mb-4" />
          <h2 className="text-xl font-black text-white mb-2">Sin reportes aún</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            Los reportes que cree en el módulo glaciar quedarán guardados aquí.
            Puede verlos incluso sin conexión a internet.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-xl bg-sky-500 text-slate-950 font-bold flex items-center gap-2 active:scale-95 transition"
            >
              <MapPin size={18} />
              Crear un reporte
            </button>
          )}
        </main>
      </ScreenShell>
    );
  }

  // Lista de reportes
  return (
    <ScreenShell
      title="Historial de reportes"
      icon={List}
      onBack={onBack}
      onHome={onHome}
    >
      <main className="flex-1 px-4 pt-4 space-y-3 max-w-xl mx-auto overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p>{MSG.ui.cargandoReportes}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 pb-2">
              <p className="text-xs text-slate-500">
                {reportes.length} {reportes.length === 1 ? 'reporte guardado' : 'reportes guardados'}
              </p>
              <button
                type="button"
                onClick={handleExportarTodos}
                disabled={exporting}
                className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                aria-label="Exportar reportes a GeoJSON"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {exporting ? 'Exportando…' : 'Exportar GeoJSON'}
              </button>
            </div>
            {exportResult && (
              <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                exportResult.success
                  ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/50'
                  : 'bg-red-900/30 text-red-300 border border-red-800/50'
              }`}>
                {exportResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{exportResult.message}</span>
              </div>
            )}
            {reportes.map((r) => (
              <ReporteCard
                key={r.id}
                reporte={r}
                onPress={() => setSelectedReporte(r)}
              />
            ))}
          </>
        )}
      </main>
    </ScreenShell>
  );
}

/**
 * ReporteCard — tarjeta compacta para la lista.
 * Muestra: montaña, fecha, estado (semáforo), puntoId.
 */
function ReporteCard({ reporte, onPress }) {
  const estado = reporte.estado || 'precaucion';
  const montana = MONTANA_BY_KEY[reporte.montana];
  const fecha = reporte.fechaISO
    ? new Date(reporte.fechaISO)
    : new Date(reporte.createdAt || 0);
  const emoji = ESTADO_EMOJI[estado] || '🟡';
  const bgClass = ESTADO_BG[estado] || ESTADO_BG.precaucion;

  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full rounded-2xl border ${bgClass} overflow-hidden transition active:scale-98 text-left`}
    >
      <div className="flex gap-3 p-3">
        {/* Miniatura */}
        <div className="shrink-0 w-20 h-20 rounded-xl bg-slate-800 overflow-hidden grid place-items-center">
          {reporte.fotoDataUrl ? (
            <img
              src={reporte.fotoDataUrl}
              alt="Punto glaciar"
              className="w-full h-full object-cover"
            />
          ) : (
            <Snowflake size={28} className="text-slate-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-black flex items-center gap-1.5 glaciar-estado-texto">
              {emoji}{' '}
              <span className="text-sm">
                {ESTADOS_SEGURIDAD[estado]?.label || 'Precaución'}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 glaciar-estado-texto">
            {fecha.toLocaleString('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {montana && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {montana.libre ? (reporte.montanaLibre || 'Otra') : montana.label}
              </span>
            )}
            {reporte.puntoId && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                📍 {reporte.puntoId}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * DetalleReporte — vista detallada read-only de un reporte.
 */
function DetalleReporte({ reporte, onBack, onEliminar, onExportar, onHome, deleting }) {
  const estado = reporte.estado || 'precaucion';
  // Solo se puede exportar a GeoJSON si el reporte tiene coordenadas GPS.
  const tieneCoords = reporte.lat != null && reporte.lng != null;
  const supKey = reporte.tipoSuperficie || reporte.capas?.[0]?.tipoSuperficie;
  const durCod = reporte.dureza || reporte.capas?.[0]?.dureza;
  const sup = SUPERFICIE_BY_KEY[supKey];
  const dur = DUREZA_BY_CODIGO[durCod];
  const montana = MONTANA_BY_KEY[reporte.montana];
  const fecha = reporte.fechaISO
    ? new Date(reporte.fechaISO)
    : new Date(reporte.createdAt || 0);
  const emoji = ESTADO_EMOJI[estado] || '🟡';
  const bgClass = ESTADO_BG[estado] || ESTADO_BG.precaucion;

  const handleHomeClick = () => {
    if (onHome) onHome();
  };

  return (
    <ScreenShell
      title="Detalle del reporte"
      icon={Snowflake}
      onBack={onBack}
      onHome={handleHomeClick}
      actions={
        <>
          {tieneCoords && (
            <button
              type="button"
              onClick={onExportar}
              className="p-2 rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-emerald-900/20 transition"
              aria-label="Exportar reporte a GeoJSON"
              title="Exportar este reporte a GeoJSON"
            >
              <Download size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onEliminar}
            disabled={deleting}
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-50"
            aria-label={MSG.ui.eliminarReporte}
          >
            {deleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </>
      }
    >
      <main className="flex-1 px-4 pt-4 space-y-4 max-w-xl mx-auto overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+120px)]">
        {/* Foto principal */}
        {reporte.fotoDataUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-700">
            <img
              src={reporte.fotoDataUrl}
              alt="Punto glaciar"
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Header del reporte */}
        <div className={`rounded-2xl border ${bgClass} p-4`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-2xl font-black flex items-center gap-2 glaciar-estado-texto">
              {emoji}{' '}
              <span className="text-lg">
                {ESTADOS_SEGURIDAD[estado]?.label || 'Precaución'}
              </span>
            </span>
          </div>
          <p className="text-sm text-slate-400 glaciar-estado-texto">
            {fecha.toLocaleString('es-CO', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
        </div>

        {/* Información básica */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <MapPin size={16} />
            Ubicación
          </h3>
          <div className="space-y-2 text-sm">
            {montana && (
              <p className="text-white">
                <span className="text-slate-500">Montaña:</span>{' '}
                {montana.libre ? (reporte.montanaLibre || 'Otra') : montana.label}
              </p>
            )}
            {reporte.puntoId && (
              <p className="text-white">
                <span className="text-slate-500">Punto fijo:</span> 📍 {reporte.puntoId}
              </p>
            )}
            {reporte.lat != null && reporte.lng != null && (
              <p className="text-xs font-mono text-slate-400">
                {reporte.lat.toFixed(5)}, {reporte.lng.toFixed(5)}
                {reporte.precision != null ? ` (±${reporte.precision}m)` : ''}
              </p>
            )}
            {reporte.altitud != null && (
              <p className="text-white">
                <span className="text-slate-500">Altitud:</span> {reporte.altitud} msnm
              </p>
            )}
            {reporte.distanciaBordeHieloM != null && (
              <p className="text-white">
                <span className="text-slate-500">Distancia al borde:</span>{' '}
                {reporte.distanciaBordeHieloM} m
              </p>
            )}
            {reporte.azimutBrujula != null && (
              <p className="text-white">
                <span className="text-slate-500">Azimut:</span> ↗ {reporte.azimutBrujula}°
              </p>
            )}
            {reporte.referenciaEncuadre && (
              <p className="text-white">
                <span className="text-slate-500">Referencia encuadre:</span>{' '}
                {reporte.referenciaEncuadre}
              </p>
            )}
          </div>
        </section>

        {/* Diagnóstico */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-300">Diagnóstico del hielo</h3>
          <div className="space-y-2 text-sm">
            {sup && (
              <p className="text-white">
                <span className="text-slate-500">Superficie:</span> {sup.icon} {sup.label}
              </p>
            )}
            {dur && (
              <p className="text-white">
                <span className="text-slate-500">Dureza:</span> {dur.codigo} · {dur.label}
              </p>
            )}
            {reporte.tempSuperficie != null && (
              <p className="text-white">
                <span className="text-slate-500">Temp. superficie:</span>{' '}
                {reporte.tempSuperficie}°C
              </p>
            )}
            {reporte.pisoGlaciar === false && (
              <p className="text-blue-300">
                🔵 Modo observación (borde del glaciar)
              </p>
            )}
          </div>
        </section>

        {/* Perfil de capas */}
        {Array.isArray(reporte.capas) && reporte.capas.length > 1 && (
          <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-300">
              Perfil de capas ({reporte.capas.length})
            </h3>
            <div className="space-y-2 text-sm">
              {reporte.capas.map((c, i) => {
                const cSup = SUPERFICIE_BY_KEY[c.tipoSuperficie];
                const cDur = DUREZA_BY_CODIGO[c.dureza];
                return (
                  <div key={i} className="text-white text-xs py-1 border-b border-slate-800 last:border-0">
                    <span className="text-slate-500 mr-2">Capa {i + 1}:</span>
                    {c.profundidad && <span>{c.profundidad}m · </span>}
                    {cSup && <span>{cSup.icon} {cSup.label}</span>}
                    {cDur && <span> · {cDur.codigo}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Peligros */}
        {Array.isArray(reporte.peligros) &&
          reporte.peligros.filter((p) => p !== 'ninguno_evidente').length > 0 && (
            <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <AlertCircle size={16} />
                Peligros observados
              </h3>
              <div className="flex flex-wrap gap-2">
                {reporte.peligros
                  .filter((p) => p !== 'ninguno_evidente')
                  .map((p) => {
                    const peligro = PELIGRO_BY_KEY[p];
                    return (
                      <span
                        key={p}
                        className="text-xs px-3 py-1 rounded-full bg-red-900/30 text-red-200 border border-red-800/40"
                      >
                        {peligro?.icon || '⚠️'} {peligro?.label || p}
                      </span>
                    );
                  })}
              </div>
              {reporte.rutaBajoSeracs && (
                <p className="text-xs text-red-300 mt-2">
                  ⚠️ La ruta pasa por debajo de los séracs
                </p>
              )}
              {reporte.penitentesDensos && (
                <p className="text-xs text-red-300 mt-2">
                  ⚠️ Penitentes densos / altos
                </p>
              )}
              {reporte.pendientePronunciada && (
                <p className="text-xs text-amber-300 mt-2">⚠️ Pendiente pronunciada</p>
              )}
            </section>
          )}

        {/* Condiciones */}
        {(reporte.tempAmbiente != null ||
          reporte.cielo ||
          reporte.viento ||
          reporte.visibilidad) && (
          <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Condiciones</h3>
            <div className="space-y-2 text-sm">
              {reporte.tempAmbiente != null && (
                <p className="text-white">
                  <span className="text-slate-500">Temp. ambiente:</span>{' '}
                  {reporte.tempAmbiente}°C
                </p>
              )}
              {reporte.cielo && (
                <p className="text-white">
                  <span className="text-slate-500">Cielo:</span> {reporte.cielo}
                </p>
              )}
              {reporte.viento && (
                <p className="text-white">
                  <span className="text-slate-500">Viento:</span> {reporte.viento}
                </p>
              )}
              {reporte.visibilidad && (
                <p className="text-white">
                  <span className="text-slate-500">Visibilidad:</span>{' '}
                  {reporte.visibilidad}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Guía y notas */}
        {(reporte.guia || reporte.notas) && (
          <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-300">Información del guía</h3>
            <div className="space-y-2 text-sm">
              {reporte.guia && (
                <p className="text-white">
                  <span className="text-slate-500">Guía:</span> {reporte.guia}
                </p>
              )}
              {reporte.notas && (
                <p className="text-white italic glaciar-estado-texto">
                  <span className="text-slate-500">Notas:</span> "{reporte.notas}"
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </ScreenShell>
  );
}
