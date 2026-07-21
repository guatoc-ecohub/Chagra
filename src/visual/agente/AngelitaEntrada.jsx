/* eslint-disable react-refresh/only-export-components -- `esDiaSoleado` es el
   criterio del número de gafas y viaja JUNTO a la entrada a propósito (una
   sola verdad); el componente se importa perezoso, no es hot-reload-sensible. */
import { useEffect, useMemo, useRef, useState } from 'react';
import '../creatures/angelita-missminutes.css';
import { Angelita } from './Angelita.jsx';

/*
 * AngelitaEntrada — LA ENTRADA TEATRAL de la compañera de Chagra.
 *
 * Después del paneo de cámara del host (el valle terminó de presentarse), la
 * abejita hace su aparición de estrella de cartoon años 30:
 *
 *   1. ASOMA pequeñita — pop elástico a escala chiquita, curiosa, aleteando.
 *   2. Si es de DÍA y hace SOL (clima 'soleado'/'dorada'): SE PONE LAS GAFAS —
 *      caen giradas desde arriba, rebasan la carita, rebotan y asientan, con
 *      el destello que barre el lente (AngelitaGafas + angelita-missminutes).
 *   3. CRECE — anticipa (se agacha a coger impulso), se estira con OVERSHOOT
 *      hasta su tamaño de asistente, squash de aterrizaje, rebotico, y el aro
 *      de energía ámbar revienta al llegar: ya está aquí la compañera viva.
 *
 * El JS solo es el METRÓNOMO de fases (clases .ang-entrada--*); el timing y
 * las curvas viven en el CSS. Contratos de la casa:
 *   · reduced-motion (o animated=false) NO hace teatro: aparece YA en tamaño
 *     final, con las gafas puestas si corresponde — fotograma digno.
 *   · El line-boil (capa cara) se enciende SOLO durante el número (asoma →
 *     crece) y en tier alto/medio: es su momento heroico, no un loop eterno.
 *   · Al terminar queda una <Angelita> normal (estadoFinal) y el host sigue
 *     mandando con sus props de siempre; `onLista` avisa el fin del show.
 *
 * USO (el host del valle, tras su paneo):
 *   <AngelitaEntrada activa={paneoTermino} clima={clima} size={96} />
 */

/* Duraciones de fase (ms) — deben COINCIDIR con los keyframes one-shot del CSS
   (regla dura de la casa: el metrónomo suelta la clase cuando el gesto terminó
   en identidad, y el empalme no salta). */
const DUR_ASOMA = 900;    // = ang-asoma
const DUR_GAFAS = 1650;   // = agz-ponerse (950) + destello (500 desde 0.9s) + respiro
const DUR_CRECE = 1300;   // = ang-crece

/** ¿Es un momento de gafas? Día con sol en el vocabulario canónico del valle
 *  ('dorada' | 'soleado' | 'niebla' | 'lluvia' | 'noche'). */
export function esDiaSoleado(clima) {
  return clima === 'soleado' || clima === 'dorada';
}

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
 * @param {string|null} [props.clima=null]  clima canónico del valle: con
 *   'soleado'/'dorada' la entrada incluye el número de las gafas (que quedan
 *   puestas). Puede pisarse con `conGafas`.
 * @param {boolean} [props.conGafas]  fuerza el número de gafas (pisa clima).
 * @param {number} [props.retrasoMs=0]  espera extra tras `activa` (afinar el
 *   empalme con el final del paneo).
 * @param {string} [props.estadoFinal='acompana']  estado del agente al quedar
 *   de asistente.
 * @param {number} [props.size=96]
 * @param {boolean} [props.animated=true]
 * @param {string} [props.tier]  'bajo' apaga line-boil del número (el show
 *   sigue: es feedback de llegada, no decoración).
 * @param {() => void} [props.onLista]  el show terminó: ya es la asistente.
 * @param {string} [props.className]  clase adicional del contenedor.
 *   El resto de props (enso, energia, confianza, …) pasan a <Angelita>.
 */
export function AngelitaEntrada({
  activa = true,
  clima = null,
  conGafas = undefined,
  retrasoMs = 0,
  estadoFinal = 'acompana',
  size = 96,
  animated = true,
  tier = undefined,
  onLista = undefined,
  className = '',
  ...rest
}) {
  const soleado = conGafas ?? esDiaSoleado(clima);
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
      paso('asoma', DUR_ASOMA + 350, () => {
        if (soleado) {
          paso('gafas', DUR_GAFAS, () => {
            paso('crece', DUR_CRECE, () => setFase('lista'));
          });
        } else {
          paso('crece', DUR_CRECE, () => setFase('lista'));
        }
      });
    }, retrasoMs);
    return () => window.clearTimeout(timer);
  }, [activa, sinTeatro, soleado, retrasoMs]);

  // Avisar al host UNA vez cuando el show termina.
  const avisado = useRef(false);
  useEffect(() => {
    if (fase === 'lista' && !avisado.current) {
      avisado.current = true;
      onListaRef.current?.();
    }
  }, [fase]);

  // Las gafas: caen en la fase 'gafas' (one-shot) y QUEDAN puestas después.
  const gafas = useMemo(() => {
    if (!soleado) return false;
    if (sinTeatro) return true;
    if (fase === 'gafas') return 'poniendose';
    return (fase === 'crece' || fase === 'lista') ? true : false;
  }, [soleado, sinTeatro, fase]);

  // Estado del agente por fase: curiosa mientras asoma/se viste, CONTENTA en
  // el estirón (brinca celebrando mientras crece — puro cartoon), y al quedar
  // lista, lo que el host pida.
  const estado = fase === 'crece' ? 'contenta' : fase === 'lista' ? estadoFinal : 'acompana';
  // Su momento heroico: line-boil solo durante el número (y no en gama baja).
  const heroica = !sinTeatro && fase !== 'lista' && fase !== 'espera' && tier !== 'bajo';

  return (
    <span
      className={`ang-entrada ang-entrada--${fase}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      data-sol={soleado ? '1' : undefined}
    >
      <span className="ang-entrada__escala">
        <Angelita
          estado={estado}
          size={size}
          animated={animated}
          tier={tier}
          gafas={gafas}
          lineBoil={heroica}
          clima={clima}
          {...rest}
        />
      </span>
      <span className="ang-entrada__aro" aria-hidden="true" />
    </span>
  );
}

export default AngelitaEntrada;
