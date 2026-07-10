/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; TODO el copy es de muestra y
 * migraría en bloque a src/config/messages.js — mismo criterio que los otros
 * mockups de la galería. Por eso se apaga aquí la regla i18n (soft `warn`):
 * el gate de pre-commit corre eslint con --max-warnings 0 y este archivo es,
 * por definición, copy hardcodeado a propósito.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup: copy de muestra (ver nota arriba) */
import { ArrowLeft, CloudRain, Droplet, CalendarDays, Eye } from 'lucide-react';
import CapaCielo from '../visual/scenes/CieloParametrico.jsx';
import { cieloEscena } from '../visual/scenes/_cielo.js';
import SceneFincaOrganismo from '../visual/scenes/SceneFincaOrganismo.jsx';
import { Lombriz } from '../visual/creatures/Lombriz.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import { Colibri } from '../visual/creatures/Colibri.jsx';
import { Escarabajo } from '../visual/creatures/Escarabajo.jsx';
import LaminaMataEtapa from '../visual/laminas/LaminaMataEtapa.jsx';
import '../visual/scenes/scenes.css';
import '../visual/scenes/scene-finca-organismo.css';
import '../visual/creatures/creatures.css';
import '../visual/laminas/laminas.css';
import './salud-finca.css';

/**
 * SaludFinca — MOCKUP "La salud de mi finca": la superficie de ESTADO/SALUD.
 *
 * No es "qué hacer hoy": es el PANORAMA de cómo está la finca, leída como un
 * organismo vivo. El diferencial es la CALMA: la observación no alarma, no hay
 * puntos ni medallas ni rachas. El estado de lo vivo se lee por color funcional
 * —savia (sana), miel (en observación), arcilla (pide una mirada), nunca rojo—.
 *
 * Firma visual: "el cantero vivo" (la finca vista como una cama de siembra desde
 * arriba, cada mata un brote teñido por su bienestar, respirando al mismo pulso
 * que el organismo del héroe). Reusa la librería visual `src/visual`:
 *   - scenes: SceneFincaOrganismo (héroe que respira) + CapaCielo (el cielo de
 *     la vereda al amanecer, nublado tras la lluvia).
 *   - creatures: Lombriz, AbejaAngelita, Colibrí, Escarabajo (la vida del suelo).
 *   - laminas: LaminaMataEtapa (la mata del foco de atención).
 *
 * Ruta pública `#/mockups/salud-finca` (sin auth, datos de muestra ficticios).
 *
 * @param {Object} props
 * @param {() => void} [props.onBack] volver al dashboard.
 */

// ── Datos de muestra (finca y vereda ficticias) ─────────────────────────────
const FINCA = { nombre: 'El Retoño', vereda: 'Aguas Claras', mirada: 'hoy, 6:40 a. m.' };

// El cantero: 48 matas. La mayoría sanas; unas pocas en observación y dos que
// piden una mirada — repartidas por la cama, no amontonadas (así se lee natural).
const MIRADA = new Set([19, 42]);
const OBS = new Set([3, 11, 22, 28, 34, 40, 45]);
const MATAS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  estado: MIRADA.has(i) ? 'mirada' : OBS.has(i) ? 'obs' : 'sana',
}));
const CONTEO = {
  sana: MATAS.filter((m) => m.estado === 'sana').length,
  obs: MATAS.filter((m) => m.estado === 'obs').length,
  mirada: MATAS.filter((m) => m.estado === 'mirada').length,
};

// Foco de atención: una mata o zona que pide mirada, sin alarmismo.
const FOCOS = [
  {
    id: 'tomate',
    estado: 'obs',
    chip: 'En observación',
    titulo: 'El tomate de la cama 3',
    texto: 'Algunas hojas de abajo tienen puntos amarillos. Vale mirarlo con calma esta semana; puede ser falta de riego parejo.',
    etapa: 'floracion',
  },
  {
    id: 'zona-baja',
    estado: 'mirada',
    chip: 'Pide una mirada',
    titulo: 'La zona baja, junto a la acequia',
    texto: 'El agua se quedó parada dos días después de la lluvia. El surco no está drenando; conviene abrirle salida.',
    etapa: null,
  },
  {
    id: 'cafeto',
    estado: 'obs',
    chip: 'En observación',
    titulo: 'El cafeto joven del lindero',
    texto: 'Está creciendo despacio. Puede ser la sombra del aguacate vecino más que el suelo. Anótelo y compare en un mes.',
    etapa: 'juvenil',
  },
];

// La vida del suelo y los polinizadores: la sensación de finca-organismo.
const VIDA = [
  {
    id: 'lombriz',
    Fig: Lombriz,
    nombre: 'Lombrices',
    cientifico: 'Martiodrilus crassus',
    texto: 'En una palada de tierra aparecieron seis. El suelo está suelto y huele a monte: buena señal de vida abajo.',
  },
  {
    id: 'angelita',
    Fig: AbejaAngelita,
    nombre: 'Abejas angelita',
    cientifico: 'Tetragonisca angustula',
    texto: 'Entran y salen del cilantro que se dejó florecer. Cuando rondan tranquilas, la finca está polinizándose sola.',
  },
  {
    id: 'colibri',
    Fig: Colibri,
    nombre: 'Colibrí',
    cientifico: 'Colibri coruscans',
    texto: 'Ronda las salvias desde temprano. Verlo volver cada mañana es una lectura sencilla de que hay flor y néctar.',
  },
  {
    id: 'escarabajo',
    Fig: Escarabajo,
    nombre: 'Escarabajos estercoleros',
    cientifico: 'Dichotomius belus',
    texto: 'Rodaron el estiércol del corral y lo enterraron. El abono se recicla solo y el suelo se airea sin arar.',
  },
];

// Geometría del cantero: cada mata cae en una cama de 8×6 con leve variación,
// para que se lea como siembra a mano y no como una tabla fría.
const COLS = 8;
const ROWS = 6;
function disponerCantero() {
  return MATAS.map((m, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const jx = ((i * 37) % 11) - 5;
    const jy = ((i * 53) % 9) - 4;
    const x = 26 + col * ((294 - 26) / (COLS - 1)) + jx;
    const y = 30 + row * ((134 - 30) / (ROWS - 1)) + jy;
    const s = 0.82 + ((i * 29) % 40) / 100;
    const r = ((i * 17) % 13) - 6;
    return { ...m, x, y, s, r };
  });
}

/** El cielo del amanecer en la vereda (nublado tras la lluvia). */
function CieloVereda() {
  const cielo = { luz: 'amanecer', condicion: 'nublado' };
  const [alto, bajo] = cieloEscena(cielo, 'finca');
  return (
    <svg
      className="slf-cielo-svg"
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="El cielo del amanecer en la vereda: nublado, con sol bajo tras la lluvia de la noche."
    >
      <defs>
        <linearGradient id="slf-cielo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={alto} />
          <stop offset="1" stopColor={bajo} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="390" height="300" fill="url(#slf-cielo-bg)" />
      <CapaCielo cielo={cielo} cx={286} cy={78} r={27} lluviaY={150} w={390} h={300} />
    </svg>
  );
}

/** El cantero vivo: la finca como cama de siembra, cada mata teñida por estado. */
function Cantero() {
  const brotes = disponerCantero();
  return (
    <svg
      className="slf-cantero-svg"
      viewBox="0 0 320 150"
      role="img"
      aria-label={`El cantero de la finca: ${CONTEO.sana} matas sanas, ${CONTEO.obs} en observación y ${CONTEO.mirada} que piden una mirada.`}
    >
      <defs>
        {/* un brote: tallo + dos hojas + semilla, anclado en la base (0,0) */}
        <g id="slf-brote-glifo">
          <path
            d="M0,0 C-0.6,-7 0.6,-11 0,-18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M0,-9 C-8,-9.5 -11.5,-14.5 -9,-20 C-3.2,-18 -0.6,-13.5 0,-10.5 Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M0,-12 C8,-12.5 11.5,-17.5 9,-23 C3.2,-21 0.6,-16.5 0,-13.5 Z"
            fill="currentColor"
            opacity="0.72"
          />
          <circle cx="0" cy="1" r="1.5" fill="currentColor" opacity="0.55" />
        </g>
      </defs>
      {/* surcos apenas insinuados, para que se lea "cama de siembra" */}
      <g stroke="rgba(120, 90, 46, 0.16)" strokeWidth="1">
        <path d="M8,52 H312" />
        <path d="M8,86 H312" />
        <path d="M8,120 H312" />
      </g>
      <g className="slf-cantero-aliento">
        {brotes.map((b) => (
          <use
            key={b.id}
            href="#slf-brote-glifo"
            className={`slf-brote slf-brote--${b.estado}`}
            transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) scale(${b.s.toFixed(2)}) rotate(${b.r})`}
          />
        ))}
      </g>
    </svg>
  );
}

export default function SaludFinca({ onBack }) {
  return (
    <div className="slf-root">
      <header className="slf-top">
        <button type="button" className="slf-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={19} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="slf-titulo">
          <p className="slf-eyebrow">El estado de la finca</p>
          <h1 className="slf-h1">La salud de mi finca</h1>
          <p className="slf-lugar">
            Finca <b>{FINCA.nombre}</b> · vereda {FINCA.vereda} · última mirada {FINCA.mirada}
          </p>
        </div>
      </header>

      <div className="slf-wrap">
        {/* Héroe: la finca como organismo que respira */}
        <section className="slf-hero" aria-label="Su finca, vista como un organismo vivo">
          <div className="slf-hero-escena">
            <SceneFincaOrganismo />
          </div>
          <div className="slf-hero-velo" />
          <div className="slf-hero-texto">
            <p className="slf-hero-linea">Su finca está viva y respira tranquila.</p>
            <p className="slf-hero-sub">
              De un vistazo: la tierra está húmeda, la vida trabaja abajo y casi todas las matas
              siguen su curso. Hay un par de cosas para mirar con calma.
            </p>
            <span className="slf-hero-pulso">
              <span className="slf-hero-punto" aria-hidden="true" />
              48 matas · pulso estable
            </span>
          </div>
        </section>

        {/* El cantero vivo (firma) */}
        <section className="slf-sec" aria-labelledby="slf-cantero-tit">
          <div className="slf-sec-cab">
            <p className="slf-kicker">El pulso de las matas</p>
            <h2 className="slf-sec-tit" id="slf-cantero-tit">El cantero, mata por mata</h2>
            <p className="slf-sec-nota">
              Cada brote es una mata de la finca. El color no juzga: solo dice si va bien, si conviene
              observarla o si pide que usted se acerque a mirar.
            </p>
          </div>
          <div className="slf-card">
            <Cantero />
            <div className="slf-conteos">
              <div className="slf-conteo">
                <span className="slf-conteo-num">
                  <span className="slf-punto slf-punto--sana" aria-hidden="true" />
                  {CONTEO.sana}
                </span>
                <span className="slf-conteo-lbl">van bien, siguen su curso</span>
              </div>
              <div className="slf-conteo">
                <span className="slf-conteo-num">
                  <span className="slf-punto slf-punto--obs" aria-hidden="true" />
                  {CONTEO.obs}
                </span>
                <span className="slf-conteo-lbl">en observación</span>
              </div>
              <div className="slf-conteo">
                <span className="slf-conteo-num">
                  <span className="slf-punto slf-punto--mirada" aria-hidden="true" />
                  {CONTEO.mirada}
                </span>
                <span className="slf-conteo-lbl">piden una mirada</span>
              </div>
            </div>
          </div>
        </section>

        {/* El cielo y el agua como señales de salud */}
        <section className="slf-sec" aria-labelledby="slf-cielo-tit">
          <div className="slf-sec-cab">
            <p className="slf-kicker">El cielo y el agua</p>
            <h2 className="slf-sec-tit" id="slf-cielo-tit">De dónde viene el agua</h2>
            <p className="slf-sec-nota">
              La lluvia y la humedad del suelo son la primera señal de cómo va a estar la finca los
              próximos días.
            </p>
          </div>
          <div className="slf-card">
            <div className="slf-cielo-fila">
              <div className="slf-cielo-caja">
                <CieloVereda />
              </div>
              <div className="slf-senales">
                <div className="slf-senal">
                  <CloudRain size={16} strokeWidth={2} color="var(--slf-agua)" aria-hidden="true" />
                  <span className="slf-senal-lbl">Llovió</span>
                  <span className="slf-senal-val">14 mm <small>hace 2 días</small></span>
                </div>
                <div className="slf-senal">
                  <CalendarDays size={16} strokeWidth={2} color="var(--slf-agua)" aria-hidden="true" />
                  <span className="slf-senal-lbl">Próxima</span>
                  <span className="slf-senal-val"><small>probable en</small> 3 días</span>
                </div>
              </div>
            </div>
            <div className="slf-senal" style={{ marginTop: '12px' }}>
              <Droplet size={16} strokeWidth={2} color="var(--slf-agua)" aria-hidden="true" />
              <span className="slf-senal-lbl">Humedad</span>
              <span className="slf-senal-val">buena <small>en el primer palmo</small></span>
            </div>
            <div className="slf-suelo-barra" role="img" aria-label="Humedad del suelo: buena, entre media y húmeda.">
              <span className="slf-suelo-marca" style={{ left: '68%' }} />
            </div>
            <div className="slf-suelo-escala">
              <span>seca</span>
              <span>media</span>
              <span>húmeda</span>
            </div>
          </div>
        </section>

        {/* Focos de atención — sin alarmismo */}
        <section className="slf-sec" aria-labelledby="slf-focos-tit">
          <div className="slf-sec-cab">
            <p className="slf-kicker">
              <Eye size={12} strokeWidth={2.4} style={{ verticalAlign: '-1px', marginRight: '4px' }} aria-hidden="true" />
              Para mirar esta semana
            </p>
            <h2 className="slf-sec-tit" id="slf-focos-tit">Tres cosas que piden atención</h2>
            <p className="slf-sec-nota">
              Nada urgente. Son puntos para acercarse, observar y anotar; ninguno es una alarma.
            </p>
          </div>
          <div className="slf-focos">
            {FOCOS.map((f) => (
              <article key={f.id} className={`slf-foco slf-foco--${f.estado}`}>
                {f.etapa && (
                  <div className="slf-foco-lam" aria-hidden="true">
                    <LaminaMataEtapa etapa={f.etapa} />
                  </div>
                )}
                <div className="slf-foco-cuerpo">
                  <h3 className="slf-foco-tit">{f.titulo}</h3>
                  <p className="slf-foco-txt">{f.texto}</p>
                  <span className={`slf-chip slf-chip--${f.estado}`}>
                    <span className={`slf-punto slf-punto--${f.estado}`} aria-hidden="true" />
                    {f.chip}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* El suelo y la vida — finca-organismo */}
        <section className="slf-sec" aria-labelledby="slf-vida-tit">
          <div className="slf-sec-cab">
            <p className="slf-kicker">El suelo y la vida</p>
            <h2 className="slf-sec-tit" id="slf-vida-tit">Quiénes trabajan la finca con usted</h2>
            <p className="slf-sec-nota">
              La salud no está solo en las matas: está en la vida que se mueve alrededor. Cuando estos
              vuelven cada día, la finca se está cuidando sola.
            </p>
          </div>
          <div className="slf-card">
            <div className="slf-vida">
              {VIDA.map((v) => (
                <div key={v.id} className="slf-bicho">
                  <div className="slf-bicho-fig">
                    <v.Fig size={46} title={v.nombre} className="slf-bicho-svg" />
                  </div>
                  <div className="slf-bicho-cuerpo">
                    <p className="slf-bicho-nom">
                      {v.nombre} <i>· {v.cientifico}</i>
                    </p>
                    <p className="slf-bicho-txt">{v.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre — la calma es el mensaje */}
        <div className="slf-cierre">
          <p>Esto es una lectura, no una alarma.</p>
          <p>
            La finca se observa con calma: mire, anote lo que vio y vuelva mañana. Con el tiempo, estas
            miradas seguidas enseñan más que cualquier medición de un solo día.
          </p>
        </div>
      </div>
    </div>
  );
}
