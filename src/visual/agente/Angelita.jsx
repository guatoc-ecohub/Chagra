import './angelita-agente.css';
import { AbejaAngelita } from '../creatures/AbejaAngelita.jsx';
import { RH_INK, RH_CHEEK } from '../creatures/_rubberhose.jsx';
import { ABEJA_PALETA } from '../creatures/abejaIdentidad.js';
import {
  estadoCanonico,
  POSE_DE_ESTADO,
  ARIA_DE_ESTADO,
  nivelDeConfianza,
} from './angelitaEstados.js';

/*
 * ANGELITA — EL CUERPO DEL AGENTE DE CHAGRA.
 *
 * La inteligencia que le responde al campesino deja de ser texto: es Angelita,
 * la abeja angelita (Tetragonisca angustula, meliponino nativo SIN aguijón) —
 * noble, sabia, cercana, campesina. NO mascota corporativa: una vecina que
 * sabe de la finca, que se posa a escuchar, que piensa buscando en su memoria,
 * que gesticula al responder y que DICE cuando no sabe (Chagra valora la
 * honestidad sobre la alucinación).
 *
 * Este componente es SOLO el cuerpo con su API de estados — cero lógica de
 * agente. El host (chat, voz, tutorial) le dice qué está pasando y ella lo
 * ENCARNA:
 *
 *   <Angelita estado="pensando" />
 *   <Angelita estado="respondiendo" visema={visema} confianza={0.9} />
 *   <Angelita estado="no-se" confianza="baja" />
 *
 * ESTADOS (angelitaEstados.js — acepta sinónimos):
 *   acompana     → idle VIVO: flota, respira (boil), mira alrededor, antics.
 *                  Es la AbejaAngelita de siempre: viva aunque nadie hable.
 *   escuchando   → se posa (reposo), ladea la cabeza hacia usted; la voz
 *                  humana entra en ondas de tinta.
 *   pensando     → burbuja de pensamiento con recuerdos de la finca (hoja,
 *                  gota, flor) que hojea; bracito a la barbilla; mirada arriba.
 *   respondiendo → habla (lip-sync por `visema` de useLipSync) y gesticula;
 *                  su voz sale en ondas de MIEL (ámbar).
 *   contenta     → brinca celebrando (pose celebra) con chispas doradas.
 *   preocupada   → alerta honesta: cejas fruncidas, gota de sudor, aro coral
 *                  que late, vibración inquieta. Para plaga/sequía/riesgo.
 *   no-se        → LA HONESTA: se encoge de hombros con las palmas arriba y
 *                  un "?" dibujado a mano. Sonríe: no saber no la avergüenza.
 *   senala       → guía: se inclina y apunta (pose señala) con destello en
 *                  el punto señalado.
 *   invita       → guía: se inclina hacia usted y hace "venga" con la manita.
 *
 * CONFIANZA (modo científico): `confianza` acepta 0..1 o 'alta'|'media'|'baja'.
 * Se dibuja como ANILLO DE CERTEZA alrededor del cuerpo: continuo y sereno si
 * está segura; punteado girando si es parcial; entrecortado, titilante y con
 * puntos suspensivos si duda. null (default) = sin anillo — nada cambia para
 * quien no maneja confianza.
 *
 * REUTILIZA, NO REDIBUJA: el cuerpo es la AbejaAngelita aprobada (inline) con
 * su identidad (abejaIdentidad.js), su kit rubber-hose y sus poses; las capas
 * del agente (halo, burbuja, ondas, cejas, chispas, signos) se dibujan ALREDEDOR
 * en el mismo lenguaje: tinta cálida RH_INK, squash & stretch, overshoot,
 * follow-through. La cadencia vive en `angelita-agente.css` (clases agt-*) con
 * los gates de la casa: reduced-motion congela en fotograma digno; tier 'bajo'
 * corta lo continuo decorativo y conserva el feedback de estado.
 *
 * Tier-safe: SVG + CSS transform/opacity, cero deps nuevas, cero three.
 */

/* El escenario del agente: la abeja (viewBox propio '-15 -15 32 30') más aire
   arriba para la burbuja de pensamiento y alrededor para halo/ondas/destellos. */
const VIEWBOX = '-23 -30 46 46';

/* La voz de cada quien tiene su color: la de USTED llega en tinta (línea), la
   de ANGELITA sale en miel (ámbar). Detalle que se lee sin explicarse. */
const COLOR_VOZ_HUMANA = RH_INK;
const COLOR_VOZ_MIEL = ABEJA_PALETA.cuerpo;
const COLOR_CERTEZA = ABEJA_PALETA.cabeza;   // el dorado claro de su cabeza
const COLOR_ALERTA = '#e0745a';              // coral de alerta (pariente del RH_CHEEK)
const CREMA_PAPEL = '#fffaf0';               // el papel de la burbuja (blanco de ojo)

/* Gotita (sudor de preocupación / recuerdo de agua) — lágrima rubber-hose. */
const GOTA_D = 'M0,-1.1 C0.75,-0.15 0.75,0.55 0,1.05 C-0.75,0.55 -0.75,-0.15 0,-1.1 Z';
/* Chispa de 4 puntas (polen dorado que estalla cuando celebra / destello POI). */
const CHISPA_D = 'M0,-2 L0.55,-0.55 L2,0 L0.55,0.55 L0,2 L-0.55,0.55 L-2,0 L-0.55,-0.55 Z';

/* ── Recuerdos de la finca (lo que hojea al PENSAR): hoja, agua, flor ────────
   Mini-íconos en el mismo trazo de la familia; viven dentro de la burbuja. */
function RecuerdoHoja() {
  return (
    <g transform="rotate(-26)">
      <ellipse rx="1.7" ry="0.95" fill="#6a994e" stroke={RH_INK} strokeWidth="0.4" />
      <path d="M-1.4,0 L1.4,0" stroke="#3f5d33" strokeWidth="0.35" strokeLinecap="round" />
    </g>
  );
}
function RecuerdoGota() {
  return <path d={GOTA_D} transform="scale(1.35)" fill={ABEJA_PALETA.gota} stroke={RH_INK} strokeWidth="0.32" />;
}
function RecuerdoFlor() {
  const petalos = [[0, -0.95], [0.9, -0.29], [0.56, 0.77], [-0.56, 0.77], [-0.9, -0.29]];
  return (
    <g>
      {petalos.map(([x, y], i) => (
        <circle key={i} cx={x * 1.15} cy={y * 1.15} r="0.68" fill={RH_CHEEK} stroke={RH_INK} strokeWidth="0.3" />
      ))}
      <circle r="0.62" fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.3" />
    </g>
  );
}
const RECUERDOS = [RecuerdoHoja, RecuerdoGota, RecuerdoFlor];

/**
 * Angelita — el cuerpo visible del agente de Chagra. Solo arte: el host cablea
 * la inteligencia y este componente la ENCARNA por estados.
 *
 * @param {Object} props
 * @param {string} [props.estado='acompana']  estado conversacional (o sinónimo).
 * @param {number|string|null} [props.confianza=null]  0..1 o 'alta'|'media'|'baja'.
 * @param {'derecha'|'izquierda'} [props.direccion='derecha']  hacia dónde mira/
 *   señala/invita (izquierda = espejo del dibujo completo).
 * @param {number} [props.size=96]
 * @param {string} [props.className]
 * @param {boolean} [props.animated=true]  false = fotograma digno.
 * @param {string|null} [props.visema]  'V1'..'V4' de useLipSync (respondiendo).
 * @param {string} [props.tier]  'alto'|'medio'|'bajo' (gama baja recorta).
 * @param {Object|null} [props.clima]  passthrough al cuerpo (clima real).
 * @param {string} [props.enso]
 * @param {string} [props.animo]  pisa el ánimo derivado del estado.
 * @param {number} [props.energia]
 * @param {string|null} [props.mundoId]  su herramienta por mundo (PropEnMano).
 * @param {boolean} [props.lineBoil]  contorno que hierve (momentos heroicos).
 * @param {string} [props.title]  pisa la narración aria derivada del estado.
 */
export function Angelita({
  estado = 'acompana',
  confianza = null,
  direccion = 'derecha',
  size = 96,
  className = '',
  animated = true,
  visema = null,
  tier = undefined,
  clima = null,
  enso = 'neutro',
  animo = undefined,
  energia = 1,
  mundoId = null,
  lineBoil = false,
  title = undefined,
  ...rest
}) {
  const e = estadoCanonico(estado);
  const vivo = animated;
  const nivel = nivelDeConfianza(confianza);
  const pose = POSE_DE_ESTADO[e];
  // El estado tiñe el ánimo del cuerpo base (aura/antics) salvo que el host
  // mande el suyo: contenta brilla 'pleno', preocupada se pone 'atento'.
  const animoDelEstado = animo ?? (e === 'contenta' ? 'pleno' : e === 'preocupada' ? 'atento' : 'sereno');
  const aria = title ?? (ARIA_DE_ESTADO[e] + (nivel === 'baja' ? ' (con dudas)' : ''));
  // Clase de animación solo cuando está viva; quieta = opacidad digna inline.
  const cls = (c) => (vivo ? c : undefined);

  /* ═══ CAPA FONDO: el anillo de certeza (confianza) + aro de alerta ═══════ */
  const halo = nivel ? (
    <g aria-hidden="true">
      <circle
        className={`agt-halo-${nivel}`}
        cx="1" cy="-1" r="15"
        fill="none"
        stroke={COLOR_CERTEZA}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray={nivel === 'media' ? '4.6 3' : nivel === 'baja' ? '1.8 4' : undefined}
        opacity={nivel === 'baja' ? 0.45 : 0.55}
      />
      {/* La duda también se dice: puntos suspensivos junto a su cabeza. */}
      {nivel === 'baja' && (
        <g fill={RH_INK} opacity="0.75">
          <circle className={cls('agt-duda-punto')} cx="15" cy="-7.8" r="0.7" />
          <circle className={cls('agt-duda-punto')} style={{ animationDelay: '-0.7s' }} cx="16.8" cy="-9.4" r="0.6" />
          <circle className={cls('agt-duda-punto')} style={{ animationDelay: '-1.4s' }} cx="18.3" cy="-11.2" r="0.5" />
        </g>
      )}
    </g>
  ) : null;
  // Preocupada: un aro coral late detrás del cuerpo — alerta que se siente,
  // no sirena. (Detrás: nunca compite con la carita.)
  const aroAlerta = e === 'preocupada' ? (
    <circle
      className={cls('agt-alerta')}
      cx="1" cy="-1" r="12.4"
      fill="none" stroke={COLOR_ALERTA} strokeWidth="1.1"
      opacity={vivo ? undefined : 0.3}
      aria-hidden="true"
    />
  ) : null;

  /* ═══ SEÑALES DE CARA (dentro de .agt-cuerpo: se mueven CON ella) ════════
     Coordenadas en el espacio de la abeja: cabeza (8.6,-1) r4.4; ojos en
     (10.1,-1.9) y (7.4,-2.2); las cejas van justo encima. */
  const caraPreocupada = e === 'preocupada' ? (
    <g aria-hidden="true">
      {/* cejas fruncidas: las puntas internas suben — preocupación, no rabia */}
      <g stroke={RH_INK} strokeWidth="0.85" strokeLinecap="round" fill="none">
        <path d="M6.1,-4.5 L8,-5.2" />
        <path d="M9.1,-5.3 L11.4,-4.5" />
      </g>
      {/* gota de sudor que brota de la sien y escurre */}
      <g transform="translate(5.1 -4.4)">
        <path
          className={cls('agt-sudor')}
          d={GOTA_D}
          fill={ABEJA_PALETA.gota}
          stroke={RH_INK}
          strokeWidth="0.35"
          opacity={vivo ? undefined : 0.85}
        />
      </g>
    </g>
  ) : null;
  const caraNoSe = e === 'no-se' ? (
    <g stroke={RH_INK} strokeWidth="0.8" strokeLinecap="round" fill="none" aria-hidden="true">
      {/* una ceja arqueada y la otra tranquila: honestidad curiosa, sin pena */}
      <path d="M5.9,-5.2 Q7.3,-6.1 8.6,-5.3" />
      <path d="M9.5,-4.8 L11.3,-4.7" />
    </g>
  ) : null;

  /* ═══ CAPA AIRE: lo que flota alrededor (burbuja, ondas, signos) ═════════ */
  // PENSANDO — burbuja de pensamiento con colita, tres puntos que laten y los
  // recuerdos de la finca que va hojeando (quieta u en tier bajo: solo el 1º).
  const recuerdosVisibles = vivo ? RECUERDOS : RECUERDOS.slice(0, 1);
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- identificador de estado canónico (ver ESTADOS_ANGELITA), no es copy de UI
  const burbuja = e === 'pensando' ? (
    <g className={cls('agt-burbuja')} aria-hidden="true">
      <circle cx="10.8" cy="-11.6" r="0.85" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="0.7" />
      <circle cx="12.2" cy="-14.6" r="1.35" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="0.8" />
      <ellipse cx="13.6" cy="-21.4" rx="7" ry="5.6" fill={CREMA_PAPEL} stroke={RH_INK} strokeWidth="1.1" />
      {/* lo que está repasando: la mata, el agua, la flor */}
      <g transform="translate(13.6 -22.8)">
        {recuerdosVisibles.map((Recuerdo, i) => (
          <g key={i} className={cls('agt-recuerdo')} style={vivo ? { animationDelay: `${i * -1.8}s` } : undefined}>
            <Recuerdo />
          </g>
        ))}
      </g>
      {/* el latido del pensar */}
      <g fill={RH_INK}>
        <circle className={cls('agt-piensa-punto')} cx="10.9" cy="-18.4" r="1" />
        <circle className={cls('agt-piensa-punto')} style={{ animationDelay: '0.22s' }} cx="13.6" cy="-18.4" r="1" />
        <circle className={cls('agt-piensa-punto')} style={{ animationDelay: '0.44s' }} cx="16.3" cy="-18.4" r="1" />
      </g>
    </g>
  ) : null;
  // ESCUCHANDO — la voz de usted entra en ondas de tinta, hacia ella.
  const ondasIn = e === 'escuchando' ? (
    <g stroke={COLOR_VOZ_HUMANA} strokeWidth="1" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, -2.8, -5.4].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-onda-in')}
          style={vivo ? { animationDelay: `${i * -0.63}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${-15.8 + dx},-6.4 q2.8,4.9 0,10.6`}
        />
      ))}
    </g>
  ) : null;
  // RESPONDIENDO — su voz sale en ondas de miel, desde la boquita.
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- identificador de estado canónico (ver ESTADOS_ANGELITA), no es copy de UI
  const ondasOut = e === 'respondiendo' ? (
    <g stroke={COLOR_VOZ_MIEL} strokeWidth="1.05" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, 2.3, 4.6].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-onda-out')}
          style={vivo ? { animationDelay: `${i * -0.53}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${14.4 + dx},-2.4 q2.9,4 0,8.2`}
        />
      ))}
    </g>
  ) : null;
  // CONTENTA — chispas de polen dorado que estallan al compás del brinco.
  const CHISPAS_POS = [[-11.5, -8.5], [13, -12], [16.5, 2.5], [-13.5, 3.5], [-3, -13.5], [9.5, 11.5]];
  const chispas = e === 'contenta' ? (
    <g fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.3" aria-hidden="true">
      {CHISPAS_POS.map(([x, y], i) => (
        <path
          key={i}
          className={cls('agt-chispa')}
          style={vivo ? { animationDelay: `${i * -0.19}s` } : undefined}
          opacity={vivo ? undefined : 0.55}
          transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.25})`}
          d={CHISPA_D}
        />
      ))}
    </g>
  ) : null;
  // NO-SÉ — el "?" dibujado a mano, con wobble de line-boil (steps, no péndulo).
  const signoNoSe = e === 'no-se' ? (
    <g className={cls('agt-nose-signo')} aria-hidden="true">
      <path
        d="M11.8,-19.2 Q11.7,-22 14.3,-21.8 Q16.6,-21.5 15.9,-19.3 Q15.5,-18 14.2,-17.4 Q13.5,-17 13.5,-15.9"
        stroke={RH_INK} strokeWidth="1.25" fill="none" strokeLinecap="round"
      />
      <circle cx="13.5" cy="-13.8" r="0.85" fill={RH_INK} />
    </g>
  ) : null;
  // SEÑALA — el destello donde apunta (abajo-derecha, donde cae su bracito).
  const destelloPoi = e === 'senala' ? (
    <g
      className={cls('agt-poi')}
      transform="translate(16 10.5)"
      opacity={vivo ? undefined : 0.7}
      aria-hidden="true"
    >
      <circle r="2.9" fill="none" stroke={COLOR_CERTEZA} strokeWidth="0.7" opacity="0.7" />
      <path d={CHISPA_D} fill={COLOR_CERTEZA} stroke={RH_INK} strokeWidth="0.35" />
    </g>
  ) : null;
  // INVITA — estelas del "venga": arcos que viajan HACIA ella.
  const estelasInvita = e === 'invita' ? (
    <g stroke={COLOR_VOZ_MIEL} strokeWidth="0.95" strokeLinecap="round" fill="none" aria-hidden="true">
      {[0, 2.4].map((dx, i) => (
        <path
          key={i}
          className={cls('agt-venga-onda')}
          style={vivo ? { animationDelay: `${i * -0.7}s` } : undefined}
          opacity={vivo ? undefined : 0.4}
          d={`M${16.4 + dx},-3.2 q-2.2,3.4 0,6.6`}
        />
      ))}
    </g>
  ) : null;

  /* ═══ MONTAJE ═════════════════════════════════════════════════════════════
     fondo (halo/alerta) → cuerpo (abeja + señales de cara, UN wrapper que los
     estados mueven junto) → aire (burbuja, ondas, chispas, signos). direccion
     'izquierda' espeja TODO el dibujo (señala/invita hacia el otro lado). */
  const espejo = direccion === 'izquierda' ? { transform: 'scaleX(-1)' } : undefined;
  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className ? `agt-angelita ${className}` : 'agt-angelita'}
      style={espejo}
      role="img"
      aria-label={aria}
      data-agente="angelita"
      data-agt-estado={e}
      data-agt-vivo={vivo ? '1' : undefined}
      data-agt-confianza={nivel || undefined}
      data-tier={tier || undefined}
      {...rest}
    >
      <title>{aria}</title>
      {halo}
      {aroAlerta}
      <g className="agt-cuerpo">
        <AbejaAngelita
          inline
          animated={vivo}
          pose={pose}
          visema={visema}
          tier={tier}
          clima={clima}
          enso={enso}
          animo={animoDelEstado}
          energia={energia}
          mundoId={mundoId}
          lineBoil={lineBoil}
        />
        {caraPreocupada}
        {caraNoSe}
      </g>
      {burbuja}
      {ondasIn}
      {ondasOut}
      {chispas}
      {signoNoSe}
      {destelloPoi}
      {estelasInvita}
    </svg>
  );
}

export default Angelita;
