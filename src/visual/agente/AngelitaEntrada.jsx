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
 * abejita hace su aparición de estrella de cartoon años 30. Orden (feedback
 * del operador: "tan pequeña que cuando al fondo hace cualquier cosa no se
 * nota" — el ojo necesita encontrarla ANTES de que pase algo):
 *
 *   1. ASOMA pequeñita — pop elástico a escala chiquita, apareciendo.
 *   2. QUIETA — se queda ESTÁTICA a esa misma escala chiquita 1-2s: nada de
 *      idle-cerebro (mirar/acicalarse/la mota que pasa — apagado con
 *      idleCerebro=false), apenas el aleteo/boil base de <Angelita> para
 *      leerse viva sin distraer. Es la pausa que deja que el ojo la encuentre
 *      antes del número.
 *   3. CRECE — la entrada MAGISTRAL: anticipa (se agacha a coger impulso), se
 *      estira con OVERSHOOT hasta su tamaño de asistente, squash de
 *      aterrizaje, rebotico, y el aro de energía ámbar revienta al llegar.
 *   4. Si es de DÍA y hace SOL (clima 'soleado'/'dorada'): AHORA, ya a tamaño
 *      completo, SE PONE LAS GAFAS — caen giradas desde arriba, rebasan la
 *      carita, rebotan y asientan, con el destello que barre el lente
 *      (AngelitaGafas + angelita-missminutes). A tamaño completo SE VEN Y
 *      RESALTAN (antes pasaba a escala chiquita y se perdían).
 *   5. BRILLO — un destello breve que remata y avisa "ya estoy lista"; se
 *      apaga solo (no un glow permanente).
 *
 * El JS solo es el METRÓNOMO de fases (clases .ang-entrada--*); el timing y
 * las curvas viven en el CSS. Contratos de la casa:
 *   · reduced-motion (o animated=false) NO hace teatro: aparece YA en tamaño
 *     final, con las gafas puestas si corresponde — fotograma digno.
 *   · El line-boil (capa cara) se enciende SOLO durante el número (asoma →
 *     crece → gafas → brillo), NUNCA en la pausa quieta, y en tier alto/medio:
 *     es su momento heroico, no un loop eterno.
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
const DUR_QUIETA = 1500;  // la pausa estática (1-2s): que el ojo la encuentre
const DUR_GAFAS = 1650;   // = agz-ponerse (950) + destello (500 desde 0.9s) + respiro
const DUR_CRECE = 1300;   // = ang-crece
const DUR_BRILLO = 650;   // = ang-destello-final: el remate que avisa "ya lista"

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
      // 1. Asoma (pop elástico, pequeñita) → 2. Quieta (pausa estática: que
      // el ojo la encuentre) → 3. Crece (la entrada magistral, overshoot) →
      // 4. Gafas si hay sol (ya a tamaño completo) → 5. Brillo (remate) → lista.
      paso('asoma', DUR_ASOMA + 350, () => {
        paso('quieta', DUR_QUIETA, () => {
          paso('crece', DUR_CRECE, () => {
            const rematar = () => paso('brillo', DUR_BRILLO, () => setFase('lista'));
            if (soleado) {
              paso('gafas', DUR_GAFAS, rematar);
            } else {
              rematar();
            }
          });
        });
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

  // Las gafas: caen en la fase 'gafas' (one-shot, YA a tamaño completo — se
  // ven y resaltan) y QUEDAN puestas de ahí en adelante (brillo → lista).
  const gafas = useMemo(() => {
    if (!soleado) return false;
    if (sinTeatro) return true;
    if (fase === 'gafas') return 'poniendose';
    return (fase === 'brillo' || fase === 'lista') ? true : false;
  }, [soleado, sinTeatro, fase]);

  // Estado del agente por fase: curiosa mientras asoma/quieta/se viste,
  // CONTENTA en el estirón (brinca celebrando mientras crece — puro cartoon),
  // y al quedar lista, lo que el host pida.
  const estado = fase === 'crece' ? 'contenta' : fase === 'lista' ? estadoFinal : 'acompana';
  // En la pausa quieta se apaga el idle-cerebro grande (mirar, acicalarse, la
  // mota que pasa): "apenas lo mínimo para leerse viva, nada que distraiga".
  // El aleteo/boil base de <Angelita> sigue intacto (idleCerebro no los toca).
  const idleCerebro = fase !== 'quieta';
  // Su momento heroico: line-boil solo durante el número (asoma→crece→gafas→
  // brillo), NUNCA en la pausa quieta ni en gama baja.
  const heroica = !sinTeatro && fase !== 'lista' && fase !== 'espera' && fase !== 'quieta' && tier !== 'bajo';

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
          idleCerebro={idleCerebro}
          gafas={gafas}
          lineBoil={heroica}
          clima={clima}
          {...rest}
        />
      </span>
      <span className="ang-entrada__aro" aria-hidden="true" />
      <span className="ang-entrada__brillo" aria-hidden="true" />
    </span>
  );
}

export default AngelitaEntrada;
