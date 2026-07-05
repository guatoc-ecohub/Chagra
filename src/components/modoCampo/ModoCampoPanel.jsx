/**
 * ModoCampoPanel — toggle "modo campo / manos libres" (#2088), pensado para
 * vivir en ProfileScreen junto a VoiceSelector (mismo estilo/convención).
 *
 * Opt-in EXPLÍCITO: la primera vez que se activa, un modal explica qué hace
 * el micrófono (solo escucha "hola chagra", todo on-device, se apaga solo).
 * El consentimiento se persiste en localStorage — no se vuelve a preguntar.
 *
 * Muestra el estado real del motor (cargando/entrenando/escuchando/error),
 * el aviso de batería baja (useModoCampo ya trae el guard), y el acceso a
 * "Enséñale tu voz" (enrollment) para cuando el modelo de fábrica (voz
 * sintética) no reconoce bien el acento real del operador.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React, { useEffect, useState } from 'react';
import { Radio, Mic, BatteryWarning, GraduationCap } from 'lucide-react';
import useModoCampo from '../../hooks/useModoCampo';
import { hasPersonalVoiceMarker, forgetPersonalVoice } from '../../services/wakeWordService';
import EnrollmentModoCampo from './EnrollmentModoCampo';
import { MSG } from '../../config/messages';

const CONSENT_KEY = 'chagra:modoCampo:consentimiento';

const STATUS_LABELS = {
  idle: 'Apagado',
  'loading-libs': MSG.modoCampo.estadoCargando,
  'loading-base': MSG.modoCampo.estadoCargandoModelo,
  'loading-personal': MSG.modoCampo.estadoCargandoVoz,
  'loading-ready': MSG.modoCampo.estadoCargando,
  training: MSG.modoCampo.estadoPreparando,
  listening: MSG.modoCampo.estadoEscuchando,
  error: MSG.modoCampo.estadoError,
};

export default function ModoCampoPanel() {
  const {
    active, setActive, status, errorMsg, source,
    lowBatteryNotice, dismissLowBattery,
  } = useModoCampo();
  const [showConsent, setShowConsent] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  // Marcador liviano (localStorage, sin cargar TF.js) — ver
  // hasPersonalVoiceMarker() en wakeWordService.js.
  const [personalVoice, setPersonalVoice] = useState(() => hasPersonalVoiceMarker());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronización de estado derivado (marcador localStorage) tras cambiar `source`, no afecta render actual
    setPersonalVoice(hasPersonalVoiceMarker());
  }, [source]);

  const handleToggle = () => {
    if (active) { setActive(false); return; }
    const consented = (() => {
      try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch (_) { return false; }
    })();
    if (!consented) { setShowConsent(true); return; }
    setActive(true);
  };

  const confirmConsent = () => {
    try { localStorage.setItem(CONSENT_KEY, '1'); } catch (_) { /* storage no disponible: igual activa */ }
    setShowConsent(false);
    setActive(true);
  };

  const handleForget = async () => {
    await forgetPersonalVoice();
    setPersonalVoice(false);
  };

  const closeEnrollment = () => {
    setShowEnrollment(false);
    setPersonalVoice(hasPersonalVoiceMarker());
  };

  return (
    <div className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5" data-testid="modo-campo-panel">
      <div className="flex items-center gap-2 px-1">
        <Radio size={18} className="text-emerald-400" aria-hidden="true" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Modo campo — manos libres
        </h3>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed px-1">
        Actívelo cuando tenga guantes o las manos ocupadas: diga <strong>«hola chagra»</strong> y
        el asistente empieza a escuchar solo, sin tocar la pantalla. Todo el reconocimiento pasa
        EN su celular — nunca sale audio a internet. La pantalla se queda encendida mientras esté
        activo.
      </p>

      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={active}
        data-testid="modo-campo-toggle"
        className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 min-h-[48px] transition-colors ${
          active
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-emerald-400'
        }`}
      >
        <Mic size={18} />
        {active ? 'Modo campo activado — tocar para apagar' : 'Activar modo campo'}
      </button>

      {active && (
        <div className="flex items-center gap-2 px-1" data-testid="modo-campo-status">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'listening'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'error'
                  ? 'bg-red-400'
                  : 'bg-amber-400 animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="text-xs text-slate-400">{STATUS_LABELS[status] || status}</span>
        </div>
      )}

      {status === 'error' && errorMsg && (
        <p className="text-[11px] text-red-400 px-1" role="alert">{errorMsg}</p>
      )}

      {lowBatteryNotice && (
        <div
          className="flex items-start gap-2 bg-amber-950/40 border border-amber-800/50 rounded-xl p-3"
          data-testid="modo-campo-bateria-baja"
        >
          <BatteryWarning size={16} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-xs text-amber-300">
              Batería baja (≤15%). El modo campo consume más batería (pantalla encendida +
              micrófono). Considere apagarlo o conectar el cargador.
            </p>
            <button
              type="button"
              onClick={dismissLowBattery}
              className="text-[11px] text-amber-400 underline mt-1"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={() => setShowEnrollment(true)}
          data-testid="modo-campo-ensename"
          className="w-full p-3 rounded-xl flex items-center justify-center gap-2 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 text-violet-400 min-h-[48px]"
        >
          <GraduationCap size={18} />
          {personalVoice ? 'Volver a enseñarle tu voz' : 'Enséñale tu voz (si no te reconoce bien)'}
        </button>
        {personalVoice && (
          <button
            type="button"
            onClick={handleForget}
            data-testid="modo-campo-olvidar"
            className="w-full text-[11px] text-slate-500 underline"
          >
            Olvidar mi voz — volver al modelo general
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
        Función en prueba (modo campo). El reconocimiento es on-device con TensorFlow.js —
        funciona sin señal una vez cargado la primera vez.
      </p>

      {showConsent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          data-testid="modo-campo-consentimiento"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-200">Antes de activar el modo campo</h4>
            <ul className="text-[12px] text-slate-400 space-y-1.5 list-disc pl-4">
              <li>El micrófono queda encendido escuchando SOLO la frase «hola chagra».</li>
              <li>Todo el procesamiento pasa en su celular — nada de audio sale a internet.</li>
              <li>Un punto visible en pantalla le avisa que el micrófono está activo.</li>
              <li>Se apaga solo si no se usa en 10 minutos, o cuando usted lo desactive.</li>
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConsent(false)}
                data-testid="modo-campo-consentimiento-cancelar"
                className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 min-h-[48px]"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={confirmConsent}
                data-testid="modo-campo-consentimiento-aceptar"
                className="flex-1 p-3 rounded-xl bg-emerald-600 text-white font-bold min-h-[48px]"
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnrollment && <EnrollmentModoCampo onClose={closeEnrollment} />}
    </div>
  );
}
