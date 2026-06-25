/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de este hero (saludo del agente, etiquetas de los portales,
 * aria-labels) son strings de interfaz. Su migración a src/config/messages.js es
 * la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de esta
 * feature visual — mismo criterio que MiFincaVivaHomeCard.jsx, FincaCards.jsx y
 * FincaRedInstitucional.jsx en este mismo directorio. */
import { useEffect, useMemo, useState } from 'react';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { buildFincaScene } from '../../services/fincaSceneService';
import { selectSceneVariant, SCENE_KINDS } from '../../services/fincaSceneProfileSelector';
import { getProfile } from '../../services/userProfileService';
import { tieneAccesoGlaciarActual } from '../../config/glaciarAccess';
import './finca-viva-hero.css';

/**
 * FincaVivaHero — el HOME INMERSIVO "Finca Viva" (PORTADO FIELMENTE del mockup
 * F2 v2 "Finca Viva Evolutiva"). La escena isométrica de TU finca ES la portada
 * del dashboard: lo PRIMERO que se ve al entrar. NO es una tarjeta debajo del
 * agente, y NO reusa el motor de escena del juego (FincaWorldScene) — el arte
 * sale del mockup F2, pixel a pixel.
 *
 * Estructura (1:1 con el mockup F2):
 *   - TOPBAR: la mano de Chagra + "Chagra · su finca viva" + pills (ayuda/perfil).
 *   - SELECTOR DE ESCALA: 3 chips Duolingo (Mi balcón / Invernadero / Mi finca).
 *     El chip ACTIVO lo decide el PERFIL real vía selectSceneVariant; tocar otro
 *     permite previsualizar esa escala (igual que el mockup).
 *   - CINTA DE MUNDO + TOGGLE de estado (recién empiezo / mi finca poblada). El
 *     estado por defecto lo decide el DATO REAL (buildFincaScene.vacia): finca
 *     vacía → "recién empiezo" inmersivo; con siembras → poblada.
 *   - ESCENA ISOMÉTRICA: 3 variantes (balcón urbano / invernadero / finca
 *     diversa), cada una con su estado poblado vs. recién-empieza. Animales SVG
 *     vivos (cerdo que se menea, gallina picotea, pato chapotea, vaca cola,
 *     abejas/mariposas). Sol que respira, nubes, prefers-reduced-motion.
 *   - GLOBO del agente colibrí flotando sobre la escena.
 *   - COMPOSITOR del agente (avatar + "Pregúntele a Chagra…" + 🎙️).
 *   - HERO TEXT: "SU AGENTE AGROECOLÓGICO" + título por escala.
 *   - 4 PORTALES como lugares: Gestionar · Aprender · Jugar · Agente.
 *
 * Se monta SOLO con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (lo decide
 * DashboardLive). Con la flag OFF el home conserva su portada actual (AgentHero).
 *
 * `children` (opcional) reemplaza la ESCENA de finca única por otra (la RED
 * institucional del extensionista usa este slot — el mismo shell F2, otra
 * escena). Si no se pasa `children`, dibuja la escena de la finca propia.
 *
 * Offline-first: lee los procesos reales de farmProcessCache (sin red). SVG
 * rsvg-safe, fuentes self-host (Baloo 2 + Nunito, font-src 'self' de la CSP),
 * animaciones que respetan prefers-reduced-motion. Español de Colombia
 * (tú/usted), sin voseo.
 *
 * @param {Object} props
 * @param {Function} [props.onNavigate]   navegación de la app.
 * @param {Function} [props.onOpenAgent]  abre el agente (globo + composer + portal).
 * @param {React.ReactNode} [props.children]  escena alterna (red institucional).
 * @param {string} [props.titulo]  título accesible (default "Mi finca viva").
 */
export default function FincaVivaHero({ onNavigate, onOpenAgent, children, titulo }) {
  const abrirAgente = () => {
    if (onOpenAgent) onOpenAgent();
    else onNavigate?.('agente');
  };

  // ── Datos reales de la finca (offline-first) ─────────────────────────────
  const [processes, setProcesses] = useState([]);
  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then((list) => { if (alive) setProcesses(Array.isArray(list) ? list : []); })
      .catch(() => { /* IDB falló: escena "recién empiezo" honesta, nunca inventada */ });
    return () => { alive = false; };
  }, []);

  const scene = useMemo(() => buildFincaScene({ processes }), [processes]);

  // Variante de escena por PERFIL (override duro urbano, invernadero, finca…).
  const variant = useMemo(() => {
    try {
      return selectSceneVariant(getProfile(), { esGuiaGlaciar: tieneAccesoGlaciarActual() });
    } catch (_) {
      return null;
    }
  }, []);

  // El mockup F2 tiene 3 escenas: balcon / invernadero / finca. Las variantes
  // ecológicas (restauracion/paramo) caen a la escena de finca diversa (su arte
  // dedicado es trabajo aparte). El kind del perfil elige el chip por defecto.
  const escalaPerfil = useMemo(() => {
    const k = variant?.kind;
    if (k === SCENE_KINDS.balcon) return 'balcon';
    if (k === SCENE_KINDS.invernadero) return 'invernadero';
    return 'finca';
  }, [variant]);

  // Chip de escala: el valor EFECTIVO es la escala del perfil, salvo que el
  // usuario haya elegido manualmente otra (override) para previsualizarla —
  // igual que el mockup F2. Guardamos SÓLO el override del usuario en estado
  // (no sincronizamos derivados con efectos: eso causa renders en cascada).
  const [escalaOverride, setEscalaOverride] = useState(null);
  const escala = escalaOverride ?? escalaPerfil;
  const setEscala = setEscalaOverride;

  // Estado poblada vs. recién-empieza: el valor por defecto es el DATO REAL
  // (finca vacía → recién empiezo); el toggle deja previsualizar el otro estado
  // como override explícito del usuario. Sin efectos de sincronización.
  const vacia = !!scene?.vacia;
  const estadoPorDefecto = vacia ? 'empieza' : 'poblada';
  const [estadoOverride, setEstadoOverride] = useState(null);
  const estado = estadoOverride ?? estadoPorDefecto;
  const setEstado = setEstadoOverride;
  const poblada = estado === 'poblada';

  const tieneFincaPropia = !children; // children = red institucional del extensionista.

  return (
    <section
      data-testid="finca-viva-hero"
      aria-label="Su finca viva"
      className="fvh"
    >
      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <div className="fvh-topbar">
        <div className="fvh-brand-mano">
          {/* La mano de Chagra (emblema, brote por yema) */}
          <svg width="27" height="27" viewBox="0 0 26 26" aria-hidden="true">
            <g fill="#2f6b3a">
              <path d="M13 23c-3.4-.2-6-2.6-6.2-6 0-1 .2-2.4.6-3.6.3-.9 1.4-.8 1.5.1l.3 2.3c.05.4.6.4.6 0V7.8c0-.7 1.1-.7 1.1 0v6.1c0 .35.5.35.5 0V6.4c0-.7 1.1-.7 1.1 0v7.5c0 .35.5.35.5 0V7.4c0-.7 1.1-.7 1.1 0v6.5c0 .35.5.35.5 0V8.9c0-.7 1.1-.7 1.1 0v5.9c.7-1 1.9-2.5 2.8-1.7.5.5.2 1.3-.3 2.2-1.4 2.6-1.5 3.4-1.6 4.5-.2 2.7-1.9 3.9-3.6 3.9z" />
            </g>
            <circle cx="13" cy="4.4" r="2.3" fill="#a3e635" />
          </svg>
        </div>
        <div className="fvh-brand-txt">
          <b>Chagra</b>
          <span>su finca viva</span>
        </div>
        <div className="fvh-top-pills">
          <button type="button" className="fvh-pill" title="Ayuda" aria-label="Ayuda">❔</button>
          <button
            type="button"
            className="fvh-pill"
            title="Perfil"
            aria-label="Perfil"
            onClick={() => onNavigate?.('perfil')}
          >
            🧑‍🌾
          </button>
        </div>
      </div>

      {/* ── SELECTOR DE ESCALA (chips) ─────────────────────────────────────── */}
      <div className="fvh-escala-chips" role="tablist" aria-label="Tamaño de su finca">
        {ESCALAS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={escala === e.id}
            className={`fvh-echip ${escala === e.id ? 'on' : ''}`}
            onClick={() => setEscala(e.id)}
          >
            <span className="ei" aria-hidden="true">{e.emoji}</span>{e.label}
          </button>
        ))}
      </div>

      {/* ── CINTA DE MUNDO + TOGGLE DE ESTADO ──────────────────────────────── */}
      <div className="fvh-mundo-row">
        <div className="fvh-mundo-cinta">
          <span className="dot" aria-hidden="true" />
          <span>{MUNDO_LABEL[escala]}</span>
        </div>
        <div className="fvh-estado-toggle" role="group" aria-label="Estado de la finca">
          <button
            type="button"
            className={!poblada ? 'on' : ''}
            onClick={() => setEstado('empieza')}
          >
            Recién empiezo
          </button>
          <button
            type="button"
            className={poblada ? 'on' : ''}
            onClick={() => setEstado('poblada')}
          >
            Mi finca poblada
          </button>
        </div>
      </div>

      {/* ── ESCENA ISOMÉTRICA (o slot institucional) ───────────────────────── */}
      <div className="fvh-escena">
        {/* globo del agente colibrí */}
        <button
          type="button"
          className="fvh-colibri-globo"
          onClick={abrirAgente}
          aria-label="Hablar con Chagra"
        >
          <b>{COLIBRI[escala][0]}</b>
          <small>
            {poblada
              ? COLIBRI[escala][1]
              : 'Su finca está empezando. Registre su primera siembra y la escena cobra vida.'}
          </small>
        </button>

        {tieneFincaPropia ? (
          <>
            {escala === 'balcon' && <SceneBalcon poblada={poblada} />}
            {escala === 'invernadero' && <SceneInvernadero poblada={poblada} />}
            {escala === 'finca' && <SceneFinca poblada={poblada} />}

            {/* criaturas vivas flotando (comunes; sólo si poblada) */}
            {poblada && (
              <div className="fvh-bichos" aria-hidden="true">
                <span className="fvh-bicho" style={{ left: '16%', top: '18%', animationDelay: '.1s' }}>🦋</span>
                <span className="fvh-bicho" style={{ left: '72%', top: '22%', fontSize: '18px', animationDelay: '1.1s' }}>🐦</span>
                <span className="fvh-bicho abeja" style={{ left: '42%', top: '30%', fontSize: '17px' }}>🐝</span>
              </div>
            )}
          </>
        ) : (
          <div className="fvh-institucional">{children}</div>
        )}
      </div>

      {/* ── COMPOSITOR DEL AGENTE ──────────────────────────────────────────── */}
      <div className="fvh-composer-wrap">
        <button
          type="button"
          className="fvh-composer"
          onClick={abrirAgente}
          data-testid="finca-viva-agent-fab"
          aria-label="Pregúntele a Chagra"
        >
          <span className="av" aria-hidden="true">🐦</span>
          <span className="ph">Pregúntele a Chagra…</span>
          <span className="mic" aria-hidden="true">🎙️</span>
        </button>
      </div>
      <div className="fvh-composer-hint">Toque 🎙️ y pregunte en voz alta — o escriba arriba</div>

      {/* ── HERO TEXT ──────────────────────────────────────────────────────── */}
      <div className="fvh-hero-saludo">
        <div className="h-small">SU AGENTE AGROECOLÓGICO</div>
        <h1 dangerouslySetInnerHTML={{ __html: HERO[escala][0] }} />
        <p>{HERO[escala][1]}</p>
      </div>

      {/* ── 4 PORTALES = LUGARES DE LA FINCA ───────────────────────────────── */}
      <div className="fvh-portales-tit">Lugares de su finca <span /></div>
      <nav className="fvh-portales" aria-label="Lugares de su finca" data-testid="finca-viva-portales">
        {buildPortales({ onNavigate, abrirAgente, scene, poblada, escala }).map((p) => (
          <button
            key={p.id}
            type="button"
            className={`fvh-portal ${p.clase}`}
            onClick={p.onClick}
            style={{ animationDelay: p.delay }}
            aria-label={`${p.titulo}: ${p.desc}`}
          >
            <span className="ir" aria-hidden="true">Entrar →</span>
            {p.placeSvg}
            <span className="fvh-p-nuevo">{p.badge}</span>
            <div className="p-head"><div className="p-emoji" aria-hidden="true">{p.emoji}</div><h3>{p.titulo}</h3></div>
            <p>{p.desc}</p>
          </button>
        ))}
      </nav>

      <div className="fvh-fill" />
      <p className="fvh-titulo-sr">{titulo || 'Mi finca viva'}</p>
    </section>
  );
}

// ── Catálogos de texto (1:1 con el mockup F2) ──────────────────────────────

const ESCALAS = [
  { id: 'balcon', emoji: '🪴', label: 'Mi balcón' },
  { id: 'invernadero', emoji: '🏭', label: 'Invernadero' },
  { id: 'finca', emoji: '🌄', label: 'Mi finca' },
];

const MUNDO_LABEL = {
  balcon: 'Mi balcón verde · ciudad',
  invernadero: 'Invernadero · monocultivo',
  finca: 'El bosque de comida · sol y templado',
};
const HERO = {
  balcon: [
    'Este es <em>su balcón vivo</em>.<br>¿Qué quiere hacer hoy?',
    'Pocas materas, mucho cuidado. Escríbame o toque un lugar; le hablo claro y con datos verificados.',
  ],
  invernadero: [
    'Estas son <em>sus 10.000 plantas</em>.<br>¿Qué quiere revisar?',
    'Monocultivo bajo control. Pregúnteme por riego, plagas o nutrición; respondo solo con datos verificados.',
  ],
  finca: [
    'Esta es <em>su finca viva</em>.<br>¿Qué quiere hacer hoy?',
    'Camine a un lugar de la finca, o escríbame abajo. Hablo claro y solo con datos verificados.',
  ],
};
const COLIBRI = {
  balcon: ['Buenas, soy Chagra 🌿', 'Su balcón está al día. Toque una matera o pregúnteme aquí abajo.'],
  invernadero: ['Buenas, soy Chagra 🌿', 'Sus hileras están bien. ¿Reviso riego o plagas? Pregúnteme abajo.'],
  finca: ['Buenas tardes, soy Chagra 🌿', 'Todo tranquilo en su finca. Toque un lugar para entrar, o pregúnteme aquí abajo.'],
};

/**
 * Los 4 portales/lugares del home F2. El badge de "Gestionar" refleja el DATO
 * REAL de la finca (0 siembras → "EMPIECE AQUÍ"; con siembras → resumen real).
 */
function buildPortales({ onNavigate, abrirAgente, scene, poblada, escala }) {
  const total = Number(scene?.totalCultivos) || 0;
  const animales = Array.isArray(scene?.animales) ? scene.animales.length : 0;
  let badgeGestionar;
  if (!poblada || total + animales === 0) {
    badgeGestionar = escala === 'balcon'
      ? 'EMPIECE AQUÍ · 0 materas'
      : escala === 'invernadero'
        ? 'EMPIECE AQUÍ · 0 trasplantes'
        : 'EMPIECE AQUÍ · 0 siembras';
  } else {
    const partes = [];
    if (total > 0) partes.push(total === 1 ? '1 siembra' : `${total} siembras`);
    if (animales > 0) partes.push('animales');
    badgeGestionar = partes.join(' · ') || 'Su finca';
  }

  return [
    {
      id: 'gestionar',
      titulo: 'Gestionar',
      desc: 'Registre y cuide sus siembras, zonas y animales.',
      emoji: '🌱',
      clase: 'p-gestionar',
      delay: '.1s',
      badge: badgeGestionar,
      placeSvg: <PlaceGestionar />,
      onClick: () => onNavigate?.('juego'),
    },
    {
      id: 'aprender',
      titulo: 'Aprender',
      desc: 'Suelo vivo, milpa, biopreparados, MIP y fenología.',
      emoji: '📚',
      clase: 'p-aprender',
      delay: '.18s',
      badge: '5 lecciones',
      placeSvg: <PlaceAprender />,
      onClick: () => onNavigate?.('aprende'),
    },
    {
      id: 'jugar',
      titulo: 'Jugar',
      desc: 'Haga crecer su finca y defiéndala jugando.',
      emoji: '🎮',
      clase: 'p-jugar',
      delay: '.26s',
      badge: 'Mi Finca Viva',
      placeSvg: <PlaceJugar />,
      onClick: () => onNavigate?.('juego'),
    },
    {
      id: 'agente',
      titulo: 'Agente',
      desc: 'Pregunte lo que sea: respuestas con su fuente.',
      emoji: '💬',
      clase: 'p-agente',
      delay: '.34s',
      badge: 'Voz y foto',
      placeSvg: <PlaceAgente />,
      onClick: () => abrirAgente(),
    },
  ];
}

// ── SVG de los 4 portales (place-svg), portados del mockup F2 ───────────────

function PlaceGestionar() {
  return (
    <svg className="place-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon points="90,46 150,80 90,114 30,80" fill="#3f7a4e" />
      <polygon points="90,46 150,80 90,82 30,80" fill="#4f9460" opacity=".7" />
      <g stroke="#2f6b3a" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85">
        <path d="M70 84 v-12" /><path d="M84 90 v-12" /><path d="M98 84 v-12" /><path d="M112 90 v-12" />
      </g>
      <g fill="#bef264"><circle cx="70" cy="70" r="4" /><circle cx="98" cy="70" r="4" /><circle cx="84" cy="76" r="4" /></g>
    </svg>
  );
}
function PlaceAprender() {
  return (
    <svg className="place-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon points="90,52 150,84 90,116 30,84" fill="#c47b2f" />
      <g transform="translate(90 60)">
        <polygon points="-22,18 0,6 22,18 22,30 -22,30" fill="#f0c878" />
        <polygon points="-26,18 0,4 26,18 0,18" fill="#a85d28" />
        <rect x="-6" y="20" width="12" height="10" fill="#7a5230" />
        <text x="0" y="0" fontSize="16" textAnchor="middle">📖</text>
      </g>
    </svg>
  );
}
function PlaceJugar() {
  return (
    <svg className="place-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon points="90,52 150,84 90,116 30,84" fill="#4f8fc0" />
      <polygon points="90,72 124,90 90,108 56,90" fill="#9fe3ee" opacity=".85" />
      <text x="90" y="98" fontSize="22" textAnchor="middle">🎮</text>
      <text x="48" y="74" fontSize="15">🐞</text><text x="120" y="80" fontSize="14">🦋</text>
    </svg>
  );
}
function PlaceAgente() {
  return (
    <svg className="place-svg" viewBox="0 0 180 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <polygon points="90,52 150,84 90,116 30,84" fill="#5d4db0" />
      <circle cx="90" cy="80" r="26" fill="#11281f" />
      <circle cx="90" cy="80" r="26" fill="none" stroke="#a3e635" strokeWidth="2.5" opacity=".8" />
      <text x="90" y="88" fontSize="26" textAnchor="middle">🐦</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ESCENAS ISOMÉTRICAS — portadas FIELMENTE del mockup F2 (un SVG por escala).
//  Cada escena tiene su estado poblada vs. recién-empieza.
// ════════════════════════════════════════════════════════════════════════════

/** VARIANTE A · BALCÓN URBANO (materas, baranda, ciudad de fondo). */
function SceneBalcon({ poblada }) {
  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid meet"
      aria-label="Su balcón urbano visto en isométrico: materas con tomate y aromáticas, baranda y la ciudad de fondo.">
      <defs>
        <linearGradient id="fvh-sky-balc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0e8" /><stop offset="1" stopColor="#dff0e3" />
        </linearGradient>
        <linearGradient id="fvh-city-balc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9c9cf" /><stop offset="1" stopColor="#9fb3bb" />
        </linearGradient>
        <radialGradient id="fvh-sun-balc" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#fff3c4" /><stop offset="70%" stopColor="#ffe08a" /><stop offset="100%" stopColor="#ffd24d" />
        </radialGradient>
        <pattern id="fvh-madera-balc" width="14" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-31)">
          <rect width="14" height="8" fill="#c8a06a" /><line x1="0" y1="0" x2="14" y2="0" stroke="#9c7642" strokeWidth="1" opacity=".5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-balc)" />
      {/* sol */}
      <g transform="translate(322 50)">
        <circle r="26" fill="#ffe08a" opacity=".35"><animate attributeName="r" values="26;30;26" dur="6s" repeatCount="indefinite" /></circle>
        <circle r="18" fill="url(#fvh-sun-balc)" />
      </g>
      {/* ciudad de fondo */}
      <g fill="url(#fvh-city-balc)" opacity=".9">
        <rect x="20" y="118" width="42" height="120" rx="3" />
        <rect x="70" y="92" width="36" height="146" rx="3" />
        <rect x="116" y="130" width="30" height="108" rx="3" />
        <rect x="250" y="104" width="40" height="134" rx="3" />
        <rect x="296" y="134" width="32" height="104" rx="3" />
        <rect x="334" y="110" width="36" height="128" rx="3" />
      </g>
      <g fill="#fff5cf" opacity=".75">
        <rect x="78" y="104" width="7" height="9" rx="1" /><rect x="90" y="104" width="7" height="9" rx="1" />
        <rect x="78" y="122" width="7" height="9" rx="1" /><rect x="90" y="122" width="7" height="9" rx="1" />
        <rect x="258" y="118" width="7" height="9" rx="1" /><rect x="270" y="118" width="7" height="9" rx="1" />
        <rect x="342" y="124" width="7" height="9" rx="1" /><rect x="354" y="124" width="7" height="9" rx="1" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;30 -6;0 0" dur="14s" repeatCount="indefinite" />
        <path d="M150 96 q6 -5 12 0 q6 -5 12 0" stroke="#3a4a52" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* PISO DEL BALCÓN */}
      <path d="M195 320 L70 252 L70 240 L195 308 L320 240 L320 252 Z" fill="#7a5230" />
      <polygon points="195,200 320,240 195,308 70,240" fill="url(#fvh-madera-balc)" stroke="#8a6038" strokeWidth="2" />
      <g stroke="#8a6038" strokeWidth="1.2" opacity=".5">
        <line x1="132" y1="220" x2="257" y2="264" /><line x1="116" y1="232" x2="241" y2="276" /><line x1="150" y1="208" x2="275" y2="252" />
      </g>

      {/* baranda */}
      <g className="fvh-rise" style={{ animationDelay: '.1s' }}>
        <polygon points="70,252 195,320 195,300 70,232" fill="#2f3b40" opacity=".18" />
        <g stroke="#52606a" strokeWidth="3.5" strokeLinecap="round">
          <path d="M84 258 v-30" /><path d="M108 271 v-30" /><path d="M132 284 v-30" /><path d="M156 296 v-30" /><path d="M180 309 v-30" />
        </g>
        <path d="M72 230 L196 298" stroke="#62707a" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g stroke="#52606a" strokeWidth="3.5" strokeLinecap="round" className="fvh-rise" style={{ animationDelay: '.1s' }}>
        <path d="M212 309 v-30" /><path d="M236 296 v-30" /><path d="M260 284 v-30" /><path d="M284 271 v-30" /><path d="M308 258 v-30" />
      </g>
      <path d="M196 298 L320 230" stroke="#62707a" strokeWidth="5" strokeLinecap="round" className="fvh-rise" style={{ animationDelay: '.1s' }} />

      {poblada ? (
        <g>
          {/* matera 1 · tomate */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.24s' }} transform="translate(150 250)">
            <path d="M-18 0 L0 10 L18 0 L18 14 L0 24 L-18 14 Z" fill="#c2562f" />
            <path d="M-18 0 L0 10 L18 0 L0 -8 Z" fill="#d9683c" />
            <ellipse cx="0" cy="-2" rx="14" ry="5" fill="#6e4a2a" />
            <g className="fvh-sway">
              <path d="M0 -2 V-40" stroke="#5a8f3a" strokeWidth="3" strokeLinecap="round" />
              <path d="M0 -14 q-10 -3 -14 -11" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 -26 q10 -3 14 -10" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M0 -36 q-9 -2 -12 -9" stroke="#4ca35c" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="6" cy="-22" r="4" fill="#ff5d44" /><circle cx="-7" cy="-30" r="3.5" fill="#ff7a59" />
              <circle cx="-2" cy="-12" r="3.5" fill="#ffd24d" />
            </g>
            <path d="M9 -4 L7 -42" stroke="#a8763e" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* matera 2 · aromáticas */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.34s' }} transform="translate(214 250)">
            <path d="M-16 0 L0 9 L16 0 L16 12 L0 21 L-16 12 Z" fill="#5f8c4e" />
            <path d="M-16 0 L0 9 L16 0 L0 -7 Z" fill="#6fa05c" />
            <ellipse cx="0" cy="-1" rx="12" ry="4" fill="#5a4329" />
            <g className="fvh-sway-slow" fill="#4ca35c">
              <circle cx="-6" cy="-9" r="5" /><circle cx="6" cy="-9" r="5" /><circle cx="0" cy="-15" r="5.5" />
              <circle cx="-3" cy="-7" r="3.5" fill="#6fc46f" /><circle cx="5" cy="-12" r="3" fill="#6fc46f" />
            </g>
          </g>
          {/* matera 3 · colgantes */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.42s' }} transform="translate(118 268) scale(.85)">
            <path d="M-14 0 L0 8 L14 0 L14 11 L0 19 L-14 11 Z" fill="#caa066" />
            <path d="M-14 0 L0 8 L14 0 L0 -6 Z" fill="#d8b277" />
            <g className="fvh-sway" fill="#5bb06e">
              <circle cx="-4" cy="-6" r="4" /><circle cx="5" cy="-6" r="4" /><circle cx="0" cy="-11" r="4.5" />
              <circle cx="-3" cy="-3" r="3" fill="#ff9ec4" />
            </g>
          </g>
          {/* regadera */}
          <g transform="translate(258 266)" className="fvh-rise" style={{ animationDelay: '.5s' }}>
            <ellipse cx="0" cy="6" rx="12" ry="5" fill="#3f7a8c" />
            <path d="M-12 6 V-4 a12 5 0 0 0 24 0 V6" fill="#4f97a8" />
            <path d="M12 -2 q10 -2 14 6" stroke="#3f7a8c" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          {/* gato del balcón */}
          <g transform="translate(95 246)" className="fvh-rise" style={{ animationDelay: '.6s' }}>
            <ellipse cx="0" cy="10" rx="13" ry="5" fill="#3a2a1c" opacity=".18" />
            <path d="M-10 8 q-2 -14 10 -14 q12 0 10 14 Z" fill="#9a9a9a" />
            <circle cx="6" cy="-9" r="7" fill="#9a9a9a" />
            <path d="M2 -14 l-2 -5 l5 3 Z" fill="#9a9a9a" /><path d="M10 -14 l2 -5 l-5 3 Z" fill="#9a9a9a" />
            <circle cx="4" cy="-9" r="1.3" fill="#1f2a18" /><circle cx="9" cy="-9" r="1.3" fill="#1f2a18" />
            <g className="fvh-an-trotecito"><path d="M-9 6 q-12 0 -12 -12" stroke="#9a9a9a" strokeWidth="5" fill="none" strokeLinecap="round" /></g>
          </g>
        </g>
      ) : (
        <g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.24s' }} transform="translate(160 252)">
            <path d="M-18 0 L0 10 L18 0 L18 14 L0 24 L-18 14 Z" fill="#c2562f" />
            <path d="M-18 0 L0 10 L18 0 L0 -8 Z" fill="#d9683c" />
            <ellipse cx="0" cy="-2" rx="14" ry="5" fill="#6e4a2a" />
            <g><path d="M0 -2 V-9" stroke="#5bb06e" strokeWidth="2.5" strokeLinecap="round" /><circle cx="0" cy="-11" r="3" fill="#7fc06f" /></g>
          </g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.34s' }} transform="translate(214 254)">
            <path d="M-16 0 L0 9 L16 0 L16 12 L0 21 L-16 12 Z" fill="#caa066" />
            <path d="M-16 0 L0 9 L16 0 L0 -7 Z" fill="#d8b277" />
            <ellipse cx="0" cy="-1" rx="12" ry="4" fill="#5a4329" />
          </g>
        </g>
      )}
    </svg>
  );
}

/** VARIANTE B · INVERNADERO (techo translúcido, hileras densas de tomate). */
function SceneInvernadero({ poblada }) {
  // Hileras densas (monocultivo) generadas como en el mockup (buildInvernadero).
  const hileras = useMemo(() => {
    const filas = [
      { x0: 96, y0: 222, n: 7 }, { x0: 128, y0: 206, n: 7 },
      { x0: 160, y0: 190, n: 7 }, { x0: 192, y0: 174, n: 7 },
    ];
    const dx = 16; const dy = 8.6;
    const out = [];
    filas.forEach((h, hi) => {
      for (let i = 0; i < h.n; i++) {
        out.push({
          key: `${hi}-${i}`,
          x: h.x0 + i * dx,
          y: h.y0 + i * dy,
          sway: (i + hi) % 2 === 0 ? 'fvh-sway' : 'fvh-sway-slow',
        });
      }
    });
    return out;
  }, []);

  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid meet"
      aria-label="Su invernadero visto en isométrico: techo translúcido y hileras densas de tomate en monocultivo, con líneas de riego. Diez mil plantas.">
      <defs>
        <linearGradient id="fvh-sky-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#90cce0" /><stop offset="1" stopColor="#d4ecd6" /></linearGradient>
        <linearGradient id="fvh-piso-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfae8a" /><stop offset="1" stopColor="#9a8a64" /></linearGradient>
        <linearGradient id="fvh-techo-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cdeef0" stopOpacity=".82" /><stop offset="1" stopColor="#a6dde2" stopOpacity=".5" /></linearGradient>
        <linearGradient id="fvh-hilera-inv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc06f" /><stop offset="1" stopColor="#3f8f4e" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-inv)" />
      <g transform="translate(326 48)"><circle r="22" fill="#ffe08a" opacity=".4" /><circle r="15" fill="#ffd24d" /></g>

      {poblada && (
        <g className="fvh-rise-svg" style={{ animationDelay: '.05s' }} transform="translate(195 64)">
          <rect x="-78" y="-22" width="156" height="44" rx="22" fill="#1f5d30" opacity=".94" />
          <text x="-46" y="9" fontSize="26" fontFamily="Baloo 2" fontWeight="800" fill="#bef264" textAnchor="middle">10.000</text>
          <text x="34" y="-2" fontSize="11" fontFamily="Nunito" fontWeight="800" fill="#fff" textAnchor="middle">plantas</text>
          <text x="34" y="11" fontSize="9.5" fontFamily="Nunito" fontWeight="700" fill="#d6ec8e" textAnchor="middle">de tomate</text>
        </g>
      )}

      {/* PISO del invernadero */}
      <path d="M195 330 L48 252 L48 238 L195 316 L342 238 L342 252 Z" fill="#7a6a44" />
      <polygon points="195,170 342,238 195,316 48,238" fill="url(#fvh-piso-inv)" stroke="#8a7a52" strokeWidth="2" />

      {poblada ? (
        <>
          {/* HILERAS densas de tomate */}
          <g className="fvh-rise" style={{ animationDelay: '.2s' }} strokeLinecap="round">
            <g>
              {hileras.map((m) => (
                <g key={m.key} transform={`translate(${m.x} ${m.y})`}>
                  <g className={m.sway}>
                    <path d="M0 0 V-18" stroke="#3f8f4e" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="0" cy="-18" r="5.5" fill="url(#fvh-hilera-inv)" />
                    <circle cx="-3" cy="-12" r="2" fill="#ff5d44" /><circle cx="3" cy="-8" r="2" fill="#ffd24d" />
                  </g>
                </g>
              ))}
            </g>
          </g>
          {/* líneas de riego */}
          <g className="fvh-rise" style={{ animationDelay: '.34s' }} stroke="#2b2b2b" strokeWidth="2.4" fill="none" opacity=".75">
            <path d="M96 222 L210 282" /><path d="M128 206 L242 266" /><path d="M160 190 L274 250" /><path d="M192 174 L306 234" />
          </g>
          <g fill="#4f9fc0" className="fvh-rise" style={{ animationDelay: '.4s' }}>
            <circle cx="120" cy="235" r="2" /><circle cx="152" cy="219" r="2" /><circle cx="184" cy="203" r="2" />
            <circle cx="166" cy="244" r="2" /><circle cx="198" cy="228" r="2" /><circle cx="230" cy="261" r="2" />
          </g>
        </>
      ) : (
        <g>
          <g stroke="#8a7a52" strokeWidth="2" opacity=".6">
            <path d="M96 222 L210 282" fill="none" /><path d="M128 206 L242 266" fill="none" />
            <path d="M160 190 L274 250" fill="none" /><path d="M192 174 L306 234" fill="none" />
          </g>
          <g transform="translate(195 250)">
            <rect x="-58" y="-12" width="116" height="24" rx="12" fill="#fff" opacity=".9" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#a8763e" textAnchor="middle">Surcos listos · 0 trasplantes</text>
          </g>
        </g>
      )}

      {/* estructura: arcos + techo translúcido */}
      <g className="fvh-rise" style={{ animationDelay: '.12s' }}>
        <g stroke="#cfd9d2" strokeWidth="4" strokeLinecap="round" opacity=".95">
          <path d="M56 244 V150" /><path d="M334 244 V150" /><path d="M195 316 V224" />
        </g>
        <path d="M56 150 Q195 96 334 150 L334 158 Q195 104 56 158 Z" fill="url(#fvh-techo-inv)" stroke="#bfe6ea" strokeWidth="2" />
        <path d="M56 150 Q195 96 334 150" fill="none" stroke="#dff4f5" strokeWidth="2" opacity=".8" />
        <g stroke="#cfe9ea" strokeWidth="1.5" opacity=".7" fill="none">
          <path d="M104 134 Q195 110 286 134" /><path d="M150 122 Q195 112 240 122" />
        </g>
        <polygon points="56,158 56,244 195,316 195,224" fill="#cdeef0" opacity=".22" />
        <polygon points="334,158 334,244 195,316 195,224" fill="#a6dde2" opacity=".18" />
      </g>

      {poblada && (
        <>
          <g className="fvh-bicho abeja" transform="translate(150 200)" aria-hidden="true" style={{ position: 'static' }}>
            <text fontSize="18">🐝</text>
          </g>
          <g className="fvh-rise-svg" style={{ animationDelay: '.5s' }} transform="translate(195 300)">
            <rect x="-66" y="-13" width="132" height="26" rx="13" fill="#fff" opacity=".92" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#2f6b3a" textAnchor="middle">Monocultivo · riego por goteo</text>
          </g>
        </>
      )}
    </svg>
  );
}

/**
 * VARIANTE C · FINCA DIVERSA (la isla rica). Cuando `poblada`, dibuja las
 * parcelas (milpa, hortaliza), el estanque con pato, el corral con cerdo y
 * gallina, la vaca, la colmena, el guamo de sombra y los arbolitos del mockup
 * F2. El estado vacío es la versión "recién empieza" (terreno listo · 0 siembras).
 */
function SceneFinca({ poblada }) {
  return (
    <svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid meet"
      aria-label="Su finca vista en isométrico: milpa, hortaliza, estanque con pato, corral con cerdo, gallina, vaca y abejas, y un guamo de sombra al centro.">
      <defs>
        <linearGradient id="fvh-sky-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ac3da" /><stop offset="1" stopColor="#c8e8cb" /></linearGradient>
        <linearGradient id="fvh-agua-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fe3ee" /><stop offset="1" stopColor="#5ab8d8" /></linearGradient>
        <linearGradient id="fvh-tile-suelo-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9bb45a" /><stop offset="1" stopColor="#6f8a3f" /></linearGradient>
        <linearGradient id="fvh-tile-verde-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fc06f" /><stop offset="1" stopColor="#4ca35c" /></linearGradient>
        <linearGradient id="fvh-tile-milpa-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8d96a" /><stop offset="1" stopColor="#9bbf48" /></linearGradient>
        <radialGradient id="fvh-sol-f" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#fff3c4" /><stop offset="70%" stopColor="#ffe08a" /><stop offset="100%" stopColor="#ffd24d" /></radialGradient>
        <pattern id="fvh-pasto-f" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M3 9 q1 -4 0 -6 M6 10 q0 -5 1 -7 M9 9 q-1 -4 0 -6" stroke="#5f8a3f" strokeWidth="1" fill="none" opacity=".45" strokeLinecap="round" />
        </pattern>
        <filter id="fvh-soft-f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>

      <rect x="0" y="0" width="390" height="360" fill="url(#fvh-sky-f)" />
      {/* sol (respira) */}
      <g transform="translate(322 52)">
        <circle r="30" fill="#ffe08a" opacity=".35"><animate attributeName="r" values="30;34;30" dur="6s" repeatCount="indefinite" /></circle>
        <circle r="20" fill="url(#fvh-sol-f)" />
      </g>
      {/* nubes */}
      <g fill="#ffffff" opacity=".9">
        <g><animateTransform attributeName="transform" type="translate" values="0 0;12 0;0 0" dur="20s" repeatCount="indefinite" />
          <ellipse cx="70" cy="42" rx="24" ry="12" /><ellipse cx="92" cy="38" rx="17" ry="12" /><ellipse cx="54" cy="38" rx="14" ry="10" /></g>
        <g opacity=".75"><animateTransform attributeName="transform" type="translate" values="0 0;-10 0;0 0" dur="26s" repeatCount="indefinite" />
          <ellipse cx="212" cy="32" rx="18" ry="9" /><ellipse cx="228" cy="29" rx="13" ry="9" /></g>
      </g>
      {/* colinas de fondo */}
      <path d="M0 158 Q100 122 200 150 T390 146 V210 H0 Z" fill="#6f9a52" opacity=".5" />
      <path d="M0 174 Q120 144 250 168 T390 164 V220 H0 Z" fill="#5f8a47" opacity=".55" />

      {/* PLATAFORMA ISO (la "isla" finca) */}
      <ellipse cx="195" cy="330" rx="150" ry="22" fill="#1c2418" opacity=".22" filter="url(#fvh-soft-f)" />
      <path d="M195 332 L40 244 L40 220 L195 308 L350 220 L350 244 Z" fill="#5e4626" />
      <path d="M195 332 L40 244 L40 220 L195 308 Z" fill="#4d3a1f" />
      <polygon points="195,148 350,220 195,308 40,220" fill="url(#fvh-tile-suelo-f)" />
      <polygon points="195,148 350,220 195,308 40,220" fill="url(#fvh-pasto-f)" />
      <g stroke="#5f8a3f" strokeWidth="1.4" opacity=".4">
        <line x1="118" y1="196" x2="272" y2="196" /><line x1="98" y1="218" x2="292" y2="218" /><line x1="118" y1="240" x2="272" y2="240" />
      </g>

      {poblada ? (
        <>
          {/* PARCELA milpa */}
          <g className="fvh-rise" style={{ animationDelay: '.15s' }}>
            <polygon points="118,188 178,216 130,244 70,216" fill="url(#fvh-tile-milpa-f)" stroke="#7da53a" strokeWidth="1.5" />
            <g className="fvh-sway" stroke="#3f8f4e" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M105 220 V204" /><path d="M105 208 q6 -3 9 -6" /><path d="M105 212 q-6 -3 -9 -5" />
              <path d="M125 226 V210" /><path d="M125 214 q6 -3 9 -6" />
              <path d="M118 204 V190" /><path d="M118 194 q-6 -3 -9 -5" />
            </g>
            <circle cx="118" cy="190" r="3" fill="#ffd24d" />
            <circle cx="92" cy="226" r="4.5" fill="#ff9d3c" /><circle cx="138" cy="236" r="4" fill="#ffb74d" />
          </g>

          {/* PARCELA hortaliza */}
          <g className="fvh-rise" style={{ animationDelay: '.28s' }}>
            <polygon points="262,188 322,216 262,244 202,216" fill="url(#fvh-tile-verde-f)" stroke="#3f8f4e" strokeWidth="1.5" />
            <g className="fvh-sway-slow" fill="#3f8f4e">
              <circle cx="240" cy="214" r="6" /><circle cx="262" cy="224" r="6.5" /><circle cx="284" cy="214" r="6" />
              <circle cx="252" cy="204" r="5" /><circle cx="274" cy="204" r="5" />
            </g>
            <g fill="#6fc46f"><circle cx="240" cy="212" r="3" /><circle cx="262" cy="221" r="3.5" /><circle cx="284" cy="212" r="3" /></g>
            <circle cx="253" cy="220" r="3" fill="#ff9ec4" />
          </g>

          {/* ESTANQUE con PATO */}
          <g className="fvh-rise" style={{ animationDelay: '.4s' }}>
            <polygon points="118,244 168,268 130,290 80,266" fill="url(#fvh-agua-f)" stroke="#4f9fc0" strokeWidth="1.5" />
            <g className="fvh-ripple" stroke="#fff" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round">
              <path d="M104 264 q8 -4 16 0" /><path d="M118 272 q8 -4 16 0" />
            </g>
            <g transform="translate(128 262)">
              <g className="fvh-an-chapotea">
                <ellipse cx="0" cy="6" rx="11" ry="4" fill="#1c2418" opacity=".18" />
                <path d="M-10 2 q0 -8 11 -8 q11 0 9 7 q-2 4 -10 4 q-8 0 -10 -3 Z" fill="#f4f4ef" />
                <circle cx="9" cy="-7" r="5" fill="#f4f4ef" />
                <circle cx="11" cy="-8" r="1.2" fill="#1f2a18" />
                <path d="M13 -7 l6 1 l-6 2 Z" fill="#ffb74d" />
                <path d="M-9 2 q-2 3 2 4" fill="none" stroke="#cfcfc6" strokeWidth="1.5" />
              </g>
            </g>
          </g>

          {/* CORRAL con CERDO + GALLINA */}
          <g className="fvh-rise" style={{ animationDelay: '.52s' }}>
            <polygon points="262,244 312,268 274,290 224,266" fill="#b89b6a" stroke="#8a6e44" strokeWidth="1.5" />
            <g stroke="#8a6e44" strokeWidth="2.2" strokeLinecap="round">
              <path d="M240 252 v-10" /><path d="M252 258 v-10" /><path d="M264 264 v-10" /><path d="M298 254 v-10" />
            </g>
            {/* cerdo (cuerpo que se menea) */}
            <g transform="translate(272 264)">
              <ellipse cx="0" cy="9" rx="16" ry="5" fill="#1c2418" opacity=".18" />
              <g className="fvh-an-menea">
                <ellipse cx="0" cy="0" rx="15" ry="10" fill="#f1a6b0" />
                <circle cx="13" cy="-2" r="7" fill="#f1a6b0" />
                <ellipse cx="18" cy="-1" rx="3.5" ry="3" fill="#e88a98" />
                <circle cx="17" cy="-2" r="1" fill="#7a3d48" /><circle cx="19" cy="-2" r="1" fill="#7a3d48" />
                <circle cx="11" cy="-7" r="1.2" fill="#3a2024" />
                <path d="M8 -9 l3 -5 l2 5 Z" fill="#e88a98" />
                <path d="M-14 2 q-7 2 -4 -3" stroke="#e88a98" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <rect x="-10" y="8" width="3" height="5" rx="1.5" fill="#e88a98" /><rect x="6" y="8" width="3" height="5" rx="1.5" fill="#e88a98" />
              </g>
            </g>
            {/* gallina (cabeza que picotea) */}
            <g transform="translate(244 256)">
              <ellipse cx="0" cy="7" rx="8" ry="3" fill="#1c2418" opacity=".18" />
              <ellipse cx="0" cy="0" rx="8" ry="6.5" fill="#f4ead0" />
              <path d="M-7 1 q-4 1 -2 -4" fill="#d8b277" />
              <g className="fvh-an-picotea">
                <circle cx="6" cy="-5" r="4" fill="#f4ead0" />
                <path d="M5 -8 q1 -4 3 -2 q-1 2 -3 2" fill="#e0532f" />
                <path d="M10 -5 l4 1 l-4 1 Z" fill="#ffb74d" />
                <circle cx="7" cy="-6" r="1" fill="#3a2024" />
              </g>
              <line x1="-2" y1="6" x2="-2" y2="10" stroke="#c79a4a" strokeWidth="1.4" /><line x1="3" y1="6" x2="3" y2="10" stroke="#c79a4a" strokeWidth="1.4" />
            </g>
          </g>

          {/* VACA con cola */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.6s' }} transform="translate(96 268)">
            <ellipse cx="0" cy="12" rx="20" ry="6" fill="#1c2418" opacity=".18" />
            <g className="fvh-an-cola"><path d="M-16 -4 q-10 6 -8 16" stroke="#d8c8b0" strokeWidth="2.6" fill="none" strokeLinecap="round" /><circle cx="-24" cy="13" r="2.5" fill="#7a5230" /></g>
            <ellipse cx="0" cy="0" rx="18" ry="11" fill="#f6efe4" />
            <ellipse cx="-7" cy="-2" rx="6" ry="5" fill="#a8763e" /><ellipse cx="8" cy="3" rx="5" ry="4" fill="#a8763e" />
            <circle cx="16" cy="-4" r="8" fill="#f6efe4" />
            <ellipse cx="20" cy="-2" rx="3.5" ry="3" fill="#f1c0c8" />
            <circle cx="14" cy="-7" r="1.2" fill="#2a1c14" />
            <path d="M11 -11 q-2 -4 2 -4" stroke="#cbb89c" strokeWidth="2.4" fill="none" /><path d="M22 -10 q3 -3 1 -5" stroke="#cbb89c" strokeWidth="2.4" fill="none" />
            <rect x="-12" y="9" width="3.5" height="7" rx="1.5" fill="#d8c8b0" /><rect x="8" y="9" width="3.5" height="7" rx="1.5" fill="#d8c8b0" />
          </g>

          {/* COLMENA */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.66s' }} transform="translate(300 252)">
            <rect x="-10" y="-2" width="20" height="16" rx="3" fill="#d9a441" />
            <rect x="-10" y="-2" width="20" height="5" rx="2" fill="#c98e30" />
            <rect x="-10" y="4" width="20" height="1.6" fill="#b07e2a" />
            <circle cx="0" cy="10" r="1.6" fill="#5e4022" />
            <polygon points="-12,-2 0,-9 12,-2" fill="#8a6e44" />
          </g>

          {/* GUAMO grande */}
          <g className="fvh-rise-svg" style={{ animationDelay: '.62s' }} transform="translate(195 272)">
            <ellipse cx="0" cy="34" rx="34" ry="8" fill="#1c2418" opacity=".2" />
            <g className="fvh-sway">
              <rect x="-5" y="-2" width="10" height="34" rx="4" fill="#7a5230" />
              <circle cx="0" cy="-22" r="27" fill="#2e6b3a" />
              <circle cx="-19" cy="-10" r="17" fill="#3f8f4e" />
              <circle cx="19" cy="-10" r="17" fill="#3f8f4e" />
              <circle cx="0" cy="-6" r="16" fill="#4ca35c" />
              <circle cx="-9" cy="-22" r="11" fill="#5bb06e" /><circle cx="9" cy="-16" r="10" fill="#5bb06e" />
              <circle cx="-8" cy="-28" r="3.5" fill="#ff7a59" /><circle cx="11" cy="-14" r="3.5" fill="#ffb74d" />
            </g>
          </g>

          {/* arbolitos laterales */}
          <g transform="translate(58 184) scale(.72)">
            <g className="fvh-sway-slow" style={{ animationDelay: '.7s' }}>
              <rect x="-4" y="0" width="8" height="24" rx="3" fill="#7a5230" />
              <ellipse cx="0" cy="-10" rx="15" ry="20" fill="#3f8f4e" /><ellipse cx="0" cy="-10" rx="8" ry="13" fill="#5bb06e" />
            </g>
          </g>
          <g transform="translate(332 184) scale(.68)">
            <g className="fvh-sway" style={{ animationDelay: '.8s' }}>
              <rect x="-4" y="0" width="8" height="24" rx="3" fill="#7a5230" />
              <circle cx="0" cy="-14" r="15" fill="#2e6b3a" /><circle cx="0" cy="0" r="13" fill="#4ca35c" />
            </g>
          </g>

          {/* sendero hacia el frente */}
          <path d="M195 308 L176 322 L214 322 Z" fill="#d8c39a" opacity=".8" />
        </>
      ) : (
        <g>
          <g stroke="#5f8a3f" strokeWidth="1.6" opacity=".5">
            <line x1="118" y1="196" x2="272" y2="196" /><line x1="98" y1="218" x2="292" y2="218" /><line x1="118" y1="240" x2="272" y2="240" />
          </g>
          <g transform="translate(195 224)">
            <ellipse cx="0" cy="6" rx="11" ry="6" fill="#8a6a3a" />
            <path d="M0 0 Q-5 -10 0 -18 Q5 -10 0 0" fill="#5bb06e" />
          </g>
          <g transform="translate(195 256)">
            <rect x="-62" y="-12" width="124" height="24" rx="12" fill="#fff" opacity=".9" />
            <text x="0" y="5" fontSize="11" fontFamily="Baloo 2" fontWeight="700" fill="#a8763e" textAnchor="middle">Terreno listo · 0 siembras</text>
          </g>
        </g>
      )}
    </svg>
  );
}
