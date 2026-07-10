/*
 * GuardianEspirituBase — la BASE reutilizable del guardián-espíritu de la finca,
 * extraída de `GuardianEspiritu` (mockup avatar-biopunk aprobado). Monta un
 * avatar de fauna como ESPÍRITU: su disco con halo por acento + los filtros SVG
 * de glow/blur compartidos. Aquí vive SOLO el marco reutilizable; el roster de
 * especies grounded, la persistencia y el selector siguen en el consumidor
 * (`dashboard/GuardianEspiritu`).
 *
 * El avatar en sí (los `<g>` de cada especie) es del dominio del consumidor: se
 * pasa como `children` y filtra su glow con `url(#${glowId})`/`url(#${blurId})`
 * (los ids que emite `EspirituDefs`, canónicos por defecto). Reduced-motion-safe.
 *
 * NOTA de dedupe (cuando `src/visual/effects` entre a main): `EspirituDefs` es el
 * mismo glow `feMerge` que expone `<GlowFilter>`; usarlo en vez de re-declarar.
 *
 * Importá `./scenes.css` una vez donde lo uses.
 */
import './scenes.css';

/**
 * Filtros SVG compartidos del espíritu: glow (`feMerge`) + blur para estelas.
 * Ids canónicos por defecto; parametrizables para repetir sin colisión.
 */
export function EspirituDefs({ glowId = 'scn-ge-glow', blurId = 'scn-ge-blur' }) {
  return (
    <defs>
      <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={blurId}><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
  );
}

/**
 * GuardianEspirituBase — el avatar-espíritu en su disco con halo por acento.
 *
 * @param {Object}  props
 * @param {import('react').ReactNode} props.children  el `<g>` del avatar de fauna
 *   (filtra su glow con `url(#scn-ge-glow)` salvo que pases `glowId`).
 * @param {number|string} [props.size]     lado del disco/SVG en px (78).
 * @param {string}  [props.acc]            color de acento del halo (#ffb54f).
 * @param {string}  [props.accRgb]         el mismo acento en "r, g, b" (para el halo translúcido).
 * @param {string}  [props.viewBox]        viewBox del SVG del avatar ("-26 -24 52 46").
 * @param {string}  [props.glowId]         id del filtro glow ("scn-ge-glow").
 * @param {string}  [props.blurId]         id del filtro blur ("scn-ge-blur").
 * @param {string}  [props.className]      clases extra del disco.
 * @param {string}  [props.title]          rótulo accesible; sin él, decorativo (aria-hidden).
 */
export default function GuardianEspirituBase({
  children,
  size = 78,
  acc = '#ffb54f',
  accRgb = '255, 181, 79',
  viewBox = '-26 -24 52 46',
  glowId = 'scn-ge-glow',
  blurId = 'scn-ge-blur',
  className = '',
  title,
}) {
  return (
    <span
      className={`scn-espiritu-halo ${className}`.trim()}
      style={{ width: size, height: size, '--scn-acc': acc, '--scn-acc-rgb': accRgb }}
    >
      <svg
        viewBox={viewBox}
        width={size}
        height={size}
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title || undefined}
        focusable="false"
      >
        {title && <title>{title}</title>}
        <EspirituDefs glowId={glowId} blurId={blurId} />
        {children}
      </svg>
    </span>
  );
}
