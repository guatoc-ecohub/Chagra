import { useId } from 'react';
import './creatures.css';
import './maizCompai.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, RH_INK } from './_rubberhose.jsx';
import {
  MAIZ_PALETA, MAIZ_PROPORCION, MAIZ_SLUG, PERFIL_MAIZ,
} from './maizIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* EL MAÍZ COMPAÑERO — Zea mays, la mata madre de la milpa: LA QUE ALIMENTA.
   Hermano rubber-hose de la abeja Angelita y la zarigüeya: compone el MISMO
   kit `_rubberhose.jsx` (ojos de goma, cachetes, sonrisa) y hereda la MISMA
   fundación transversal — lip-sync (BocaVisema), clima→cuerpo (PERFIL_MAIZ),
   line-boil, modo poder — cero código duplicado. Solo que NO es un bicho:
   es una PLANTA, y eso decide su carácter entero:
     · ARRAIGADA: no tiene pies — tiene un montículo de tierra aporcada con
       raicitas que asoman. El único personaje del elenco que NO viaja.
     · MECIDA: su idle no es andar ni volar, es la BRISA — cada hoja con su
       propio compás (períodos co-primos, asimetría), jamás en bloque.
     · CORONADA: el penacho (espiga) es su firma de silueta Y su órgano de
       reacción: cuando algo la emociona, el plumero VIBRA (data-vibra).

   ── LA SILUETA MANDA (ver MAIZ_FIRMA en maizIdentidad.js) ───────────────────
   Penacho en plumero + hojas-cinta (una alzada, otra vencida) + mazorca al
   costado con barbas + base de montículo. Todo sobrevive al negro sobre
   blanco. El contraste interno es el Ent frailejón: roseta gorda y quieta de
   viejo sabio — el maíz es esbelto, joven y bailarín.

   ── POR QUÉ NO SE VISTE (AccesoriosClima) ───────────────────────────────────
   Igual que la zarigüeya: la ruana especie-agnóstica taparía la mazorca (su
   firma) y una mata con sombrero de fieltro lee disfraz, no clima. El clima
   se le escribe en el CUERPO por `cuerpoDeClima` (tinte + opacidad) con
   PERFIL_MAIZ (sequía 0.95: la seca se le nota de una — es lo real).

   La IDENTIDAD (paleta + proporciones + firma) vive en `maizIdentidad.js`;
   la CADENCIA, en `maizCompai.css` (clases `maiz-*`). */
const VIEWBOX = '-16 -26 32 46';

/* Las 4 hojas-cinta: POSICIÓN en el grupo externo (atributo transform),
   CADENCIA en el interno (.maiz-hoja) — si se juntaran, la animación CSS
   pisaría el atributo y las hojas caerían apiladas (lección de las crías de
   la zarigüeya). Cada una con su duración/delay co-primos = brisa ASIMÉTRICA:
   el viento nunca las mueve en bloque. `origen` = su unión al tallo. */
const HOJAS = [
  {
    id: 'brazo-alzado',
    d: `M1.8,-2.0 C5.6,-3.6 8.8,-6.4 10.6,-10.4 C11.1,-11.5 12.3,-11.4 12.5,-10.3
        C13.0,-7.0 10.4,-2.8 6.2,-0.6 C4.4,0.1 2.4,-0.2 1.8,-1.0 Z`,
    vena: 'M2.4,-1.4 C5.8,-2.8 8.8,-5.6 10.9,-9.6',
    origen: 'left bottom', dur: '3.4s', delay: '-0.6s',
  },
  {
    id: 'brazo-vencido',
    d: `M-1.5,-3.4 C-6.0,-6.2 -10.4,-6.0 -13.3,-2.4 C-14.5,-0.9 -14.1,0.9 -12.7,0.4
        C-9.9,-0.6 -5.9,-1.5 -1.3,-1.0 Z`,
    vena: 'M-2.0,-2.6 C-6.2,-4.6 -10.2,-4.4 -12.9,-1.4',
    origen: 'right center', dur: '4.1s', delay: '-1.7s',
  },
  {
    id: 'falda-izq',
    d: `M-1.2,8.0 C-5.4,6.8 -9.4,7.8 -12.3,11.2 C-9.1,11.7 -4.9,10.7 -1.0,9.5 Z`,
    vena: 'M-1.8,8.4 C-5.4,7.9 -8.9,8.9 -11.5,10.8',
    origen: 'right center', dur: '3.1s', delay: '-2.3s',
  },
  {
    id: 'falda-der',
    d: `M1.4,5.4 C5.7,4.1 9.7,5.1 12.5,8.7 C9.3,9.2 5.1,8.0 1.2,6.9 Z`,
    vena: 'M2.0,5.8 C5.6,5.2 9.1,6.1 11.7,8.2',
    origen: 'left center', dur: '4.6s', delay: '-1.1s',
  },
];

export function MaizCompai({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Planta de maíz',
  /* Pose de VIDA species-agnostic ('anda' base — aquí es "está": la mata no
     anda, pero el contrato de data-pose se respeta para el CSS transversal). */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (PERFIL_MAIZ: sequía 0.95 — la seca se le
     nota de una). Sin clima (avatares, catálogo) = neutro digno. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (useLipSync → BocaVisema): la boquita del choclo se abre
     cuando el agente narra. Sin visema (o 'V1') = la sonrisa de siempre. */
  visema = null,
  /* ── SED (reacción de finca): las hojas pierden su brisa (se aquietan
     vencidas) — el maíz es el personaje MÁS sensible a la seca. */
  sed = false,
  /* ── VIBRA (su reacción-firma): el penacho tiembla de emoción — al toque de
     hotspot, a la celebración. OPT-IN, la escena lo enciende un instante. */
  vibra = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren la brisa plena;
     'bajo' apaga el idle continuo (brisa + boil) y deja lo reactivo (vibra). */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30) — OPT-IN. */
  lineBoil = false,
  /* ── MODO PODER (aura de 4 capas) — OPT-IN. */
  poder = false,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.12, Math.min(0.34, 0.14 + 0.2 * (energia ?? 1)));
  const auraR = 9.2 + 1.6 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_MAIZ });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = MAIZ_PALETA;
  const PR = MAIZ_PROPORCION;

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // BOCA del choclo: visema (el agente narra) o la sonrisa de siempre.
  const boca = visema
    ? <BocaVisema cx={0.5} cy={-9.6} w={2.6} prof={1.0} visema={visema} />
    : <Sonrisa cx={0.5} cy={-9.7} w={2.4} prof={0.9} />;

  // ── EL PENACHO (LA FIRMA + el órgano de reacción) ─────────────────────────
  // Cinco plumas en abanico ASIMÉTRICO (tres a un lado, dos al otro, largos
  // distintos) con las anteras como bombillos en las puntas. Tinta debajo,
  // color encima (contorno rubber-hose de dos pasadas). El grupo entero se
  // mece (.maiz-penacho) y VIBRA cuando la mata reacciona (data-vibra).
  const PLUMAS = [
    { d: 'M0.5,-16.2 C0.5,-19.0 0.3,-21.2 0.1,-23.4', punta: [0.05, -23.6] },
    { d: 'M0.3,-16.2 C-1.5,-18.6 -3.0,-20.2 -4.6,-21.0', punta: [-4.8, -21.1] },
    { d: 'M0.3,-16.0 C-1.2,-17.3 -2.7,-18.0 -4.1,-18.2', punta: [-4.3, -18.2] },
    { d: 'M0.7,-16.2 C2.3,-18.8 3.7,-20.4 5.1,-21.3', punta: [5.3, -21.4] },
    { d: 'M0.7,-16.0 C2.1,-17.1 3.3,-17.6 4.7,-17.8', punta: [4.9, -17.8] },
  ];
  const penacho = (
    <g className="maiz-penacho" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
      <g stroke={RH_INK} strokeWidth="2.1" fill="none" strokeLinecap="round">
        {PLUMAS.map((p) => <path key={p.d} d={p.d} />)}
      </g>
      <g stroke={P.penacho} strokeWidth="1.05" fill="none" strokeLinecap="round">
        {PLUMAS.map((p) => <path key={p.d} d={p.d} />)}
      </g>
      {/* anteras: los bombillos del plumero */}
      {PLUMAS.map((p) => (
        <circle key={p.d} cx={p.punta[0]} cy={p.punta[1]} r="0.85"
          fill={P.polen} stroke={RH_INK} strokeWidth="0.55" />
      ))}
      {/* motitas de polen que sueltan las anteras (flotan y se apagan) */}
      <g className="maiz-polen" fill={P.polen} opacity="0.8">
        <circle cx="-2.6" cy="-22.6" r="0.42" />
        <circle cx="3.4" cy="-23.2" r="0.36" />
      </g>
    </g>
  );

  // ── LA MAZORCA AL COSTADO (LA FIRMA: la carga que alimenta) ───────────────
  // Envuelta en su amero, recostada en el tallo, con las barbas cobrizas
  // asomando por la punta. Grupo propio (.maiz-mazorca): pesa y se mece con
  // su propio retraso (follow-through del cuerpo).
  const mazorca = (
    <g transform="translate(4.3 2.8) rotate(20)">
      <g className="maiz-mazorca" style={{ transformBox: 'fill-box', transformOrigin: 'center top' }}>
        {/* bráctea de atrás del amero */}
        <path d="M-1.4,-4.4 C-3.6,-1.8 -3.8,2.6 -1.8,5.2 C-3.0,1.8 -2.8,-1.6 -1.4,-4.4 Z"
          fill={P.amero} stroke={RH_INK} strokeWidth="0.8" />
        {/* el grano */}
        <ellipse cx="0" cy="0" rx={PR.mazorcaRx} ry={PR.mazorcaRy}
          fill={P.mazorca} stroke={RH_INK} strokeWidth="1.2" />
        {/* hileras de granos (dos costuras + tres arcos) */}
        <g stroke={P.grano} strokeWidth="0.5" fill="none" opacity="0.85">
          <path d="M-0.9,-4.3 C-1.3,-1.4 -1.3,1.6 -0.9,4.3" />
          <path d="M1.0,-4.2 C1.4,-1.4 1.4,1.5 1.0,4.2" />
          <path d="M-2.2,-1.6 C-0.7,-2.1 0.8,-2.1 2.2,-1.6" />
          <path d="M-2.4,0.4 C-0.8,-0.1 0.9,-0.1 2.4,0.4" />
          <path d="M-2.2,2.4 C-0.7,1.9 0.8,1.9 2.2,2.4" />
        </g>
        {/* bráctea de adelante (el amero que la abraza) */}
        <path d="M1.6,-4.0 C3.3,-1.2 3.3,2.8 1.3,5.4 C2.5,2.0 2.5,-1.2 1.6,-4.0 Z"
          fill={P.amero} stroke={RH_INK} strokeWidth="0.8" opacity="0.95" />
        {/* LAS BARBAS (sedas) cobrizas por la punta — grupo propio, tiemblan */}
        <g className="maiz-barba" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
          <g stroke={P.barba} strokeWidth="0.75" fill="none" strokeLinecap="round">
            <path d="M-0.4,-4.5 C-0.2,-6.0 0.8,-6.9 2.0,-7.0" />
            <path d="M0.2,-4.6 C0.8,-6.2 2.0,-7.2 3.3,-7.1" />
            <path d="M-0.8,-4.4 C-1.2,-5.8 -0.8,-6.9 0.2,-7.6" />
          </g>
        </g>
      </g>
    </g>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, montículo, tallo con nudos,
  //    hojas-cinta, mazorca, y la cabeza-choclo con su penacho. `.crt-body`
  //    respira (boil vegetal, override maiz-boil en maizCompai.css).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (verdor de mata sana) */}
      <circle cx="0" cy="-4" r={auraR} fill={P.hojaClara} opacity={auraOp} filter={`url(#${blur})`} />

      {/* ── EL ARRAIGO (firma): montículo aporcado + raicitas-deditos ──────── */}
      <g>
        <ellipse cx="0" cy="15.4" rx={PR.monticuloRx} ry={PR.monticuloRy}
          fill={P.tierra} stroke={RH_INK} strokeWidth="1.3" />
        {/* surcos y terrones del aporque */}
        <g stroke={P.tierraOscura} strokeWidth="0.6" fill="none" opacity="0.75">
          <path d="M-6.4,15.2 C-4.2,14.2 -1.8,13.8 0.6,14.0" />
          <path d="M-1.8,16.4 C0.8,15.8 3.4,15.8 5.6,16.4" />
        </g>
        <circle cx="-4.9" cy="16.6" r="0.85" fill={P.tierraOscura} opacity="0.8" />
        <circle cx="5.4" cy="14.6" r="0.65" fill={P.tierraOscura} opacity="0.7" />
        {/* raicitas que asoman como deditos (no hay pies: hay raíces) */}
        <g stroke={RH_INK} strokeWidth="0.9" fill="none" strokeLinecap="round">
          <path d="M-7.6,17.4 C-8.8,17.8 -9.6,18.5 -10.0,19.3" />
          <path d="M7.8,17.2 C8.9,17.7 9.6,18.4 9.9,19.2" />
        </g>
        <g stroke={P.raiz} strokeWidth="0.45" fill="none" strokeLinecap="round">
          <path d="M-7.6,17.4 C-8.8,17.8 -9.6,18.5 -10.0,19.3" />
          <path d="M7.8,17.2 C8.9,17.7 9.6,18.4 9.9,19.2" />
        </g>
      </g>

      {/* ── EL TALLO: culmo esbelto con leve S de vida y sus nudos ─────────── */}
      <path d="M0.0,14.6 C-0.9,8.5 0.9,2.5 -0.3,-4.0 C-0.6,-6.4 0.1,-7.6 0.4,-8.4"
        fill="none" stroke={RH_INK} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M0.0,14.6 C-0.9,8.5 0.9,2.5 -0.3,-4.0 C-0.6,-6.4 0.1,-7.6 0.4,-8.4"
        fill="none" stroke={P.cuerpo} strokeWidth="3.1" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${P.cuerpoGlow})` }} />
      {/* nudos del culmo (las rodillas de la caña) */}
      <g stroke={P.nudo} strokeWidth="0.85" strokeLinecap="round" opacity="0.9">
        <path d="M-1.8,7.6 L1.4,7.4" />
        <path d="M-1.3,0.6 L1.9,0.4" />
      </g>

      {/* ── LAS HOJAS-CINTA (firma): brisa asimétrica, cada una a su compás ── */}
      {HOJAS.map((h) => (
        <g key={h.id}>
          <g
            className="maiz-hoja"
            /* la duración va por CSS var (no por animationDuration inline):
               así el estado de SED (maizCompai.css) SÍ puede frenar la brisa
               — un inline le ganaría siempre a la hoja de estilos. */
            style={{
              transformBox: 'fill-box', transformOrigin: h.origen,
              '--brisa-dur': h.dur, '--brisa-delay': h.delay,
            }}
          >
            <path d={h.d} fill={P.hoja} stroke={RH_INK} strokeWidth="1.15" strokeLinejoin="round" />
            <path d={h.vena} fill="none" stroke={P.vena} strokeWidth="0.55" opacity="0.8" />
          </g>
        </g>
      ))}

      {/* LA MAZORCA — después de las hojas (se ve entera), antes de la cabeza. */}
      {mazorca}

      {/* ── LA CABEZA-CHOCLO: la carita de grano tierno entre dos brácteas ──── */}
      <g className="maiz-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* la cara (el choclo pelado que asoma) */}
        <ellipse cx="0.4" cy="-11.8" rx={PR.caraR} ry={PR.caraR + 0.4}
          fill={P.cara} stroke={RH_INK} strokeWidth="1.35" />
        {/* insinuación de hileras de grano en la frente (identidad sin ruido) */}
        <g stroke={P.grano} strokeWidth="0.4" fill="none" opacity="0.45">
          <path d="M-1.8,-15.4 C-0.4,-15.8 1.6,-15.8 2.9,-15.4" />
          <path d="M-2.6,-14.2 C-0.6,-14.7 2.2,-14.7 3.7,-14.2" />
        </g>
        {/* las dos brácteas que la abrazan (el amero de la cabeza) */}
        <path d="M-3.6,-15.9 C-6.0,-13.2 -6.0,-9.2 -3.5,-7.3 C-4.6,-10.0 -4.7,-13.2 -3.6,-15.9 Z"
          fill={P.hojaClara} stroke={RH_INK} strokeWidth="1.0" />
        <path d="M4.5,-15.7 C6.8,-13.0 6.8,-9.2 4.4,-7.4 C5.4,-10.0 5.5,-13.1 4.5,-15.7 Z"
          fill={P.hojaClara} stroke={RH_INK} strokeWidth="1.0" />
        {/* ojos de goma + chapetas campesinas + boca */}
        <OjosRubber
          ojos={[{ cx: -1.2, cy: -12.8, r: 1.55 }, { cx: 2.3, cy: -12.9, r: 1.45 }]}
          mirar={[0.2, 0.1]}
          parpadea={vivo}
        />
        <Cachetes puntos={[{ cx: -2.9, cy: -10.3, r: 1.1 }, { cx: 3.9, cy: -10.4, r: 1.0 }]} vivo={vivo} />
        {boca}
        {/* EL PENACHO corona la cabeza (se mece con ella y vibra solo) */}
        {penacho}
      </g>
    </g>
  );

  // Sin antics de viaje (rh-antic/rh-travieso trasladan — una mata arraigada
  // no deriva): la VIDA del maíz es la brisa de sus hojas + el boil vegetal.
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{body}</g> : body;

  const estadoAttrs = {
    'data-creature': MAIZ_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-sed': sed ? '1' : undefined,
    'data-vibra': vibra ? '1' : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
  };

  if (inline) {
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
  // MODO PODER (standalone): aura de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up maiz-poder"
        data-creature-poder={MAIZ_SLUG}
        style={{ '--aura-color': auraDeBicho(MAIZ_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default MaizCompai;
