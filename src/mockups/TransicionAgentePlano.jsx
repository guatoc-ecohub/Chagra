/*
 * TransicionAgentePlano — vitrina del CRUCE DEL AGENTE 3D → PLANO.
 *
 * La tesis: cuando el valle 3D abre una pantalla plana, el compañero NO debe
 * morir con el canvas — cruza CON usted. Esta vitrina monta el flujo real de
 * punta a punta con las piezas de producción:
 *
 *   · TunelLamina ('saliendo' / 'entrando') — el túnel Odyssey que ya cruza
 *     la pantalla en la entrada del valle;
 *   · AgentePlanoPuente + senalAgentePlano — el puente del agente: la abeja
 *     se clava al túnel, cruza el destello hecha cometa, aterriza con squash
 *     & stretch y SE APLANA contra el vidrio hasta ser el avatar plano;
 *   · BurbujaAngelita — la voz de siempre, que retoma del otro lado.
 *
 * El lado "valle" es una lámina de páramo al atardecer (CSS puro, cero
 * three: la vitrina demuestra el CRUCE, no el mundo). El lado "pantalla" es
 * una pantalla de la gente: la del agua, con el compAI en su esquina.
 *
 * El intercambio valle ↔ pantalla pasa DEBAJO del destello (onCubierto del
 * túnel) mientras el overlay del agente vuela POR ENCIMA — la misma
 * arquitectura que necesita el shell real (el puente vive en la raíz que
 * persiste; la señal cruza el swap). Reduced-motion: corte directo digno,
 * el avatar plano simplemente aparece.
 */
import { useCallback, useRef, useState } from 'react';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import BurbujaAngelita from '../visual/agente/BurbujaAngelita.jsx';
import { AgentePlanoPuente } from '../visual/agente/AgentePlanoTransicion.jsx';
import { posarAgente, alzarAgente } from '../visual/agente/senalAgentePlano.js';
import {
  destinoFabPorDefecto,
  FAB_MARGEN_DER,
  FAB_MARGEN_ABAJO,
  FAB_LADO,
  LADO_VUELO,
} from '../visual/agente/agentePlanoData.js';
import TunelLamina from '../visual/mundo3d/transiciones/TunelLamina.jsx';
import { rectDeOrigen } from '../visual/mundo3d/transiciones/tunelLaminaData.js';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import './transicionAgentePlano.css';

/* La percha del compañero en la lámina del valle (fracciones del viewport,
   compartidas entre el CSS de la escena y el rect de llegada al alzar —
   así el aterrizaje de vuelta es píxel-exacto). */
const PERCHA_FX = 0.3;
const PERCHA_FY = 0.42;

const SALUDO_PLANO =
  'Aquí sigo con usted. El tanque va en 74 % y anoche llovió lo suficiente: su agua está tranquila.';

/* Un frailejón de lámina (silueta digna, sin pretensión botánica). */
function Frailejon({ left, bottom, size = 64 }) {
  return (
    <svg
      className="tap-frailejon"
      style={{ left, bottom, width: size, height: size * 1.5 }}
      viewBox="0 0 40 60"
      aria-hidden="true"
    >
      <rect x="17" y="22" width="6" height="38" rx="3" fill="#4a4132" />
      <g fill="#7fae7a">
        <ellipse cx="20" cy="16" rx="4" ry="13" />
        <ellipse cx="20" cy="16" rx="4" ry="13" transform="rotate(40 20 16)" />
        <ellipse cx="20" cy="16" rx="4" ry="13" transform="rotate(-40 20 16)" />
        <ellipse cx="20" cy="16" rx="4" ry="13" transform="rotate(75 20 16)" />
        <ellipse cx="20" cy="16" rx="4" ry="13" transform="rotate(-75 20 16)" />
      </g>
      <circle cx="20" cy="15" r="4.5" fill="#e8c95a" />
    </svg>
  );
}

export default function TransicionAgentePlanoMockup() {
  const [equipo] = useState(decidirTier);
  const reducedMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [vista, setVista] = useState('valle'); // 'valle' | 'pantalla'
  const [tunel, setTunel] = useState(null); // null | { fase, destino, rect }
  const [abejaViva, setAbejaViva] = useState(true); // la compañera en la lámina
  const [chipVisible, setChipVisible] = useState(false); // el avatar plano posado
  const [cruzando, setCruzando] = useState(false);

  const refAbeja = useRef(null);
  const refChip = useRef(null);

  // ── ZARPAR: valle 3D → pantalla plana. El overlay del agente retoma a la
  //    abeja en su percha EXACTA (rect medido) y la escena la esconde en el
  //    mismo instante: una sola alma, cero abejas dobles.
  const abrirPantalla = useCallback(
    (ev) => {
      if (cruzando) return;
      setCruzando(true);
      const desde = rectDeOrigen(refAbeja.current);
      setAbejaViva(false);
      if (reducedMotion) {
        setVista('pantalla');
      } else {
        setTunel({ fase: 'saliendo', destino: 'agua', rect: rectDeOrigen(ev) });
      }
      posarAgente({ desde, animo: 'sereno', energia: 1 });
    },
    [cruzando, reducedMotion],
  );

  // ── VOLVER: pantalla plana → valle. El avatar se despega del vidrio y el
  //    overlay vuela de vuelta a la percha (mismas fracciones que la escena).
  const volverAlValle = useCallback(
    (ev) => {
      if (cruzando) return;
      setCruzando(true);
      const desde = rectDeOrigen(refChip.current);
      setChipVisible(false);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const hasta = {
        x: vw * PERCHA_FX - LADO_VUELO / 2,
        y: vh * PERCHA_FY - LADO_VUELO / 2,
        width: LADO_VUELO,
        height: LADO_VUELO,
      };
      if (reducedMotion) {
        setVista('valle');
      } else {
        setTunel({ fase: 'entrando', destino: 'valle', rect: rectDeOrigen(ev) });
      }
      alzarAgente({ desde, hasta });
    },
    [cruzando, reducedMotion],
  );

  // El puente avisa: posado (revelar el avatar del lado que recibe) y fin.
  const onPosadaPuente = useCallback((sentido) => {
    if (sentido === 'posar') setChipVisible(true);
    else setAbejaViva(true);
  }, []);
  const onFinPuente = useCallback(() => setCruzando(false), []);

  const fab = typeof window === 'undefined'
    ? { x: 0, y: 0 }
    : destinoFabPorDefecto({ ancho: window.innerWidth, alto: window.innerHeight });

  return (
    <div className="tap" data-vista={vista}>
      {vista === 'valle' && (
        <section className="tap-valle" aria-label="El valle de la finca al atardecer">
          {/* La lámina: cielo, cordones de montaña, niebla y frailejones. */}
          <div className="tap-cielo" aria-hidden="true" />
          <div className="tap-sol" aria-hidden="true" />
          <div className="tap-loma tap-loma--lejos" aria-hidden="true" />
          <div className="tap-loma tap-loma--media" aria-hidden="true" />
          <div className="tap-niebla" aria-hidden="true" />
          <div className="tap-loma tap-loma--cerca" aria-hidden="true" />
          <Frailejon left="14%" bottom="16%" size={46} />
          <Frailejon left="24%" bottom="9%" size={72} />
          <Frailejon left="66%" bottom="13%" size={56} />
          <Frailejon left="82%" bottom="7%" size={84} />

          {/* La compañera, VIVA en el mundo: flota con su sombra debajo
              (el volumen que luego va a rendir contra el vidrio). */}
          {abejaViva && (
            <div
              className="tap-percha"
              style={{ left: `${PERCHA_FX * 100}%`, top: `${PERCHA_FY * 100}%` }}
            >
              <div className="tap-abeja" ref={refAbeja}>
                <AbejaAngelita size={LADO_VUELO} animo="sereno" energia={1} animated />
              </div>
              <span className="tap-abeja-sombra" aria-hidden="true" />
            </div>
          )}

          <header className="tap-encabezado">
            <span className="tap-eyebrow">Vitrina · el agente cruza a lo plano</span>
            <h1>El valle, con su compañera</h1>
          </header>

          <aside className="tap-panel">
            <h2>El agua de su finca</h2>
            <p>
              Al abrir la pantalla, el túnel cruza — y ella cruza con usted:
              se clava a la luz y aterriza hecha el agente de su pantalla.
            </p>
            <button type="button" className="tap-cta" onClick={abrirPantalla} disabled={cruzando}>
              Abrir la pantalla del agua »
            </button>
          </aside>
        </section>
      )}

      {vista === 'pantalla' && (
        <section className="tap-pantalla" aria-label="La pantalla del agua">
          <header className="tap-pantalla-encabezado">
            <button
              type="button"
              className="tap-volver"
              onClick={volverAlValle}
              disabled={cruzando}
            >
              ‹ Volver al valle
            </button>
            <h1>El agua de mi finca</h1>
          </header>

          <div className="tap-tarjetas">
            <article className="tap-tarjeta">
              <span className="tap-tarjeta-dato">74 %</span>
              <p>Tanque principal — nivel sano para la semana.</p>
            </article>
            <article className="tap-tarjeta">
              <span className="tap-tarjeta-dato">12 mm</span>
              <p>Lluvia de anoche sobre la vereda.</p>
            </article>
            <article className="tap-tarjeta">
              <span className="tap-tarjeta-dato">Al día</span>
              <p>El reservorio y las canales no reportan novedades.</p>
            </article>
          </div>

          {/* El AGENTE PLANO: el mismo compañero, ahora calcomanía viva en la
              esquina de toda pantalla — revelado en el instante exacto en que
              el overlay lo posa (empalme sin hueco). */}
          {chipVisible && (
            <>
              <div
                className="tap-chip"
                ref={refChip}
                style={{ right: FAB_MARGEN_DER, bottom: FAB_MARGEN_ABAJO, width: FAB_LADO, height: FAB_LADO }}
              >
                <AbejaAngelita size={FAB_LADO - 12} animo="sereno" energia={1} animated />
              </div>
              <div
                className="tap-burbuja"
                style={{ right: FAB_MARGEN_DER, bottom: FAB_MARGEN_ABAJO + FAB_LADO + 14 }}
              >
                <BurbujaAngelita mensaje={SALUDO_PLANO} tipo="informativa" />
              </div>
            </>
          )}
          {/* Ancla fantasma del aterrizaje (depurable): coincide con
              destinoFabPorDefecto — el overlay aterriza aquí. */}
          <span
            className="tap-ancla"
            style={{ left: fab.x, top: fab.y, width: FAB_LADO, height: FAB_LADO }}
            aria-hidden="true"
          />
        </section>
      )}

      {/* El TÚNEL real de producción: cruza la pantalla; el swap va debajo
          del destello (onCubierto). */}
      {tunel && (
        <TunelLamina
          fase={tunel.fase}
          destino={tunel.destino}
          rect={tunel.rect}
          tier={equipo.tier}
          reducedMotion={reducedMotion}
          letrero={tunel.fase === 'saliendo' ? 'A la pantalla del agua…' : 'De vuelta al valle…'}
          onCubierto={() => setVista(tunel.fase === 'saliendo' ? 'pantalla' : 'valle')}
          onFin={() => setTunel(null)}
        />
      )}

      {/* El PUENTE del agente: vive en esta raíz (persiste al swap) y corre
          el cruce por encima del túnel. */}
      <AgentePlanoPuente
        tier={equipo.tier}
        reducedMotion={reducedMotion}
        onPosada={onPosadaPuente}
        onFin={onFinPuente}
      />
    </div>
  );
}
