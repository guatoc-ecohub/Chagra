/* GuacamayaSalida — LA SALIDA ÉPICA de la guacamaya como compañera de Chagra.
 *
 * Reutiliza la maquinaria de salida (señal genérica que usan otros compais en
 * sus escenas 3D), adaptada para la guacamaya. La salida es un one-shot teatral:
 *
 *   1. ALETA VISTOSO — la guacamaya alevtea amplio, como despidiéndose.
 *   2. DESAPARECE MÍSTICO — se desvanece con opacidad y escala, como si
 *      volara hacia el bosque.
 *   3. COMPLETO — el componente desaparece (opacity 0) y avisa al host.
 *
 * A diferencia de la entrada, la salida es más corta: no necesita pausa
 * intermedia porque el ojo ya la está siguiendo. Es un "bye" con estilo.
 *
 * El JS solo es el METRÓNOMO de fases (clases .guaca-salida--*); el timing y
 * las curvas viven en el CSS. Contratos de la casa:
 *   · reduced-motion (o animated=false) NO hace teatro: desaparece YA —
 *     fotograma digno.
 *   · `onSalio` avisa al host cuando el show terminó.
 */

import { useEffect, useRef, useState } from 'react';
import { GuacamayaCompai } from '../creatures/GuacamayaCompai.jsx';

/* Duraciones de fase (ms) — deben COINCIDIR con los keyframes one-shot del CSS. */
const DUR_ALETA = 800;    // aleteo de despedida
const DUR_MISTICO = 1200; // desvanecimiento místico

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object} props
 * @param {boolean} [props.activa=true]  dispara la secuencia de salida.
 * @param {number} [props.retrasoMs=0]  espera extra tras `activa`.
 * @param {string} [props.estadoSalida='invita']  estado durante el aleteo
 *   (invita = alas abiertas, gesto de "hasta luego").
 * @param {number} [props.size=96]
 * @param {boolean} [props.animated=true]
 * @param {string} [props.tier]  'bajo' apaga decoración.
 * @param {() => void} [props.onSalio]  el show terminó: ya se fue.
 */
export function GuacamayaSalida({
  activa = true,
  retrasoMs = 0,
  estadoSalida = 'invita',
  size = 96,
  animated = true,
  tier = undefined,
  onSalio = undefined,
  className = '',
  ...rest
}) {
  const sinTeatro = !animated || prefiereQuietud();
  const [fase, setFase] = useState(sinTeatro ? 'completo' : 'espera');
  const onSalioRef = useRef(onSalio);
  useEffect(() => { onSalioRef.current = onSalio; });

  useEffect(() => {
    if (!activa || sinTeatro) return undefined;
    let timer = 0;
    const paso = (f, dur, siguiente) => {
      setFase(f);
      timer = window.setTimeout(siguiente, dur);
    };
    timer = window.setTimeout(() => {
      // 1. Alevtea (despedida) → 2. Desvanece místico → completo.
      paso('aleta', DUR_ALETA, () => {
        paso('mistico', DUR_MISTICO, () => setFase('completo'));
      });
    }, retrasoMs);
    return () => window.clearTimeout(timer);
  }, [activa, sinTeatro, retrasoMs]);

  const avisado = useRef(false);
  useEffect(() => {
    if (fase === 'completo' && !avisado.current) {
      avisado.current = true;
      onSalioRef.current?.();
    }
  }, [fase]);

  // Estado por fase: invita (alas abiertas, "hasta luego") → se va.
  const estado = fase === 'aleta' ? estadoSalida : 'acompana';
  // Opacidad por fase: 1 (espera/aleta) → 0 (mistico/completo).
  const opacidad = fase === 'mistico' || fase === 'completo' ? 0 : 1;

  return (
    <span
      className={`guaca-salida guaca-salida--${fase}${className ? ` ${className}` : ''}`}
      style={{ 
        width: size, 
        height: size,
        opacity: opacidad,
        transition: sinTeatro ? 'none' : `opacity ${DUR_MISTICO}ms ease-in`
      }}
    >
      <GuacamayaCompai
        estado={estado}
        size={size}
        animated={animated}
        tier={tier}
        {...rest}
      />
    </span>
  );
}

export default GuacamayaSalida;
