/*
 * MOCKUP — "Guardianes que aparecen" (#/mockups/guardianes-narrativos)
 * ---------------------------------------------------------------------------
 * Los guardianes de fauna de la chagra como PERSONAJES ILUSTRADOS que LLEGAN
 * contextualmente a la pantalla: la abeja angelita visita cuando el cultivo
 * florece, la lombriz sube cuando el suelo mejora, el colibrí vuelve tras la
 * lluvia, la mariposa ronda en cosecha, el escarabajo entierra el abono.
 *
 * HILO MÍTICO (muisca vivo, NO gamificación): Bachué —la Madre Agua que salió
 * de la laguna de Iguaque y pobló la tierra— manda a sus mensajeros. El agua es
 * el hilo que corre al pie de la escena. Sin puntos, sin logros, sin niveles:
 * los guardianes solo APARECEN cuando algo está pasando bien.
 *
 * GROUNDING: cada guardián es fauna REAL con binomio verificado (ver `fuente`).
 *   - Abeja angelita ....... Tetragonisca angustula (meliponino nativo, SIN aguijón — NO Apis)
 *   - Colibrí chillón ...... Colibri coruscans (colibrí nativo de jardines andinos)
 *   - Lombriz de tierra .... Martiodrilus crassus (lombriz gigante nativa de los Andes)
 *   - Mariposa pasionaria .. Dione juno (Nymphalidae, néctar de flores de la huerta)
 *   - Escarabajo estercolero Dichotomius belus (propio de Colombia, entierra el estiércol)
 *
 * TÉCNICA (catálogo 2026-07-10): SVG + CSS puros, cero deps; solo transform/
 * opacity animados (GPU, Android gama baja); glow feGaussianBlur+feMerge de la
 * familia GuardianEspiritu; acento que re-tiñe la escena (`--gn-acc`); transform
 * de posición en <g> externo y animación en <g> interno; prefers-reduced-motion
 * = fotograma final digno (los guardianes aparecen sin volar). Datos de muestra.
 *
 * Voz: usted-cordial colombiano, frases cortas (sin voseo).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import './guardianes-narrativos.css';

/* ─── ROSTER — fauna nativa REAL con binomio verificado ────────────────────── */
const GUARDIANES = {
  abeja: {
    nombre: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    acc: '#ffb54f', accRgb: '255, 181, 79',
    fuente: 'Meliponino nativo sin aguijón — polinizador de la chagra',
  },
  colibri: {
    nombre: 'Colibrí chillón',
    cientifico: 'Colibri coruscans',
    acc: '#2dffc4', accRgb: '45, 255, 196',
    fuente: 'Colibrí nativo de los Andes — visitante común de los jardines',
  },
  lombriz: {
    nombre: 'Lombriz de tierra',
    cientifico: 'Martiodrilus crassus',
    acc: '#ff9d6a', accRgb: '255, 157, 106',
    fuente: 'Lombriz gigante nativa de los Andes — ingeniera del suelo vivo',
  },
  mariposa: {
    nombre: 'Mariposa pasionaria',
    cientifico: 'Dione juno',
    acc: '#ff6ad0', accRgb: '255, 106, 208',
    fuente: 'Mariposa de alas largas — néctar de las flores de la huerta',
  },
  escarabajo: {
    nombre: 'Escarabajo estercolero',
    cientifico: 'Dichotomius belus',
    acc: '#9dd66a', accRgb: '157, 214, 106',
    fuente: 'Escarabajo del abono, propio de Colombia — entierra el estiércol',
  },
};

/* ─── ESTADOS DE MUESTRA — el contexto que hace LLEGAR a cada guardián ──────── */
const ESTADOS = [
  {
    id: 'floracion', guardian: 'abeja',
    chip: 'Floración', signo: 'Su cultivo está floreciendo',
    narrativa:
      'Vea, llegó la angelita. Eso quiere decir que su cultivo está floreciendo bien; ella va de flor en flor y le cuaja la cosecha.',
  },
  {
    id: 'suelo', guardian: 'lombriz',
    chip: 'Suelo mejorando', signo: 'La tierra va recobrando vida',
    narrativa:
      'La lombriz está trabajando su suelo. Cuando ella asoma, es que la tierra volvió a estar viva y aireada.',
  },
  {
    id: 'lluvia', guardian: 'colibri',
    chip: 'Después de la lluvia', signo: 'Escampó sobre la finca',
    narrativa:
      'Escampó y salió el colibrí a las flores nuevas. El agua que dejó Bachué despertó el néctar de su huerta.',
  },
  {
    id: 'cosecha', guardian: 'mariposa',
    chip: 'Cosecha', signo: 'Su cultivo está para cosechar',
    narrativa:
      'La mariposa ronda su cultivo maduro. Donde ella baila hay flores sanas y frutos que ya vienen.',
  },
  {
    id: 'abono', guardian: 'escarabajo',
    chip: 'Abonó la tierra', signo: 'Echó estiércol al cultivo',
    narrativa:
      'Llegó el escarabajo. Él entierra el abono por usted y le afloja la tierra sin herramienta.',
  },
];

const estadoById = (id) => ESTADOS.find((e) => e.id === id) || ESTADOS[0];

/* ─── filtros SVG compartidos (glow + blur suave) — familia GuardianEspiritu ── */
function GnDefs() {
  return (
    <defs>
      <filter id="gn-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.1" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="gn-blur3"><feGaussianBlur stdDeviation="3" /></filter>
      <linearGradient id="gn-agua-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4fd8ff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#2b7fbf" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="gn-suelo-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a2c22" />
        <stop offset="1" stopColor="#1a120d" />
      </linearGradient>
    </defs>
  );
}

/* ─── GUARDIANES ILUSTRADOS ─────────────────────────────────────────────────
   Regla de la casa: transform de POSICIÓN en el <g> externo (lo pone el stage);
   la ENTRADA en el <g> `.gn-anim`; la vida perpetua (aleteo) en el <g> interno. */

/* Abeja angelita — cuerpo ámbar rayado, alitas de tul (Tetragonisca angustula) */
function GuardianAbeja() {
  return (
    <g className="gn-anim gn-anim-flota">
      <g filter="url(#gn-glow)">
        <circle r="6" fill="#ffb54f" opacity="0.35" filter="url(#gn-blur3)" />
        <ellipse cx="0" cy="0" rx="8.5" ry="5.4" fill="#ffb54f"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,181,79,0.9))' }} />
        <path d="M-3.2,-4.9 L-3.2,4.9 M0.8,-5.2 L0.8,5.2 M4.4,-4.2 L4.4,4.2"
          stroke="#3a2410" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8.2" cy="-0.8" r="3.4" fill="#ffd76a" />
        <circle cx="9.3" cy="-1.6" r="0.9" fill="#04160f" />
        <path d="M11,-2.4 C12.4,-3.4 13.7,-3.4 14.7,-2.6" stroke="#3a2410" strokeWidth="0.7" fill="none" strokeLinecap="round" />
        <ellipse className="gn-ala" cx="-1.8" cy="-7" rx="6" ry="3.6" fill="#bfeaff" opacity="0.6" />
        <ellipse className="gn-ala" style={{ animationDelay: '-0.07s' }} cx="2.2" cy="-6.4" rx="4.6" ry="2.8" fill="#eafff6" opacity="0.5" />
      </g>
    </g>
  );
}

/* Colibrí chillón — pico largo, garganta violeta, ala que bate (Colibri coruscans) */
function GuardianColibri() {
  return (
    <g className="gn-anim gn-anim-vuela">
      <g filter="url(#gn-glow)">
        <circle r="6" fill="#2dffc4" opacity="0.35" filter="url(#gn-blur3)" />
        {/* cola */}
        <path d="M-6,0.5 L-18,-3.5 L-13,0.5 L-18,4.5 Z" fill="#1f9f86" />
        {/* cuerpo */}
        <path d="M-7,0 C-1,-6.5 10,-6 14,-1.2 C16.6,1 16.6,3.2 14,4.8 C8.5,8.2 -0.5,7.8 -7,1.4 Z" fill="#2dffc4" />
        <path d="M-4,3 C3,5.2 10,5 14,2.6 C10,7 1.5,7.2 -5,2.2 Z" fill="#bfffe9" opacity="0.7" />
        {/* cabeza */}
        <circle cx="12.4" cy="-2.2" r="4.2" fill="#3be8a6" />
        {/* garganta violeta iridiscente del chillón */}
        <path d="M11.4,0.4 C12.8,2.6 14.6,2.6 15.8,0.6 C14.6,3 11.8,3 11.4,0.4 Z" fill="#b28dff" opacity="0.9" />
        <circle cx="13.6" cy="-2.8" r="1.2" fill="#04160f" />
        <circle cx="14" cy="-3.2" r="0.4" fill="#eafff6" />
        {/* pico largo y recto */}
        <path d="M16.2,-1.8 C21.5,-2.4 26,-3.1 30.4,-4.4" stroke="#eafff6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* alas que baten */}
        <path className="gn-ala" d="M4,-1.6 C-4.5,-16 10.5,-23.5 17.5,-14 C14.8,-5.6 8.2,-1.6 4,-1.6 Z" fill="#4fd8ff" opacity="0.8" />
        <path className="gn-ala" style={{ animationDelay: '-0.05s' }} d="M5.6,1.8 C0,13.2 13.4,17.8 17.5,10 C14.2,4.2 9.6,1.8 5.6,1.8 Z" fill="#2dffc4" opacity="0.45" />
      </g>
    </g>
  );
}

/* Lombriz de tierra — cuerpo segmentado que ASOMA del suelo (Martiodrilus crassus) */
function GuardianLombriz() {
  return (
    <g className="gn-anim gn-anim-sube">
      <g filter="url(#gn-glow)">
        {/* cuerpo curvo segmentado que sube */}
        <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9"
          fill="none" stroke="#c0715a" strokeWidth="7.4" strokeLinecap="round" />
        <path d="M0,26 C-2,14 6,10 4,0 C2.5,-7 8,-11 12,-9"
          fill="none" stroke="#ff9d6a" strokeWidth="4.4" strokeLinecap="round" opacity="0.85" />
        {/* anillos / segmentos */}
        <g stroke="#7a3f2e" strokeWidth="0.9" opacity="0.65" strokeLinecap="round">
          <path d="M-1.4,22 L1.4,20.5" /><path d="M-1.2,16.5 L2.2,15.5" />
          <path d="M2.4,11.5 L5.6,11" /><path d="M3.4,5.5 L6.4,5.6" />
          <path d="M2.8,-0.5 L5.6,-1.4" /><path d="M4.6,-6 L7.4,-7.6" />
        </g>
        {/* clitelo (banda clara característica) */}
        <path d="M3.2,3 C2,-1 4,-4 6.6,-5" fill="none" stroke="#ffd9b0" strokeWidth="4.6" strokeLinecap="round" opacity="0.75" />
        {/* cabecita */}
        <circle cx="12.2" cy="-9.4" r="2.2" fill="#ff9d6a" />
        <circle cx="13.2" cy="-10" r="0.6" fill="#3a1c12" opacity="0.7" />
      </g>
    </g>
  );
}

/* Mariposa pasionaria — alas que abren y cierran (Dione juno) */
function GuardianMariposa() {
  return (
    <g className="gn-anim gn-anim-mariposa">
      <g filter="url(#gn-glow)">
        {/* ala trasera izq/der */}
        <g className="gn-mari-ala gn-mari-ala-izq">
          <path d="M0,2 C-13,4 -18,12 -12,15 C-6,17 -1,10 0,4 Z" fill="#d24a1e" opacity="0.9" />
          <circle cx="-9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7" />
        </g>
        <g className="gn-mari-ala gn-mari-ala-der">
          <path d="M0,2 C13,4 18,12 12,15 C6,17 1,10 0,4 Z" fill="#d24a1e" opacity="0.9" />
          <circle cx="9" cy="11" r="1.3" fill="#2a0f06" opacity="0.7" />
        </g>
        {/* ala delantera izq/der (alas largas de Dione) */}
        <g className="gn-mari-ala gn-mari-ala-izq">
          <path d="M0,-2 C-16,-11 -24,-6 -22,0 C-20,5 -8,3 0,1 Z" fill="#ff6ad0" opacity="0.92" />
          <path d="M-20,-3 C-14,-2 -7,-1 -1,0" fill="none" stroke="#eafff6" strokeWidth="0.8" opacity="0.6" />
          <circle cx="-16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85" />
        </g>
        <g className="gn-mari-ala gn-mari-ala-der">
          <path d="M0,-2 C16,-11 24,-6 22,0 C20,5 8,3 0,1 Z" fill="#ff6ad0" opacity="0.92" />
          <path d="M20,-3 C14,-2 7,-1 1,0" fill="none" stroke="#eafff6" strokeWidth="0.8" opacity="0.6" />
          <circle cx="16" cy="-4" r="1.1" fill="#eafff6" opacity="0.85" />
        </g>
        {/* cuerpo + antenas */}
        <ellipse cx="0" cy="2" rx="1.7" ry="9" fill="#2a1712" />
        <circle cx="0" cy="-8" r="1.9" fill="#2a1712" />
        <path d="M-0.8,-9.4 C-3,-13 -4.5,-14 -6,-13.6 M0.8,-9.4 C3,-13 4.5,-14 6,-13.6"
          stroke="#2a1712" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <circle cx="-6" cy="-13.6" r="0.9" fill="#ff6ad0" />
        <circle cx="6" cy="-13.6" r="0.9" fill="#ff6ad0" />
      </g>
    </g>
  );
}

/* Escarabajo estercolero — cuerpo negro brillante que rueda su bola (Dichotomius belus) */
function GuardianEscarabajo() {
  return (
    <g className="gn-anim gn-anim-rueda">
      {/* bola de abono que empuja (rueda) */}
      <g className="gn-bola">
        <circle cx="-13" cy="7" r="6.5" fill="#5a4230" />
        <circle cx="-13" cy="7" r="6.5" fill="none" stroke="#3a2c1c" strokeWidth="1" />
        <circle cx="-15" cy="5" r="1.5" fill="#6e5238" opacity="0.7" />
        <circle cx="-11.5" cy="9" r="1.1" fill="#42301f" opacity="0.7" />
      </g>
      <g filter="url(#gn-glow)">
        {/* patas que se mueven */}
        <g className="gn-patas" stroke="#0c1206" strokeWidth="1.7" strokeLinecap="round">
          <path d="M-4,4 L-9,10" /><path d="M0,5 L-1,11" /><path d="M4,4 L8,10" />
        </g>
        {/* élitros brillantes */}
        <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="#141c10"
          style={{ filter: 'drop-shadow(0 0 5px rgba(157,214,106,0.7))' }} />
        <ellipse cx="0" cy="0" rx="9" ry="6.4" fill="none" stroke="#9dd66a" strokeWidth="0.7" strokeOpacity="0.6" />
        {/* sutura + brillo */}
        <path d="M0,-5.6 L0,5.6" stroke="#0c1206" strokeWidth="0.8" />
        <ellipse cx="-3.5" cy="-2.8" rx="2.6" ry="1.4" fill="#3d5a24" opacity="0.55" />
        {/* cabeza + cuerno (Dichotomius) */}
        <path d="M8,-3.4 C12,-3.8 13.4,-1 12.4,1.4 C11.4,3.6 9,3.6 8.2,2.6 C9.4,1 9.2,-1.4 8,-3.4 Z" fill="#0f150b" />
        <path d="M11.2,-3.2 C12.6,-5 13.4,-4.4 13.2,-2.8" fill="none" stroke="#0f150b" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10.4" cy="-0.6" r="0.7" fill="#9dd66a" opacity="0.8" />
      </g>
    </g>
  );
}

const CUERPO = {
  abeja: GuardianAbeja,
  colibri: GuardianColibri,
  lombriz: GuardianLombriz,
  mariposa: GuardianMariposa,
  escarabajo: GuardianEscarabajo,
};

/* Posición del guardián dentro del stage (viewBox 0 0 340 210). El colibrí y la
   abeja llegan a las flores (alto); lombriz y escarabajo a la línea de suelo. */
const POS = {
  abeja: 'translate(232 74)',
  colibri: 'translate(120 66)',
  lombriz: 'translate(168 150)',
  mariposa: 'translate(214 70)',
  escarabajo: 'translate(150 150)',
};

/* ─── El STAGE: pequeña finca de noche con corte de suelo + hilo de agua ─────── */
function Escena({ guardianId, keyTick }) {
  const Cuerpo = CUERPO[guardianId] || GuardianAbeja;
  return (
    <svg className="gn-svg" viewBox="0 0 340 210" role="img"
      aria-label={`Escena: llegó ${GUARDIANES[guardianId].nombre}`}>
      <GnDefs />
      {/* cielo/velo de la escena */}
      <rect x="0" y="0" width="340" height="210" fill="#0a1420" />
      {/* luna tenue */}
      <circle cx="286" cy="34" r="13" fill="#eafff6" opacity="0.14" />
      <circle cx="286" cy="34" r="8.5" fill="#eafff6" opacity="0.12" />
      {/* estrellas */}
      <g fill="#eafff6" opacity="0.5">
        <circle cx="40" cy="30" r="1" /><circle cx="90" cy="20" r="0.8" />
        <circle cx="150" cy="34" r="0.7" /><circle cx="210" cy="24" r="0.9" />
        <circle cx="250" cy="46" r="0.7" /><circle cx="316" cy="60" r="0.8" />
      </g>
      {/* flores (contexto de los polinizadores) */}
      <g stroke="#2f6e5a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M60,166 C58,140 66,128 62,112" />
        <path d="M264,166 C266,142 258,130 262,116" />
      </g>
      <g>
        <circle cx="62" cy="110" r="4.2" fill="#ff6ad0" opacity="0.85" />
        <circle cx="62" cy="110" r="1.6" fill="#ffd76a" />
        <circle cx="262" cy="114" r="4.2" fill="#b28dff" opacity="0.85" />
        <circle cx="262" cy="114" r="1.6" fill="#ffd76a" />
      </g>
      {/* corte de suelo */}
      <path d="M0,168 C60,162 120,166 180,164 C240,162 300,166 340,164 L340,210 L0,210 Z"
        fill="url(#gn-suelo-grad)" />
      <path d="M0,168 C60,162 120,166 180,164 C240,162 300,166 340,164"
        fill="none" stroke="#4a3728" strokeWidth="1.4" opacity="0.7" />
      {/* raicillas + micelio tenue en el suelo */}
      <g stroke="#6e5238" strokeWidth="0.7" opacity="0.4" fill="none">
        <path d="M40,172 C42,180 38,186 44,192" /><path d="M110,174 C112,182 108,188 114,196" />
        <path d="M300,172 C298,182 304,188 300,196" />
      </g>
      {/* EL HILO DE AGUA DE BACHUÉ — corre al pie de la escena (Madre Agua) */}
      <g className="gn-agua" aria-hidden="true">
        <path d="M-10,202 C40,198 80,206 130,201 C180,196 220,206 270,201 C310,197 340,203 350,201 L350,212 L-10,212 Z"
          fill="url(#gn-agua-grad)" />
        <path className="gn-agua-brillo" d="M-10,200 C40,196 80,204 130,199 C180,194 220,204 270,199 C310,195 340,201 350,199"
          fill="none" stroke="#bfeaff" strokeWidth="1" opacity="0.5" />
      </g>
      {/* halo de llegada (re-teñido por el guardián) */}
      <g key={`halo-${keyTick}`} transform={POS[guardianId]}>
        <circle className="gn-halo" r="10" fill="none" stroke="var(--gn-acc)" strokeWidth="1.4" opacity="0.7" />
      </g>
      {/* EL GUARDIÁN — remonta con key para re-disparar su entrada */}
      <g key={`g-${keyTick}`} transform={POS[guardianId]}>
        <Cuerpo />
      </g>
    </svg>
  );
}

export default function MockupGuardianesNarrativos({ onBack = null }) {
  const [estadoId, setEstadoId] = useState(ESTADOS[0].id);
  const [saliendo, setSaliendo] = useState(false);
  const [keyTick, setKeyTick] = useState(0); // fuerza remonte → re-dispara la entrada
  const [auto, setAuto] = useState(false);
  const timers = useRef([]);

  const estado = estadoById(estadoId);
  const guardian = GUARDIANES[estado.guardian];

  const limpiar = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  // Cambio de guardián: el actual se DESPIDE (fade + deriva) y el nuevo LLEGA.
  const irA = useCallback((next) => {
    if (next === estadoId) return;
    setSaliendo(true);
    const t = setTimeout(() => {
      setEstadoId(next);
      setSaliendo(false);
      setKeyTick((k) => k + 1);
    }, 340);
    timers.current.push(t);
  }, [estadoId]);

  // "Que lleguen solos": ciclo suave que muestra la aparición contextual.
  useEffect(() => {
    if (!auto) return undefined;
    const orden = ESTADOS.map((e) => e.id);
    const paso = () => {
      setEstadoId((cur) => {
        const idx = orden.indexOf(cur);
        return orden[(idx + 1) % orden.length];
      });
      setKeyTick((k) => k + 1);
    };
    const iv = setInterval(paso, 4200);
    return () => clearInterval(iv);
  }, [auto]);

  useEffect(() => limpiar, []);

  return (
    <div
      className="gn-wrap"
      style={{ '--gn-acc': guardian.acc, '--gn-acc-rgb': guardian.accRgb }}
      data-guardian={estado.guardian}
    >
      <header className="gn-top">
        <button type="button" className="gn-back" onClick={() => onBack && onBack()} aria-label="Volver">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="gn-top-txt">
          <span className="gn-kicker">GUARDIANES QUE LLEGAN</span>
          <span className="gn-top-sub">Mockup · datos de muestra</span>
        </div>
      </header>

      {/* HILO MÍTICO — Bachué, la Madre Agua */}
      <p className="gn-mito">
        Bachué, la Madre Agua, manda sus mensajeros a su chagra. Cuando aparecen, es que algo está pasando bien.
      </p>

      {/* LA ESCENA donde el guardián aparece */}
      <section className={`gn-stage ${saliendo ? 'saliendo' : 'entrando'}`} aria-live="polite">
        <Escena guardianId={estado.guardian} keyTick={keyTick} />

        {/* micro-narrativa que sube suave con el guardián */}
        <div key={`n-${keyTick}`} className="gn-narrativa">
          <div className="gn-narra-head">
            <span className="gn-narra-nombre">{guardian.nombre}</span>
            <span className="gn-narra-cientifico">{guardian.cientifico}</span>
          </div>
          <p className="gn-narra-frase">{estado.narrativa}</p>
          <span className="gn-narra-fuente">{guardian.fuente}</span>
        </div>
      </section>

      {/* SELECTOR de estado — el contexto que hace llegar a cada guardián */}
      <div className="gn-selector" role="radiogroup" aria-label="Estado de la finca">
        <span className="gn-selector-label">¿Qué está pasando en su finca?</span>
        <div className="gn-chips">
          {ESTADOS.map((e) => {
            const on = e.id === estadoId;
            const g = GUARDIANES[e.guardian];
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`gn-chip ${on ? 'on' : ''}`}
                style={{ '--gn-chip-acc': g.acc, '--gn-chip-acc-rgb': g.accRgb }}
                onClick={() => irA(e.id)}
              >
                <span className="gn-chip-signo">{e.chip}</span>
                <span className="gn-chip-quien">{g.nombre}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`gn-auto ${auto ? 'on' : ''}`}
          aria-pressed={auto}
          onClick={() => setAuto((v) => !v)}
        >
          {auto ? 'Dejando que lleguen solos…' : 'Dejar que lleguen solos'}
        </button>
      </div>
    </div>
  );
}
