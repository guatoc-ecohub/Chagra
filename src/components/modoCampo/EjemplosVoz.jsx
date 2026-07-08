/**
 * EjemplosVoz — tarjeta "qué puedo decirle" del modo campo (wake-word
 * «hola chagra»). Vive dentro de ModoCampoPanel (Perfil → voz).
 *
 * Coreografía en dos actos (la tarjeta "cobra vida" al abrirse):
 *
 *   1. ENTRADA — al montar, los 3 ejemplos IRRUMPEN en cascada (stagger):
 *      cada uno se desliza desde la derecha con un pequeño rebote, uno tras
 *      otro. Se quedan un momento para leerse completos.
 *   2. CARRUSEL — los dos de abajo se despiden con gracia y el primero se
 *      queda al mando; desde ahí rota UN ejemplo cada ~4s con la onda de voz
 *      sutil que late (el comportamiento de siempre).
 *
 * Honestidad del copy: NO promete "IA en su teléfono". El reconocimiento
 * del wake-word sí es on-device, pero el agente necesita señal para
 * responder — por eso el encabezado vende el gesto ("con las manos
 * ocupadas"), no una capacidad que no existe.
 *
 * Accesibilidad: respeta prefers-reduced-motion — sin coreografía ni
 * rotación, los 3 ejemplos se muestran quietos en lista (misma información,
 * cero vaivén).
 *
 * Solo UI/copy: cero lógica de wake-word, cero deps nuevas (emoji + CSS).
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React, { useEffect, useState } from 'react';
import './ejemplosVoz.css';

/** Los 3 ejemplos canónicos — cada uno una capacidad DISTINTA. */
// eslint-disable-next-line react-refresh/only-export-components -- constante de copy que los tests validan junto al componente (patrón NotifPermissionPrompt)
export const EJEMPLOS_VOZ = [
  {
    emoji: '🎙️',
    capacidad: 'Anotar en su cuaderno',
    frase: '«Hola Chagra, anota que fumigué el lote 2 con caldo bordelés»',
    resultado: 'Queda escrito en su cuaderno de campo, sin sacarse los guantes.',
  },
  {
    emoji: '🌱',
    capacidad: 'Pedir un consejo',
    frase: '«Hola Chagra, ¿por qué se me está amarillando el café?»',
    resultado: 'El agente le responde hablado, con lo que sabe de su finca.',
  },
  {
    emoji: '💰',
    capacidad: 'Preguntar un dato en vivo',
    frase: '«Hola Chagra, ¿a cómo está el aguacate esta semana?»',
    resultado: 'Le trae el precio del día y se lo dice de una.',
  },
];

const ROTACION_MS = 4000;
/* Coreografía de entrada: cuánto se quedan los 3 en pantalla (da tiempo de
 * leerlos tras la cascada) y cuánto dura la despedida de los dos de abajo.
 * Los tests avanzan el reloj con estos números — si cambian, cambiarlos allá. */
const ENTRADA_HOLD_MS = 4600;
const ENTRADA_SALIDA_MS = 450;

/** ¿El usuario pidió movimiento reducido a nivel de sistema? */
const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/** Onda de voz decorativa: 9 barras que laten (CSS puro, sin datos falsos de
 *  micrófono — es ilustración, y con reduced-motion queda quieta). */
function OndaVoz() {
  return (
    <div className="ejemplos-voz-onda" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="ejemplos-voz-barra" style={{ '--i': i }} />
      ))}
    </div>
  );
}

function Ejemplo({ ejemplo }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-2xl leading-none mt-0.5 shrink-0" aria-hidden="true">{ejemplo.emoji}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 mb-0.5">
          {ejemplo.capacidad}
        </p>
        <p className="text-[13px] text-slate-200 font-medium leading-snug">{ejemplo.frase}</p>
        <p className="text-[11px] text-slate-500 leading-snug mt-1">→ {ejemplo.resultado}</p>
      </div>
    </div>
  );
}

export default function EjemplosVoz() {
  // Se lee UNA vez al montar: si el usuario cambia la preferencia del sistema
  // con el panel abierto, el próximo montaje la recoge (suficiente acá).
  const [sinMovimiento] = useState(prefiereMenosMovimiento);
  // Actos: 'entrada' (los 3 en cascada) → 'saliendo' (despedida de 2 y 3)
  // → 'carrusel' (rotación de siempre). Con reduced-motion no hay actos.
  const [acto, setActo] = useState('entrada');
  const [idx, setIdx] = useState(0);
  // El carrusel arranca mostrando el MISMO primer ejemplo que quedó de la
  // entrada: esa primera pintura no debe re-animar (leería como glitch).
  const [yaRoto, setYaRoto] = useState(false);

  useEffect(() => {
    if (sinMovimiento || acto === 'carrusel') return undefined;
    const timer = setTimeout(
      () => setActo(acto === 'entrada' ? 'saliendo' : 'carrusel'),
      acto === 'entrada' ? ENTRADA_HOLD_MS : ENTRADA_SALIDA_MS,
    );
    return () => clearTimeout(timer);
  }, [sinMovimiento, acto]);

  useEffect(() => {
    if (sinMovimiento || acto !== 'carrusel') return undefined;
    const timer = setInterval(() => {
      setYaRoto(true);
      setIdx((i) => (i + 1) % EJEMPLOS_VOZ.length);
    }, ROTACION_MS);
    return () => clearInterval(timer);
  }, [sinMovimiento, acto]);

  return (
    <div
      className="ejemplos-voz rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 space-y-3"
      data-testid="ejemplos-voz"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[13px] font-bold text-slate-200">
          Háblele con las manos ocupadas
        </h4>
        <OndaVoz />
      </div>

      {sinMovimiento ? (
        <div className="space-y-3" data-testid="ejemplos-voz-lista">
          {EJEMPLOS_VOZ.map((e) => <Ejemplo key={e.capacidad} ejemplo={e} />)}
        </div>
      ) : acto !== 'carrusel' ? (
        /* Acto 1: los 3 ejemplos irrumpen en cascada al abrir el panel.
           En 'saliendo', los dos de abajo se despiden y el alto colapsa
           suave hacia la escena del carrusel (una sola vez, no es loop). */
        <div
          className={`ejemplos-voz-entrada${acto === 'saliendo' ? ' ejemplos-voz-entrada-saliendo' : ''}`}
          data-testid="ejemplos-voz-entrada"
          aria-live="off"
        >
          {EJEMPLOS_VOZ.map((e, i) => (
            <div key={e.capacidad} className="ejemplos-voz-entrada-item" style={{ '--i': i }}>
              <Ejemplo ejemplo={e} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* key={idx} remonta el nodo → la animación de entrada corre en cada
              rotación (menos en la primera pintura, que hereda el ejemplo que
              dejó la cascada). min-height evita brincos entre frases. */}
          <div className="ejemplos-voz-escena" aria-live="off">
            <div
              className={`ejemplos-voz-paso${yaRoto ? ' ejemplos-voz-paso-anima' : ''}`}
              key={idx}
              data-testid="ejemplos-voz-activo"
            >
              <Ejemplo ejemplo={EJEMPLOS_VOZ[idx]} />
            </div>
          </div>
          <div className="flex justify-center gap-1.5" aria-hidden="true">
            {EJEMPLOS_VOZ.map((e, i) => (
              <span
                key={e.capacidad}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  i === idx ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <p
        className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-700/50 pt-2.5"
        data-testid="ejemplos-voz-guia"
      >
        Diga <strong className="text-slate-400">«hola chagra»</strong> y hable. La primera vez,
        enséñele su voz (1 minuto).
      </p>
    </div>
  );
}
