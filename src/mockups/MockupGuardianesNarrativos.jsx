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
 * REUSO: los cuerpos de los guardianes YA NO se dibujan aquí — vienen de la
 * librería visual `src/visual/creatures` (personajes de fauna reutilizables).
 * Esta pantalla los consume en modo `inline` y solo aporta el ESCENARIO y la
 * coreografía de LLEGADA. Si mejora un bicho, mejórelo en la librería.
 *
 * TÉCNICA (catálogo 2026-07-10): SVG + CSS puros, cero deps; solo transform/
 * opacity animados (GPU, Android gama baja); glow feGaussianBlur+feMerge de la
 * familia GuardianEspiritu; acento que re-tiñe la escena (`--gn-acc`); transform
 * de posición en <g> externo y ENTRADA en el <g> de la criatura;
 * prefers-reduced-motion = fotograma final digno (los guardianes aparecen sin
 * volar). Datos de muestra.
 *
 * Voz: usted-cordial colombiano, frases cortas (sin voseo).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AbejaAngelita, Colibri, Lombriz, Mariposa, Escarabajo } from '../visual/creatures';
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

/* ─── filtros SVG del ESCENARIO — gradientes de agua/suelo. El glow de cada
   guardián lo aporta ahora su propio componente de `src/visual/creatures`. ─── */
function GnDefs() {
  return (
    <defs>
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

/* ─── GUARDIANES ILUSTRADOS — reusados de la librería `src/visual/creatures` ──
   Regla de la escena: transform de POSICIÓN en el <g> externo (lo pone el
   stage); la ENTRADA (`gn-anim-*`) viaja en el `className` de la criatura
   `inline`; la vida perpetua (aleteo, alas, bola) la trae la propia criatura. */
const CUERPO = {
  abeja: AbejaAngelita,
  colibri: Colibri,
  lombriz: Lombriz,
  mariposa: Mariposa,
  escarabajo: Escarabajo,
};

/* Coreografía de LLEGADA por guardián (definida en guardianes-narrativos.css). */
const ENTRADA = {
  abeja: 'gn-anim-flota',
  colibri: 'gn-anim-vuela',
  lombriz: 'gn-anim-sube',
  mariposa: 'gn-anim-mariposa',
  escarabajo: 'gn-anim-rueda',
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
  const Cuerpo = CUERPO[guardianId] || AbejaAngelita;
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
        <Cuerpo inline className={`gn-anim ${ENTRADA[guardianId]}`} />
      </g>
    </svg>
  );
}

export default function MockupGuardianesNarrativos({ onBack = () => {} }) {
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
