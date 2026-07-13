import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, AntenaRubber, RH_INK } from './_rubberhose.jsx';
import { ABEJA_PALETA, ABEJA_PROPORCION } from './abejaIdentidad.js';
import { cuerpoDeClima, PERFIL_ABEJA, ropaDeClimaBicho } from './creatureClimaCuerpo.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* Abeja angelita — Tetragonisca angustula (meliponino nativo SIN aguijón, NO
   Apis). Cuerpo ámbar rayado (chumbe andino), cabeza clara, alitas de tul.
   Elevada al lenguaje RUBBER-HOSE PLENO (Cuphead + Miss Minutes de Loki):
   contorno grueso que respira, ojos de goma con pupila grande y brillo, cachetes
   campesinos, bracitos/patitas de manguera con mitones, antenas con bombillo que
   hacen follow-through, y squash-&-stretch en el idle (boil ~12fps). El DIBUJO
   compone el KIT reutilizable `_rubberhose.jsx` (que el oso andino y el colibrí
   heredan); la CADENCIA vive en `creatures.css` (clases `rh-*`, gate RM + tier).
   La IDENTIDAD (paleta + proporciones) vive en `abejaIdentidad.js`: la MISMA
   fuente que dimensiona/tiñe su presencia 3D (useEntradaAbeja) — una sola abeja. */
const VIEWBOX = '-15 -15 32 30';

/* Rayas del cuerpo tejidas como CHUMBE andino: banda de tinta con hilo tierra. */
const BANDAS = [
  { x: -3.6, y0: -4.7, y1: 4.7 },
  { x: 0.4, y0: -5.0, y1: 5.0 },
  { x: 4.0, y0: -4.0, y1: 4.0 },
];

export function AbejaAngelita({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Abeja angelita',
  /* Pose de VIDA (idle-life): 'vuela' (default, aleteo normal) | 'celebra'
     (SALTO con anticipación + brazos en V que rebasan y asientan) | 'reposo'
     (alitas plegadas + respiración lenta) | 'señala' (se inclina hacia el POI
     y extiende el bracito apuntando, con overshoot). Los gestos viven en
     `creatures.css` (keyframes rh-celebra / rh-reposo / rh-senala) y solo se
     activan cuando la creature está viva (animated); con animated=false o
     reduced-motion la abeja queda en fotograma digno (bracitos colgando,
     sonriendo). Solo cambia CSS por data-pose: consumidores viejos no notan nada. */
  pose = 'vuela',
  /* ── REACTIVIDAD AL ESTADO REAL DE LA FINCA (auditoría §5b) ────────────────
     El repertorio de reacción que la escena deriva de la finca (reaccionFinca).
     La creature lo interpreta con SU cuerpo (gotas, probóscide, brillo) — estética
     rubber-hose (Miss Minutes / Cuphead): squash-and-stretch, elástico, expresivo.
     Todo opcional: sin estos props la abeja se ve EXACTO como antes.
       animo    → piel/aura: 'pleno'|'sereno'|'atento'|'sediento'|'descansa'
       energia  → 0..1 viveza (aura y tamaño del brillo)
       mojada   → llueve: gotas que escurren + brillo húmedo
       sed      → Niño/sequía: saca la lengüita y jadea
       comiendo → hay cosecha: baja la probóscide y liba (mordisquea) */
  animo = 'sereno',
  energia = 1,
  mojada = false,
  sed = false,
  comiendo = false,
  /* ── EL CLIMA REAL escrito en el CUERPO (angelitaClimaCuerpo.js) ───────────
     clima/enso del estadoFinca REAL (useFincaViva): lluvia→brillo mojado y
     alas pesadas, Niño+día claro→tono deshidratado y alas lentas, niebla→
     silueta difusa, dorada→vibrante y alas rápidas. Sin clima (avatares,
     catálogo) = neutro digno: la abeja se ve EXACTO como siempre. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4') que produce useLipSync desde el RMS del TTS:
     la boquita cambia de forma al hablar. Sin visema (o 'V1') = la sonrisa de
     siempre → los avatares/catálogo no cambian. El HOOK vive aparte para no
     colgar un AnalyserNode en cada instancia; acá solo se consume el estado. */
  visema = null,
  /* ── VESTUARIO por clima+hora (ropaDeClima) ───────────────────────────────
     OPT-IN: con vestuario=true la abeja se abriga según el clima real (ruana de
     noche/frío — mata el bug de sudar de noche —, sombrero+sudor al sol cálido).
     Default false → los consumidores de `clima` existentes NO ven accesorios
     nuevos (solo el tinte de piel de cuerpoDeClima). tempC afina frío/calor. */
  vestuario = false,
  tempC = undefined,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + follow-through) y deja el
     aleteo + estados reactivos. Sin prop (standalone: avatares, catálogo) =
     pleno. El CSS gatea por [data-tier='bajo']; RM lo congela por encima. */
  tier = undefined,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30 — LineBoilFilter) ────────
     OPT-IN: con lineBoil el CONTORNO de Angelita vibra escalonado (feTurbulence
     + feDisplacement, ~8fps) — el trazo "hierve" como dibujo animado clásico.
     Default false → los consumidores existentes NO cambian. Con animated=false
     o reduced-motion el filtro queda con seed fija (textura sin vibrar). Es la
     capa MÁS cara del kit: reservada para su entrada heroica (galería, hero). */
  lineBoil = false,
  /* ── PUFF DE POLEN (partículas) ────────────────────────────────────────────
     OPT-IN: motas de polen ámbar que flotan y se desvanecen alrededor del
     cuerpo — Angelita cargada de polen, la LOCA que va de flor en flor. CSS las
     anima (crt-polen-mota); reduced-motion las deja quietas. Default false. */
  polen = false,
  /* ── MODO PODER (transformación / power-up dorado — transformacion.css) ─────
     OPT-IN: con poder=true (y en modo standalone) la abeja se envuelve en su
     aura DORADA de 4 capas (glow, boost, ingravidez, corrientes ascendentes) —
     su firma cuando "sube de nivel". El host la enciende un rato con
     usePoderTemporal(). En modo inline el power-up lo pone el host DOM que
     envuelve la escena (::before/mix-blend no aplican a nodos SVG). */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la mano — propsPorMundo/PropEnMano) ─────
     mundoId opcional: al ENTRAR a un mundo Angelita carga su herramienta
     (agua→manguerita, suelo→lupa, animales→lazo, semillero→canasto…). Sin
     mundoId (o mundo sin prop) entra con las manos libres. Va en su manita
     izquierda (el lado libre; la carita vive a la derecha). */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const wing = animated ? 'crt-wing' : undefined;
  const vivo = animated;
  // El aura respira con la energía real de la finca (matas vivas + agua).
  const auraOp = Math.max(0.16, Math.min(0.5, 0.2 + 0.3 * (energia ?? 1)));
  const auraR = 5.4 + 1.2 * (energia ?? 1);

  // ── EL CLIMA REAL en el cuerpo (creatureClimaCuerpo, perfil abeja). Determinista,
  //    una vez por render: tinte + opacidad al contorno; el aleteo se acelera
  //    (dorada) o pesa (lluvia) escalando la duración base de `.crt-wing` (0.15s).
  //    Sin clima → neutro: filtro/opacidad nulos, aleteo base. RM: como `wing` va
  //    solo con `animated`, la duración cuelga de nodos ya quietos (inocua).
  const cuerpoClima = cuerpoDeClima(clima, { enso, tier, perfil: PERFIL_ABEJA });
  // Solo estampamos duración inline cuando el clima REALMENTE cambia el aleteo
  // (≠1): así un clima neutro NO pisa los overrides de pose ('celebra'/'reposo').
  const wingDur = (wing && cuerpoClima.velocidadAlas !== 1)
    ? { animationDuration: `${(0.15 / cuerpoClima.velocidadAlas).toFixed(3)}s` }
    : undefined;
  // Alitas de TUL que se DIFUMINAN al ACELERAR (motion-blur real): cuando el
  // clima acelera el aleteo (dorada/soleado, velocidadAlas alta) el tul se ve
  // borroso — la firma de las alas rápidas del meliponino. Determinista: cuelga
  // del clima, no del reloj. Tier bajo o sin aleteo → nítido (blur es raster
  // caro). RM: las alas ya están quietas, el blur queda estático (inocuo).
  const alasRapidas = wing && tier !== 'bajo' && cuerpoClima.velocidadAlas >= 1.12;
  const alaBlur = alasRapidas
    ? { filter: `blur(${(0.35 * cuerpoClima.velocidadAlas).toFixed(2)}px)` }
    : undefined;
  const alaStyle = (wingDur || alaBlur) ? { ...wingDur, ...alaBlur } : undefined;
  const alaStyle2 = (wingDur || alaBlur)
    ? { animationDelay: '-0.07s', ...wingDur, ...alaBlur }
    : { animationDelay: '-0.07s' };
  // Filtro/opacidad de clima para el nodo raíz (svg autónomo o <g> inline).
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  // Vestuario por clima+hora (opt-in). Perfil abeja: neutro, suda al sol de día,
  // ruana de noche. Sin vestuario o sin clima → nada (comportamiento histórico).
  const ropa = (vestuario && clima) ? ropaDeClimaBicho('abeja-angelita', clima, { tempC }) : null;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );
  // Probóscide (lengüita): sale con SED (jadeo) o al COMER (libar). Cuelga de la
  // cabeza (cx≈9.6). CSS la anima según data-sed/data-comiendo; RM la deja quieta.
  // El <g> EXTERNO posiciona (attr transform); el INTERNO (.crt-lengua) anima —
  // si el CSS animara el mismo nodo del translate, lo pisaría (CSS transform
  // gana sobre el atributo) y la lengüita saltaría al centro del cuerpo.
  const lengua = (sed || comiendo) ? (
    <g transform="translate(9.6 2.4)">
      <g className="crt-lengua">
        <path d="M0,0 C-0.4,2.6 0.4,4.4 0,6.2" stroke={ABEJA_PALETA.lengua} strokeWidth="1.1"
          fill="none" strokeLinecap="round" />
        <circle cx="0" cy="6.4" r="1.05" fill={ABEJA_PALETA.lengua} />
      </g>
    </g>
  ) : null;
  // Gotas de lluvia que escurren del cuerpo/alas cuando está MOJADA. Rubber-hose:
  // caen con un rebotico. CSS (crt-gota) las anima; RM las deja colgando.
  const gotas = mojada ? (
    <g className="crt-gotas" fill={ABEJA_PALETA.gota} opacity="0.9">
      <path className="crt-gota" d="M-6,4 q-1.1,1.8 0,3.2 q1.1,-1.4 0,-3.2 Z" />
      <path className="crt-gota" style={{ animationDelay: '-0.5s' }} d="M2,5.2 q-1,1.7 0,3 q1,-1.3 0,-3 Z" />
      <path className="crt-gota" style={{ animationDelay: '-1.1s' }} d="M8,3.4 q-0.9,1.5 0,2.7 q0.9,-1.2 0,-2.7 Z" />
    </g>
  ) : null;
  // Puff de POLEN: motas ámbar que flotan y se disuelven alrededor del cuerpo —
  // Angelita cargada de polen (la LOCA de flor en flor). CSS (crt-polen-mota) las
  // sube con deriva; con animated=false / RM quedan colgando dignas. Opt-in.
  const polenEl = polen ? (
    <g className="crt-polen" fill={ABEJA_PALETA.cuerpo} aria-hidden="true">
      <circle className={vivo ? 'crt-polen-mota' : undefined} cx="-9" cy="5.5" r="0.85" />
      <circle className={vivo ? 'crt-polen-mota' : undefined} style={{ animationDelay: '-0.8s' }} cx="6.5" cy="7.2" r="0.6" />
      <circle className={vivo ? 'crt-polen-mota' : undefined} style={{ animationDelay: '-1.5s' }} cx="-2.5" cy="8.4" r="0.72" />
      <circle className={vivo ? 'crt-polen-mota' : undefined} style={{ animationDelay: '-2.1s' }} cx="9.5" cy="4.2" r="0.52" />
      <circle className={vivo ? 'crt-polen-mota' : undefined} style={{ animationDelay: '-2.9s' }} cx="1.5" cy="9" r="0.6" />
    </g>
  ) : null;
  // PROP DEL MUNDO en la manita izquierda (el lado libre; la carita va a la
  // derecha). El punta del brazo izquierdo cae en ~(-8.5, 6.2); posamos el prop
  // ahí, chico (los dibujos son ~12u de alto; la abeja ~11u). Sin mundoId o
  // mundo sin prop → PropEnMano devuelve null (manos libres, nunca rompe).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={-9.4} y={7.6} escala={0.6} ink={RH_INK} animated={vivo} />
  ) : null;

  // ── CUERPO rubber-hose. Orden de atrás→adelante: aura, alas, patitas, tronco
  //    (ámbar con contorno + chumbe), bracitos, cabeza (ojos/cachetes/sonrisa/
  //    antenas), probóscide, gotas. `.crt-body` es el nodo que squashea (boil
  //    idle + estados reactivos, que lo pisan por especificidad).
  //    ENCIMA van DOS wrappers de VIDA con períodos co-primos (6.3s / 9.7s):
  //    `rh-travieso` (saltitos de lado, wobble, double-take) y `rh-antic` (la
  //    vuelta de campana Miss-Minutes con anticipación y overshoot). Tres capas
  //    de transform que nunca caen en el mismo compás = idle impredecible, vivo.
  //    El CSS los apaga con RM, tier bajo, estados reactivos y ánimo bajito.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva */}
      <circle r={auraR} fill={ABEJA_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* alitas de tul con contorno + smear (crt-wingbeat ya lleva el estirón).
          La duración del aleteo la modula el clima real (wingDur): dorada rápida,
          lluvia pesada. celebra/reposo (data-pose) mandan por especificidad CSS. */}
      <ellipse className={wing} style={alaStyle} cx="-1.8" cy="-7" rx="6" ry="3.6" fill={ABEJA_PALETA.alaTul}
        opacity="0.62" stroke="rgba(42,26,12,0.4)" strokeWidth="0.5" />
      <ellipse className={wing} style={alaStyle2} cx="2.2" cy="-6.4"
        rx="4.6" ry="2.8" fill={ABEJA_PALETA.alaTulClara} opacity="0.5" stroke="rgba(42,26,12,0.35)" strokeWidth="0.5" />

      {/* patitas manguera con pie crema (detrás del tronco, se mecen suave) */}
      <Miembro d="M-2.6,4.4 C-3.2,6.6 -3.4,8 -3.0,9.2" ancho={1.9} punta={[-3.0, 9.4]} puntaR={1.3} pie sway={vivo} delay={-0.6} />
      <Miembro d="M1.8,4.7 C1.4,6.8 1.3,8.2 1.8,9.4" ancho={1.9} punta={[1.8, 9.6]} puntaR={1.3} pie sway={vivo} delay={-0.95} />

      {/* tronco ámbar con contorno grueso (la línea que respira con el boil) */}
      <ellipse cx="0" cy="0" rx={ABEJA_PROPORCION.troncoRx} ry={ABEJA_PROPORCION.troncoRy}
        fill={ABEJA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3"
        style={{ filter: `drop-shadow(0 0 6px ${ABEJA_PALETA.cuerpoGlow})` }} />
      {/* rayas = chumbe: banda de tinta + hilo tierra */}
      {BANDAS.map((b, i) => (
        <g key={i}>
          <path d={`M${b.x},${b.y0} L${b.x},${b.y1}`} stroke={RH_INK} strokeWidth="1.9" strokeLinecap="round" />
          <path d={`M${b.x},${b.y0 + 0.6} L${b.x},${b.y1 - 0.6}`} stroke={ABEJA_PALETA.hiloChumbe} strokeWidth="0.7" strokeLinecap="round" />
        </g>
      ))}

      {/* bracitos manguera con mitón crema (delante del tronco, follow-through).
          Marcados (crt-brazo-l/r) y con pivote en el HOMBRO para que los gestos
          celebra/señala los alcen desde el hombro, no desde el centro del bbox:
          el hombro izquierdo cae arriba-derecha de su bbox ('right top'); el
          derecho, arriba-izquierda ('left top'). */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9" ancho={2.1} punta={[-8.5, 6.2]} puntaR={1.55} sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5" ancho={2.2} punta={[7.0, 7.8]} puntaR={1.6} sway={vivo} delay={-0.45} />

      {/* cabeza clara con contorno */}
      <circle cx="8.6" cy="-1.0" r={ABEJA_PROPORCION.cabezaR} fill={ABEJA_PALETA.cabeza} stroke={RH_INK} strokeWidth="1.2" />
      {/* chapetas campesinas + sonrisa + ojos de goma (parpadean juntos) */}
      <Cachetes puntos={[{ cx: 10.4, cy: 0.7, r: 1.15 }, { cx: 6.9, cy: 0.3, r: 0.85 }]} vivo={vivo} />
      {/* Boca: lip-sync si hay visema; si no, la sonrisa de goma de siempre. */}
      {visema
        ? <BocaVisema cx={8.9} cy={1.4} w={2.8} prof={1.1} visema={visema} />
        : <Sonrisa cx={8.9} cy={1.4} w={2.8} prof={1.1} />}
      <OjosRubber
        ojos={[{ cx: 10.1, cy: -1.9, r: 1.95 }, { cx: 7.4, cy: -2.2, r: 1.45 }]}
        mirar={[0.3, 0.34]}
        parpadea={vivo}
      />
      {/* antenas con bombillo que se mecen (secondary motion) */}
      <AntenaRubber d="M7.7,-4.7 C6.7,-7.3 7.0,-9.3 8.3,-10.1" bulbo={[8.3, -10.3]} sway={vivo} delay={0} />
      <AntenaRubber d="M9.7,-4.6 C11.0,-6.7 11.3,-8.7 10.5,-10.3" bulbo={[10.5, -10.5]} sway={vivo} delay={-0.3} />

      {/* Vestuario por clima+hora (ruana/sombrero/sudor) — solo con vestuario=true. */}
      {ropa && (
        <AccesoriosClima
          estado={ropa}
          tronco={{ cx: 0, cy: 0, rx: ABEJA_PROPORCION.troncoRx, ry: ABEJA_PROPORCION.troncoRy }}
          cabeza={{ cx: 8.6, cy: -1.0, r: ABEJA_PROPORCION.cabezaR }}
          animated={vivo}
        />
      )}

      {/* Prop del mundo en la manita (entra heroica con su herramienta). */}
      {propMundo}

      {lengua}
      {gotas}
      {polenEl}
    </g>
  );
  // Las capas de antics envuelven al cuerpo SOLO cuando está vivo (animated):
  // nodos aparte para que sus transforms no pisen el boil de `.crt-body`.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  // El line-boil (contorno que hierve) envuelve TODO el dibujo cuando se pide:
  // el feDisplacementMap desplaza el trazo entero (Cuphead). Grupo aparte para
  // no colisionar con el glow del `.crt-body` (dos filtros, nodos distintos).
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  // data-estado agrupa la reacción para el CSS (brillo mojado, jadeo, mordisco).
  // data-pose SOLO cuando está viva: así los gestos (celebra/reposo/señala) no
  // corren con animated=false — la abeja queda en fotograma digno (bracitos
  // colgando, sonriendo). RM lo apaga además por dentro del CSS.
  const estadoAttrs = {
    'data-creature': 'abeja-angelita',
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-mojada': mojada ? '1' : undefined,
    'data-sed': sed ? '1' : undefined,
    'data-comiendo': comiendo ? '1' : undefined,
    'data-visema': visema || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-sombrero': ropa?.sombrero ? '1' : undefined,
    'data-sudor': ropa?.sudor ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-polen': polen ? '1' : undefined,
    'data-prop': mundoId || undefined,
  };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); acá solo marcamos data-poder por si el host lo consulta.
    return (
      <g className={className} style={estiloClima} data-poder={poder ? '1' : undefined} {...estadoAttrs}>
        {defs}
        {cuerpoVivo}
      </g>
    );
  }
  const svg = (
    <svg viewBox={VIEWBOX} width={size} height={size} className={className} style={estiloClima}
      role="img" aria-label={title} {...estadoAttrs} {...rest}>
      <title>{title}</title>
      {defs}
      {cuerpoVivo}
    </svg>
  );
  // MODO PODER (standalone): la envolvemos en su aura DORADA de 4 capas
  // (transformacion.css: glow radial + boost + ingravidez + corrientes). El
  // wrapper DOM es lo único que puede llevar ::before/mix-blend/corrientes.
  if (poder) {
    return (
      <span
        className="is-powered-up abeja-poder"
        data-creature-poder="abeja-angelita"
        style={{ '--aura-color': auraDeBicho('abeja-angelita'), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default AbejaAngelita;
