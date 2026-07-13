/* i18n (ADR-050): etiquetas user-facing en español Colombia — mismo criterio
 * de archivo que MercadosScreen. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useState } from 'react';
import {
  ArrowLeft, CheckCircle2, Star, Handshake, AlertCircle,
} from 'lucide-react';
import useRedStore from '../../store/useRedStore';
import { ENTREGA, SHARE_LEVEL } from '../../services/red';
import NivelCompartirSwitch from './NivelCompartirSwitch';

/**
 * CierreTratoSheet — "¿Se concretó el negocio?": el paso de CIERRE de un trato
 * del mercado. Es el gesto mínimo que alimenta TODA la red humana: de este
 * registro salen el grafo social y la reputación ganada (mercado → grafo,
 * services/red/README.md). Sin pedir nada extra: producto, vereda y cantidad
 * ya vienen de la oferta.
 *
 * Tres preguntas, ninguna obligatoria de más:
 *   1. ¿Cómo terminó la entrega? (el hecho verificable)
 *   2. ¿Cómo calificaron la calidad? (opcional, 1..5 — o nada, nunca se inventa)
 *   3. ¿Con quién comparte este trato? (compuerta opt-in; nace PRIVADO)
 *
 * @param {Object} props
 * @param {Object} props.oferta - la oferta del mercado que originó el trato.
 * @param {() => void} props.onClose
 * @param {(trato:Object) => void} [props.onRegistrado]
 */

const ENTREGA_OPCIONES = [
  { valor: ENTREGA.ENTREGADO, label: 'Sí, entregué el producto' },
  { valor: ENTREGA.PARCIAL, label: 'Entregué una parte' },
  { valor: ENTREGA.NO_ENTREGADO, label: 'No se dio la entrega' },
  { valor: ENTREGA.PENDIENTE, label: 'Cerramos el trato, entrega pendiente' },
];

export default function CierreTratoSheet({ oferta, onClose, onRegistrado }) {
  const registrarTrato = useRedStore((s) => s.registrarTrato);
  const [entrega, setEntrega] = useState(ENTREGA.ENTREGADO);
  const [calidad, setCalidad] = useState(/** @type {number|null} */ (null));
  const [shareLevel, setShareLevel] = useState(SHARE_LEVEL.PRIVADO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [registrado, setRegistrado] = useState(false);

  const handleRegistrar = async () => {
    setGuardando(true);
    setError(null);
    const trato = await registrarTrato({ oferta, entrega, calidad, shareLevel });
    setGuardando(false);
    if (!trato) {
      setError('No se pudo guardar el trato. Su registro no se perdió: intente de nuevo.');
      return;
    }
    setRegistrado(true);
    if (onRegistrado) onRegistrado(trato);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Registrar el trato de ${oferta?.producto || 'su producto'}`}
      onClick={(e) => {
        // stopPropagation: este sheet puede vivir DENTRO del backdrop de
        // DetalleOferta (que también cierra al click) — cerrar el sheet no
        // debe cerrar el detalle de la oferta.
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-white text-sm truncate px-2 flex items-center gap-2">
            <Handshake size={16} className="text-emerald-400" aria-hidden="true" /> ¿Se concretó el negocio?
          </span>
          <span className="w-8" />
        </div>

        {registrado ? (
          <div className="p-4 space-y-4" data-testid="trato-registrado">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
              <CheckCircle2 size={28} className="text-emerald-400 mx-auto" aria-hidden="true" />
              <p className="text-white font-bold mt-2">Trato registrado en su cuaderno.</p>
              <p className="text-slate-300 text-sm mt-1 leading-snug">
                {shareLevel >= SHARE_LEVEL.PARES
                  ? 'Como lo compartió con los vecinos, este trato ya ayuda a que otro campesino lo encuentre cuando busque quién cultiva lo mismo cerca.'
                  : 'Quedó privado en su teléfono. Cuando quiera, puede compartirlo con los vecinos para que la red lo conozca.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Listo
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            <p className="text-sm text-slate-300 leading-snug">
              Registre cómo terminó el trato de <strong className="text-white">{oferta?.producto}</strong>.
              Con esto su palabra queda respaldada por hechos, y los vecinos de la
              red pueden confiar en usted sin conocerlo todavía.
            </p>

            {/* 1. La entrega: el hecho verificable que gana fiabilidad. */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-200 mb-2">¿Cómo terminó la entrega?</legend>
              <div className="space-y-1.5" role="radiogroup" aria-label="Resultado de la entrega">
                {ENTREGA_OPCIONES.map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    role="radio"
                    aria-checked={entrega === op.valor}
                    onClick={() => setEntrega(op.valor)}
                    data-testid={`entrega-${op.valor}`}
                    className={`w-full min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      entrega === op.valor
                        ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 2. Calidad calificada (opcional — nunca se inventa). */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-200 mb-1">
                ¿Cómo calificó el comprador la calidad? <span className="text-slate-500 font-normal">(opcional)</span>
              </legend>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación de calidad, de 1 a 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={calidad === n}
                    aria-label={`${n} de 5`}
                    onClick={() => setCalidad(calidad === n ? null : n)}
                    data-testid={`calidad-${n}`}
                    className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <Star
                      size={22}
                      aria-hidden="true"
                      className={calidad != null && n <= calidad ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                    />
                  </button>
                ))}
                {calidad != null && (
                  <span className="text-xs text-slate-400 ml-1">{calidad} de 5</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Si no se la calificaron, déjelo vacío. Un dato en blanco es más
                honesto que uno inventado.
              </p>
            </fieldset>

            {/* 3. La compuerta: con quién comparte este trato. */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-200 mb-2">¿Con quién comparte este trato?</legend>
              <NivelCompartirSwitch value={shareLevel} onChange={setShareLevel} />
            </fieldset>

            {error && (
              <p className="text-rose-400 text-sm flex items-center gap-1.5" data-testid="trato-error">
                <AlertCircle size={14} aria-hidden="true" /> {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={handleRegistrar}
                disabled={guardando}
                data-testid="registrar-trato"
                className="flex-1 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} aria-hidden="true" /> {guardando ? 'Guardando…' : 'Registrar el trato'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
