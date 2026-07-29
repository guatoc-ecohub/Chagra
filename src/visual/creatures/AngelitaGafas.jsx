/*
 * AngelitaGafas — las GAFAS DE SOL de Angelita + las CEJAS expresivas.
 *
 * Dos piezas de CARA para subir la expresividad del cuerpo rubber-hose al
 * máximo (años 30: la cara ES el personaje):
 *
 *   <GafasSol />    → gafas redondas de tinta con destello ámbar/cielo, en
 *                     perspectiva 3/4 (el lente lejano asoma detrás del
 *                     cercano). Su momento estelar: `puesta='poniendose'`
 *                     reproduce UNA vez la caída teatral sobre los ojitos —
 *                     baja girada desde arriba, rebasa, rebota y asienta
 *                     (timing + overshoot), y el destello barre el lente.
 *   <CejasRubber /> → cejas de goma por ESTILO ('alegres'|'altas'|'vivas'|
 *                     'fruncidas'): el rasgo que le faltaba a la carita para
 *                     actuar de verdad (alegría, atención, concentración).
 *
 * Ambas viven en el espacio de la CABEZA de Angelita (cabeza en (8.6,-1) r4.4;
 * ojos en (10.1,-1.9) y (7.4,-2.2) — abejaIdentidad/AbejaAngelita). La CADENCIA
 * (caída, rebote, destello, vida de cejas) vive en `angelita-missminutes.css`
 * gateada por data-attrs del cuerpo (data-gafas / data-cejas) con las reglas de
 * la casa: reduced-motion congela en fotograma digno, tier 'bajo' corta lo
 * decorativo continuo. Cero dependencias nuevas; transform/opacity friendly.
 */
import { RH_INK } from './_rubberhose.jsx';
import { ABEJA_PALETA } from './abejaIdentidad.js';

/* El vidrio oscuro cálido (tinta quemada, no negro industrial) y sus reflejos:
   el cielo de las alas de tul arriba, la chispa crema del catchlight cruzada. */
const LENTE = '#221106';
const REFLEJO_CIELO = ABEJA_PALETA.alaTul;
const CHISPA = '#fff3d8';

/* Geometría 3/4 sobre los ojos reales: lente CERCANO (ojo derecho, grande) por
   delante; lente LEJANO (ojo izquierdo) asoma detrás — como la cara misma. */
const CERCA = { cx: 10.15, cy: -1.95, r: 2.3 };
const LEJOS = { cx: 7.3, cy: -2.25, r: 1.8 };

/**
 * Las gafas de sol rubber-hose. El grupo entero anima según `puesta`:
 *   'puesta'      → quietas sobre los ojos (default).
 *   'poniendose'  → la caída teatral one-shot (CSS `agz-ponerse`), con el
 *                   destello que barre el lente al aterrizar.
 * El gate vive en el CSS por [data-gafas] del cuerpo; este componente solo
 * dibuja y pone clases. `animated=false` (o RM) = fotograma digno: puestas.
 *
 * @param {Object} props
 * @param {'puesta'|'poniendose'} [props.puesta='puesta']
 * @param {boolean} [props.animated=true]
 * @param {string} [props.ink=RH_INK]
 */
export function GafasSol({ puesta = 'puesta', animated = true, ink = RH_INK }) {
  const cayendo = animated && puesta === 'poniendose';
  return (
    <g
      className={`agz-gafas${cayendo ? ' agz-cae' : ''}`}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      aria-hidden="true"
    >
      {/* lente LEJANO (detrás): asoma por la izquierda del cercano */}
      <circle cx={LEJOS.cx} cy={LEJOS.cy} r={LEJOS.r} fill={LENTE} stroke={ink} strokeWidth="0.6" />
      <path
        d={`M${LEJOS.cx - 1.15},${LEJOS.cy - 0.95} Q${LEJOS.cx - 0.1},${LEJOS.cy - 1.55} ${LEJOS.cx + 0.85},${LEJOS.cy - 1.05}`}
        stroke={REFLEJO_CIELO} strokeWidth="0.42" fill="none" strokeLinecap="round" opacity="0.55"
      />
      {/* patica de la gafa hacia la oreja (borde de la cabeza, lado lejano) */}
      <path
        d={`M${LEJOS.cx - LEJOS.r + 0.25},${LEJOS.cy - 0.3} C4.9,-2.3 4.5,-1.95 4.35,-1.5`}
        stroke={ink} strokeWidth="0.7" fill="none" strokeLinecap="round"
      />
      {/* puentecito sobre la nariz (une los aros por arriba) */}
      <path
        d={`M${LEJOS.cx + 1.0},${LEJOS.cy - 1.5} Q8.9,-4.15 ${CERCA.cx - 1.4},${CERCA.cy - 1.7}`}
        stroke={ink} strokeWidth="0.75" fill="none" strokeLinecap="round"
      />
      {/* lente CERCANO (delante, el protagonista) */}
      <circle cx={CERCA.cx} cy={CERCA.cy} r={CERCA.r} fill={LENTE} stroke={ink} strokeWidth="0.7" />
      {/* reflejo de cielo en el arco superior */}
      <path
        d={`M${CERCA.cx - 1.5},${CERCA.cy - 1.15} Q${CERCA.cx},${CERCA.cy - 1.95} ${CERCA.cx + 1.35},${CERCA.cy - 1.0}`}
        stroke={REFLEJO_CIELO} strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.6"
      />
      {/* la CHISPA diagonal (dos trazos paralelos, cartoon clásico) — con
          'poniendose' el CSS la barre por el vidrio al aterrizar */}
      <g className="agz-chispa" stroke={CHISPA} strokeLinecap="round" opacity="0.85">
        <path d={`M${CERCA.cx - 1.0},${CERCA.cy + 1.1} L${CERCA.cx + 0.6},${CERCA.cy - 0.9}`} strokeWidth="0.5" />
        <path d={`M${CERCA.cx - 0.1},${CERCA.cy + 1.3} L${CERCA.cx + 1.0},${CERCA.cy - 0.1}`} strokeWidth="0.32" />
      </g>
    </g>
  );
}

/* ── CEJAS de goma por estilo — coordenadas sobre los ojos reales ────────────
   (ojo derecho arriba en y≈-3.85; izquierdo en y≈-3.65; las cejas van un pelo
   más arriba para no chocar con los aros de las gafas cuando conviven). Cada
   estilo son DOS paths [cejaDerecha, cejaIzquierda] en el trazo de la casa. */
const CEJAS_D = {
  /* arqueadas de dicha — acompañan sonrisa/celebración */
  alegres: ['M9.0,-4.65 Q10.25,-5.5 11.45,-4.75', 'M6.4,-4.55 Q7.35,-5.25 8.3,-4.7'],
  /* levantadas de atención — escuchar, sorpresa amable */
  altas: ['M8.95,-5.2 Q10.25,-6.1 11.5,-5.3', 'M6.35,-5.1 Q7.3,-5.8 8.25,-5.2'],
  /* como alegres pero VIVAS: el CSS les da el eyebrow-flash del que habla */
  vivas: ['M9.0,-4.65 Q10.25,-5.5 11.45,-4.75', 'M6.4,-4.55 Q7.35,-5.25 8.3,-4.7'],
  /* fruncidas de concentración (husmear, señalar) — decididas, no bravas */
  fruncidas: ['M9.2,-5.0 L11.35,-4.35', 'M6.35,-4.4 L8.25,-4.95'],
};

/**
 * Cejas expresivas. Opt-in: sin `estilo` (o desconocido) no dibuja nada — las
 * caras existentes no cambian. La vida ('vivas', flash al hablar) es del CSS.
 *
 * @param {Object} props
 * @param {'alegres'|'altas'|'vivas'|'fruncidas'|null} [props.estilo]
 * @param {string} [props.ink=RH_INK]
 */
export function CejasRubber({ estilo = null, ink = RH_INK }) {
  const par = estilo ? CEJAS_D[estilo] : null;
  if (!par) return null;
  return (
    <g
      className="rh-cejas"
      stroke={ink} strokeWidth="0.85" fill="none" strokeLinecap="round"
      style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
      aria-hidden="true"
    >
      <path className="rh-ceja" d={par[0]} />
      <path className="rh-ceja" d={par[1]} />
    </g>
  );
}
