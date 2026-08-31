import { useId } from 'react';
import './creatures.css';
import { CreatureFilters } from './_filters.jsx';
import { OjosRubber, Cachetes, Sonrisa, BocaVisema, Miembro, RH_INK } from './_rubberhose.jsx';
import {
  ZARIGUYA_PALETA, ZARIGUYA_PROPORCION, ZARIGUYA_SLUG, PERFIL_ZARIGUYA,
} from './zariguyaIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import { LineBoilFilter } from './LineBoilFilter.jsx';
import { PropEnMano } from './PropEnMano.jsx';
import { AuraPoder } from './AuraPoder.jsx';
import { auraDeBicho } from './transformacion.js';

/* LA ZARIGÜEYA — chucha / fara / runcho (Didelphis), el marsupial NOCTURNO de
   la finca andina: LA QUE CARGA. Hermana rubber-hose de la abeja Angelita, el
   oso guardián y la danta: compone el MISMO kit `_rubberhose.jsx` (ojos de
   goma, cachetes, sonrisa, miembros manguera) y hereda la MISMA fundación
   transversal — lip-sync (useLipSync → BocaVisema), modo poder (transformacion,
   aura ROSA DE LUNA), prop por mundo (PropEnMano) y line-boil (LineBoilFilter)
   — cero código duplicado. Solo cambia el ANIMAL y su CARÁCTER: nocturna,
   humilde, curiosa por la nariz y MADRE.

   ── LA SILUETA MANDA (ver ZARIGUYA_FIRMA en zariguyaIdentidad.js) ────────────
   Su firma es de FORMA, no de color — se reconoce en negro sobre blanco:
     · LAS CRÍAS AL LOMO: el contorno de la espalda no es una curva limpia sino
       una escalerita de bultos. Es LA firma (y conducta real: cuando ya no
       caben en el marsupio viajan agarradas al pelo del lomo).
     · HOCICO en CUÑA, largo y puntiagudo, con la trufa al final.
     · COLA PRENSIL DESNUDA que nace BAJA en la grupa, barre el suelo y remata
       en gancho enroscado.
     · OREJAS grandes, redondas y desnudas, altas en el contorno.
     · POSTURA ERGUIDA que husmea, con las manitos recogidas al pecho: masa
       VERTICAL. El gurre escarba pegado al suelo (masa HORIZONTAL) — ese
       contraste de eje es lo que los separa a 64 px. Dibujarla horizontal fue
       el error que hundió el primer intento (PR #2613).

   ── POR QUÉ NO SE VISTE (AccesoriosClima) ───────────────────────────────────
   A propósito NO expone `vestuario`: `AccesoriosClima` es especie-agnóstico y
   pinta la ruana OPACA y por encima del tronco — sobre esta criatura taparía
   justo las CRÍAS DEL LOMO, o sea su firma (el mismo bug que hizo que la abeja
   pareciera un burro con poncho, arreglado en el PR #2782). El clima igual se
   le escribe en el cuerpo por `clima` (tinte + opacidad vía cuerpoDeClima), que
   no tapa nada. Si algún día necesita abrigo, la ruana debe pintarse ANTES de
   las crías y por DEBAJO de ellas — nunca en la llamada única de último.

   La IDENTIDAD (paleta + proporciones + firma) vive en `zariguyaIdentidad.js`;
   la CADENCIA, en `creatures.css` (clases `zari-*`). */
const VIEWBOX = '-16 -20 32 40';

export function Zariguya({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Zarigüeya (chucha)',
  /* Pose de VIDA (idle-life), species-agnostic (gestos rh-g-* de creatures.css):
     'anda' (base) | 'celebra' | 'reposo' | 'señala'. Solo corren viva
     (animated); con animated=false o reduced-motion queda en fotograma digno. */
  pose = 'anda',
  animo = 'sereno',
  energia = 1,
  /* CLIMA REAL escrito en el cuerpo (perfil zarigüeya: el pelo de guardia se
     empapa rápido, la niebla se la traga). Sin clima (avatares, catálogo) =
     neutro digno. */
  clima = null,
  enso = 'neutro',
  /* ── LIP-SYNC (sistema transversal, useLipSync) ────────────────────────────
     visema opcional ('V1'..'V4'): la boca —al final de la cuña del hocico— se
     abre cuando el agente narra. Sin visema (o 'V1') = la sonrisa de siempre. */
  visema = null,
  /* ── LAS CRÍAS AL LOMO (su FIRMA) ──────────────────────────────────────────
     Cuántas viajan en la espalda (0-3). Default 3: el personaje base LAS LLEVA,
     no son un adorno que se agrega después — sin ellas el contorno pierde la
     escalerita de bultos que la hace inconfundible. Ponerlo en 0 es legítimo
     (una joven que todavía no es madre) pero DEGRADA la firma: úsese a
     sabiendas. */
  crias = ZARIGUYA_PROPORCION.crias,
  /* ── HUSMEA (el hocico en el aire — su reacción-firma) ─────────────────────
     OPT-IN: la cuña del hocico se alza y tantea a lado y lado, las vibrisas
     tiemblan y las orejas se enderezan. El marsupial vive por la nariz.
     Default false → husmeo idle suave. */
  husmea = false,
  /* ── TANATOSIS (hacerse la muerta — el gag más suyo) ───────────────────────
     OPT-IN: la conducta real que le da el nombre en inglés ("playing possum")
     y que en rubber-hose es puro Miss Minutes: se tumba de lado, se le sale la
     lengüita, los ojos se cierran… y la cola sigue enroscándose sola porque no
     está muerta ni por asomo. Las crías se aguantan agarradas. Default false. */
  tanatosis = false,
  /* Device-tier (DR-3D-PERF-GAMABAJA): 'alto'|'medio' corren el rubber-hose
     pleno; 'bajo' apaga el idle continuo (boil + cola + crías + vibrisas) y
     deja los estados reactivos (husmea/tanatosis). */
  tier,
  /* ── LÍNEA QUE RESPIRA (line-boil, Cuphead años 30) ────────────────────────
     OPT-IN: el CONTORNO vibra escalonado (~10fps). Default false. */
  lineBoil = false,
  /* ── MODO PODER (transformación / power-up ROSA DE LUNA) ───────────────────
     OPT-IN: se envuelve en su aura de 4 capas — el rosado desnudo de orejas,
     trufa y cola encendido de noche. */
  poder = false,
  /* ── PROP POR MUNDO (herramienta en la manito — propsPorMundo/PropEnMano) ── */
  mundoId = null,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `crt-glow-${uid}`;
  const blur = `crt-blur-${uid}`;
  const boil = `crt-boil-${uid}`;
  const vivo = animated;
  const auraOp = Math.max(0.14, Math.min(0.4, 0.16 + 0.24 * (energia ?? 1)));
  const auraR = 8.4 + 1.5 * (energia ?? 1);

  // CLIMA → cuerpo (determinista, una vez por render): tinte + opacidad. Sin
  // alas (velocidadAlas siempre 1: no se usa).
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_ZARIGUYA });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const P = ZARIGUYA_PALETA;
  const PR = ZARIGUYA_PROPORCION;
  const nCrias = Math.max(0, Math.min(3, Math.round(crias)));

  const defs = (
    <defs>
      <CreatureFilters glow={glow} blur={blur} />
      {lineBoil && <LineBoilFilter id={boil} animated={vivo} />}
    </defs>
  );

  // PROP DEL MUNDO en la manito recogida. Sin mundoId → null (manitos libres).
  const propMundo = mundoId ? (
    <PropEnMano mundoId={mundoId} x={5.4} y={4.6} escala={0.62} ink={RH_INK} animated={vivo} />
  ) : null;

  // BOCA al final de la cuña del hocico: visema (el agente narra) o la sonrisa
  // humilde de siempre.
  const boca = visema
    ? <BocaVisema cx={8.6} cy={-9.0} w={2.4} prof={0.9} visema={visema} />
    : <Sonrisa cx={8.6} cy={-9.2} w={2.2} prof={0.8} />;

  // ── LAS CRÍAS AL LOMO (LA FIRMA) ──────────────────────────────────────────
  // Escalonadas en abanico sobre la diagonal del lomo (de la nuca a la grupa),
  // cada una con su ángulo y su tamaño: así se ven las TRES enteras en vez de
  // encimarse, y el contorno superior queda con bultos y VALLES entre ellos
  // (que es lo que sobrevive al test de negro). Cada cría es la madre en
  // pequeño — cabecita con hocico ya puntudo, orejita redonda, manito que
  // agarra el pelo y colita pelona: NO es un muñeco redondo.
  // Van MONTADAS SOBRE el borde de la espalda (no dentro del cuerpo: ahí se
  // camuflarían y la firma desaparecería), mirando hacia atrás —a la
  // izquierda— mientras la madre mira adelante. Esa contradicción de sentidos
  // es parte de lo que hace la silueta única.
  // Los centros van SOBRE la línea del lomo (no dentro del cuerpo: ahí se
  // camuflarían y la firma desaparecería): cada bultito queda medio afuera y
  // medio adentro, que es como se monta una cría de verdad. Escalonadas de la
  // nuca a la grupa, con valles visibles entre ellas — esos valles son lo que
  // sobrevive al test de negro.
  const POS_CRIAS = [
    { x: -1.4, y: -9.0, s: 1.0, rot: -8, d: -0.0 },
    { x: -6.6, y: -6.4, s: 1.08, rot: -20, d: -0.9 },
    { x: -10.2, y: -1.0, s: 0.95, rot: -34, d: -1.7 },
  ];

  // Cada cría es la madre en pequeño: cuerpito, hocico YA puntudo, orejita
  // redonda, colita pelona y la manito que agarra el pelo. Dibujada CENTRADA
  // en su origen (para que translate/rotate la coloquen sin sorpresas) y
  // mirando hacia atrás — la madre mira adelante, ellas miran de dónde vienen.
  const criasAlLomo = nCrias > 0 && (
    <g className="zari-crias">
      {POS_CRIAS.slice(0, nCrias).map((c, i) => (
        // OJO: la POSICIÓN va en un grupo EXTERNO (atributo transform) y la
        // CADENCIA en uno interno (clase .zari-cria). Si se juntaran, la
        // animación CSS —que escribe `transform`— PISARÍA el atributo y las
        // tres crías caerían apiladas en el origen del viewBox. Pasó, y en la
        // captura se leía como una sola cría en el pecho.
        <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.s})`}>
        <g
          className="zari-cria"
          style={{ transformBox: 'fill-box', transformOrigin: 'center bottom', animationDelay: `${c.d}s` }}
        >
          {/* colita pelona enroscada (asoma por el lado de atrás) */}
          <path d="M2.0,0.8 C3.8,1.4 4.4,0.2 3.6,-0.9" fill="none"
            stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" />
          {/* cuerpito agachado: EL BULTO que rompe la línea del lomo */}
          <ellipse cx="0" cy="0" rx="2.45" ry="2.05"
            fill={P.cria} stroke={RH_INK} strokeWidth="1.0" />
          {/* orejita redonda desnuda (chiquita pero grande para su cabeza) */}
          <circle cx="-2.35" cy="-2.5" r="0.98" fill={P.oreja} stroke={RH_INK} strokeWidth="0.62" />
          <circle cx="-2.35" cy="-2.45" r="0.4" fill={P.orejaPiel} />
          {/* cabecita con el HOCICO YA PUNTUDO (la firma en miniatura) */}
          <circle cx="-1.85" cy="-1.5" r="1.45" fill={P.cria} stroke={RH_INK} strokeWidth="0.9" />
          <path d="M-2.5,-2.2 C-3.6,-2.9 -4.8,-2.9 -5.3,-2.3 C-5.7,-1.8 -5.4,-1.2 -4.7,-1.2
                   C-4.0,-1.3 -3.1,-1.0 -2.6,-0.6 Z"
            fill={P.cara} stroke={RH_INK} strokeWidth="0.82" strokeLinejoin="round" />
          <circle cx="-5.1" cy="-1.9" r="0.42" fill={P.trufa} />
          {/* ojito de goma (chiquito, despierto) */}
          <circle cx="-2.1" cy="-1.75" r="0.66" fill="#fffaf0" stroke={RH_INK} strokeWidth="0.32" />
          <circle cx="-2.22" cy="-1.68" r="0.33" fill="#20130a" />
          {/* manito que AGARRA el pelo del lomo (por eso no se cae) */}
          <path d="M-0.4,1.9 C-0.2,2.7 0.6,3.0 1.3,2.6" fill="none"
            stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" />
        </g>
        </g>
      ))}
    </g>
  );

  // ── CUERPO rubber-hose (atrás→adelante): aura, cola prensil, patas
  //    traseras plantígradas, tronco ERGUIDO en pera, pelo de guardia, crías al
  //    lomo, manitos recogidas al pecho y la cabeza con la CUÑA del hocico.
  //    `.crt-body` es el nodo que squashea (boil zarigüeya: menudo y rápido).
  const body = (
    <g className={`crt-body${vivo ? ' rh-boil' : ''}`} filter={`url(#${glow})`}>
      {/* aura viva (presencia chica y nocturna) */}
      <circle cx="-1" cy="3" r={auraR} fill={P.cuerpo} opacity={auraOp} filter={`url(#${blur})`} />

      {/* ── LA COLA PRENSIL DESNUDA (firma) ───────────────────────────────────
          Nace BAJA en la grupa (no en el lomo: naciendo alta se leía como un
          ala flotando), barre el suelo hacia atrás y remata en GANCHO
          enroscado. Piel desnuda con anillado, y una base PELUDA que la ancla
          al cuerpo. Grupo propio (.zari-cola): se enrosca y desenrosca sola. */}
      <g className="zari-cola" style={{ transformBox: 'fill-box', transformOrigin: 'right center' }}>
        <path d="M-6.4,10.4 C-10.4,12.8 -14.2,12.2 -15.0,8.8 C-15.7,5.6 -13.8,3.0 -11.6,3.4
                 C-10.0,3.7 -9.4,5.4 -10.6,6.3"
          fill="none" stroke={RH_INK} strokeWidth="2.9" strokeLinecap="round" />
        <path d="M-6.4,10.4 C-10.4,12.8 -14.2,12.2 -15.0,8.8 C-15.7,5.6 -13.8,3.0 -11.6,3.4
                 C-10.0,3.7 -9.4,5.4 -10.6,6.3"
          fill="none" stroke={P.cola} strokeWidth="1.5" strokeLinecap="round" />
        {/* anillado de la cola pelona (piel, no pelo) */}
        <g stroke={RH_INK} strokeWidth="0.42" opacity="0.5" fill="none">
          <path d="M-8.6,11.9 L-8.2,10.5" />
          <path d="M-11.2,12.4 L-11.0,10.9" />
          <path d="M-13.8,11.1 L-13.1,9.9" />
          <path d="M-15.0,8.2 L-13.7,8.0" />
          <path d="M-14.1,5.0 L-13.1,5.8" />
        </g>
        {/* base PELUDA: donde el pelo de guardia todavía cubre la cola */}
        <path d="M-5.0,8.6 C-7.4,8.9 -8.6,10.0 -8.8,11.6 C-7.0,11.0 -5.6,10.4 -4.6,10.0 Z"
          fill={P.colaBase} stroke={RH_INK} strokeWidth="1.0" strokeLinejoin="round" />
      </g>

      {/* patas traseras PLANTÍGRADAS (apoya toda la planta: no anda de puntas),
          con el pie claro y el halux separado. Sostienen el cuerpo erguido. */}
      <Miembro d="M-4.6,10.2 C-5.4,11.9 -5.6,13.0 -5.2,13.8" ancho={3.2}
        punta={[-5.2, 14.1]} puntaR={2.0} pie sway={vivo} delay={-0.8} glove={P.mitones} />
      <Miembro d="M0.6,10.8 C1.2,12.4 1.3,13.4 0.9,14.0" ancho={3.0}
        punta={[0.9, 14.3]} puntaR={1.9} pie sway={vivo} delay={-1.1} glove={P.mitones} />

      {/* ── TRONCO EN PERA INCLINADA (masa DIAGONAL — el contraste con el
          gurre, que escarba horizontal y pegado al suelo). Ancho y bajo en la
          grupa (los cuartos traseros sobre los que se incorpora), angosto y
          alto en los hombros: así el LOMO es una diagonal ascendente — la
          plataforma donde van montadas las crías. Sin esa diagonal las crías
          caen dentro del cuerpo y la firma se pierde. */}
      <path d="M-9.4,7.2 C-10.6,1.4 -7.6,-3.6 -1.6,-5.8 C3.2,-7.6 7.0,-5.0 7.2,-0.4
               C7.4,4.6 4.6,9.6 -0.6,11.0 C-5.8,12.4 -8.8,11.0 -9.4,7.2 Z"
        fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${P.cuerpoGlow})` }} />
      {/* lanilla clara del vientre (asoma bajo el pelo de guardia): va por el
          lado de ADELANTE-ABAJO, el opuesto al lomo cargado. */}
      <path d="M0.4,-3.0 C4.2,-2.2 6.2,1.2 5.4,5.2 C4.6,8.8 2.0,10.4 -1.0,10.6
               C1.6,8.0 3.0,3.6 1.6,-0.4 Z"
        fill={P.panza} opacity="0.85" />
      {/* PELO DE GUARDIA largo y desgreñado: mechones que ROMPEN la silueta por
          la grupa y el borde de la espalda (contra el domo liso y rígido del
          armadillo). */}
      <g stroke={P.guardia} strokeWidth="1.0" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M-9.0,4.6 C-10.8,4.0 -11.8,3.4 -12.4,2.6" />
        <path d="M-8.6,8.2 C-10.4,8.6 -11.4,8.6 -12.2,8.2" />
        <path d="M-6.0,10.6 C-7.0,12.0 -7.6,12.8 -7.8,13.6" />
        <path d="M-7.2,-2.2 C-8.8,-3.2 -9.6,-4.0 -9.8,-5.0" />
      </g>

      {/* LAS CRÍAS AL LOMO — encima del tronco, sobre la diagonal de la
          espalda. Van DESPUÉS del cuerpo (se ven enteras) y ANTES de la
          cabeza (la nuca de la madre las solapa apenas: ahí van agarradas). */}
      {criasAlLomo}

      {/* MANITOS RECOGIDAS contra el pecho — lo que hace un marsupial al
          pararse a oler. No son patas de apoyo: cuelgan cortas y curvas. */}
      <Miembro clase="crt-brazo-l" origen="right top"
        d="M2.8,-3.0 C4.6,-1.6 5.4,0.2 4.8,2.0" ancho={2.6}
        punta={[4.7, 2.3]} puntaR={1.5} sway={vivo} delay={-0.25} glove={P.mitones} />
      <Miembro clase="crt-brazo-r" origen="left top"
        d="M5.0,-3.8 C7.0,-2.6 7.8,-0.8 7.2,1.0" ancho={2.4}
        punta={[7.1, 1.3]} puntaR={1.4} sway={vivo} delay={-0.55} glove={P.mitones} />

      {/* ── CABEZA (grupo propio .zari-cabeza): orejas GRANDES redondas
          desnudas + cráneo + la CUÑA del hocico con vibrisas y trufa. El
          translate del grupo padre la lleva a lo alto de la diagonal (los
          hombros); va en un nodo APARTE del animado para que la cadencia CSS
          (que escribe `transform`) no lo pise. */}
      <g transform="translate(2.4 -1.0)">
      <g className="zari-cabeza" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* OREJAS grandes, redondas y DESNUDAS (firma), altas y separadas para
            que muerdan el contorno. Grupo propio: se enderezan al husmear. */}
        <g className="zari-orejas" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
          <circle cx="-1.6" cy="-11.4" r={PR.orejaR} fill={P.oreja} stroke={RH_INK} strokeWidth="1.15" />
          <circle cx="-1.6" cy="-11.2" r={PR.orejaR * 0.5} fill={P.orejaPiel} opacity="0.75" />
          <circle cx="3.9" cy="-12.4" r={PR.orejaR * 1.02} fill={P.oreja} stroke={RH_INK} strokeWidth="1.15" />
          <circle cx="3.9" cy="-12.2" r={PR.orejaR * 0.52} fill={P.orejaPiel} opacity="0.85" />
        </g>

        {/* cráneo */}
        <circle cx="1.4" cy="-8.4" r={PR.cabezaR} fill={P.cuerpo} stroke={RH_INK} strokeWidth="1.4" />
        {/* chapetas campesinas */}
        <Cachetes puntos={[{ cx: -1.4, cy: -6.6, r: 1.15 }, { cx: 4.0, cy: -6.2, r: 1.05 }]} vivo={vivo} />

        {/* ── EL HOCICO EN CUÑA (firma): sale del cráneo como una punta larga
            —más larga que el radio de la cabeza— y termina en la trufa. Va en
            la CARA PÁLIDA (la máscara clara del marsupial), que además le da a
            la boca un escenario donde leerse. Grupo propio (.zari-hocico):
            husmea (sube y tantea) y tiembla al hablar. Pivote en la base. */}
        <g className="zari-hocico" style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}>
          <path d={`M-0.4,-10.2 C2.4,-12.0 5.2,-11.6 ${1.4 + PR.hocicoLargo},-9.2
                    C${1.4 + PR.hocicoLargo + 1.4},-8.6 ${1.4 + PR.hocicoLargo + 1.5},-7.6 ${1.4 + PR.hocicoLargo + 0.4},-7.4
                    C5.6,-7.0 2.2,-6.0 -0.2,-6.6 C-1.6,-7.6 -1.6,-9.2 -0.4,-10.2 Z`}
            fill={P.cara} stroke={RH_INK} strokeWidth="1.25" strokeLinejoin="round" />
          {/* la TRUFA rosada al final de la cuña */}
          <ellipse cx={1.4 + PR.hocicoLargo + 0.5} cy="-8.1" rx="1.15" ry="0.95"
            fill={P.trufa} stroke={RH_INK} strokeWidth="0.6" />
          {/* VIBRISAS: el marsupial lee el mundo con ellas (grupo .zari-bigote) */}
          <g className="zari-bigote" style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}>
            <g stroke={RH_INK} strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.75">
              <path d="M8.4,-9.0 C10.0,-10.4 11.2,-11.0 12.4,-11.2" />
              <path d="M8.6,-8.2 C10.4,-8.6 11.8,-8.6 13.0,-8.4" />
              <path d="M8.4,-7.4 C10.0,-6.8 11.2,-6.2 12.0,-5.4" />
            </g>
          </g>
          {boca}
        </g>

        {/* el ANTIFAZ oscuro que le cruza los ojos (contra la cara pálida) */}
        <path d="M-2.6,-9.6 C-0.8,-10.8 1.6,-10.9 3.4,-10.0 C1.6,-9.2 -0.8,-9.0 -2.6,-9.6 Z"
          fill={P.antifaz} opacity="0.55" />
        {/* ojos de goma: grandes y negros (bicho de noche), despiertos */}
        <OjosRubber
          ojos={[{ cx: -0.4, cy: -9.4, r: 1.5 }, { cx: 3.2, cy: -9.8, r: 1.4 }]}
          mirar={[0.3, 0.06]}
          parpadea={vivo}
        />
      </g>
      </g>

      {/* Prop del mundo en la manito (entra con su herramienta). */}
      {propMundo}
    </g>
  );

  // Antics de VIDA (períodos co-primos) SOLO viva; nodos aparte para no pisar
  // el boil de `.crt-body`. El CSS los apaga con RM / tier bajo / durante los
  // gestos y los estados husmea/tanatosis.
  const conAntics = vivo ? (
    <g className="rh-antic">
      <g className="rh-travieso">{body}</g>
    </g>
  ) : body;
  const cuerpoVivo = lineBoil ? <g filter={`url(#${boil})`}>{conAntics}</g> : conAntics;

  const estadoAttrs = {
    'data-creature': ZARIGUYA_SLUG,
    'data-pose': vivo ? pose : undefined,
    'data-animo': animo,
    'data-tier': tier || undefined,
    'data-visema': visema || undefined,
    'data-husmea': husmea ? '1' : undefined,
    'data-tanatosis': tanatosis ? '1' : undefined,
    'data-crias': nCrias ? String(nCrias) : undefined,
    'data-lineboil': lineBoil ? '1' : undefined,
    'data-prop': mundoId || undefined,
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
  // MODO PODER (standalone): aura ROSA DE LUNA de 4 capas.
  if (poder) {
    return (
      <span
        className="is-powered-up zariguya-poder"
        data-creature-poder={ZARIGUYA_SLUG}
        style={{ '--aura-color': auraDeBicho(ZARIGUYA_SLUG), display: 'inline-flex' }}
      >
        {svg}
        <AuraPoder />
      </span>
    );
  }
  return svg;
}

export default Zariguya;
