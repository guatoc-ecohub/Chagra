/**
 * UmbralValle — LA PUERTA GRANDE del home al VALLE 3D (portada finca-viva).
 *
 * Encargo del operador (FABLE_50 §A6 + dirección "home máximo" 2026-07-16):
 * la portada necesita una escena de entrada MÁGICA y un paso home→valle que
 * se sienta de juego, no un hash que corta en seco. Este componente es las
 * dos cosas a la vez: una VISTA VIVA del valle andino (la misma familia
 * visual del valle 3D aprobado) que además ES la puerta — tocarla inunda la
 * pantalla con la luz del cielo de la hora y aterriza en `valle3d`.
 *
 * POR QUÉ SE VE COMO SE VE (cero color inventado):
 *   · El CIELO y la luz salen de CLIMAS (valleData) vía useCicloDia — la
 *     MISMA fuente que pinta el valle 3D y su placeholder CargandoValle.
 *     Eso hace la transición casi invisible: el velo con que cubrimos la
 *     pantalla es el mismo gradiente con que el valle recibe.
 *   · Las montañas son los 4 PISOS TÉRMICOS del valle (PISOS_TERMICOS de
 *     valleData: cálido → templado → frío → páramo) con perspectiva
 *     atmosférica real: a más lejos, más mezcla con el color de la niebla
 *     de la franja (mezclaHex de cielosHoraData, aritmética pura).
 *   · La casa campesina usa los tokens CASA de la paleta madre (encalado,
 *     zócalo, teja, ventana cálida) — es la MISMA casa-ancla del valle.
 *   · El colibrí es el BARBUDITO ilustrado (Barbudito.jsx), la criatura
 *     insignia, sobrevolando el umbral como guía.
 *
 * PERF (Android barato, es la portada): DOM + SVG + CSS puros — CERO three,
 * cero imágenes, cero blur. Animaciones solo transform/opacity, apagadas con
 * prefers-reduced-motion. El chunk de la entrada 3D se PRECARGA al tocar
 * (import() fire-and-forget) para que el swap bajo el velo no muestre carga.
 *
 * NAVEGACIÓN: `onNavigate('valle3d')` — la vista existe en el shell clásico
 * (App.jsx case 'valle3d') y en prod (rutasProdChagraApp). Sin la prop, cae
 * al evento global `chagraNavigate` que ambos shells escuchan.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { useCallback, useMemo, useState } from 'react';
import useCicloDia from '../../visual/mundo3d/useCicloDia.js';
import { mezclaHex } from '../../visual/mundo3d/cielosHoraData.js';
import { CLIMAS } from '../../mockups/valle/valleData';
import { BarbuditoIlustrado } from '../colibri/Barbudito';
import './umbral-valle.css';

/* ── Paleta madre (hex citados de paletaMadre.js / valleData.js; el barrel
      src/visual/mundo3d/paleta arrastra three vía atmosferaMadre, así que en
      el home DOM se citan los valores con su fuente — no se inventa color). */
const PISO = {
  calido: '#84a83f', // valleData PISOS_TERMICOS.calido (VERDES.calidoVivo)
  templado: '#4e9143', // PISOS_TERMICOS.templado (VERDES.templadoVivo)
  frio: '#3c7f64', // PISOS_TERMICOS.frio (VERDES.frioVivo)
  paramo: '#a5975c', // EJE_TERMICO paramo (TIERRAS.pajonal)
};
const CASA = {
  encalado: '#f3ecdc',
  zocalo: '#a35a3c',
  teja: '#b0603f',
  tejaSombra: '#8f4b31',
  madera: '#6b4a2e',
  ventana: '#ffd9a0',
  carpinteria: '#44685a',
}; // paletaMadre.CASA — la casa campesina canónica del valle
const CAMINO = '#8a6a44'; // TIERRAS.camino
const MONTE = '#3f6f3a'; // VERDES.monte (copa en sombra)
const TINTA = '#2c241c'; // tinta rubber-hose cálida (fauna tokens)

/* Sombra nocturna del terreno: índigo del keyframe noche de la bóveda
   (cielosHoraData noche '#26325a'), NO un negro plano. */
const NOCHE_TIERRA = '#22304f';
const SOMBRA_CREPUSCULO = '#4a3450';

/* Cuánto se oscurece el terreno por franja (el día no se toca). */
const OSCURECER = {
  amanecer: { hacia: SOMBRA_CREPUSCULO, t: 0.22 },
  atardecer: { hacia: SOMBRA_CREPUSCULO, t: 0.28 },
  noche: { hacia: NOCHE_TIERRA, t: 0.58 },
};

/* Posición del sol/la luna en el lienzo (viewBox 360×210) por franja: el arco
   del día de oriente (derecha) a occidente (izquierda), como CLIMAS.sol. */
const ASTRO = {
  amanecer: { cx: 306, cy: 86, r: 17 },
  manana: { cx: 264, cy: 58, r: 15 },
  mediodia: { cx: 180, cy: 34, r: 14 },
  tarde: { cx: 104, cy: 54, r: 15 },
  atardecer: { cx: 54, cy: 88, r: 18 },
  noche: { cx: 288, cy: 44, r: 12 },
};

/* Estrellas fijas (x, y, radio) — pocas y bien puestas, no confeti. */
const ESTRELLAS = [
  [22, 26, 1.4], [58, 14, 1], [96, 38, 1.2], [140, 18, 1], [172, 46, 1.3],
  [214, 12, 1], [246, 34, 1.4], [312, 22, 1], [338, 44, 1.2], [76, 58, 1],
];

/* Luciérnagas (posición base; el vuelo lo hace el CSS). */
const LUCIERNAGAS = [
  [96, 168], [150, 182], [228, 172], [296, 184],
];

/**
 * @param {Object} props
 * @param {(view: string, data?: any) => void} [props.onNavigate] navegación
 *   real de la app (DashboardLive la pasa). Sin ella, cae al evento global.
 */
export default function UmbralValle({ onNavigate }) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  /* La franja REAL del día (amanecer→noche) — el mismo reloj del valle 3D. */
  const { franja } = useCicloDia({ reducedMotion });
  const clima = CLIMAS[franja] || CLIMAS.tarde;

  /* Colores derivados de la franja (mezclas puras, memoizadas). */
  const v = useMemo(() => {
    const osc = OSCURECER[franja] || null;
    const tinte = (hex, lejosT) => {
      /* perspectiva atmosférica: lejos = más niebla de la franja */
      let c = mezclaHex(hex, clima.niebla, lejosT);
      if (osc) c = mezclaHex(c, osc.hacia, osc.t);
      return c;
    };
    const esNoche = franja === 'noche';
    return {
      cielo0: clima.cielo[0],
      cielo1: clima.cielo[1],
      luz: clima.luz,
      paramo: tinte(PISO.paramo, 0.58),
      frio: tinte(PISO.frio, 0.38),
      templado: tinte(PISO.templado, 0.18),
      calido: tinte(PISO.calido, 0.05),
      monte: tinte(MONTE, 0.12),
      camino: tinte(CAMINO, 0.08),
      astro: esNoche ? '#e3e9f4' : clima.luz,
      haloAstro: esNoche ? 'rgba(214,224,246,0.35)' : `${'rgba(255,226,160,0.4)'}`,
      estrellas: clima.estrellas === true || Number(clima.estrellas) > 0,
      luciernagas: (clima.luciernagas || 0) > 0,
      /* la ventana espera encendida del atardecer al amanecer */
      ventanaPrendida: esNoche || franja === 'atardecer' || franja === 'amanecer',
      nieblaOp: clima.nieblaLejos <= 26 ? 0.5 : clima.nieblaLejos <= 36 ? 0.32 : 0.18,
    };
  }, [franja, clima]);

  /* ── El DESPEGUE (home→valle cinematográfico): un velo con el cielo de la
        hora cubre la pantalla, la navegación corre DEBAJO y el velo se
        desvanece sobre el valle que recibe. CLAVE: el velo es un nodo
        imperativo colgado de document.body — un overlay React moriría con el
        swap de vista (verificado 2026-07-16: se veía el loader oscuro del
        shell a mitad de viaje) y este SOBREVIVE al desmontaje del dashboard.
        Su CSS (.uv-despegue) vive en el bundle global, así que sigue animando
        después del swap; se autodestruye a los 2.1 s. ── */
  const [despegando, setDespegando] = useState(false);

  const navegarAlValle = useCallback(() => {
    if (onNavigate) onNavigate('valle3d');
    else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'valle3d' } }));
    }
  }, [onNavigate]);

  const entrar = useCallback(() => {
    if (despegando) return;
    /* Precalentar el chunk de la entrada 3D bajo el velo (fire-and-forget). */
    try { import('../../mockups/EntradaValle3D.jsx').catch(() => {}); } catch (_) { /* opcional */ }
    if (reducedMotion || typeof document === 'undefined') {
      navegarAlValle();
      return;
    }
    setDespegando(true);
    const velo = document.createElement('div');
    velo.className = 'uv-despegue';
    velo.setAttribute('aria-hidden', 'true');
    velo.style.setProperty('--uv-cielo-a', v.cielo0);
    velo.style.setProperty('--uv-cielo-b', v.cielo1);
    velo.style.setProperty('--uv-luz', v.luz);
    document.body.appendChild(velo);
    /* Los timers NO se atan al ciclo de vida del componente: el desmontaje
       del dashboard a mitad de viaje es lo esperado, y el velo debe seguir. */
    setTimeout(navegarAlValle, 620);
    setTimeout(() => { velo.remove(); }, 2100);
  }, [despegando, reducedMotion, navegarAlValle, v]);

  return (
    <section className="uv" aria-label="Su valle vivo" data-franja={franja}>
      <button
        type="button"
        className={`uv-puerta${despegando ? ' uv-puerta--despega' : ''}`}
        data-testid="fvh-umbral-valle"
        aria-label={`Entrar a su valle en 3D. Ahora es ${clima.etiqueta.toLowerCase()} en la vereda.`}
        onClick={entrar}
        style={{
          '--uv-cielo-a': v.cielo0,
          '--uv-cielo-b': v.cielo1,
          '--uv-luz': v.luz,
        }}
      >
        {/* ── LA VISTA: el valle andino de la finca, a la hora real.
              El LIENZO es panorámico (720×210): el ARTE PRINCIPAL (casa,
              sendero, milpa, astro) vive en la mitad DERECHA (grupo
              translate(360)) y el terreno se EXTIENDE hacia la izquierda.
              Con xMaxYMax slice, el móvil muestra la mitad derecha (idéntico
              al diseño base) y el desktop abre el panorama completo sin
              recortar el cielo (el CSS capa el ancho al aspecto del lienzo). */}
        <svg
          className="uv-vista"
          viewBox="0 0 720 210"
          preserveAspectRatio="xMaxYMax slice"
          aria-hidden="true"
        >
          {/* resplandor del horizonte, de lado a lado (cero blur) */}
          <rect x="0" y="52" width="720" height="52" fill={v.luz} opacity="0.22" />

          {/* estrellas de la mitad izquierda (solo la ve el desktop) */}
          {v.estrellas && (
            <g className="uv-estrellas">
              {ESTRELLAS.map(([x, y, r], i) => (
                <circle key={`ext-${i}`} cx={x * 0.94 + 8} cy={y + 4} r={r} fill="#f2f5ff" className={`uv-estrella uv-estrella--${(i + 1) % 3}`} />
              ))}
            </g>
          )}
          {/* un ave más, lejana, en el panorama ancho */}
          <g className="uv-aves" stroke={mezclaHex(TINTA, v.cielo0, 0.35)} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6">
            <path d="M84,40 q4,-5 8,0 M92,40 q4,-5 8,0" />
          </g>

          {/* ── EXTENSIÓN IZQUIERDA del terreno (x 0..362) ── */}
          <path
            d="M0,104 L0,78 L36,60 L64,74 L96,54 L128,70 L162,58 L196,72 L228,52 L262,70 L298,62 L330,74 L362,84 L362,104 Z"
            fill={v.paramo}
          />
          <path
            d="M0,126 L0,96 L40,86 L78,100 L112,84 L150,98 L184,88 L222,100 L258,88 L296,102 L330,92 L362,100 L362,126 Z"
            fill={v.frio}
          />
          <path
            d="M0,154 L0,118 Q60,106 120,116 Q200,128 270,112 Q330,103 362,122 L362,154 Z"
            fill={v.templado}
          />
          <g fill={v.monte}>
            <ellipse cx="46" cy="120" rx="8" ry="5.5" />
            <ellipse cx="72" cy="126" rx="7" ry="5" />
            <ellipse cx="122" cy="118" rx="8" ry="5.5" />
            <ellipse cx="172" cy="124" rx="7" ry="4.6" />
            <ellipse cx="232" cy="114" rx="8" ry="5" />
            <ellipse cx="300" cy="110" rx="7" ry="4.6" />
          </g>
          <path
            d="M0,210 L0,148 Q80,138 160,146 Q260,156 362,152 L362,210 Z"
            fill={v.calido}
          />

          {/* ── EL ARTE PRINCIPAL, anclado a la derecha (la vista del móvil) ── */}
          <g transform="translate(360,0)">
          {/* astro: el sol en su arco (o la luna plata de la noche) */}
          <g className="uv-astro">
            <circle cx={ASTRO[franja].cx} cy={ASTRO[franja].cy} r={ASTRO[franja].r * 2.6} fill={v.haloAstro} opacity="0.5" />
            <circle cx={ASTRO[franja].cx} cy={ASTRO[franja].cy} r={ASTRO[franja].r} fill={v.astro} />
            {franja === 'noche' && (
              /* el mordisco de la luna: mismo índigo del cielo alto */
              <circle cx={ASTRO.noche.cx + 5} cy={ASTRO.noche.cy - 4} r={ASTRO.noche.r * 0.82} fill={v.cielo0} />
            )}
          </g>

          {/* estrellas (solo cuando la franja las trae) */}
          {v.estrellas && (
            <g className="uv-estrellas">
              {ESTRELLAS.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="#f2f5ff" className={`uv-estrella uv-estrella--${i % 3}`} />
              ))}
            </g>
          )}

          {/* pajaritos lejanos cruzando el cielo */}
          <g className="uv-aves" stroke={mezclaHex(TINTA, v.cielo0, 0.35)} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7">
            <path d="M120,44 q4,-5 8,0 M128,44 q4,-5 8,0" />
            <path d="M158,56 q3.4,-4 7,0 M165,56 q3.4,-4 7,0" />
          </g>

          {/* ── LA CORDILLERA: los 4 pisos térmicos, del páramo al cálido.
                Crestas con carácter andino (picos, no lomas de nube); a más
                lejos, más niebla de la franja encima del color del piso. ── */}
          {/* páramo, lejísimos: la línea de picos altos */}
          <path
            d="M0,104 L0,84 L34,62 L58,76 L88,54 L118,72 L146,50 L176,68 L206,58 L238,74 L266,48 L300,68 L328,58 L360,76 L360,104 Z"
            fill={v.paramo}
          />
          {/* frío: la segunda línea, más cerca y más firme */}
          <path
            d="M0,126 L0,100 L36,88 L72,102 L104,84 L140,100 L172,88 L210,102 L244,86 L282,100 L318,90 L360,102 L360,126 Z"
            fill={v.frio}
          />
          {/* banco de niebla que se acuesta entre el frío y el templado
              (las puntas se AFILAN a la izquierda: sin borde vertical duro) */}
          <g className="uv-niebla" opacity={v.nieblaOp}>
            <path d="M-16,114 Q80,96 170,106 Q270,114 380,104 L380,120 Q270,128 170,120 Q80,116 -16,114 Z" fill={clima.niebla} />
            <path d="M44,122 Q150,112 250,118 Q310,121 400,116 L400,128 Q310,132 230,128 Q130,126 44,122 Z" fill={clima.niebla} opacity="0.7" />
          </g>
          {/* templado: la ladera trabajada, lomas suaves de cafetal */}
          <path
            d="M0,154 L0,122 Q44,108 90,118 Q136,128 180,114 Q226,102 270,116 Q316,130 360,118 L360,154 Z"
            fill={v.templado}
          />
          {/* cafetal del templado: hileras de matas de sombra */}
          <g fill={v.monte}>
            <ellipse cx="34" cy="126" rx="8" ry="5.5" />
            <ellipse cx="56" cy="131" rx="7" ry="5" />
            <ellipse cx="80" cy="127" rx="8" ry="5.5" />
            <ellipse cx="104" cy="132" rx="7" ry="4.6" />
            <ellipse cx="150" cy="122" rx="7" ry="5" />
            <ellipse cx="196" cy="118" rx="8" ry="5" />
            <ellipse cx="240" cy="122" rx="7" ry="4.6" />
          </g>
          {/* cálido: el primer plano tibio donde vive la casa */}
          <path
            d="M0,210 L0,152 Q56,140 116,148 Q178,156 238,146 Q300,136 360,148 L360,210 Z"
            fill={v.calido}
          />
          {/* el sendero que sube a la puerta de la casa (la invitación) */}
          <path
            d="M226,210 C244,196 268,186 288,176 C298,171 302,168 304,164"
            fill="none"
            stroke={v.camino}
            strokeWidth="11"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M226,210 C244,196 268,186 288,176 C298,171 302,168 304,164"
            fill="none"
            stroke={v.camino}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="1 9"
          />

          {/* ── LA CASA-ANCLA, protagonista a la derecha (tokens CASA) ── */}
          <g className="uv-casa">
            {/* muro encalado + zócalo pintado */}
            <rect x="286" y="140" width="42" height="28" rx="2" fill={CASA.encalado} />
            <rect x="286" y="161" width="42" height="7" fill={CASA.zocalo} />
            {/* faldón de teja a dos aguas (sol y sombra) + alero */}
            <path d="M280,142 L307,122 L334,142 Z" fill={CASA.teja} />
            <path d="M307,122 L334,142 L340,140 L310,118.5 Z" fill={CASA.tejaSombra} />
            <path d="M280,142 L274,140 L304,118.5 L310,118.5 Z" fill={CASA.teja} />
            {/* puerta de madera + ventana que espera */}
            <rect x="292" y="150" width="10" height="18" rx="1.2" fill={CASA.madera} />
            <rect
              x="309"
              y="147"
              width="11"
              height="11"
              rx="1.2"
              fill={v.ventanaPrendida ? CASA.ventana : CASA.carpinteria}
              className={v.ventanaPrendida ? 'uv-ventana-prendida' : undefined}
            />
            {v.ventanaPrendida && (
              /* el halo tibio de la ventana: "la casa espera" */
              <circle cx="314.5" cy="152.5" r="14" fill={CASA.ventana} opacity="0.22" />
            )}
            {/* el árbol guardián junto a la casa */}
            <rect x="270" y="146" width="4" height="18" rx="1.8" fill={CASA.madera} />
            <ellipse cx="272" cy="138" rx="11" ry="10" fill={v.monte} />
            <ellipse cx="266" cy="142" rx="6" ry="5" fill={mezclaHex(v.monte, v.luz, 0.18)} />
          </g>

          {/* la cerca de madera del potrero, a la izquierda del sendero */}
          <g stroke={mezclaHex(CASA.madera, v.calido, 0.2)} strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d="M150,170 L150,152 M186,166 L186,148 M222,163 L222,146" />
            <path d="M144,158 L228,151 M144,166 L228,158" />
          </g>
          {/* matas de café flanqueando el sendero del frente */}
          <g fill={mezclaHex(v.monte, v.calido, 0.2)}>
            <ellipse cx="248" cy="172" rx="10" ry="7" />
            <ellipse cx="338" cy="176" rx="11" ry="8" />
            <ellipse cx="316" cy="184" rx="9" ry="6.5" />
          </g>

          {/* luciérnagas del anochecer */}
          {v.luciernagas && (
            <g className="uv-luciernagas">
              {LUCIERNAGAS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="1.8" fill="#ffe9a8" className={`uv-luciernaga uv-luciernaga--${i}`} />
              ))}
            </g>
          )}
          </g>
        </svg>

        {/* el barbudito de páramo, el guía que sobrevuela el umbral */}
        <span className="uv-colibri" aria-hidden="true">
          <BarbuditoIlustrado size={78} />
        </span>

        {/* eyebrow + hora viva */}
        <span className="uv-eyebrow" aria-hidden="true">Su valle vivo</span>
        <span className="uv-hora" aria-hidden="true">{clima.etiqueta}</span>

        {/* ── LA INVITACIÓN ── */}
        <span className="uv-cta" aria-hidden="true">
          <span className="uv-cta-txt">
            <b>Entrar a mi valle</b>
            <small>Camine su finca en 3D</small>
          </span>
          <span className="uv-cta-flecha">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M5 12h13M13 6.5 18.5 12 13 17.5" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>

      {/* El velo del viaje NO se renderiza aquí: es un nodo imperativo en
          document.body (ver `entrar`) para sobrevivir al swap de vista. */}
    </section>
  );
}
