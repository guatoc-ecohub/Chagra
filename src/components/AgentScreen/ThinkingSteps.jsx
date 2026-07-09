import React, { useEffect, useState } from 'react';
import { MSG } from '../../config/messages';

/**
 * ThinkingSteps — loading contextual por fase mientras el agente "piensa"
 * (lever de velocidad PERCIBIDA: ataca la queja "se queda pensando").
 *
 * La fase REAL la emite el pipeline de AgentScreen (thinkingPhase):
 *   'transcribiendo' → 'entendiendo' → 'consultando' → 'escribiendo'.
 * Dentro de cada fase, MSG.agente.fasesPasos define 1..N pasos {icon, texto}.
 * La fase larga ('consultando': grounding contra el sidecar — catálogo,
 * grafo AGE, guards) rota sus pasos cada STEP_ROTATE_MS como secuencia
 * temporizada creíble: avanza y SE QUEDA en el último (nunca loopea hacia
 * atrás — el avance debe sentirse hacia adelante). Al cambiar la fase real,
 * el índice se resetea.
 *
 * Accesibilidad:
 *   - Lectores de pantalla: el contenedor del ChatHistory ya es aria-live
 *     polite. Para no parlotear cada 2s, el texto rotativo va aria-hidden y
 *     un span sr-only anuncia SOLO la fase real (cambia con eventos reales).
 *   - prefers-reduced-motion: se apaga el fade de entrada (animation: none).
 *     El texto SÍ sigue cambiando — es información de estado, no decoración;
 *     congelarlo devolvería la sensación de "colgado" que este componente
 *     existe para eliminar.
 */
const STEP_ROTATE_MS = 2000;

export default function ThinkingSteps({ phase }) {
  const steps = (phase && MSG.agente.fasesPasos[phase]) || null;
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    // Fase nueva (evento real del pipeline) → arrancar en su primer paso.
    setStepIdx(0);
    const count = (phase && MSG.agente.fasesPasos[phase] || []).length;
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      // Avanza y se detiene en el último paso (setState idéntico → React
      // no re-renderiza; el interval residual es inofensivo y se limpia al
      // cambiar de fase o desmontar).
      setStepIdx((i) => Math.min(i + 1, count - 1));
    }, STEP_ROTATE_MS);
    return () => clearInterval(id);
  }, [phase]);

  // Fase desconocida o null (p. ej. Deep Research u otro flujo que no setea
  // thinkingPhase) → "Pensando" genérico, el comportamiento de siempre.
  if (!steps || steps.length === 0) {
    return <span>{MSG.agente.pensandoTexto}</span>;
  }

  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const faseLabel = MSG.agente.fases[phase] || MSG.agente.pensandoTexto;

  return (
    <>
      <style>{THINKING_STEPS_CSS}</style>
      {/* Anuncio estable para lectores de pantalla: solo la fase real. */}
      <span className="sr-only">{faseLabel}</span>
      {/* key por fase+paso re-monta el span → replay del fade de entrada. */}
      <span
        key={`${phase}-${stepIdx}`}
        className="chagra-thinking-step"
        data-testid="thinking-step"
        data-phase={phase}
        aria-hidden="true"
      >
        <span className="chagra-thinking-step-icon">{step.icon}</span>
        {step.texto}
      </span>
    </>
  );
}

/**
 * CSS del paso rotativo. Fade+rise corto al entrar cada paso; neutralizado
 * bajo prefers-reduced-motion siguiendo el patrón del proyecto (agentEntrance,
 * FLOATING_BACK_CSS). El ícono fuerza font-style normal porque la tarjeta
 * "pensando" del ChatHistory es italic y el emoji heredaría la inclinación.
 */
const THINKING_STEPS_CSS = `
@keyframes chagra-thinking-step-kf {
  0% { opacity: 0; transform: translateY(3px); }
  100% { opacity: 1; transform: translateY(0); }
}
.chagra-thinking-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  animation: chagra-thinking-step-kf 260ms ease-out both;
}
.chagra-thinking-step-icon { font-style: normal; }
@media (prefers-reduced-motion: reduce) {
  .chagra-thinking-step { animation: none !important; }
}
`;
