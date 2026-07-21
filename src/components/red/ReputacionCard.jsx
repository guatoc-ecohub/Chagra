import { MapPin, Star } from 'lucide-react';
import { NIVEL_REPUTACION } from '../../services/red';
import { NIVEL_REPUTACION_COPY, MOTIVO_REPUTACION_COPY } from './reputacionCopy';

/**
 * ReputacionCard — la reputación GANADA de un productor para UN cultivo.
 *
 * Espeja el idioma verde/ámbar/rojo del SemaforoConfianza del agente, pero
 * para un actor humano: aquí el color resume HECHOS de entrega del mercado
 * (quién entregó qué y cómo lo calificaron), no curaduría de fuentes. Por eso
 * la tarjeta habla en tratos contables ("entregó 4 de 5") y no en estrellas
 * abstractas: la confianza se muestra con su porqué, sin exponer nada privado
 * (ni nombres, ni compradores, ni notas — solo lo que ya cruzó la compuerta).
 *
 * `nuevo` es un nivel HONESTO, no un castigo: sin historial suficiente se
 * dice "vecino nuevo en la red", nunca se inventa un puntaje.
 *
 * @param {Object} props
 * @param {import('../../services/red/types.js').Reputacion} props.reputacion
 * @param {string} [props.titulo] - encabezado opcional (default: el producto).
 * @param {boolean} [props.esUsted] - la tarjeta es del propio operador.
 */

export default function ReputacionCard({ reputacion, titulo, esUsted = false }) {
  if (!reputacion) return null;
  const copy = NIVEL_REPUTACION_COPY[reputacion.nivel] || NIVEL_REPUTACION_COPY[NIVEL_REPUTACION.NUEVO];
  const motivo = MOTIVO_REPUTACION_COPY[reputacion.motivo] || null;
  const { Icon } = copy;
  const ubic = [reputacion.vereda, reputacion.municipio].filter(Boolean).join(', ');
  const fiabilidadPct = Math.round((reputacion.fiabilidad || 0) * 100);
  const tieneHistorial = reputacion.nConfirmadas > 0;

  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"
      data-testid="reputacion-card"
      data-nivel={reputacion.nivel}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-white text-sm leading-tight truncate">
            {titulo || reputacion.producto}
          </h4>
          <p className="text-slate-400 text-xs mt-0.5">
            {esUsted ? 'Usted en la red' : 'Un vecino de la red'}
            {ubic ? ` · ${ubic}` : ''}
          </p>
        </div>
        {/* Semáforo humano: mismo idioma que el semáforo de confianza del
            agente, pero sobre hechos de entrega. */}
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${copy.chip}`}
          data-testid="reputacion-nivel"
        >
          <Icon size={12} aria-hidden="true" /> {copy.label}
        </span>
      </div>

      {/* Los HECHOS, contables — no un puntaje abstracto. */}
      <div className="mt-2 text-xs text-slate-300 space-y-1">
        {tieneHistorial ? (
          <>
            <p data-testid="reputacion-fiabilidad">
              Cumplió la entrega en <strong>{reputacion.nConfirmadas}</strong> trato{reputacion.nConfirmadas === 1 ? '' : 's'} confirmado{reputacion.nConfirmadas === 1 ? '' : 's'} ({fiabilidadPct}% de fiabilidad).
            </p>
            {reputacion.calidadPromedio != null && (
              <p className="flex items-center gap-1" data-testid="reputacion-calidad">
                <Star size={11} className="text-amber-400" aria-hidden="true" />
                Calidad calificada: {reputacion.calidadPromedio.toFixed(1)} de 5.
              </p>
            )}
          </>
        ) : (
          <p data-testid="reputacion-sin-historial">
            Sin entregas confirmadas todavía en la red.
          </p>
        )}
        {motivo && (
          <p className="text-slate-400 leading-snug" data-testid="reputacion-motivo">{motivo}</p>
        )}
      </div>

      {ubic === '' && (
        <p className="text-slate-500 text-[11px] mt-1.5 flex items-center gap-1">
          <MapPin size={11} aria-hidden="true" /> Sin vereda registrada en sus tratos.
        </p>
      )}
    </div>
  );
}
