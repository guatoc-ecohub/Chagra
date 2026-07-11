/*
 * FAUNA BENÉFICA en estilo RUBBER-HOSE (Cuphead / Miss Minutes de Loki),
 * fusionada con lo andino. Los ALIADOS de la finca, cada uno mostrando su ROL
 * de forma bella:
 *
 *   MariquitaRubber   → CONTROLA PLAGAS   (posada en la hoja que cuida)
 *   AbejorroRubber    → POLINIZA          (polen de oro sobre la flor)
 *   LombrizRubber     → AIREA EL SUELO    (burbujas de aire desde el túnel)
 *   EscarabajoRubber  → DESCOMPONE        (bola de humus → brote de vida)
 *
 * Lenguaje: línea de tinta GRUESA que respira (boil), OJOS DE GOMA con pupila
 * expresiva, squash & stretch, y acentos de TEXTIL ANDINO (rombos, chakana,
 * guardas, banda tejida). SVG + CSS puros: solo transform/opacity (GPU, Android
 * gama baja). Familia de props idéntica a `creatures/` + extras rubber-hose.
 *
 * ── Props ────────────────────────────────────────────────────────────────
 *   size        number|string  64   ancho/alto en modo standalone (<svg>).
 *   className   string         —    clase raíz; en `inline` la escena engancha
 *                                   aquí su coreografía de entrada/posición.
 *   inline      boolean        false  false → <svg> autónomo; true → solo <g>.
 *   animated    boolean        true   vida perpetua (boil/respira/aletea…).
 *   tier        'alto'|'medio'|'bajo' degradación por equipo. 'bajo' → versión
 *                                   SIMPLE (sin boil, sin gradientes, quieta).
 *   look        [dx,dy]        —    hacia dónde miran las pupilas de goma.
 *   mostrarRol  boolean        false  muestra la CINTA con el verbo del rol.
 *   title       string         —    aria-label + <title> accesible.
 *
 * ── Cableo (lo hace Opus) ──────────────────────────────────────────────────
 *   import { MariquitaRubber } from '@/visual/creatures/FaunaRubberhose.jsx';
 *   // Avatar / catálogo:
 *   <MariquitaRubber size={72} mostrarRol />
 *   // Dentro de una escena SVG propia (la escena pone posición/entrada):
 *   <g transform="translate(120 60)"><AbejorroRubber inline className="entra" /></g>
 *   Registro consultable: ./faunaRubberhose.registry.js (FAUNA_RUBBER).
 */
import { useId } from 'react';
import './faunaRubberhose.css';
import { INK, HUESO, PALETA, ROLES } from './_faunaRubberTokens.js';
import { RubberDefs, RubberEye, HoseLimb, RolCinta } from './_faunaKitRubber.jsx';

/* Envoltorio común: decide <svg> autónomo vs <g> inline, con los mismos datos
   de accesibilidad y el mismo `data-creature`. */
function Marco({ inline, slug, title, viewBox, size, className, rest, children }) {
  if (inline) {
    return (
      <g className={className} data-creature={slug}>
        {children}
      </g>
    );
  }
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      data-creature={slug}
      {...rest}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MARIQUITA — Hippodamia convergens. ROL: CONTROLA PLAGAS.
   Depredadora de pulgones. Posada en la hoja que protege; manchas en chakana
   con corazón de maíz. Grandes ojos de goma tiernos.
   ══════════════════════════════════════════════════════════════════════════ */
export function MariquitaRubber({
  size = 72,
  className,
  inline = false,
  animated = true,
  tier = 'alto',
  look = [0, 0.32],
  mostrarRol = false,
  title = 'Mariquita, control de plagas',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `frh-glow-${uid}`;
  const shine = `frh-shine-${uid}`;
  const P = PALETA.mariquita;
  const R = ROLES.mariquita;
  const simple = tier === 'bajo';
  const vivo = animated && !simple;

  const patas = [
    { d: 'M-8,4 C-13,6 -16,7 -19,6.5', foot: [-19, 6.5] },
    { d: 'M-9,0 C-15,0.5 -18,0.8 -21,0.4', foot: [-21, 0.4] },
    { d: 'M-8,-4 C-13,-5 -16,-6 -18,-8', foot: [-18, -8] },
    { d: 'M8,4 C13,6 16,7 19,6.5', foot: [19, 6.5] },
    { d: 'M9,0 C15,0.5 18,0.8 21,0.4', foot: [21, 0.4] },
    { d: 'M8,-4 C13,-5 16,-6 18,-8', foot: [18, -8] },
  ];
  const manchas = [
    { c: [-6, -6], rombo: true },
    { c: [6, -6], rombo: true },
    { c: [-9, 0.5] },
    { c: [9, 0.5] },
    { c: [-6, 6.5] },
    { c: [6, 6.5] },
  ];

  return (
    <Marco inline={inline} slug="mariquita-rubber" title={title} viewBox="-26 -26 52 60" size={size} className={className} rest={rest}>
      <RubberDefs glow={glow} shine={shine} />
      <g className={vivo ? 'frh-boil' : undefined}>
        <g className={vivo ? 'frh-step' : undefined}>
          {patas.map((p, i) => (
            <HoseLimb key={`pata${i}`} d={p.d} w={2.3} foot={p.foot} />
          ))}
        </g>
        <g filter={`url(#${glow})`}>
          <g className={vivo ? 'frh-breathe' : undefined}>
            {/* caparazón (élitros) */}
            <ellipse cx="0" cy="-3" rx="13" ry="12" fill={P.caparazon} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            {!simple && <ellipse cx="0" cy="-3" rx="13" ry="12" fill={`url(#${shine})`} />}
            {/* sutura central */}
            <path d="M0,-8.5 L0,8.5" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
            {/* manchas en chakana con corazón de maíz (acento andino) */}
            {manchas.map((m, i) => (
              <g key={`mancha${i}`}>
                <circle cx={m.c[0]} cy={m.c[1]} r="2.7" fill={P.punto} />
                {m.rombo && !simple && (
                  <path
                    d={`M${m.c[0]},${m.c[1] - 1.2} L${m.c[0] + 1.2},${m.c[1]} L${m.c[0]},${m.c[1] + 1.2} L${m.c[0] - 1.2},${m.c[1]} Z`}
                    fill={P.rombo}
                  />
                )}
              </g>
            ))}
            {!simple && (
              <path d="M0,1 L2.6,3.5 L0,6 L-2.6,3.5 Z" fill={P.rombo} stroke={INK} strokeWidth="0.7" />
            )}
            {/* cabeza */}
            <ellipse cx="0" cy="-12.5" rx="6.5" ry="4.4" fill={P.cuerpo} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
            {!simple && (
              <>
                <circle cx="-3.7" cy="-13" r="1.1" fill={HUESO} opacity="0.85" />
                <circle cx="3.7" cy="-13" r="1.1" fill={HUESO} opacity="0.85" />
              </>
            )}
            {/* antenas de manguera con bolita */}
            {!simple && (
              <>
                <HoseLimb d="M-2.5,-16 C-4,-18 -4.5,-19.5 -5,-20.5" w={1.7} foot={[-5, -20.7]} footR={1.3} />
                <HoseLimb d="M2.5,-16 C4,-18 4.5,-19.5 5,-20.5" w={1.7} foot={[5, -20.7]} footR={1.3} />
              </>
            )}
            {/* ojos de goma */}
            <RubberEye cx={-2.7} cy={-12.6} r={2} look={look} blink={vivo} feliz={!simple} />
            <RubberEye cx={2.7} cy={-12.6} r={2} look={look} blink={vivo} feliz={!simple} />
          </g>
        </g>
      </g>

      {/* ROL: control de plagas — posada sobre la hoja que cuida, vigilando al
          pulgón. La escena de la mariquita guardiana. */}
      {!simple && (
        <g opacity="0.96">
          <path d="M-11,15 C-6,10 6,10 11,15 C6,19 -6,19 -11,15 Z" fill={P.hoja} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M-9,15 C-3,14 3,14 9,15" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.5" />
          {/* pulgón (la plaga) al borde, vigilado */}
          <ellipse cx="8.5" cy="14" rx="1.9" ry="1.5" fill={P.plaga} stroke={INK} strokeWidth="0.8" />
          <path d="M7,14.6 L6,15.6 M8.5,15.4 L8.5,16.4 M10,14.6 L11,15.6" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
          <path d="M8.5,12.4 C8.5,11.4 9,10.8 9.6,10.4" fill="none" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
          {/* arco de vigilancia (la guardiana observa) */}
          <path d="M2,7 C6,8 8,10 8.4,12" fill="none" stroke={P.hoja} strokeWidth="1" strokeLinecap="round" strokeDasharray="1.4 1.8" opacity="0.6" />
        </g>
      )}
      {mostrarRol && <RolCinta x={0} y={24} texto={R.verbo} color={R.color} ancho={46} />}
    </Marco>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ABEJORRO — Bombus atratus (abejorro común andino). ROL: POLINIZA.
   Cuerpo peludo con bandas, alas de goma que baten, corbícula cargada de polen
   y motas doradas que suben sobre la flor.
   ══════════════════════════════════════════════════════════════════════════ */
export function AbejorroRubber({
  size = 74,
  className,
  inline = false,
  animated = true,
  tier = 'alto',
  look = [0, 0.4],
  mostrarRol = false,
  title = 'Abejorro, polinizador',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `frh-glow-${uid}`;
  const shine = `frh-shine-${uid}`;
  const clip = `frh-clip-${uid}`;
  const P = PALETA.abejorro;
  const R = ROLES.abejorro;
  const simple = tier === 'bajo';
  const vivo = animated && !simple;

  // Pelusa: ticks radiales que erizan la silueta (rubber-hose peludo).
  const fuzz = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const rx = 11;
    const ry = 13;
    const cy = -6;
    const x1 = (rx * Math.cos(a)).toFixed(1);
    const y1 = (cy + ry * Math.sin(a)).toFixed(1);
    const x2 = ((rx + 2.2) * Math.cos(a)).toFixed(1);
    const y2 = (cy + (ry + 2.2) * Math.sin(a)).toFixed(1);
    return `M${x1},${y1} L${x2},${y2}`;
  }).join(' ');

  // Motas de polen que suben desde la flor (el ROL, en movimiento).
  const motas = [
    { c: [-3, 16], d: '0s' },
    { c: [3, 15], d: '0.7s' },
    { c: [6, 17], d: '1.4s' },
    { c: [-6, 17], d: '2s' },
  ];

  return (
    <Marco inline={inline} slug="abejorro-rubber" title={title} viewBox="-28 -30 56 66" size={size} className={className} rest={rest}>
      <RubberDefs glow={glow} shine={shine} />
      <defs>
        <clipPath id={clip}>
          <ellipse cx="0" cy="-6" rx="11" ry="13" />
        </clipPath>
      </defs>

      <g className={vivo ? 'frh-boil' : undefined}>
        {/* alas de goma translúcidas que baten (alzadas hacia arriba-afuera) */}
        <g className={vivo ? 'frh-wing frh-wing-l' : undefined}>
          <ellipse cx="-7" cy="-15" rx="7.4" ry="4.5" fill={P.ala} opacity="0.62" stroke={INK} strokeWidth="1.2" transform="rotate(-52 -7 -15)" />
          <path d="M-5,-12 C-8,-14 -10,-16 -11,-19" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />
        </g>
        <g className={vivo ? 'frh-wing frh-wing-r' : undefined}>
          <ellipse cx="7" cy="-15" rx="7.4" ry="4.5" fill={P.ala} opacity="0.62" stroke={INK} strokeWidth="1.2" transform="rotate(52 7 -15)" />
          <path d="M5,-12 C8,-14 10,-16 11,-19" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />
        </g>

        {/* patas de manguera + corbícula (canasta de polen) */}
        <g className={vivo ? 'frh-step' : undefined}>
          <HoseLimb d="M-7,4 C-10,7 -12,8 -13,9" w={2.1} foot={[-13, 9]} />
          <HoseLimb d="M-5,6 C-6,9 -6,10 -6,11" w={2.1} foot={[-6, 11]} />
          <HoseLimb d="M7,4 C10,7 12,8 13,9" w={2.1} foot={[13, 9]} />
          <HoseLimb d="M5,6 C6,9 6,10 6,11" w={2.1} foot={[6, 11]} />
          {!simple && (
            <>
              <circle cx="-13" cy="8.5" r="2.6" fill={P.polen} stroke={INK} strokeWidth="0.9" />
              <circle cx="13" cy="8.5" r="2.6" fill={P.polen} stroke={INK} strokeWidth="0.9" />
            </>
          )}
        </g>

        <g filter={`url(#${glow})`}>
          <g className={vivo ? 'frh-breathe' : undefined}>
            {/* cuerpo peludo */}
            {!simple && (
              <path d={fuzz} fill="none" stroke={P.pelo} strokeWidth="1.6" strokeLinecap="round" />
            )}
            <ellipse cx="0" cy="-6" rx="11" ry="13" fill={P.pelo} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            {/* bandas oscuras (recortadas al cuerpo) */}
            <g clipPath={`url(#${clip})`}>
              <rect x="-13" y="-13" width="26" height="4.6" rx="2.3" fill={P.banda} />
              <rect x="-13" y="-5" width="26" height="4.8" rx="2.4" fill={P.banda} />
              <rect x="-13" y="3" width="26" height="4.4" rx="2.2" fill={P.banda} />
            </g>
            {!simple && <ellipse cx="0" cy="-6" rx="11" ry="13" fill={`url(#${shine})`} />}

            {/* cabeza (mira a la flor) */}
            <circle cx="0" cy="6" r="5.4" fill={P.banda} stroke={INK} strokeWidth="1.8" />
            {/* antenas */}
            {!simple && (
              <>
                <HoseLimb d="M-2,1.5 C-4,-0.5 -4.5,-1.5 -5,-2.5" w={1.5} foot={[-5, -2.7]} footR={1.1} />
                <HoseLimb d="M2,1.5 C4,-0.5 4.5,-1.5 5,-2.5" w={1.5} foot={[5, -2.7]} footR={1.1} />
              </>
            )}
            <RubberEye cx={-2.4} cy={5.4} r={2.1} look={look} blink={vivo} feliz={!simple} />
            <RubberEye cx={2.4} cy={5.4} r={2.1} look={look} blink={vivo} feliz={!simple} />
            {/* sonrisa */}
            {!simple && <path d="M-2.2,9 Q0,10.6 2.2,9" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />}
          </g>
        </g>
      </g>

      {/* ROL: poliniza — la flor y el polen dorado que ella reparte. */}
      {!simple &&
        [0, 1, 2, 3, 4].map((k) => (
          <path
            key={`petalo${k}`}
            d="M0,-6 C3,-6 3,-1 0,0 C-3,-1 -3,-6 0,-6 Z"
            fill={P.flor}
            stroke={INK}
            strokeWidth="1"
            strokeLinejoin="round"
            transform={`translate(0 20) rotate(${k * 72})`}
          />
        ))}
      {!simple && (
        <path d="M0,17.5 L1.6,20 L0,22.5 L-1.6,20 Z" transform="translate(0 0)" fill={P.florCorazon} stroke={INK} strokeWidth="0.8" />
      )}
      {!simple &&
        motas.map((m, i) => (
          <circle key={`mota${i}`} className="frh-mote" style={{ animationDelay: m.d }} cx={m.c[0]} cy={m.c[1]} r="1.4" fill={P.polen} />
        ))}
      {mostrarRol && <RolCinta x={0} y={30} texto={R.verbo} color={R.color} ancho={48} />}
    </Marco>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LOMBRIZ — Martiodrilus crassus (lombriz gigante nativa). ROL: AIREA EL SUELO.
   Asoma del túnel; clitelo como BANDA TEJIDA (guarda andina); burbujas de aire
   que suben = la tierra que oxigena y nutre.
   ══════════════════════════════════════════════════════════════════════════ */
export function LombrizRubber({
  size = 72,
  className,
  inline = false,
  animated = true,
  tier = 'alto',
  look = [0.25, -0.3],
  mostrarRol = false,
  title = 'Lombriz, airea el suelo',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `frh-glow-${uid}`;
  const shine = `frh-shine-${uid}`;
  const P = PALETA.lombriz;
  const R = ROLES.lombriz;
  const simple = tier === 'bajo';
  const vivo = animated && !simple;

  const CUERPO = 'M3,26 C-3,16 9,12 5,2 C2,-6 9,-12 13,-16';
  const segmentos = [
    'M0.6,24 L4,22.6',
    'M0.2,19 L3.8,18',
    'M6,13.5 L9,13',
    'M6.4,7.5 L9.4,7.6',
    'M5,1 L8,-0.2',
  ];
  const burbujas = [
    { c: [6, 22], d: '0s' },
    { c: [1, 24], d: '0.9s' },
    { c: [10, 21], d: '1.7s' },
  ];

  return (
    <Marco inline={inline} slug="lombriz-rubber" title={title} viewBox="-16 -30 42 68" size={size} className={className} rest={rest}>
      <RubberDefs glow={glow} shine={shine} />

      {/* suelo del que asoma (con guarda escalonada andina en la superficie) */}
      <path d="M-16,38 L-16,26 Q-4,22 4,26 Q14,30 26,24 L26,38 Z" fill={P.suelo} />
      <path d="M-14,25.5 l3,-2 l3,2 l3,-2 l3,2 l3,-2 l3,2 l3,-2" fill="none" stroke={INK} strokeWidth="1" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="3.5" cy="26" rx="4.2" ry="2" fill="#3a281a" opacity="0.7" />

      {/* burbujas de aire que suben = airea el suelo (el ROL) */}
      {!simple &&
        burbujas.map((b, i) => (
          <circle key={`aire${i}`} className="frh-mote" style={{ animationDelay: b.d }} cx={b.c[0]} cy={b.c[1]} r="1.5" fill={P.aire} stroke={INK} strokeWidth="0.5" opacity="0.85" />
        ))}

      <g className={vivo ? 'frh-boil' : undefined}>
        <g filter={`url(#${glow})`}>
          <g className={vivo ? 'frh-crawl' : undefined}>
            {/* cuerpo: tinta gruesa + relleno de piel + brillo de goma */}
            <path d={CUERPO} fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
            <path d={CUERPO} fill="none" stroke={P.piel} strokeWidth="6" strokeLinecap="round" />
            {!simple && (
              <path d="M4.5,20 C-1,12 8,9 5,1" fill="none" stroke={P.pielHi} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
            )}
            {/* anillos de segmento */}
            <g stroke={INK} strokeWidth="0.9" opacity="0.5" strokeLinecap="round">
              {segmentos.map((d, i) => (
                <path key={`seg${i}`} d={d} />
              ))}
            </g>
            {/* clitelo: banda tejida con guarda andina */}
            <path d="M6,-1 C3.5,2 3,5 5,7.5" fill="none" stroke={P.clitelo} strokeWidth="7.4" strokeLinecap="round" />
            {!simple && (
              <g fill={P.guarda}>
                <path d="M5.6,0 l1.1,1 l-1.1,1 l-1.1,-1 Z" />
                <path d="M4.6,3 l1.1,1 l-1.1,1 l-1.1,-1 Z" />
                <path d="M5,6 l1.1,1 l-1.1,1 l-1.1,-1 Z" />
              </g>
            )}
            {/* cabecita con ojos de goma */}
            <circle cx="13" cy="-16" r="4.2" fill={P.pielHi} stroke={INK} strokeWidth="1.6" />
            <RubberEye cx={11.6} cy={-16.8} r={1.7} look={look} blink={vivo} feliz={!simple} />
            <RubberEye cx={14.8} cy={-16.6} r={1.7} look={look} blink={vivo} feliz={!simple} />
            {!simple && <path d="M11.5,-13.4 Q13,-12.4 14.6,-13.2" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />}
          </g>
        </g>
      </g>

      {mostrarRol && <RolCinta x={5} y={32} texto={R.verbo} color={R.color} ancho={34} />}
    </Marco>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ESCARABAJO — Dichotomius belus (estercolero colombiano). ROL: DESCOMPONE.
   Empuja la bola de humus que gira; a su paso brota vida. Lomo con CHAKANA de
   maíz. Cuerno y ojos de goma decididos.
   ══════════════════════════════════════════════════════════════════════════ */
export function EscarabajoRubber({
  size = 76,
  className,
  inline = false,
  animated = true,
  tier = 'alto',
  look = [-0.6, 0.2],
  mostrarRol = false,
  title = 'Escarabajo, descompone',
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `frh-glow-${uid}`;
  const shine = `frh-shine-${uid}`;
  const humus = `frh-humus-${uid}`;
  const P = PALETA.escarabajo;
  const R = ROLES.escarabajo;
  const simple = tier === 'bajo';
  const vivo = animated && !simple;

  const patas = [
    { d: 'M-4,6 C-7,9 -9,10 -11,11', foot: [-11, 11] },
    { d: 'M2,7 C1,10 1,11 1,12', foot: [1, 12] },
    { d: 'M8,6 C10,9 12,10 13,11', foot: [13, 11] },
  ];

  return (
    <Marco inline={inline} slug="escarabajo-rubber" title={title} viewBox="-34 -24 62 56" size={size} className={className} rest={rest}>
      <RubberDefs glow={glow} shine={shine} />
      <defs>
        <linearGradient id={humus} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.bolaWaste} />
          <stop offset="100%" stopColor={P.bolaHumus} />
        </linearGradient>
      </defs>

      {/* suelo */}
      <path d="M-34,17 L28,17" stroke={INK} strokeWidth="1.4" opacity="0.4" strokeLinecap="round" />
      <ellipse cx="-30" cy="16" rx="2" ry="0.8" fill={INK} opacity="0.25" />
      <ellipse cx="24" cy="16" rx="1.6" ry="0.7" fill={INK} opacity="0.25" />

      {/* ROL: a su paso, la vida brota de lo descompuesto (brote quieto detrás) */}
      {!simple && (
        <g className={vivo ? 'frh-sprout' : undefined}>
          <path d="M-28,16 L-28,9" stroke={P.brote} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-28,11 C-31,10 -32,8 -31,6 C-29,7 -28,9 -28,11 Z" fill={P.brote} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M-28,12.5 C-25,11.5 -24,9.5 -25,7.5 C-27,8.5 -28,10.5 -28,12.5 Z" fill={P.brote} stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
        </g>
      )}

      {/* bola de humus que rueda (residuo → tierra rica) */}
      <g className={vivo ? 'frh-roll' : undefined}>
        <circle cx="-19" cy="9" r="7" fill={`url(#${humus})`} stroke={INK} strokeWidth="1.8" />
        {!simple && (
          <>
            <circle cx="-21" cy="7" r="1.4" fill={P.bolaHumus} opacity="0.6" />
            <circle cx="-17" cy="11" r="1.1" fill={P.bolaWaste} opacity="0.7" />
            <circle cx="-16.5" cy="6.5" r="0.9" fill={P.bolaWaste} opacity="0.6" />
          </>
        )}
      </g>

      <g className={vivo ? 'frh-boil' : undefined}>
        {/* patas que empujan */}
        <g className={vivo ? 'frh-step' : undefined}>
          {patas.map((p, i) => (
            <HoseLimb key={`pata${i}`} d={p.d} w={2.4} foot={p.foot} />
          ))}
        </g>

        <g filter={`url(#${glow})`}>
          <g className={vivo ? 'frh-breathe' : undefined}>
            {/* élitros brillantes */}
            <ellipse cx="4" cy="-1" rx="11" ry="8" fill={P.elitro} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
            {!simple && <ellipse cx="4" cy="-1" rx="11" ry="8" fill={`url(#${shine})`} />}
            <path d="M4,-8.5 L4,6.5" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
            {/* CHAKANA de maíz en el lomo (acento andino) */}
            {!simple && (
              <g>
                <path d="M4,-6 L8.5,-1 L4,4 L-0.5,-1 Z" fill={P.rombo} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
                <path d="M4,-3.4 L6,-1 L4,1.4 L2,-1 Z" fill={P.elitro} />
                <circle cx="4" cy="-1" r="0.9" fill={P.rombo} />
              </g>
            )}
            {/* cabeza con cuerno + ojos de goma decididos */}
            <circle cx="-6.5" cy="-1.5" r="4.6" fill={P.elitro} stroke={INK} strokeWidth="1.8" />
            {!simple && (
              <path d="M-8.5,-4.5 C-10,-6.5 -11,-8 -10.5,-9.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            )}
            <RubberEye cx={-8} cy={-2.4} r={1.9} look={look} blink={vivo} />
            <RubberEye cx={-4.6} cy={-2.4} r={1.9} look={look} blink={vivo} />
            {!simple && <path d="M-8,1.6 Q-6.3,2.4 -4.6,1.6" fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />}
          </g>
        </g>
      </g>

      {mostrarRol && <RolCinta x={2} y={24} texto={R.verbo} color={R.color} ancho={50} />}
    </Marco>
  );
}
