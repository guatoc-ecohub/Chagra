import { useId } from 'react';
import './creatures.css';
import './angelita-missminutes.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, AntenaRubber, RH_INK } from './_rubberhose.jsx';
import { GafasSol, CejasRubber } from './AngelitaGafas.jsx';
import { ABEJA_PALETA, ABEJA_PROPORCION } from './abejaIdentidad.js';
import { aplicarComportamientos, PERFIL_ABEJA, auraDeBicho } from './comportamientos/index.js';
import { AccesoriosClima } from './AccesoriosClima.jsx';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';

/* Abejita, la abeja angelita — Tetragonisca angustula (meliponino nativo de
   Choachí, SIN aguijón, NO Apis). Cabeza y tórax OSCUROS (casi negros) +
   abdomen ámbar PÁLIDO con bandas CLARAS apenas insinuadas (tergitos pálidos
   de la angelita real) y la franja dorada lateral del mesosoma — su firma de
   campo. Lo vetado siguen siendo las tres barras OSCURAS: esas son la firma de
   la Apis europea, la que saquea las colmenas de angelita. Cuerpo esbelto,
   alitas de tul que le sobran del cuerpo, remate redondo sin aguijón.
   Elevada al lenguaje RUBBER-HOSE PLENO (Cuphead + Miss Minutes de Loki):
   contorno grueso que respira, ojos de goma con pupila grande y brillo, cachetes
   campesinos, bracitos/patitas de manguera SIN guantes (re-skin aprobado
   2026-08-21: remate de tinta sutil, no mitón), antenas con bombillo que
   hacen follow-through, y squash-&-stretch en el idle (boil ~12fps).
   La CARA sigue la referencia aprobada (ref-abeja.png, Cuphead/Miss Minutes):
   ojos más grandes y redondos con buen catchlight + sonrisa más ancha y
   cálida, sobre la máscara facial clara del clípeo meliponino. El DIBUJO
   compone el KIT reutilizable `_rubberhose.jsx` (que el oso andino y el colibrí
   heredan); la CADENCIA vive en `creatures.css` (clases `rh-*`, gate RM + tier).
   La IDENTIDAD (paleta + proporciones) vive en `abejaIdentidad.js`: la MISMA
   fuente que dimensiona/tiñe su presencia 3D (useEntradaAbeja) — una sola abeja.
   ITER2 (2026-08-23) — EL NORTE: actuación de caricatura rubber-hose PERO
   apariencia anclada en lo real (lámina naturalista): SEIS patas en tres pares
   (antes 4), ojo COMPUESTO oscuro con pseudopupila dorada (antes esclerótica
   blanca de caricatura), antenas geniculadas con codo (antes arcos con globo),
   3 ocelos ámbar en la coronilla y pilosidad del mesosoma. El rig (clases,
   cadencia, estados, gestos) queda intacto: todo fue cirugía de piel. */
const VIEWBOX = '-15 -15 32 30';


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
  /* ── GAFAS DE SOL (AngelitaGafas) ──────────────────────────────────────────
     OPT-IN: false (default, nada cambia) | true (puestas sobre los ojitos) |
     'poniendose' (reproduce UNA vez la caída teatral: baja girada, rebasa,
     rebota y asienta — su entrada de día soleado). La cadencia vive en
     angelita-missminutes.css gateada por data-gafas; RM = puestas quietas. */
  gafas = /** @type {boolean|'poniendose'} */ (false),
  /* ── CEJAS EXPRESIVAS (AngelitaGafas.CejasRubber) ──────────────────────────
     OPT-IN: null (default: la carita de siempre) | 'alegres' | 'altas' |
     'vivas' (con eyebrow-flash al hablar) | 'fruncidas' (concentrada). El
     agente las deriva por estado; cualquier host puede pedirlas directo. */
  cejas = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const comportamiento = aplicarComportamientos('abeja-angelita', {
    idle: { animated, activo: animated, tier },
    clima: { estado: clima, enso, tier, perfil: PERFIL_ABEJA, vestuario, tempC },
    lipsync: { visema },
    gestos: {
      pose, animo, energia, mojada, sed, comiendo, polen, gafas, cejas,
      mundoId, poder, lineBoil,
    },
  });
  const vivo = comportamiento.rubberhose.animado;
  const poseAplicada = comportamiento.gestos.pose.pose;
  const animoAplicado = comportamiento.gestos.animo;
  const energiaAplicada = comportamiento.gestos.energia;
  const mojadaAplicada = comportamiento.gestos.mojada;
  const sedAplicada = comportamiento.gestos.sed;
  const comiendoAplicada = comportamiento.gestos.comiendo;
  const polenAplicado = comportamiento.gestos.polen;
  const gafasAplicadas = comportamiento.gestos.gafas;
  const cejasAplicadas = comportamiento.gestos.cejas;
  const mundoIdAplicado = comportamiento.gestos.mundoId;
  const poderAplicado = comportamiento.gestos.poder;
  const lineBoilAplicado = comportamiento.gestos.lineBoil;
  const visemaAplicada = comportamiento.lipsync.visema;
  const cuerpoClima = comportamiento.clima;
  const ropa = comportamiento.clima.ropa;
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const wing = vivo ? 'crt-wing' : undefined;
  // El aura respira con la energía real de la finca (matas vivas + agua).
  // Ceñida (2026-08-23): antes 0.2+0.3·e con r 5.4+1.2·e y, encima del glow
  // global del cuerpo, la niebla ámbar era lo PRIMERO que se leía a tamaño
  // chico. Un anillo de calor discreto conserva la conducta (respira con la
  // energía) sin ahogar la silueta de tinta.
  const auraOp = Math.max(0.12, Math.min(0.32, 0.14 + 0.18 * energiaAplicada));
  const auraR = 5.0 + 0.9 * energiaAplicada;

  // ── EL CLIMA REAL en el cuerpo (creatureClimaCuerpo, perfil abeja). Determinista,
  //    una vez por render: tinte + opacidad al contorno; el aleteo se acelera
  //    (dorada) o pesa (lluvia) escalando la duración base de `.crt-wing` (0.15s).
  //    Sin clima → neutro: filtro/opacidad nulos, aleteo base. RM: como `wing` va
  //    solo con `animated`, la duración cuelga de nodos ya quietos (inocua).
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
  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {/* Line-boil (contorno que hierve) — solo se instancia si se pide. */}
      {lineBoilAplicado && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );
  // Probóscide (lengüita): sale con SED (jadeo) o al COMER (libar). Cuelga de la
  // cabeza (cx≈9.6). CSS la anima según data-sed/data-comiendo; RM la deja quieta.
  // El <g> EXTERNO posiciona (attr transform); el INTERNO (.crt-lengua) anima —
  // si el CSS animara el mismo nodo del translate, lo pisaría (CSS transform
  // gana sobre el atributo) y la lengüita saltaría al centro del cuerpo.
  const lengua = (sedAplicada || comiendoAplicada) ? (
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
  const gotas = mojadaAplicada ? (
    <g className="crt-gotas" fill={ABEJA_PALETA.gota} opacity="0.9">
      <path className="crt-gota" d="M-6,4 q-1.1,1.8 0,3.2 q1.1,-1.4 0,-3.2 Z" />
      <path className="crt-gota" style={{ animationDelay: '-0.5s' }} d="M2,5.2 q-1,1.7 0,3 q1,-1.3 0,-3 Z" />
      <path className="crt-gota" style={{ animationDelay: '-1.1s' }} d="M8,3.4 q-0.9,1.5 0,2.7 q0.9,-1.2 0,-2.7 Z" />
    </g>
  ) : null;
  // Puff de POLEN: motas ámbar que flotan y se disuelven alrededor del cuerpo —
  // Angelita cargada de polen (la LOCA de flor en flor). CSS (crt-polen-mota) las
  // sube con deriva; con animated=false / RM quedan colgando dignas. Opt-in.
  const polenEl = polenAplicado ? (
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
  const propMundo = mundoIdAplicado ? (
    <PropEnMano mundoId={mundoIdAplicado} x={-9.4} y={7.6} escala={0.6} ink={RH_INK} animated={vivo} />
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
  //    CONGRUENCIA (2026-08-23): el cuerpo ya NO lleva el filtro glow global
  //    (feGaussianBlur+feMerge duplicaba TODO el dibujo borroso debajo —
  //    incluidas patitas oscuras — y la silueta de tinta se ahogaba en niebla
  //    ámbar; además era un blur raster de la figura entera por frame sobre un
  //    nodo que boilea a ~12fps). El calor vive en UNA sola fuente: el aura.
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`}>
      {/* aura viva */}
      <circle r={auraR} fill={ABEJA_PALETA.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* RUANA primero, bajo las alas (ARREGLO "la abeja parece burro"):
          `AccesoriosClima` es especie-agnóstico y pinta la ruana OPACA y de
          último — antes se pintaba junto a sombrero/sudor, DESPUÉS de las
          alas (más abajo), tapándolas. Las alas son el rasgo que hace
          reconocible la silueta de una abeja (sin ellas se lee como un
          bulto con patas — un burro con poncho); el poncho además sube en
          arco sobre el cuello (el "cuello en V") hasta invadir el espacio de
          la segunda ala. Bastó reordenar EL PINTADO: la ruana sola, antes
          de las alas, para que estas queden ENCIMA — cero cambios en
          `AccesoriosClima.jsx` (sigue sirviendo igual al oso/colibrí/etc.)
          ni en la lógica de la hora/clima (`ropaDeClimaBicho`, intacta).
          Sombrero/sudor NO se tocan: siguen su lugar de siempre, después de
          la cabeza (más abajo) — ese orden ya era correcto (el sombrero va
          ENCIMA de la cabeza). */}
      {ropa?.ruana && (
        <AccesoriosClima
          estado={{ ruana: true }}
          tronco={{ cx: 0, cy: 0, rx: ABEJA_PROPORCION.troncoRx, ry: ABEJA_PROPORCION.troncoRy }}
          cabeza={{ cx: 8.6, cy: -1.0, r: ABEJA_PROPORCION.cabezaR }}
          animated={vivo}
        />
      )}

      {/* ALITAS DE TUL con FORMA DE ALA (congruencia 2026-08-23): antes eran
          dos elipses pálidas casi sin trazo, flotando sobre el lomo — se leían
          como una almohada/halo, no como alas, y a tamaño chico desaparecían.
          Ahora son dos alas de verdad ENRAIZADAS en el tórax (de donde salen
          las alas del meliponino) que barren hacia atrás REBASANDO el abdomen
          ("alitas que le sobran del cuerpo"), con contorno de la MISMA familia
          de tinta (más suave que el cuerpo: siguen siendo tul) y 1-2 venas
          apenas insinuadas (honestidad de ala hialina, no decoración).
          El rig NO cambia: mismo slot de pintado, misma clase `crt-wing` en
          cada ala (smear del aleteo, tempo por clima vía alaStyle) y el
          motion-blur de alas rápidas se hereda igual. El <g> agrupa ala+venas
          para que aleteen como una sola pieza (fill-box, pivote abajo). */}
      <g className={wing} style={alaStyle}>
        <path
          d="M4.6,-3.4 C3.4,-6.4 -1.6,-9.2 -6.8,-9.4 C-10.6,-9.5 -13.1,-8.2 -12.9,-6.7 C-12.7,-5.3 -9.9,-4.6 -6.4,-4.2 C-2.6,-3.8 2.2,-3.2 4.6,-3.4 Z"
          fill={ABEJA_PALETA.alaTul} fillOpacity="0.62"
          stroke="rgba(42,26,12,0.6)" strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M3.6,-3.9 C0.2,-6.6 -4.2,-8.0 -9.8,-8.2" fill="none"
          stroke="rgba(42,26,12,0.28)" strokeWidth="0.32" strokeLinecap="round" />
        <path d="M3.6,-3.8 C0.4,-5.4 -4.4,-6.2 -10.6,-6.4" fill="none"
          stroke="rgba(42,26,12,0.24)" strokeWidth="0.3" strokeLinecap="round" />
      </g>
      <g className={wing} style={alaStyle2}>
        <path
          d="M3.9,-2.8 C3.0,-5.2 -0.4,-7.0 -4.4,-7.1 C-7.3,-7.2 -9.2,-6.2 -9.0,-5.0 C-8.8,-3.9 -6.6,-3.4 -3.9,-3.1 C-1.2,-2.8 2.0,-2.5 3.9,-2.8 Z"
          fill={ABEJA_PALETA.alaTulClara} fillOpacity="0.5"
          stroke="rgba(42,26,12,0.5)" strokeWidth="0.6" strokeLinejoin="round" />
        <path d="M3.0,-3.2 C0.4,-5.0 -3.0,-5.9 -7.6,-5.9" fill="none"
          stroke="rgba(42,26,12,0.24)" strokeWidth="0.3" strokeLinecap="round" />
      </g>

      {/* patitas manguera SIN mitón (re-skin 2026-08-21): remate de tinta
          sutil, detrás del tronco, se mecen suave.
          SEIS PATAS (iter2 2026-08-23, anatomía dura): una abeja tiene 6 y el
          dibujo traía 4 (2 bracitos + 2 patitas). Ahora el conteo es honesto y
          se lee por PARES, como en la lámina: delantero (bracito-r + su par
          lejano acá atrás), medio (patita cercana + patita lejana) y trasero
          (bracito-l, que barre bajo el abdomen, + su par lejano). Las del lado
          LEJANO viven en este slot (detrás del tronco) y van un pelo más
          delgadas — profundidad sin cambiar la tinta. El rig no cambia: mismo
          slot de pintado, mismo rh-sway con delays co-primos. */}
      {/* pata delantera LEJANA (par del bracito-r) */}
      <Miembro d="M5.6,3.4 C6.2,5.4 6.5,7.0 6.2,8.4" ancho={1.6} punta={[6.2, 8.6]} puntaR={1.1} pie sinGuante sway={vivo} delay={-1.35} />
      {/* pata media LEJANA */}
      <Miembro d="M1.8,4.2 C1.4,6.4 1.3,7.9 1.8,9.3" ancho={1.6} punta={[1.8, 9.5]} puntaR={1.1} pie sinGuante sway={vivo} delay={-0.95} />
      {/* pata trasera LEJANA (par del bracito-l): barre hacia atrás bajo el
          abdomen, como la trasera real del meliponino */}
      <Miembro d="M-1.8,4.2 C-2.9,6.0 -3.9,7.5 -5.0,8.6" ancho={1.7} punta={[-5.2, 8.8]} puntaR={1.2} pie sinGuante sway={vivo} delay={-0.6} />

      {/* ABDOMEN ámbar PÁLIDO y esbelto: SIN las tres barras verticales
          OSCURAS (esas eran la firma de la Apis europea). Remata redondo — SIN
          aguijón. Va a la izquierda, dejándole el lado derecho al tórax; su
          contorno respira con el boil. */}
      {/* (congruencia 2026-08-23: fuera el drop-shadow inline — duplicaba el
          calor del aura como niebla pegada al contorno Y era un filtro raster
          por frame sobre el nodo que boilea; la línea de tinta vuelve a mandar) */}
      <ellipse cx="-2.0" cy="0.2" rx="8.1" ry="4.5"
        fill={ABEJA_PALETA.cuerpo} stroke={RH_INK} strokeWidth="1.3" />
      {/* brillo suave de volumen (el lomo del abdomen) — nunca una barra Apis */}
      <ellipse cx="-3.2" cy="-1.9" rx="3.9" ry="1.5" fill={ABEJA_PALETA.cabeza} opacity="0.26" />
      {/* tergite del remate, APENAS insinuado (línea suave que sigue la curva) */}
      <path d="M-7.2,-2.1 Q-7.9,0.2 -7.2,2.3" stroke={ABEJA_PALETA.hiloChumbe}
        strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.45" />
      {/* bandas CLARAS de los tergitos (T. angustula real): dos arcos PÁLIDOS
          que marchan hacia el tórax siguiendo la curva del abdomen — luz, no
          pigmento. Sutiles a propósito: segmentación de meliponino, jamás las
          barras oscuras de la Apis. Respiran con el boil como todo el cuerpo. */}
      <path d="M-4.9,-3.1 Q-5.7,0.2 -4.9,3.5" stroke={ABEJA_PALETA.bandaClara}
        strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M-1.7,-3.6 Q-2.5,0.2 -1.7,4.0" stroke={ABEJA_PALETA.bandaClara}
        strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* TÓRAX oscuro y redondo (peludo): junto con la cabeza forma la mitad
          OSCURA del cuerpo — la estructura de valores INVERTIDA respecto a la
          Apis (que lo tiene claro). Sobre el arranque del abdomen, bajo la cabeza. */}
      <ellipse cx="5.0" cy="-0.4" rx="3.5" ry="4.4" fill={ABEJA_PALETA.torax}
        stroke={RH_INK} strokeWidth="1.2" />
      {/* luz de lomo del tórax: el MISMO sol arriba-izquierda que ya baña el
          abdomen (brillo) y los ojos (catchlight) — antes el tórax era la
          única masa sin luz y se leía como mancha plana (congruencia de
          iluminación, un solo arco pintado, nada de gradientes) */}
      <path d="M3.0,-2.9 A2.8,3.7 0 0 1 4.5,-3.9" stroke="#6b4b28"
        strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* PILOSIDAD del mesosoma (iter2 2026-08-23): el comentario de arriba
          decía "peludo" pero nunca se dibujó. Cinco pelitos cortos sobre el
          lomo — la felpa del tórax del meliponino real (lámina naturalista),
          no púas: trazos finos del tono de la luz, respiran con el boil. */}
      <g stroke={ABEJA_PALETA.pelusa} strokeWidth="0.3" fill="none"
        strokeLinecap="round" opacity="0.6" aria-hidden="true">
        <path d="M2.9,-3.6 q-0.5,-0.4 -0.7,-0.9" />
        <path d="M3.6,-4.25 q-0.4,-0.5 -0.5,-1.0" />
        <path d="M4.5,-4.7 q-0.2,-0.55 -0.2,-1.05" />
        <path d="M5.4,-4.75 q0.05,-0.6 -0.05,-1.05" />
        <path d="M6.2,-4.5 q0.25,-0.5 0.2,-0.95" />
      </g>
      {/* franja DORADA lateral del mesosoma — la marca amarilla en el costado
          del tórax negro, la firma de campo con la que se reconoce a la
          angelita real. Un solo trazo curvo sobre el flanco visible.
          (2026-08-23: un pelo más ancha y firme — a tamaño de UI desaparecía) */}
      <path d="M2.7,-2.9 Q1.9,-0.4 2.7,2.2" stroke={ABEJA_PALETA.franjaTorax}
        strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.95" />

      {/* pata media CERCANA (iter2 2026-08-23): la sexta pata del conteo
          honesto — cuelga del arranque del tronco, delante del cuerpo como
          los bracitos pero SIN clase de gesto (no actúa, solo camina/cuelga). */}
      <Miembro d="M3.4,3.4 C3.0,5.6 2.8,7.2 3.2,8.8" ancho={1.7} punta={[3.2, 9.0]} puntaR={1.2} pie sinGuante sway={vivo} delay={-1.7} />

      {/* bracitos manguera SIN mitón (re-skin 2026-08-21: la referencia traía
          guantes por DEFECTO — acá el remate es tinta sutil, manita desnuda).
          Marcados (crt-brazo-l/r) y con pivote en el HOMBRO para que los gestos
          celebra/señala los alcen desde el hombro, no desde el centro del bbox:
          el hombro izquierdo cae arriba-derecha de su bbox ('right top'); el
          derecho, arriba-izquierda ('left top'). */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9" ancho={2.1} punta={[-8.5, 6.2]} puntaR={1.55} sinGuante sway={vivo} delay={-0.15} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5" ancho={2.2} punta={[7.0, 7.8]} puntaR={1.6} sinGuante sway={vivo} delay={-0.45} />

      {/* CABEZA — agrupada aparte (crt-cabeza) SOLO para que el agente pueda
          negarla de lado a lado ("no sé", angelita-agente.css) sin mover el
          resto del cuerpo: el mismo dibujo de siempre, un wrapper más. Con
          vestuario=true el sombrero se dibuja AFUERA de este grupo (posición
          fija por coordenadas) — no la sigue si niega; caso opt-in raro que
          no ocurre en el agente conversacional (donde vive el gesto). */}
      <g className="crt-cabeza">
        {/* cabeza OSCURA (casi negra) con contorno — la mitad oscura del meliponino */}
        <circle cx="8.6" cy="-1.0" r={ABEJA_PROPORCION.cabezaR} fill={ABEJA_PALETA.testa} stroke={RH_INK} strokeWidth="1.2" />
        {/* luz de coronilla: el mismo arco de sol arriba-izquierda que el tórax —
            rompe el "casco" vacío de la frente sin aclarar la cabeza (Humboldt:
            la testa sigue oscura; esto es luz, no pigmento) */}
        <path d="M5.6,-3.0 A3.6,3.6 0 0 1 7.4,-4.4" stroke="#6b4b28"
          strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* OCELOS (iter2 2026-08-23): los 3 ojitos simples ámbar en triángulo
            sobre la coronilla, entre las antenas — anatomía real de abeja que
            además le da a la frente oscura un acento de vida. Puntos quietos:
            no parpadean ni miran (los ocelos reales no forman imagen). */}
        <g fill={ABEJA_PALETA.ocelo} opacity="0.85" aria-hidden="true">
          <circle cx="8.0" cy="-4.65" r="0.26" />
          <circle cx="8.7" cy="-4.95" r="0.3" />
          <circle cx="9.4" cy="-4.6" r="0.26" />
        </g>
        {/* MÁSCARA FACIAL clara: la marca amarilla del clípeo de la angelita real —
            y, a la vez, el fondo sobre el que la carita (ojos/boca/cejas del agente)
            sigue leyéndose pese a la cabeza oscura. Va bajo ojos/cachetes/boca.
            (2026-08-23: sube y crece un pelo — antes el aro de tinta de los ojos
            se PERDÍA contra la testa oscura y la carita quedaba apretada abajo;
            con la máscara respaldando los dos ojos, la línea del ojo siempre
            pisa fondo claro y la cara se lee a cualquier tamaño. El margen
            oscuro alrededor se conserva: la cabeza sigue siendo la mitad
            oscura del bicho.) */}
        <ellipse cx="9.3" cy="-0.7" rx="3.4" ry="3.85" fill={ABEJA_PALETA.cara} opacity="0.95" />
        {/* chapetas campesinas + sonrisa + ojos de goma (parpadean juntos).
            CARA re-skin 2026-08-21 (referencia ref-abeja.png, Cuphead/Miss
            Minutes): ojos más grandes y redondos (r 2.1/1.6 — el TECHO que las
            gafas de sol pueden cubrir sin que el aro del ojo se asome tras el
            lente; los centros NO se mueven: gafas, cejas y CSS de mirada
            cuelgan de ahí) + sonrisa más ancha y cálida (w 3.6) que remata en
            los cachetes. BocaVisema recibe LOS MISMOS w/prof que la sonrisa
            para que el lip-sync no salte al arrancar; prof queda en 1.2 porque
            más profundidad saca la lengüita del visema V3 fuera del mentón. */}
        <Cachetes puntos={[{ cx: 10.4, cy: 0.7, r: 1.25 }, { cx: 6.9, cy: 0.3, r: 0.95 }]} vivo={vivo} />
        {/* Boca: lip-sync si hay visema; si no, la sonrisa de goma de siempre.
            Envuelta en `.crt-boca` (pivote centrado) para que los GESTOS del
            agente la agarren por CSS (el bostezo la abre en grande). */}
        <g className="crt-boca" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          {visemaAplicada
            ? <BocaVisema cx={8.9} cy={1.4} w={3.6} prof={1.2} visema={visemaAplicada} />
            : <Sonrisa cx={8.9} cy={1.4} w={3.6} prof={1.2} />}
        </g>
        {/* OJO COMPUESTO cálido (iter2 2026-08-23, anatomía dura): una abeja
            NO tiene esclerótica blanca — el ojo real de la angelita es una
            masa OSCURA lateral. El globo pasa a miel muy oscura (esclera),
            la mirada vive en la pseudopupila: anillo dorado (el MISMO oro de
            la franja del mesosoma) + pupila + catchlight — de lejos ojo de
            abeja de lámina, de cerca la chispa de mascota. `tornasol` pone el
            barrido de luz corneal del ojo compuesto. Centros y radios NO se
            mueven (gafas, cejas y CSS de mirada cuelgan de ahí); parpadeo y
            dart (rh-blink / rh-mirada) intactos. */}
        <OjosRubber
          ojos={[{ cx: 10.1, cy: -1.9, r: 2.1 }, { cx: 7.4, cy: -2.2, r: 1.6 }]}
          mirar={[0.3, 0.34]}
          parpadea={vivo}
          esclera={ABEJA_PALETA.ojo}
          iris={ABEJA_PALETA.ojoIris}
          tornasol
        />
        {/* cejas expresivas (opt-in): el rasgo que actúa alegría/atención/foco.
            CLARAS sobre la testa oscura (2026-08-23): en tinta no se veían. */}
        {cejasAplicadas && <CejasRubber estilo={cejasAplicadas} color={ABEJA_PALETA.cara} />}
        {/* antenas GENICULADAS que se mecen (secondary motion). Iter2
            2026-08-23: la antena real de abeja tiene CODO (escapo + flagelo
            quebrado), no un arco de caña — el trazo ahora dobla a mitad de
            camino y el bombillo baja de globo (1.15) a yema (0.7): remate de
            masa rubber-hose, ya no globo de caricatura. Los EXTREMOS no se
            mueven (misma silueta de conjunto, mismo sway/delays). */}
        <AntenaRubber d="M7.7,-4.7 C7.3,-6.1 7.0,-7.0 6.4,-7.4 C7.1,-8.2 7.8,-9.3 8.3,-10.1" bulbo={[8.3, -10.3]} bulboR={0.7} sway={vivo} delay={0} />
        <AntenaRubber d="M9.7,-4.6 C10.1,-5.9 10.3,-6.8 10.0,-7.4 C10.6,-8.3 10.8,-9.5 10.5,-10.3" bulbo={[10.5, -10.5]} bulboR={0.7} sway={vivo} delay={-0.3} />
        {/* gafas de sol (opt-in): por ENCIMA de ojos y cejas — con 'poniendose'
            caen desde arriba con overshoot y el destello barre el lente */}
        {gafasAplicadas && <GafasSol puesta={gafasAplicadas === 'poniendose' ? 'poniendose' : 'puesta'} animated={vivo} />}
      </g>

      {/* Sombrero + sudor por clima+hora — solo con vestuario=true. La ruana
          YA se pintó arriba, antes de las alas (ver el bloque de más arriba);
          este orden (después de la cabeza) sigue siendo el correcto para el
          sombrero, que debe quedar ENCIMA de la cabeza. */}
      {(ropa?.sombrero || ropa?.sudor) && (
        <AccesoriosClima
          estado={{ sombrero: ropa.sombrero, sudor: ropa.sudor }}
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
  const cuerpoVivo = lineBoilAplicado ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  // data-estado agrupa la reacción para el CSS (brillo mojado, jadeo, mordisco).
  // data-pose SOLO cuando está viva: así los gestos (celebra/reposo/señala) no
  // corren con animated=false — la abeja queda en fotograma digno (bracitos
  // colgando, sonriendo). RM lo apaga además por dentro del CSS.
  const estadoAttrs = {
    'data-creature': 'abeja-angelita',
    'data-pose': vivo ? poseAplicada : undefined,
    'data-animo': animoAplicado,
    'data-tier': tier || undefined,
    'data-mojada': mojadaAplicada ? '1' : undefined,
    'data-sed': sedAplicada ? '1' : undefined,
    'data-comiendo': comiendoAplicada ? '1' : undefined,
    'data-visema': visemaAplicada || undefined,
    'data-ruana': ropa?.ruana ? '1' : undefined,
    'data-sombrero': ropa?.sombrero ? '1' : undefined,
    'data-sudor': ropa?.sudor ? '1' : undefined,
    'data-lineboil': lineBoilAplicado ? '1' : undefined,
    'data-polen': polenAplicado ? '1' : undefined,
    'data-prop': mundoIdAplicado || undefined,
    'data-gafas': gafasAplicadas ? (gafasAplicadas === 'poniendose' && vivo ? 'poniendose' : '1') : undefined,
    'data-cejas': cejasAplicadas || undefined,
  };

  if (inline) {
    // En modo inline el power-up lo pone el host DOM (::before/mix-blend no
    // aplican a SVG); acá solo marcamos data-poder por si el host lo consulta.
    return (
      <g className={className} style={estiloClima} data-poder={poderAplicado ? '1' : undefined} {...estadoAttrs}>
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
  if (poderAplicado) {
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
