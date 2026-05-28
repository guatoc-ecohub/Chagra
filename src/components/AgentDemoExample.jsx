import React, { useEffect, useState, useRef } from 'react';
import { User } from 'lucide-react';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import AIBetaBadge from './AIBetaBadge';

/**
 * AgentDemoExample — mini-demo predefinida del agente Chagra para que el
 * operador vea "qué puede hacer" sin tener que tomar una foto ni redactar
 * una pregunta.
 *
 * Decisión UX-4 (issue #285): cuando un operador nuevo abre la pantalla del
 * agente sin historial, la falta de fricción para arrancar es crítica. El
 * botón "Ver ejemplo (sin foto)" del AgentScreen monta este componente, que
 * inyecta un turno simulado user + una respuesta simulada del agente con
 * delay realista (1s), badge "beta" y disclaimer claro de que es
 * demostrativo. Cero llamadas al LLM, cero costo de inferencia, cero riesgo
 * de alucinación — el contenido es texto fijo curado.
 *
 * Diseño:
 *   - Replica la apariencia de ChatBubble (mismo avatar, misma burbuja
 *     emerald para user, slate para agente) para que el operador entienda
 *     visualmente cómo se ve una conversación real.
 *   - Delay 1s antes de mostrar la respuesta del agente — comunica que el
 *     agente "está pensando" sin engaño (no decimos que sea inferencia
 *     real, el disclaimer lo aclara).
 *   - AIBetaBadge para coherencia con respuestas reales del agente
 *     (UX-1, #284).
 *   - Disclaimer pequeño debajo: "Ejemplo demostrativo. Tu situación real
 *     puede variar." — wording sobrio, sin hype.
 *
 * Props:
 *   - onClose: callback opcional sin args. Si se pasa, renderiza un botón
 *              pequeño "Cerrar ejemplo" para que el operador limpie la
 *              demo y siga con su flow normal.
 *   - autoStart: bool, default true. Si false, el componente arranca en
 *              estado "vacío" y espera a que el caller llame start() — por
 *              ahora solo lo usa el test para inspeccionar el estado
 *              previo al delay.
 *
 * NO se persiste en IndexedDB (esto NO es una conversación real). NO se
 * agrega a `conversationMemory` ni al `messages` state del AgentScreen.
 * El componente es completamente self-contained.
 */

const DEMO_USER_PROMPT = 'Tengo gulupa con mancha amarilla en las hojas, ¿qué hago?';

const DEMO_AGENT_RESPONSE = `Por la descripción puede ser deficiencia de hierro o ataque de la mancha café (Septoria passiflorae). Te sugiero:

1. Toma una foto de la hoja afectada para confirmar.
2. Si confirmamos Septoria, biopreparado base: extracto de cola de caballo (Equisetum arvense) al 2%, foliar cada 8 días.
3. Mejora drenaje del suelo si lluvia >100mm/semana.

¿Tomamos la foto ahora?`;

const AGENT_REPLY_DELAY_MS = 1000;

export default function AgentDemoExample({ onClose, autoStart = true }) {
  const [showAgentReply, setShowAgentReply] = useState(false);
  const timerRef = useRef(null);

  // El delay del reply del agente lo manejamos como un timer puro en
  // useEffect. NO hacemos setState síncrono dentro del effect (eso es
  // anti-patrón react-hooks/set-state-in-effect) — solo agendamos el
  // setTimeout, que despertará al setShowAgentReply(true) cuando expire.
  // La condición `autoStart` decide si arrancamos; si false, el componente
  // queda en "Pensando…" hasta que el caller lo desmonte o re-monte.
  useEffect(() => {
    if (!autoStart) {
      return undefined;
    }
    timerRef.current = setTimeout(() => {
      setShowAgentReply(true);
      timerRef.current = null;
    }, AGENT_REPLY_DELAY_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoStart]);

  return (
    <div
      data-testid="agent-demo-example"
      className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/30"
      role="region"
      aria-label="Ejemplo demostrativo del agente"
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3">
        Ejemplo
      </p>

      {/* Burbuja simulada del usuario — coherente con ChatBubble. */}
      <div className="flex justify-end mb-3">
        <div className="flex gap-2 max-w-[85%] flex-row-reverse">
          <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-600">
            <User size={16} className="text-white" aria-hidden="true" />
          </div>
          <div
            data-testid="agent-demo-user-bubble"
            className="rounded-2xl px-4 py-2.5 bg-emerald-700/60 text-white rounded-tr-sm"
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {DEMO_USER_PROMPT}
            </p>
          </div>
        </div>
      </div>

      {/* Burbuja simulada del agente — aparece tras 1s. */}
      {showAgentReply ? (
        <div className="flex justify-start mb-2" data-testid="agent-demo-agent-bubble">
          <div className="flex gap-2 max-w-[85%] flex-row">
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 border border-emerald-700/40 overflow-hidden">
              <ChagraAgentAvatar state="thinking" size={32} ariaLabel="Chagra IA" />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-slate-800/80 text-slate-100 rounded-tl-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {DEMO_AGENT_RESPONSE}
              </p>
              <AIBetaBadge className="mt-1" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex justify-start mb-2"
          data-testid="agent-demo-thinking"
          aria-live="polite"
        >
          <div className="flex gap-2 max-w-[85%] flex-row">
            <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 border border-amber-400/60 overflow-hidden">
              <ChagraAgentAvatar state="thinking" size={32} ariaLabel="Chagra IA" />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-slate-800/60 text-slate-400">
              <p className="text-sm leading-relaxed italic">Pensando…</p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer + cerrar. */}
      <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-slate-500 italic" data-testid="agent-demo-disclaimer">
          Ejemplo demostrativo. Tu situación real puede variar.
        </p>
        {typeof onClose === 'function' && (
          <button
            type="button"
            onClick={onClose}
            data-testid="agent-demo-close"
            className="text-[11px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline transition-colors"
          >
            Cerrar ejemplo
          </button>
        )}
      </div>
    </div>
  );
}
