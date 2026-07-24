/*
 * Iconos de ETAPA DE CICLO — set coherente para catálogo y cards.
 *
 * Seis glifos que cuentan la vida de una mata en orden: semilla que germina →
 * mata frondosa → flor → fruto → canasta de cosecha → frasco guardado. Todos
 * comparten la MISMA familia visual: línea de un solo grosor, uniones
 * redondeadas y `currentColor` — no traen color propio, así que toman el tinte
 * de su etapa (la clase `text-*` del contenedor) y quedan legibles a 16 px.
 *
 * Reutilizable: antes de dibujar un icono de fase, úselos desde aquí. La forma
 * de consumo canónica es <IconoEtapaCiclo orden={1..6} />, que respeta el mismo
 * orden fenológico que ya usan las guías (germinación=1 … producto=6).
 *
 * Props comunes: { size = 16, title, className, ...rest }.
 *   - Sin `title` el icono es decorativo (aria-hidden): úselo junto a un rótulo
 *     de texto, que es lo normal en una card.
 *   - Con `title` pasa a role="img" con su <title> accesible (uso suelto).
 */

const VIEWBOX = '0 0 24 24';

/* Rasgos compartidos por las seis etapas: una sola familia de trazo. */
const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function IconoEtapaBase({ size = 16, title = '', className = '', children, ...rest }) {
  const decorativo = !title;
  return (
    <svg
      viewBox={VIEWBOX}
      width={size}
      height={size}
      className={className}
      role={decorativo ? undefined : 'img'}
      aria-hidden={decorativo ? 'true' : undefined}
      aria-label={decorativo ? undefined : title}
      {...rest}
    >
      {decorativo ? null : <title>{title}</title>}
      <g {...TRAZO}>{children}</g>
    </svg>
  );
}

/* 1 · Germinación — la semilla revienta y saca su primer par de cotiledones. */
export function IconoGerminacion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M3.5 19 H20.5" />
      <path d="M12 19 V11.5" />
      <path d="M12 12.5 C9.4 12.9 7.5 11.6 6.7 9.2 C9.4 8.8 11.4 10.1 12 12.5 Z" />
      <path d="M12 12.5 C14.6 12.9 16.5 11.6 17.3 9.2 C14.6 8.8 12.6 10.1 12 12.5 Z" />
    </IconoEtapaBase>
  );
}

/* 2 · Vegetativo — la mata frondosa: tallo con dos pares de hojas. */
export function IconoVegetativo(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 21 V6" />
      <path d="M12 9.5 C9.6 9.9 7.7 8.6 6.9 6.2 C9.6 5.8 11.4 7.1 12 9.5 Z" />
      <path d="M12 9.5 C14.4 9.9 16.3 8.6 17.1 6.2 C14.4 5.8 12.6 7.1 12 9.5 Z" />
      <path d="M12 14.5 C9.8 14.9 8 13.7 7.3 11.5 C9.8 11.1 11.5 12.3 12 14.5 Z" />
      <path d="M12 14.5 C14.2 14.9 16 13.7 16.7 11.5 C14.2 11.1 12.5 12.3 12 14.5 Z" />
    </IconoEtapaBase>
  );
}

/* 3 · Floración — flor de cinco pétalos sobre su tallo con hoja. */
export function IconoFloracion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 21 V13" />
      <path d="M12 16.5 C10 16.9 8.4 15.7 7.8 13.7 C10 13.3 11.5 14.5 12 16.5 Z" />
      <g transform="translate(12 8.5)">
        <ellipse cx="0" cy="-3.3" rx="1.6" ry="2.5" />
        <ellipse cx="0" cy="-3.3" rx="1.6" ry="2.5" transform="rotate(72)" />
        <ellipse cx="0" cy="-3.3" rx="1.6" ry="2.5" transform="rotate(144)" />
        <ellipse cx="0" cy="-3.3" rx="1.6" ry="2.5" transform="rotate(216)" />
        <ellipse cx="0" cy="-3.3" rx="1.6" ry="2.5" transform="rotate(288)" />
      </g>
      <circle cx="12" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </IconoEtapaBase>
  );
}

/* 4 · Fructificación — el fruto cuajado con su pedúnculo y una hoja. */
export function IconoFructificacion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 21 C8.9 21 6.7 18.6 6.7 15.6 C6.7 12.8 9.1 11.2 12 11.2 C14.9 11.2 17.3 12.8 17.3 15.6 C17.3 18.6 15.1 21 12 21 Z" />
      <path d="M12 11.2 V7.5" />
      <path d="M12.2 9.1 C13.4 7.2 15.5 6.4 17.4 6.6 C17.2 8.6 15.4 9.6 12.2 9.1 Z" />
    </IconoEtapaBase>
  );
}

/* 5 · Cosecha — la canasta con asa y banda de trenzado. */
export function IconoCosecha(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M8 11 C8.4 7.6 15.6 7.6 16 11" />
      <path d="M4.5 11 H19.5" />
      <path d="M6 11 L7.4 19.2 A1.3 1.3 0 0 0 8.7 20.3 H15.3 A1.3 1.3 0 0 0 16.6 19.2 L18 11" />
      <path d="M6.8 15.5 H17.2" />
    </IconoEtapaBase>
  );
}

/* 6 · Producto — la cosecha guardada en su frasco, con su tapa y nivel. */
export function IconoProducto(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M8.5 3.5 H15.5 A1 1 0 0 1 16.5 4.5 V6 H7.5 V4.5 A1 1 0 0 1 8.5 3.5 Z" />
      <path d="M8 6 H16 V18.5 A2 2 0 0 1 14 20.5 H10 A2 2 0 0 1 8 18.5 Z" />
      <path d="M8 12 H16" />
    </IconoEtapaBase>
  );
}

/* Set en orden fenológico (1-indexado por posición): germinación → producto. */
// eslint-disable-next-line react-refresh/only-export-components -- registro del set que los tests validan junto a los iconos (patrón EjemplosVoz)
export const ICONOS_ETAPA_POR_ORDEN = [
  IconoGerminacion,
  IconoVegetativo,
  IconoFloracion,
  IconoFructificacion,
  IconoCosecha,
  IconoProducto,
];

/*
 * IconoEtapaCiclo — punto de entrada por `orden` (1..6). Recorta a rango y cae
 * a la última etapa si el orden viene fuera de rango, para que una card nunca
 * quede sin icono. Marca `data-etapa-orden` con la etapa resuelta.
 */
export function IconoEtapaCiclo({ orden = 1, ...props }) {
  const total = ICONOS_ETAPA_POR_ORDEN.length;
  const n = Number.isFinite(orden) ? Math.min(Math.max(Math.trunc(orden), 1), total) : total;
  const Icono = ICONOS_ETAPA_POR_ORDEN[n - 1];
  return <Icono data-etapa-orden={n} {...props} />;
}

export default IconoEtapaCiclo;
