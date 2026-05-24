import { useState, useEffect, useCallback } from 'react';

/**
 * tipsService.js — tips rotativos para mostrar mientras el agente Chagra
 * está pensando. Reduce la sensación de espera vacía + educa al usuario
 * sobre features que probablemente no conoce.
 *
 * Diseño:
 *   - Array curado de tips cortos (1-2 líneas mobile). NO ads, NO hype.
 *   - Tip aleatorio inicial, rotación cada 8s mientras processing.
 *   - Hook useRotatingTip(active) devuelve el tip actual + opt-out.
 *   - Persistir tips dismissed en sesión (no localStorage — no incomoda
 *     al usuario que solo cierra "no me interesa hoy" sino lifetime).
 *
 * Referencias:
 *   - feedback-no-interrupt-on-new-request (operador pidió integración
 *     "linda, que no confunda — el usuario entiende que es un tip
 *     complementario mientras Chagra piensa, no parte de la respuesta")
 *   - Bug 2026-05-24 reportado por operador: 4 minutos de "Procesando…"
 *     sin feedback útil. Operador propuso tip rotativo.
 */

/**
 * Tips curados — operativos y útiles, NO marketing. Mantener corto:
 * máximo 90 caracteres por tip para que rinda en móvil sin truncar.
 *
 * Si agregas tips nuevos, mantén el tono colombiano (tú/usted, NO voseo
 * argentino) y enfocate en cosas que el usuario PUEDE hacer mientras
 * espera, NO en marketing del producto.
 */
export const CHAGRA_TIPS = [
  {
    id: 'register-plant',
    icon: '🌱',
    text: 'Puedes registrar tus plantas con foto desde el menú Plantas — el agente las recordará después.',
  },
  {
    id: 'voice-better',
    icon: '🎤',
    text: 'En modo voz, menciona tu municipio y altitud — el agente da consejos más precisos.',
  },
  {
    id: 'specific-questions',
    icon: '💡',
    text: '"Sombra café 2400 msnm Choachí" funciona mejor que "¿qué siembro?" — entre más contexto, mejor respuesta.',
  },
  {
    id: 'badge-generativa',
    icon: '⚠️',
    text: 'Si ves "Respuesta generativa · verifica", el agente NO usó datos verificados — toma con cautela.',
  },
  {
    id: 'colibri-replay',
    icon: '🐦',
    text: 'Doble-tap al colibrí del agente para repetir la última respuesta hablada.',
  },
  {
    id: 'iot-sensors',
    icon: '📡',
    text: 'Si tienes sensores IoT en tu finca, el ícono de gota muestra lecturas en vivo.',
  },
  {
    id: 'offline-sync',
    icon: '📴',
    text: 'Sin señal: tus registros se guardan localmente y sincronizan cuando vuelva el internet.',
  },
  {
    id: 'multifinca',
    icon: '🚜',
    text: 'Si manejas varias fincas, cambia la activa desde tu perfil — el agente respeta el contexto.',
  },
  {
    id: 'history',
    icon: '📜',
    text: 'Tu historial de consultas vive en el ícono libro — puedes volver a respuestas pasadas.',
  },
  {
    id: 'photo-diagnostico',
    icon: '📸',
    text: 'Una foto vale más que descripción: si una planta luce rara, súbele foto en lugar de describirla.',
  },
  {
    id: 'tools-grounded',
    icon: '🔍',
    text: 'Cuando ves "Catálogo verificado" en la respuesta, el agente consultó datos reales de plantas.',
  },
  {
    id: 'speech-corrigir',
    icon: '✏️',
    text: 'Si el modo voz transcribió mal (ej. tu vereda), reescribe la pregunta — el agente aún no aclara solo.',
  },
];

const ROTATION_INTERVAL_MS = 8000;

/**
 * React hook: rota tips cada 8s mientras `active=true`. Devuelve el tip
 * actual + función para dismiss permanente (durante esta sesión).
 *
 * @param {boolean} active — si false, el hook devuelve null y NO rota.
 * @returns {{ tip: { id, icon, text } | null, dismiss: () => void }}
 */
export function useRotatingTip(active) {
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * CHAGRA_TIPS.length),
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active || dismissed) return undefined;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CHAGRA_TIPS.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [active, dismissed]);

  // Reset dismissed cuando active vuelve false → true (nueva sesión thinking).
  // Sin esto, el usuario que dismiss una vez nunca vuelve a ver tips.
  // Se hace con derived state pattern para evitar lint set-state-in-effect.
  const [lastActive, setLastActive] = useState(active);
  if (lastActive !== active) {
    setLastActive(active);
    if (!active && dismissed) {
      setDismissed(false);
    }
  }

  const dismiss = useCallback(() => setDismissed(true), []);

  if (!active || dismissed) return { tip: null, dismiss };
  return { tip: CHAGRA_TIPS[tipIndex], dismiss };
}

// Re-export internals para tests.
export const __test = {
  ROTATION_INTERVAL_MS,
};
