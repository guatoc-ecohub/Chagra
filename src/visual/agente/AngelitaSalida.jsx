import { useEffect, useRef, useState } from 'react';
import '../creatures/angelita-missminutes.css';
import { Angelita } from './Angelita.jsx';

/*
 * AngelitaSalida — LA SALIDA TEATRAL de la compañera de Chagra (el espejo de
 * AngelitaEntrada.jsx).
 *
 * Cuando la sesión termina o el host la despide (se cierra el chat, cambia de
 * mundo, el usuario se va), Angelita no desaparece de un salto: hace su
 * mutis de estrella de cartoon años 30, al revés de como llegó:
 *
 *   1. SE DESPIDE contenta — un pop elástico feliz (estado='contenta', el
 *      mismo brinco de la abeja que ya sabe celebrar) que dice "hasta luego".
 *   2. ENCOGE — anticipa (se infla un pelo) y se comprime con el MISMO
 *      lenguaje de anticipación/overshoot de `ang-crece` pero LEÍDO EN
 *      REVERSA, hasta desvanecerse del todo; el aro de energía, en vez de
 *      reventar hacia afuera, IMPLOTA hacia adentro y se apaga.
 *
 * El JS solo es el METRÓNOMO de fases (clases .ang-salida--*); el timing y
 * las curvas viven en el CSS (angelita-missminutes.css, sección 5). Contratos
 * de la casa (los mismos de la entrada, espejados):
 *   · reduced-motion (o animated=false) NO hace teatro: desaparece YA, sin
 *     fotograma intermedio — el equivalente inverso de "aparece ya en tamaño
 *     final" de la entrada.
 *   · `onSalio` avisa una sola vez cuando el mutis terminó (fase 'fuera');
 *     con `activa=false` no hace nada (queda esperando, presente).
 *   · NO usa un estado nuevo: 'contenta' ya existe en ESTADOS_ANGELITA y es
 *     el gesto alegre de la casa (brinca celebrando) — se reutiliza tal cual.
 *
 * USO (el host que la despide):
 *   <AngelitaSalida activa={sesionTermino} size={96} onSalio={() => desmontar()} />
 */

/* Duraciones de fase (ms) — deben COINCIDIR con los keyframes one-shot del CSS
   (misma regla dura que la entrada: el metrónomo suelta la clase cuando el
   gesto terminó en identidad, y el empalme no salta). */
const DUR_DESPIDE = 900;  // = ang-despide
const DUR_ENCOGE = 1300;  // = ang-encoge (mismo tiempo que ang-crece, en reversa)

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object} props
 * @param {boolean} [props.activa=true]  dispara la secuencia de salida (el
 *   host la pone en true cuando decide despedirla). Mientras sea false, queda
 *   PRESENTE (tamaño normal). Una vez corrida no se repite (remontar con key
 *   para repetir).
 * @param {number} [props.retrasoMs=0]  espera extra tras `activa` (afinar el
 *   empalme con lo que la despide).
 * @param {string} [props.estadoInicial='acompana']  estado del agente
 *   mientras está PRESENTE (antes de que la despidan) — el mismo espíritu de
 *   `estadoFinal` en AngelitaEntrada, pero para el extremo de llegada.
 * @param {number} [props.size=96]
 * @param {boolean} [props.animated=true]
 * @param {string} [props.tier]  'bajo' apaga line-boil del número (el mutis
 *   sigue viéndose: es feedback de partida, no decoración).
 * @param {() => void} [props.onSalio]  el mutis terminó: ya no está.
 * @param {string} [props.className]  clase adicional del contenedor.
 *   El resto de props (enso, energia, confianza, …) pasan a <Angelita>.
 */
export function AngelitaSalida({
  activa = true,
  retrasoMs = 0,
  estadoInicial = 'acompana',
  size = 96,
  animated = true,
  tier = undefined,
  onSalio = undefined,
  className = '',
  ...rest
}) {
  // Sin teatro (RM / animated=false): desaparece YA, sin fotograma
  // intermedio (el inverso exacto del "aparece ya en tamaño final" de la
  // entrada — ver AngelitaEntrada.jsx).
  const sinTeatro = !animated || prefiereQuietud();
  const [fase, setFase] = useState(sinTeatro ? 'fuera' : 'presente');
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
      paso('despide', DUR_DESPIDE, () => {
        paso('encoge', DUR_ENCOGE, () => setFase('fuera'));
      });
    }, retrasoMs);
    return () => window.clearTimeout(timer);
  }, [activa, sinTeatro, retrasoMs]);

  // Avisar al host UNA vez cuando el mutis termina.
  const avisado = useRef(false);
  useEffect(() => {
    if (fase === 'fuera' && !avisado.current) {
      avisado.current = true;
      onSalioRef.current?.();
    }
  }, [fase]);

  // Estado del agente por fase: CONTENTA en todo el número de despedida (el
  // mismo brinco de "hasta luego" desde que se despide hasta que se encoge),
  // y lo que el host pida mientras sigue presente.
  const estado = (fase === 'despide' || fase === 'encoge') ? 'contenta' : estadoInicial;
  // Su momento heroico: line-boil solo durante el número (y no en gama baja).
  const heroica = !sinTeatro && fase !== 'presente' && fase !== 'fuera' && tier !== 'bajo';

  return (
    <span
      className={`ang-salida ang-salida--${fase}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <span className="ang-salida__escala">
        <Angelita
          estado={estado}
          size={size}
          animated={animated}
          tier={tier}
          lineBoil={heroica}
          {...rest}
        />
      </span>
      <span className="ang-salida__aro" aria-hidden="true" />
    </span>
  );
}

export default AngelitaSalida;
