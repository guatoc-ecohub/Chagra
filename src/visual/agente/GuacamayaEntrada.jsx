/* GuacamayaEntrada — LA ENTRADA TEATRAL de la guacamaya como compañera de Chagra.
 *
 * Reutiliza la MISMA maquinaria de AngelitaEntrada.jsx, adaptada a la guacamaya
 * bandera (Ara macao, rig F24 del valle). La entrada es teatral y cartoon puro:
 *
 *   1. ASOMA pequeñita — pop elástico a escala chiquita, apareciendo.
 *   2. QUIETA — se queda ESTÁTICA a esa misma escala chiquita 1-2s: nada de
 *      idle-cerebro (mirar/acicalarse — apagado con idleCerebro=false), apenas
 *      el aleteo/boil base para leerse viva sin distraer. Es la pausa que deja
 *      que el ojo la encuentre antes del número.
 *   3. CRECE — la entrada MAGISTRAL: anticipa (se agacha a coger impulso), se
 *      estira con OVERSHOOT hasta su tamaño de asistente, squash de
 *      aterrizaje, rebotico, y el aro de energía revienta al llegar.
 *   4. BRILLO — un destello breve que remata y avisa "ya estoy lista"; se
 *      apaga solo (no un glow permanente).
 *
 * A diferencia de Angelita, la guacamaya NO usa gafas de sol (no hay accesorio
 * equivalente), así que esa fase se omite. La entrada es más corta pero igual
 * de teatral: asoma → quieta → crece → brillo → lista.
 *
 * El JS solo es el METRÓNOMO de fases (clases .ang-entrada--*); el timing y
 * las curvas viven en el CSS. Contratos de la casa:
 *   · reduced-motion (o animated=false) NO hace teatro: aparece YA en tamaño
 *     final — fotograma digno.
 *   · Al terminar queda una <GuacamayaCompai> normal (estadoFinal) y el host
 *     sigue mandando con sus props de siempre; `onLista` avisa el fin del show.
 *
 * USO (el host del valle, tras su paneo):
 *   <GuacamayaEntrada activa={paneoTermino} size={96} />
 */

import { useEffect, useRef, useState } from 'react';
import '../creatures/angelita-missminutes.css';
import { GuacamayaCompai } from '../creatures/GuacamayaCompai.jsx';

/* Duraciones de fase (ms) — deben COINCIDIR con los keyframes one-shot del CSS
   (regla dura de la casa: el metrónomo suelta la clase cuando el gesto terminó
   en identidad, y el empalme no salta). */
const DUR_ASOMA = 900;    // = ang-asoma
const DUR_QUIETA = 1500;  // la pausa estática (1-2s): que el ojo la encuentre
const DUR_CRECE = 1300;   // = ang-crece
const DUR_BRILLO = 650;   // = ang-destello-final: el remate que avisa "ya lista"

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object} props
 * @param {boolean} [props.activa=true]  dispara la secuencia (el host la pone
 *   en true cuando su paneo de cámara terminó). Mientras sea false, espera
 *   invisible. Una vez corrida no se repite (remontar con key para repetir).
 * @param {number} [props.retrasoMs=0]  espera extra tras `activa` (afinar el
 *   empalme con el final del paneo).
 * @param {string} [props.estadoFinal='acompana']  estado del agente al quedar
 *   de asistente.
 * @param {number} [props.size=96]
 * @param {boolean} [props.animated=true]
 * @param {string} [props.tier]  'bajo' apaga decoración del número (el show
 *   sigue: es feedback de llegada, no decoración).
 * @param {() => void} [props.onLista]  el show terminó: ya es la asistente.
 * @param {string} [props.className]  clases extra en el wrapper del teatro.
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync — passthrough.
 *   El resto de props (enso, energia, …) pasan igual a <GuacamayaCompai>.
 */
export function GuacamayaEntrada({
  activa = true,
  retrasoMs = 0,
  estadoFinal = 'acompana',
  size = 96,
  animated = true,
  tier = undefined,
  onLista = undefined,
  className = '',
  ...rest
}) {
  // Sin teatro (RM / animated=false): directo a 'lista', digna y completa.
  const sinTeatro = !animated || prefiereQuietud();
  const [fase, setFase] = useState(sinTeatro ? 'lista' : 'espera');
  const onListaRef = useRef(onLista);
  useEffect(() => { onListaRef.current = onLista; });

  useEffect(() => {
    if (!activa || sinTeatro) return undefined;
    let timer = 0;
    const paso = (f, dur, siguiente) => {
      setFase(f);
      timer = window.setTimeout(siguiente, dur);
    };
    timer = window.setTimeout(() => {
      // 1. Asoma (pop elástico, pequeñita) → 2. Quieta (pausa estática: que
      // el ojo la encuentre) → 3. Crece (la entrada magistral, overshoot) →
      // 4. Brillo (remate) → lista.
      paso('asoma', DUR_ASOMA + 350, () => {
        paso('quieta', DUR_QUIETA, () => {
          paso('crece', DUR_CRECE, () => {
            paso('brillo', DUR_BRILLO, () => setFase('lista'));
          });
        });
      });
    }, retrasoMs);
    return () => window.clearTimeout(timer);
  }, [activa, sinTeatro, retrasoMs]);

  // Avisar al host UNA vez cuando el show termina.
  const avisado = useRef(false);
  useEffect(() => {
    if (fase === 'lista' && !avisado.current) {
      avisado.current = true;
      onListaRef.current?.();
    }
  }, [fase]);

  // Estado del agente por fase: curiosa mientras asoma/quieta, CONTENTA en el
  // estirón (brinca celebrando mientras crece — puro cartoon), y al quedar
  // lista, lo que el host pida.
  const estado = fase === 'crece' ? 'contenta' : fase === 'lista' ? estadoFinal : 'acompana';
  // En la pausa quieta se apaga el idle-cerebro grande (mirar, acicalarse):
  // "apenas lo mínimo para leerse viva, nada que distraiga".
  // El aleteo/boil base de <GuacamayaCompai> sigue intacto (idleCerebro no lo toca).
  const idleCerebro = fase !== 'quieta';

  return (
    <span
      className={`ang-entrada ang-entrada--${fase}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <span className="ang-entrada__escala">
        <GuacamayaCompai
          estado={estado}
          size={size}
          animated={animated}
          tier={tier}
          idleCerebro={idleCerebro}
          {...rest}
        />
      </span>
      <span className="ang-entrada__aro" aria-hidden="true" />
      <span className="ang-entrada__brillo" aria-hidden="true" />
    </span>
  );
}

export default GuacamayaEntrada;
