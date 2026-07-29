/*
 * MuralParallax — el plano 2D side-scroller de los murales New Donk,
 * PARAMETRIZADO por mundo. Es la generalización del mural genérico de
 * NewDonk2Den3D: mismas capas (parallax CSS repeat-x + franja de flora SVG
 * al 200% + suelo + Angelita caminando), pero todo el arte viene de un
 * objeto `tema` (ver muralCafe.jsx / muralAgua.jsx / muralSemillero.jsx).
 *
 * Es DOM/SVG puro: el host lo mete en la escena 3D vía drei <Html transform>
 * (eso lo hace MuralesNewDonk.jsx — este archivo no sabe de three).
 *
 * Con prefers-reduced-motion todas las animaciones quedan quietas y el
 * mural se lee como lámina digna.
 */
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
import { FichasMural } from './FichasMural.jsx';
import { MURAL_PX } from './muralDimensions.js';

/* Mismas dimensiones que el mural original: 640×360 px que con
   distanceFactor 2.5 proyectan ~4.0 × 2.25 unidades de mundo. */
const CSS_MNP = `
.mnd-mural {
  position: relative;
  width: ${MURAL_PX.w}px;
  height: ${MURAL_PX.h}px;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 18px;
  font-family: system-ui, sans-serif;
  user-select: none;
}
.mnd-mural__lienzo {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 9px;
  overflow: hidden;
}
/* ── capas parallax genéricas: el arte (gradients) viene inline del tema ── */
.mnd-capa {
  position: absolute;
  left: 0;
  right: 0;
  background-repeat: repeat-x;
  animation: mndScroll linear infinite;
}
@keyframes mndScroll {
  from { background-position-x: 0; }
  to { background-position-x: var(--mnd-ancho); }
}
/* ── franja de flora cercana: pista al 200% con dos copias idénticas ── */
.mnd-flora { position: absolute; left: 0; right: 0; overflow: hidden; }
.mnd-flora__pista {
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${MURAL_PX.w * 2}px;
  height: 100%;
  display: flex;
  animation: mndPista linear infinite;
}
@keyframes mndPista { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.mnd-flora__copia { position: relative; width: 50%; height: 100%; flex: none; }
/* ── Angelita caminando (quieta en X; el mundo es el que corre) ── */
.mnd-angelita {
  position: absolute;
  bottom: 13.5%;
  animation: mndCamina 0.62s ease-in-out infinite;
  transform-origin: 50% 88%;
  filter: drop-shadow(0 10px 7px rgba(30, 54, 20, 0.32));
}
@keyframes mndCamina {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-7px) rotate(2.5deg); }
}
.mnd-placa {
  position: absolute;
  top: 9px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  color: #f6ffe6;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
/* reduced-motion: lámina quieta */
.mnd-mural[data-rm='1'] .mnd-capa,
.mnd-mural[data-rm='1'] .mnd-flora__pista,
.mnd-mural[data-rm='1'] .mnd-angelita { animation: none; }
`;

/**
 * Una capa de parallax data-driven.
 * @param {object} cfg { fondo, tam, height, bottom, opacidad, dur, ancho,
 *                       bordeArriba, bordeAbajo, posicion }
 */
function Capa({ cfg }) {
  return (
    <div
      className="mnd-capa"
      style={{
        height: cfg.height,
        bottom: cfg.bottom ?? 0,
        backgroundImage: cfg.fondo,
        backgroundSize: cfg.tam,
        backgroundPosition: cfg.posicion ?? '0 100%',
        opacity: cfg.opacidad,
        borderTop: cfg.bordeArriba,
        borderBottom: cfg.bordeAbajo,
        animationDuration: `${cfg.dur}s`,
        '--mnd-ancho': cfg.ancho,
      }}
    />
  );
}

/**
 * El mural 2D de un mundo. DOM puro, listo para <Html transform>.
 *
 * @param {object} props
 * @param {object} props.tema arte del mundo (ver murales/mural*.jsx).
 * @param {boolean} [props.reducedMotion] congela todas las animaciones.
 * @param {boolean} [props.celebra] la Angelita celebra (vuelta rubber-hose).
 */
export function MuralParallax({ tema, reducedMotion = false, celebra = false }) {
  const { flora, angelita } = tema;
  const Copia = flora.Copia;
  return (
    <div
      className="mnd-mural"
      data-rm={reducedMotion ? '1' : '0'}
      data-mundo={tema.id}
      style={{ background: tema.marcoCss, boxShadow: tema.marcoSombra }}
    >
      <style>{CSS_MNP}</style>
      <div className="mnd-mural__lienzo" style={{ background: tema.lienzo }}>
        {tema.capas.map((c, i) => <Capa key={i} cfg={c} />)}
        <div className="mnd-flora" style={{ bottom: flora.bottom, height: flora.height }}>
          <div className="mnd-flora__pista" style={{ animationDuration: `${flora.dur}s` }}>
            <div className="mnd-flora__copia"><Copia /></div>
            <div className="mnd-flora__copia"><Copia /></div>
          </div>
        </div>
        <Capa cfg={tema.suelo} />
        <div className="mnd-angelita" style={{ left: angelita.left }}>
          <AbejaAngelita
            size={96}
            animated={!reducedMotion}
            pose={celebra ? 'celebra' : 'vuela'}
            animo={celebra ? (angelita.animoCelebra ?? 'pleno') : (angelita.animo ?? 'sereno')}
            energia={1}
            title={`Angelita caminando por el mural de ${tema.nombre}`}
          />
        </div>
        <span className="mnd-placa" style={{ background: tema.placaFondo }}>{tema.placa}</span>
        <FichasMural mundo={tema.id} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
