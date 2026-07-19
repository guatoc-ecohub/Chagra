/*
 * PerroHeroe — la forma DIBUJADA "de trabajo" de los perros guardianes:
 * el héroe rubber-hose que queda en pantalla entre el cruce de ida y el de
 * vuelta (fases 'guardia' y 'paso' de escenaGuardianes).
 *
 * No es un personaje nuevo: es el MISMO Dalmata/Beagle aprobado, más grande,
 * envuelto en su aura de poder (transformacion.js: cobalto leal Oliver,
 * canela de rastro Dante) y con GESTOS de guardián — todos de AVISO y arreo,
 * jamás de ataque:
 *
 *   'ladra'  — embestidas cortas del cuerpo (el ¡guau! leído en la masa,
 *              CSS) + la boca ARTICULA de verdad: pulsos de visema V4
 *              cronometrados por timer (la fundación de lip-sync que ya
 *              tienen las dos razas — cero código nuevo de boca).
 *   'senala' — la pose 'señala' del kit (se inclina al POI y apunta con la
 *              pata) más una inclinación sostenida hacia el monte.
 *   'arrea'  — barridos laterales amplios (el vaivén del perro que cierra el
 *              rebaño hacia el corral), inclinándose en cada viraje.
 *   'vigila' — quieto y sereno, con respiración orgullosa: el depredador
 *              pasa y se le respeta con la mirada, no con la carrera.
 *
 * `--mira` (1 | -1) voltea la dirección de embestidas/inclinaciones para que
 * apunten AL MONTE según dónde quede en pantalla. Tier 'bajo': gestos CSS
 * apagados y sin pulso de boca (fotograma digno). `reducedMotion`: quieto en
 * su gesto más noble (animated=false hacia el SVG).
 */
import { useEffect, useState } from 'react';
import { Dalmata } from './Dalmata.jsx';
import { Beagle } from './Beagle.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';
import './perroTransicion.css';

const PERROS_2D = {
  dalmata: { Comp: Dalmata, px: 170 },
  beagle: { Comp: Beagle, px: 148 },
};

/* Cadencia del ladrido (ms por media boca): ~2.6 ¡guau! por segundo — casa
   con el ciclo de embestida del CSS (420ms) sin quedar metronómico. */
const LADRIDO_MS = 190;

export function PerroHeroe({
  /** 'dalmata' (Oliver) | 'beagle' (Dante). */
  perro = 'dalmata',
  /** 'ladra' | 'senala' | 'arrea' | 'vigila'. */
  gesto = 'vigila',
  /** Ancla en pantalla (mismas coords que su PerroTransicion, para que el
      relevo overlay→héroe sea invisible). */
  x = '50%',
  y = '60%',
  /** 1 = el monte queda a la DERECHA del perro en pantalla; -1 = izquierda. */
  mira = 1,
  /** Tamaño opcional (default: el del registro — el héroe es grande). */
  px = null,
  tier = 'alto',
  reducedMotion = false,
}) {
  const reg = PERROS_2D[perro] || PERROS_2D.dalmata;
  const { Comp } = reg;
  const size = px || reg.px;
  const vivo = !reducedMotion;

  /* El pulso de la boca al ladrar: visema V4 (boca abierta) ↔ nada (la
     sonrisa), por timer determinista. Solo mientras ladra, viva y con tier. */
  const [boca, setBoca] = useState(/** @type {string|null} */ (null));
  useEffect(() => {
    if (gesto !== 'ladra' || reducedMotion || tier === 'bajo') {
      setBoca(null);
      return undefined;
    }
    let abierta = false;
    const iv = setInterval(() => {
      abierta = !abierta;
      setBoca(abierta ? 'V4' : null);
    }, LADRIDO_MS);
    return () => clearInterval(iv);
  }, [gesto, reducedMotion, tier]);

  /* Gesto → pose del kit. El señalar ya existe como pose ('señala'); el resto
     va en 'anda' y el CSS del wrapper pone el cuerpo a trabajar. */
  const pose = gesto === 'senala' ? 'señala' : 'anda';

  return (
    <div
      className={`perro-heroe perro-heroe--${gesto}`}
      data-tier={tier}
      data-perro={perro}
      aria-hidden="true"
      style={{ '--px': x, '--py': y, '--mira': mira, '--aura-color': auraDeBicho(perro) }}
    >
      <div className="perro-heroe__cuerpo">
        <span
          className="is-powered-up"
          data-creature-poder={perro}
          style={{ display: 'inline-flex' }}
        >
          <Comp
            size={size}
            animated={vivo}
            tier={tier}
            vida={false}
            pose={pose}
            visema={boca}
            /* el arreo se siente en la cola/orejas propias de cada raza */
            menea={perro === 'dalmata' && gesto === 'arrea'}
            olfatea={perro === 'beagle' && gesto === 'vigila'}
            /* la LÍNEA QUE HIERVE (Cuphead años 30) — la capa reservada para
               la entrada heroica ES esta forma: solo tier alto y vivo (es la
               más cara del kit; en medio/bajo el héroe ya se lee sin ella) */
            lineBoil={vivo && tier === 'alto'}
          />
          {vivo && tier !== 'bajo' && <AuraPoder />}
        </span>
      </div>
    </div>
  );
}

export default PerroHeroe;
