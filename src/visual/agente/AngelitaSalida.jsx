import { useEffect, useRef, useState } from 'react';
import '../creatures/angelita-missminutes.css';
import { Angelita } from './Angelita.jsx';

/*
 * AngelitaSalida — LA SALIDA MÍSTICA, espejo de AngelitaEntrada.
 *
 * Cuando la compañera se despide (cambia de mundo, cierra la escena, la app se
 * duerme), no se corta en seco: junta energía y se DISUELVE en la misma luz
 * espectral de la que se condensó al entrar (reusa la capa `.ang-mistico`,
 * hermana de `jaguar-aparicion`). Orden:
 *
 *   1. MÍSTICO — el aura espectral crece a su alrededor, las motas se encienden
 *      y el line-boil se prende: se recoge un poco, "junta poder" para partir.
 *   2. ENCOGE — un último estirón hacia arriba (anticipación) y se comprime —
 *      el reverso exacto del `crece` de la entrada.
 *   3. IDO — se va a la nada disolviéndose; las motas se dispersan hacia afuera
 *      y arriba, el aura se abre y se apaga. `onIdo` avisa que ya no está.
 *
 * El JS es SOLO el metrónomo de fases (clases .ang-salida--*); las curvas y el
 * timing viven en angelita-missminutes.css. Contratos de la casa:
 *   · reduced-motion (o animated=false): SIN teatro — salta directo a 'ido'
 *     (se va, fotograma digno) y avisa onIdo.
 *   · line-boil solo durante el número, nunca en tier bajo.
 *
 * USO (el host, al despedir a la compañera):
 *   <AngelitaSalida activa={hayQueSalir} onIdo={desmontar} size={96} />
 */

/* Duraciones de fase (ms) — COINCIDEN con los keyframes one-shot del CSS. */
const DUR_MISTICO = 900; // = ang-recoge + arranque de aura
const DUR_ENCOGE = 850;  // = ang-encoge
const DUR_IDO = 600;     // = ang-desvanece

/* Motas del místico: ángulo repartido en el círculo, radio y retraso variados
   para que el brote no sea uniforme (cero Math.random: determinista por índice). */
const MOTAS = Array.from({ length: 6 }, (_, i) => ({
  ang: `${(360 / 6) * i + (i % 2 ? 18 : 0)}deg`,
  r: `${30 + (i % 3) * 8}%`,
  d: `${i * 70}ms`,
}));

export function MotasMisticas() {
  return (
    <span className="ang-mistico" aria-hidden="true">
      <span className="ang-mistico__aura" />
      {MOTAS.map((m, i) => (
        <span
          key={i}
          className="ang-mistico__mota"
          style={{ '--ang': m.ang, '--r': m.r, '--d': m.d }}
        />
      ))}
    </span>
  );
}

function prefiereQuietud() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object} props
 * @param {boolean} [props.activa=true]  dispara la despedida.
 * @param {number} [props.retrasoMs=0]  espera antes de arrancar.
 * @param {number} [props.size=96]
 * @param {boolean} [props.animated=true]  false = sin teatro, se va digna.
 * @param {string} [props.tier]  'bajo' apaga line-boil (el número sigue).
 * @param {string} [props.title]  Título accesible del avatar.
 * @param {() => void} [props.onIdo]  la compañera ya se fue (para desmontar).
 *   El resto de props (clima, enso, …) pasan a <Angelita>.
 */
export function AngelitaSalida({
  activa = true,
  retrasoMs = 0,
  size = 96,
  animated = true,
  tier = undefined,
  onIdo = undefined,
  className = '',
  ...rest
}) {
  const sinTeatro = !animated || prefiereQuietud();
  const [fase, setFase] = useState(sinTeatro ? 'ido' : 'lista');
  const onIdoRef = useRef(onIdo);
  useEffect(() => { onIdoRef.current = onIdo; });

  useEffect(() => {
    if (!activa || sinTeatro) return undefined;
    let timer = 0;
    const paso = (f, dur, siguiente) => {
      setFase(f);
      timer = window.setTimeout(siguiente, dur);
    };
    timer = window.setTimeout(() => {
      paso('mistico', DUR_MISTICO, () => {
        paso('encoge', DUR_ENCOGE, () => {
          paso('ido', DUR_IDO, () => setFase('ido'));
        });
      });
    }, retrasoMs);
    return () => window.clearTimeout(timer);
  }, [activa, sinTeatro, retrasoMs]);

  // Avisar UNA vez cuando ya se fue.
  const avisado = useRef(false);
  useEffect(() => {
    if (fase === 'ido' && !avisado.current) {
      avisado.current = true;
      // dar tiempo al keyframe de desvanecimiento antes de desmontar
      const t = window.setTimeout(() => onIdoRef.current?.(), sinTeatro ? 0 : DUR_IDO);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [fase, sinTeatro]);

  // Estado por fase: se despide (invita/saluda) mientras junta energía, y en el
  // encoge se pone contenta (parte en alto, no triste). En 'ido' ya no importa.
  const estado = fase === 'mistico' ? 'invita' : fase === 'encoge' ? 'contenta' : 'acompana';
  const heroica = !sinTeatro && (fase === 'mistico' || fase === 'encoge') && tier !== 'bajo';

  return (
    <span
      className={`ang-salida ang-salida--${fase}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <MotasMisticas />
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
