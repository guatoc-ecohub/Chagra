/**
 * EnrollmentModoCampo — "Enséñale tu voz" (#2088).
 *
 * Flujo guiado ~20-30s: graba 5 "hola chagra" + 2 otras palabras + un
 * momento de silencio con el MICRÓFONO REAL, entrena una cabeza transfer
 * PERSONAL sobre el modelo base (mismo proceso que el modelo de fábrica,
 * pero con la voz del operador) y la guarda en IndexedDB. Es el fallback
 * cuando el modelo sintético (Kokoro TTS) no reconoce bien un acento/tono
 * particular — ver wakeWordEnrollment.js.
 *
 * UI simple, push-to-record: un botón grande por paso, indicador de
 * "grabando…" mientras collectExample() escucha (~1-1.5s), avance
 * automático al resolver. Sin pasos ocultos ni configuración.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, Check, Loader2, AlertTriangle } from 'lucide-react';
import { createEnrollmentSession, ENROLLMENT_STEPS } from '../../services/wakeWordEnrollment';
import { MSG } from '../../config/messages';

const FASE_INTRO = 'intro';
const FASE_GRABANDO = 'grabacion';
const FASE_ENTRENANDO = 'entrenando';
const FASE_LISTO = 'listo';
const FASE_ERROR = 'error';

export default function EnrollmentModoCampo({ onClose }) {
  const [fase, setFase] = useState(FASE_INTRO);
  const [pasoIdx, setPasoIdx] = useState(0);
  const [grabandoAhora, setGrabandoAhora] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const sessionRef = useRef(null);
  const canceladoRef = useRef(false);
  // Si el error fue durante entrenar() (ya grabó TODO), reintentar debe
  // re-entrenar — no volver a pedirle que regrabe los 8 pasos.
  const erroAlEntrenarRef = useRef(false);

  useEffect(() => () => { canceladoRef.current = true; }, []);

  const asegurarSesion = async () => {
    if (sessionRef.current) return sessionRef.current;
    const session = await createEnrollmentSession();
    sessionRef.current = session;
    return session;
  };

  const grabarPaso = async () => {
    setMensajeError('');
    setGrabandoAhora(true);
    setFase(FASE_GRABANDO);
    try {
      const session = await asegurarSesion();
      const paso = ENROLLMENT_STEPS[pasoIdx];
      await session.collect(paso.label);
      if (canceladoRef.current) return;
      setGrabandoAhora(false);
      if (pasoIdx + 1 < ENROLLMENT_STEPS.length) {
        setPasoIdx((i) => i + 1);
        setFase(FASE_INTRO);
      } else {
        await entrenar(session);
      }
    } catch (err) {
      if (canceladoRef.current) return;
      setGrabandoAhora(false);
      setFase(FASE_ERROR);
      setMensajeError(
        err?.message?.includes('Permission') || err?.message?.includes('MediaDevices')
          ? 'No pude usar el micrófono. Revise el permiso del navegador e intente de nuevo.'
          : (err?.message || 'No pude grabar esa muestra.'),
      );
    }
  };

  const entrenar = async (session) => {
    setFase(FASE_ENTRENANDO);
    try {
      await session.trainAndSave();
      if (canceladoRef.current) return;
      setFase(FASE_LISTO);
    } catch (err) {
      if (canceladoRef.current) return;
      erroAlEntrenarRef.current = true;
      setFase(FASE_ERROR);
      setMensajeError(err?.message || 'No pude entrenar con sus muestras. Intente de nuevo.');
    }
  };

  const cancelar = () => {
    sessionRef.current?.cancel?.();
    onClose();
  };

  const reintentarPaso = () => {
    setMensajeError('');
    if (erroAlEntrenarRef.current && sessionRef.current) {
      erroAlEntrenarRef.current = false;
      entrenar(sessionRef.current);
      return;
    }
    setFase(FASE_INTRO);
  };

  const paso = ENROLLMENT_STEPS[pasoIdx];
  const progreso = Math.round((pasoIdx / ENROLLMENT_STEPS.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enséñale tu voz a Chagra"
      data-testid="enrollment-modo-campo"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200">Enséñale tu voz</h4>
          <button
            type="button"
            onClick={cancelar}
            aria-label="Cerrar"
            data-testid="enrollment-cerrar"
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {(fase === FASE_INTRO || fase === FASE_GRABANDO) && (
          <>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Paso {pasoIdx + 1} de {ENROLLMENT_STEPS.length}
            </p>
            <p className="text-base text-slate-200 font-semibold text-center py-2" data-testid="enrollment-prompt">
              {paso.prompt}
            </p>
            <button
              type="button"
              onClick={grabarPaso}
              disabled={grabandoAhora}
              data-testid="enrollment-grabar"
              className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-2 min-h-[56px] ${
                grabandoAhora
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              <Mic size={20} />
              {grabandoAhora ? MSG.modoCampo.grabandoHableAhora : 'Grabar'}
            </button>
          </>
        )}

        {fase === FASE_ENTRENANDO && (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="enrollment-entrenando">
            <Loader2 size={32} className="text-violet-400 animate-spin" />
            <p className="text-sm text-slate-300 text-center">
              Aprendiendo su voz… un momento.
            </p>
          </div>
        )}

        {fase === FASE_LISTO && (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="enrollment-listo">
            <Check size={32} className="text-emerald-400" />
            <p className="text-sm text-slate-200 text-center font-semibold">
              Listo — ya aprendí a reconocer su voz.
            </p>
            <p className="text-[11px] text-slate-500 text-center">
              Cuando active el modo campo, va a usar su voz personal en vez del modelo general.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full p-3 rounded-xl bg-emerald-600 text-white font-bold min-h-[48px]"
              data-testid="enrollment-cerrar-listo"
            >
              Listo
            </button>
          </div>
        )}

        {fase === FASE_ERROR && (
          <div className="flex flex-col items-center gap-3 py-4" data-testid="enrollment-error">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-red-300 text-center">{mensajeError}</p>
            <button
              type="button"
              onClick={reintentarPaso}
              className="w-full p-3 rounded-xl bg-slate-800 text-slate-200 min-h-[48px]"
              data-testid="enrollment-reintentar"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
