import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_SOIL_LIFE, mundoSubsueloDecisions } from './mundoSubsueloData';
import { recordGameStart, recordGameComplete } from '../../services/usageTelemetryService';
import { fvhSkinClass } from '../../config/fvhSkin';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import { evaluarSubsuelo, mensajeMeta } from '../../services/mundoSubsueloEngine';
import { Lombriz } from '../../visual/creatures/index.js';
import './mundo-subsuelo.css';

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getSoilStage(score) {
  if (score >= 75) return 'vivo';
  if (score >= 55) return 'despertando';
  if (score >= 35) return 'en cuidado';
  return 'cansado';
}

/* Emoji por etapa para el sello del HUD (solo decorativo, aria-hidden). */
const STAGE_EMOJI = {
  vivo: '🌟',
  despertando: '🌱',
  'en cuidado': '🌤️',
  cansado: '😴',
};

function Mascot({ name, title, children, active }) {
  return (
    <article
      data-active={active ? 'true' : 'false'}
      className={`jp-ms-mascota rounded-2xl border p-3 shadow-sm ${active ? 'border-cyan-300 bg-cyan-50' : 'border-lime-200 bg-white/88'}`}
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className={`msx-avatar grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${name === 'Miquito' ? 'bg-cyan-200' : 'bg-amber-200'}`}
        >
          {name === 'Miquito' ? (
            <svg viewBox="0 0 48 48" className="h-10 w-10" role="img" aria-label={name}>
              <path d="M12 23c1-9 7-15 15-15s13 6 14 15H12Z" fill="#38bdf8" />
              <path d="M18 23h17l-3 15H21l-3-15Z" fill="#f8fafc" />
              <circle cx="22" cy="18" r="2.5" fill="#f0fdfa" />
              <circle cx="31" cy="17" r="2" fill="#f0fdfa" />
              <path d="M22 31c3 2 6 2 9 0" stroke="#164e63" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          ) : (
            /* Lombricita = la Lombriz rubber-hose de la casa, no una carita
               genérica (spec belleza-juegos: la guía-protagonista de verdad).
               El contenedor ya es aria-hidden; el título del SVG es descriptivo
               y distinto del nombre (para no duplicar el texto "Lombricita"). */
            <Lombriz size={40} title="Lombriz de tierra" animated={active} />
          )}
        </div>
        <div>
          <h3 className="text-base font-black text-stone-950">{name}</h3>
          <p className="text-xs font-black uppercase tracking-wide text-stone-500">{title}</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-stone-700">{children}</p>
    </article>
  );
}

function SoilScene({ soilLife, activeDecision }) {
  const stage = getSoilStage(soilLife);
  const rootDepth = 38 + soilLife * 0.7;
  const hifaCount = Math.max(2, Math.round(soilLife / 12));
  const wormCount = Math.max(1, Math.round(soilLife / 22));
  const sparkCount = Math.max(0, Math.round((soilLife - 40) / 10));
  const isTired = soilLife < 35;

  return (
    <div
      data-testid="mundo-subsuelo-escena"
      data-soil-life={soilLife}
      data-stage={stage}
      className={fvhSkinClass('ms-vinneta overflow-hidden rounded-3xl border border-amber-200 bg-[#f6efe1] shadow-[0_24px_70px_rgba(60,46,26,0.16)]')}
    >
      <svg viewBox="0 0 760 430" role="img" aria-label="Corte transversal del suelo con raices, hongos, agua y lombrices" className="block h-auto w-full">
        <defs>
          <linearGradient id="ms-sky" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#b9f3ff" />
            <stop offset="100%" stopColor="#e8f7c8" />
          </linearGradient>
          <linearGradient id="ms-soil" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isTired ? '#b88452' : '#8a5a32'} />
            <stop offset="100%" stopColor={isTired ? '#7a5236' : '#3f2d20'} />
          </linearGradient>
          <filter id="ms-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="760" height="160" fill="url(#ms-sky)" />

        {/* Sol que respira y nube a la deriva (decorativos). */}
        <g className="msx-sol" aria-hidden="true">
          <circle cx="668" cy="56" r="24" fill="#fde047" />
          <circle cx="668" cy="56" r="16" fill="#fef08a" />
          {Array.from({ length: 8 }).map((_, index) => {
            const angle = (index * Math.PI) / 4;
            return (
              <line
                key={`rayo-${index}`}
                x1={668 + Math.cos(angle) * 30}
                y1={56 + Math.sin(angle) * 30}
                x2={668 + Math.cos(angle) * 38}
                y2={56 + Math.sin(angle) * 38}
                stroke="#fcd34d"
                strokeWidth="4"
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g className="msx-nube" fill="#ffffff" opacity="0.85" aria-hidden="true">
          <ellipse cx="505" cy="55" rx="38" ry="14" />
          <ellipse cx="478" cy="61" rx="24" ry="11" />
          <ellipse cx="533" cy="62" rx="22" ry="10" />
        </g>

        <rect x="0" y="155" width="760" height="275" fill="url(#ms-soil)" />
        <path d="M0 155c75 12 128-13 206-1 82 13 130 21 225 4 96-17 160-3 329-3v29H0Z" fill="#6f8f32" />
        <path d="M0 184c94 19 153 9 229 14 88 6 161-10 250 0 96 11 162 7 281-4v236H0Z" fill="#5b3825" opacity={isTired ? 0.52 : 0.74} />

        {/* Matas de pasto sobre la superficie (decorativas). */}
        <g stroke="#4d7c0f" strokeWidth="3" strokeLinecap="round" fill="none" aria-hidden="true">
          {[152, 208, 332, 396, 522, 578, 700].map((x) => (
            <g key={`pasto-${x}`}>
              <path d={`M${x} 158c-1-6-3-10-6-13`} />
              <path d={`M${x + 4} 158c0-7 0-12 1-15`} />
              <path d={`M${x + 8} 158c1-6 3-10 6-12`} />
            </g>
          ))}
        </g>

        {/* Textura del perfil: piedritas y motas de materia orgánica. */}
        <g aria-hidden="true">
          <ellipse cx="70" cy="300" rx="14" ry="9" fill="#7c5a3a" opacity="0.65" />
          <ellipse cx="420" cy="395" rx="17" ry="10" fill="#6b4f33" opacity="0.6" />
          <ellipse cx="580" cy="330" rx="11" ry="7" fill="#7c5a3a" opacity="0.55" />
          <ellipse cx="250" cy="410" rx="13" ry="8" fill="#6b4f33" opacity="0.6" />
          {Array.from({ length: 16 }).map((_, index) => (
            <circle
              key={`mota-${index}`}
              cx={42 + index * 46}
              cy={236 + ((index * 53) % 150)}
              r="2.5"
              fill={index % 2 ? '#caa06c' : '#2d2013'}
              opacity="0.4"
            />
          ))}
        </g>

        {/* Matas verdes: se mecen con la brisa, cada una a su ritmo. */}
        {[92, 265, 438, 608].map((x, index) => (
          <g key={`mata-${x}`} className="msx-planta" style={{ animationDelay: `${index * 0.8}s` }}>
            <path d={`M${x} 153c-8-28 8-49 29-52 20 4 36 24 29 52Z`} fill={index % 2 ? '#84cc16' : '#22c55e'} />
            <path
              d={`M${x + 14} 132c6-10 12-15 18-18`}
              stroke="#ecfccb"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          </g>
        ))}

        {/* Raíces: crecen con un pop suave cada vez que ganan profundidad. */}
        <g key={`raices-${rootDepth}`} className="msx-raices">
          {[92, 265, 438, 608].map((x, index) => (
            <g key={x}>
              <path d={`M${x + 29} 153v${rootDepth}`} stroke="#f5e8b7" strokeWidth="7" strokeLinecap="round" />
              <path d={`M${x + 29} 205c-${18 + index * 4} 16-${28 + index * 3} 31-${38 + index * 2} 49`} stroke="#f5e8b7" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d={`M${x + 29} 224c${18 + index * 3} 17 ${31 + index * 2} 34 ${42 + index * 2} 58`} stroke="#f5e8b7" strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>
          ))}
        </g>

        {/* La firma: nutrientes viajando por el internet de los hongos. */}
        {Array.from({ length: hifaCount }).map((_, index) => {
          const y = 245 + (index % 4) * 35;
          const start = 92 + index * 82;
          return (
            <path
              key={`hifa-${index}`}
              className="msx-hifa"
              style={{ animationDelay: `${index * 0.45}s` }}
              d={`M${start} ${y} C${start + 42} ${y - 30}, ${start + 96} ${y + 28}, ${start + 148} ${y - 6}`}
              stroke="#67e8f9"
              strokeWidth={soilLife > 70 ? 5 : 3}
              fill="none"
              strokeLinecap="round"
              opacity={isTired ? 0.24 : 0.78}
              filter={soilLife > 55 ? 'url(#ms-glow)' : undefined}
            />
          );
        })}

        {Array.from({ length: sparkCount }).map((_, index) => (
          <circle
            key={`spark-${index}`}
            data-testid="nutrient-spark"
            className="msx-chispa"
            style={{ animationDelay: `${index * 0.35}s` }}
            cx={132 + index * 92}
            cy={238 + (index % 3) * 46}
            r="6"
            fill={index % 2 ? '#fef08a' : '#22d3ee'}
            filter="url(#ms-glow)"
          />
        ))}

        {/* Lombrices = la Lombriz rubber-hose de la casa, meneándose en su
            galería (spec belleza-juegos: la protagonista viva de la red del
            suelo, no un trazo con puntico). Inline dentro del corte, escalada y
            un poco rotada para acostarse en su galería del suelo. */}
        {Array.from({ length: wormCount }).map((_, index) => {
          const wx = 112 + index * 178;
          const wy = 345 - (index % 2) * 34;
          const rot = index % 2 === 0 ? 26 : -14;
          return (
            <g key={`worm-${index}`} className="msx-lombriz" style={{ animationDelay: `${index * 0.6}s` }}>
              <g transform={`translate(${wx + 26} ${wy - 30}) scale(1.75) rotate(${rot})`}>
                <Lombriz inline animated title="Lombriz" />
              </g>
            </g>
          );
        })}

        {soilLife >= 55 && (
          <g fill="#38bdf8" opacity="0.82">
            <path className="msx-agua" d="M641 161c-22 47-24 78-2 116 22-38 21-69 2-116Z" />
            <path className="msx-agua" style={{ animationDelay: '0.8s' }} d="M688 154c-18 37-20 62-1 92 18-30 17-56 1-92Z" />
            <path className="msx-agua" style={{ animationDelay: '1.5s' }} d="M595 164c-15 33-17 54-1 81 15-27 14-49 1-81Z" />
          </g>
        )}

        {isTired && (
          <g>
            <path d="M18 180c82 6 142 18 218 46" stroke="#d97706" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M37 205c65 4 107 16 172 39" stroke="#f59e0b" strokeWidth="5" fill="none" strokeLinecap="round" />
          </g>
        )}

        <g transform="translate(32 24)">
          <rect width="210" height="76" rx="20" fill="rgba(255,255,255,0.82)" />
          <text x="18" y="31" fill="#1c1917" fontSize="18" fontWeight="800">Escena: {stage}</text>
          <text x="18" y="56" fill="#57534e" fontSize="14" fontWeight="700">{activeDecision.result}</text>
        </g>
      </svg>
    </div>
  );
}

export default function MundoSubsuelo() {
  const [soilLife, setSoilLife] = useState(BASE_SOIL_LIFE);
  const [activeId, setActiveId] = useState('compost-bocashi');
  // Cuenta de jugadas (cartas tomadas) para dar un pequeño arco de reto.
  const [jugadas, setJugadas] = useState(0);
  const activeDecision = mundoSubsueloDecisions.find((decision) => decision.id === activeId) || mundoSubsueloDecisions[0];
  const stage = getSoilStage(soilLife);
  const meterColor = soilLife >= 60 ? 'bg-emerald-500' : soilLife >= 35 ? 'bg-amber-500' : 'bg-rose-500';

  // FEEL gated (dev-only): con la flag ON se enciende la capa de OBJETIVO (meta
  // de suelo vivo + celebración al lograrla). Con OFF el juego queda EXACTO como
  // hoy (sandbox libre, sin meta ni celebración).
  const feelOn = fincaVivaHomePerfilActivo();
  const objetivo = useMemo(() => evaluarSubsuelo(soilLife, jugadas), [soilLife, jugadas]);
  // La celebración aparece UNA vez al cruzar la meta hacia arriba; se cierra a
  // mano. `metaFestejada` evita que reaparezca al seguir jugando tras lograrla.
  const [metaFestejada, setMetaFestejada] = useState(false);
  const celebrandoMeta = feelOn && objetivo.alcanzada && !metaFestejada;

  // Telemetría de uso ANÓNIMA: inicio del juego al montar (una vez).
  useEffect(() => { recordGameStart('mundo_subsuelo'); }, []);
  // Completado: cuando la escena alcanza 'vivo' (soilLife >= 75), una sola vez.
  const completadoRef = useRef(false);
  useEffect(() => {
    if (stage === 'vivo' && !completadoRef.current) {
      completadoRef.current = true;
      recordGameComplete('mundo_subsuelo');
    }
  }, [stage]);

  const guideLine = useMemo(() => {
    if (activeDecision.tone === 'bad') {
      return 'Probemos otra jugada para que la tierra respire otra vez.';
    }
    if (soilLife >= 70) {
      return 'Mira como brillan los caminos bajo las plantas.';
    }
    return 'Cada decision cambia lo que pasa debajo de tus botas.';
  }, [activeDecision.tone, soilLife]);

  function chooseDecision(decision) {
    setActiveId(decision.id);
    setSoilLife((current) => clamp(current + decision.effect));
    setJugadas((n) => n + 1);
  }

  function reiniciarSuelo() {
    setSoilLife(BASE_SOIL_LIFE);
    setJugadas(0);
    setActiveId('compost-bocashi');
    setMetaFestejada(false);
  }

  return (
    <main data-testid="mundo-subsuelo" className={fvhSkinClass('ms-root jp-ambiente mx-auto flex w-full max-w-6xl flex-col gap-4 bg-[#fff8e8] px-3 py-4 text-stone-950 sm:px-5')}>
      <header className="jp-ms-header overflow-hidden rounded-3xl border border-lime-200 bg-[linear-gradient(135deg,#fef3c7,#d9f99d_52%,#a5f3fc)] p-4 shadow-sm sm:p-6">
        <p className="jp-ms-kicker text-xs font-black uppercase tracking-[0.2em] text-emerald-900">Aprende a Cultivar Jugando</p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-black leading-none text-stone-950 sm:text-5xl">Mundo Subsuelo</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-stone-700">
              Toma una carta y mira si el suelo despierta: raices profundas, hongos conectados,
              lombrices activas, agua que entra y nutrientes que brillan.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/78 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-stone-500">Vida del suelo</p>
                <p className="text-3xl font-black text-stone-950">
                  <span data-testid="vida-suelo-valor">{soilLife}</span>
                  <span className="text-lg text-stone-500">/100</span>
                </p>
              </div>
              <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black uppercase text-white">
                <span aria-hidden="true">{STAGE_EMOJI[stage]} </span>
                {stage}
              </span>
            </div>
            <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
              <div className={`msx-meter-fill h-full rounded-full ${meterColor}`} style={{ width: `${soilLife}%` }} />
              {feelOn && <span className="msx-meter-meta" style={{ left: '75%' }} />}
            </div>
            {/* Línea de meta (gated dev-only): marca dónde está "suelo vivo". */}
            {feelOn && (
              <p
                data-testid="subsuelo-meta"
                className="mt-2 text-xs font-bold leading-snug text-stone-700"
                role="status"
              >
                {mensajeMeta(objetivo)}
                <span className="ml-1 text-stone-400">· Jugadas: {jugadas}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Mascot name="Lombricita" title="Cuida tuneles" active={activeDecision.guide === 'Lombricita'}>
          Dame suelo cubierto y comida organica. Yo ayudo a mezclar aire, agua y vida.
        </Mascot>
        <Mascot name="Miquito" title="Conecta raices" active={activeDecision.guide === 'Miquito'}>
          Soy micorriza. Mi red ayuda a las plantas a explorar mas suelo. {guideLine}
        </Mascot>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <SoilScene soilLife={soilLife} activeDecision={activeDecision} />

        <div className="flex flex-col gap-3">
          <section
            key={`decision-${activeId}-${jugadas}`}
            data-testid="decision-activa"
            className="msx-entra jp-ms-panel rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Carta activa</p>
                <h2 className="mt-1 text-2xl font-black leading-tight text-stone-950">{activeDecision.title}</h2>
              </div>
              <span className={`msx-punch rounded-full px-3 py-1 text-sm font-black ${activeDecision.tone === 'good' ? 'bg-lime-100 text-lime-900' : 'bg-rose-100 text-rose-900'}`}>
                {activeDecision.effect > 0 ? '+' : ''}
                {activeDecision.effect}
              </span>
            </div>
            <p className="mt-3 text-base font-bold text-stone-800">{activeDecision.achievement}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-stone-600">{activeDecision.why}</p>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-2" aria-label="Cartas de decision">
            {mundoSubsueloDecisions.map((decision) => {
              const Icon = decision.icon;
              const selected = decision.id === activeId;
              return (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => chooseDecision(decision)}
                  data-selected={selected ? 'true' : 'false'}
                  className={`msx-carta jp-ms-carta min-h-28 rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.98] ${
                    selected
                      ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200'
                      : decision.tone === 'good'
                        ? 'border-lime-200 bg-white hover:bg-lime-50'
                        : 'border-rose-200 bg-white hover:bg-rose-50'
                  }`}
                  aria-pressed={selected}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${decision.tone === 'good' ? 'bg-lime-100 text-lime-800' : 'bg-rose-100 text-rose-800'}`}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm font-black leading-tight text-stone-950">{decision.title}</span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-stone-600">{decision.result}</span>
                </button>
              );
            })}
          </section>
        </div>
      </section>

      {/* Celebración al lograr la meta (gated dev-only). Sandbox intacto con la
          flag OFF: nunca aparece y no hay objetivo que "cerrar". */}
      {celebrandoMeta && (
        <section
          data-testid="subsuelo-meta-lograda"
          className="msx-pop rounded-3xl border-2 border-lime-400 bg-[linear-gradient(135deg,#ecfccb,#a5f3fc)] p-5 text-center shadow-sm"
          role="status"
        >
          <div className="text-5xl" aria-hidden="true">🌱✨</div>
          <h2 className="mt-2 text-2xl font-black text-stone-950">¡Suelo vivo!</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-stone-700">
            {mensajeMeta(objetivo)} Sigue cuidándolo o vuelve a empezar para
            lograrlo en menos jugadas.
          </p>
          <button
            type="button"
            data-testid="subsuelo-reiniciar"
            onClick={reiniciarSuelo}
            className="mt-4 min-h-[52px] rounded-2xl bg-emerald-600 px-6 font-black text-white shadow active:scale-95"
          >
            Empezar de nuevo
          </button>
          <button
            type="button"
            onClick={() => setMetaFestejada(true)}
            className="mt-2 block w-full text-sm font-bold text-stone-500 underline"
          >
            Seguir explorando el suelo
          </button>
        </section>
      )}
    </main>
  );
}
