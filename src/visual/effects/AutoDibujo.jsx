/*
 * AutoDibujo — el AUTO-DIBUJADO orquestado compartido (§13.11 del catálogo).
 *
 * La receta de SceneTrazoMinimal ("el trazo se dibuja solo al entrar"):
 * `pathLength="1"` normalizado + `stroke-dashoffset` que va a 0 + etapas con
 * delay escalonado. Aquí queda como helper para no re-cablear el dasharray a
 * mano en cada lámina/onboarding/glifo.
 *
 * El movimiento vive en `effects.css` (clases `vfx-draw`, `vfx-fade`,
 * `vfx-t1…vfx-t9`); este componente solo pega las clases correctas y pone
 * `pathLength="1"` para que el draw-in sea independiente de la longitud real
 * del trazo. Reduced-motion = el dibujo COMPLETO y quieto (lo garantiza el CSS).
 *
 * Recuerde importar el CSS una vez en la escena:  import '.../effects/effects.css'
 *
 * @param {object}  props
 * @param {'path'|'line'|'polyline'|'circle'|'rect'|string} [props.as='path']
 *        elemento SVG a renderizar.
 * @param {number}  [props.stage]      etapa 1..9 (delay escalonado del dibujo).
 * @param {boolean} [props.fade=false] `true` = aparece en fundido (opacity) en
 *        vez de trazarse — para planos de color (sol, leyenda, humo).
 * @param {string}  [props.className]  clases extra.
 * Resto de props (`d`, `stroke`, `strokeWidth`, `fill`, `cx`…) se pasan tal cual.
 */
export function AutoDibujo({ as = 'path', stage, fade = false, className, ...rest }) {
  // Tag dinámico: TS no puede probar que el string es un tag SVG válido —
  // cast puntual (irreducible sin enumerar todos los tags).
  const El = /** @type {any} */ (as);
  const base = fade ? 'vfx-fade' : 'vfx-draw';
  const stageClass = stage ? ` vfx-t${stage}` : '';
  const cls = `${base}${stageClass}${className ? ` ${className}` : ''}`;
  // pathLength normaliza el dashoffset a [0..1]; solo aplica al modo trazo.
  const drawProps = fade ? {} : { pathLength: 1 };
  return <El className={cls} {...drawProps} {...rest} />;
}

export default AutoDibujo;
