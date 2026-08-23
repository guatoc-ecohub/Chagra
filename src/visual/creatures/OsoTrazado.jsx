import { useRef } from 'react';
import { OSO_TRAZADO_SVG, OSO_TRAZADO_INTERIOR, OT_VIEWBOX } from './osoTrazado/pielTrazado.js';
import { useVidaIdle, useRitmoPropio, useMiradaUsted } from './useVidaIdle.js';
import { OSO_BASTON_SLUG, PERFIL_OSO_BASTON } from './osoBastonIdentidad.js';
import { cuerpoDeClima } from './creatureClimaCuerpo.js';
import './osoLamina/osoLamina.css';
import './osoTrazado/osoTrazadoRig.css';

/* Estados del contrato de avatar → forma canónica interna (mismo mapa que
   OsoBastonLaminaViva: data-agt-estado viaja crudo para paridad de API). */
const ESTADO_CANON = {
  idle: 'idle', reposo: 'idle', acompana: 'idle',
  thinking: 'thinking', pensando: 'thinking',
  speaking: 'speaking', respondiendo: 'speaking', hablando: 'speaking',
  listening: 'listening', escuchando: 'listening',
  caminando: 'caminando', walking: 'caminando', anda: 'caminando',
};

/* Poses de OsoBaston → estado del contrato (la cadencia olv-* vive en
   data-agt-estado; 'camina' es el único que cambia el reloj del cuerpo). */
const ESTADO_DE_POSE = { camina: 'caminando', anda: 'idle', reposo: 'idle' };

/* Apertura de mandíbula por visema (0..1) — misma tabla que la lámina viva. */
const JAW_DE_VISEMA = { V1: 0, V2: 0.42, V3: 1, V4: 0.36 };

/* La mirada en unidades de viewBox: --rh-mx llega en ±0.55px (dardeo del
   kit); la lámina viva multiplica por size/12 EN PX DE PANTALLA. Aquí el
   translate corre en UNIDADES DE USUARIO del SVG (655 de ancho), así que el
   factor equivalente sería constante 655/12 ≈ 54.6 (~4.6% del ancho).
   CALIBRADO A LA MITAD para esta piel: al extremo, 4.6% doblaba los
   mechones del respaldo bajo lupa (la lámina viva ahí muestra HUECOS de
   página — peor); a 2.3% la mirada se lee igual y el doblado queda
   sub-lupa. */
const MIRA_K = (655 / 24).toFixed(1);

/**
 * OsoTrazado — EXPERIMENTO: la lámina del oso AUTO-TRAZADA (vtracer, receta
 * trazar-lamina.sh) sobre el esqueleto/cadencia de la lámina viva,
 * articulada por CLIP-REGIONES (ver `osoTrazado/pielTrazado.js`). Drop-in
 * con la API de `OsoBaston` (size/className/inline/animated/title/pose/
 * visema/florece/resopla/vida/tier/clima/enso + `estado` del contrato de
 * avatar) para servir a valle 3D + 2D + kart.
 *
 * HONESTIDAD DE API (es la lámina, no el vector): `animo`, `energia`,
 * `lineBoil`, `poder` y `mundoId` se ACEPTAN y se ignoran con dignidad — el
 * line-boil, el aura de poder y el prop por mundo son capas del kit vector
 * (OsoBaston) que sobre el grabado trazado no aplican sin inventar dibujo.
 * `clima` SÍ aplica (tinte/opacidad por cuerpoDeClima, como OsoBaston).
 *
 * @param {Object} props — ver OsoBaston; extras:
 *   estado: contrato de avatar ('idle'|'thinking'|'speaking'|'listening'|
 *     'caminando'); si no viene, se deriva de `pose`.
 */
export default function OsoTrazado({
  size = 64,
  className = '',
  inline = false,
  animated = true,
  title = 'Oso del bastón',
  pose = 'anda',
  animo = 'sereno',            // eslint-disable-line no-unused-vars -- paridad de API (vector-only)
  energia = 1,                 // eslint-disable-line no-unused-vars -- paridad de API (vector-only)
  clima = null,
  enso = 'neutro',
  visema = null,
  florece = false,
  resopla = false,
  vida = true,
  tier = undefined,
  lineBoil = false,            // eslint-disable-line no-unused-vars -- paridad de API (vector-only)
  poder = false,               // eslint-disable-line no-unused-vars -- paridad de API (vector-only)
  mundoId = null,              // eslint-disable-line no-unused-vars -- paridad de API (vector-only)
  estado = undefined,
  style = undefined,
  ...rest
}) {
  const raizRef = useRef(null);
  const estadoVigente = estado || ESTADO_DE_POSE[pose] || 'idle';
  const canon = ESTADO_CANON[estadoVigente] || 'idle';
  const enIdle = canon === 'idle';
  const vivo = animated;
  const activoVida = vivo && vida && tier !== 'bajo';

  // ═══ LA VIDA (los MISMOS hooks de la lámina viva) ═════════════════════════
  const ritmoPropio = useRitmoPropio();
  const momento = useVidaIdle(OSO_BASTON_SLUG, activoVida && enIdle && !florece && !resopla && !visema);
  useMiradaUsted(raizRef, activoVida && canon !== 'speaking');

  const vidaVigente = florece ? 'florece' : resopla ? 'resopla' : momento || undefined;
  const jaw = JAW_DE_VISEMA[visema] ?? 0;

  // CLIMA → cuerpo (determinista): tinte + opacidad, como OsoBaston.
  const cuerpoClima = cuerpoDeClima(clima, { enso: /** @type {any} */ (enso), tier, perfil: PERFIL_OSO_BASTON });
  const estiloClima = (cuerpoClima.tinte || cuerpoClima.opacidad < 1)
    ? { filter: cuerpoClima.tinte || undefined, opacity: cuerpoClima.opacidad < 1 ? cuerpoClima.opacidad : undefined }
    : undefined;

  const attrs = {
    'data-creature': OSO_BASTON_SLUG,
    'data-agt-estado': estadoVigente,
    'data-visema': visema || undefined,
    'data-vida': vivo ? vidaVigente : undefined,
    'data-tier': tier || undefined,
    ...(vivo ? null : { 'data-quieto': '' }),
  };
  const estiloRaiz = {
    '--olv-jaw': String(jaw),
    '--olv-mira-k': MIRA_K,
    ...ritmoPropio,
    ...estiloClima,
    ...style,
  };

  /* MODO INLINE (paridad OsoBaston): un <g> para el SVG del host, escalado
     del espacio 615×630 de la lámina a la caja '-17 -22 34 42' del oso
     vector (suelo del arte en y≈17.4; pies de la lámina en y=627). El
     viewport interno (<svg> anidado) es OBLIGATORIO: los transform-origin
     del rig están en px del view-box de la lámina. */
  if (inline) {
    const k = 34 / 607; // ancho opaco medido de la lámina (x 3..610)
    const tx = (-326 * k).toFixed(2);   // centro x de la lámina (306) +20 de margen → 0
    const ty = (17.4 - 657 * k).toFixed(2); // pies (627) +30 de margen → suelo 17.4
    return (
      <g
        ref={raizRef}
        className={`osoTrazado ${className || ''}`.trim()}
        style={estiloRaiz}
        {...attrs}
        {...rest}
      >
        <g transform={`translate(${tx} ${ty}) scale(${k.toFixed(4)})`}>
          <svg
            width="655"
            height="690"
            viewBox={OT_VIEWBOX}
            overflow="visible"
            /* La piel es un string plano (pielTrazado.js) — el MISMO markup
               que consumen los hosts sin React. */
            dangerouslySetInnerHTML={{ __html: OSO_TRAZADO_INTERIOR }}
          />
        </g>
      </g>
    );
  }

  const contenedor = (
    <div
      ref={raizRef}
      role="img"
      aria-label={title}
      title={title}
      className={`osoTrazado ${className || ''}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        lineHeight: 0,
        ...estiloRaiz,
      }}
      {...attrs}
      {...rest}
      dangerouslySetInnerHTML={{ __html: OSO_TRAZADO_SVG }}
    />
  );
  return contenedor;
}
