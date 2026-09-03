/*
 * Iconos de ETAPA DE CICLO — set coherente para catálogo y cards.
 *
 * Seis glifos que cuentan la vida de una mata en orden: semilla que germina →
 * mata frondosa → flor → fruto → canasta de cosecha → frasco guardado.
 *
 * UNA sola lógica de abstracción para los seis (es lo que los hace familia):
 *   - Silueta abierta, sin rellenos: todo es contorno de un solo grosor,
 *     uniones redondeadas, sobre `currentColor` (toman el tinte de su etapa).
 *   - Nada de detalle interior menor de ~6 unidades: a 16 px (tamaño real de
 *     card) el detalle fino se funde en mancha; lo que lee es la silueta.
 *   - La mata se dibuja como MASA (copa lobulada), no como hojas contables.
 *   - Las plantas (1-3) nacen de un tallo en x=12; los objetos (4-6) se
 *     asientan en la misma línea de base (y≈20.5). Mismo tamaño de bloque.
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
/** @type {import('react').SVGProps<SVGGElement>} */
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

/* 1 · Germinación — sobre la línea de tierra, la semilla saca sus dos cotiledones. */
export function IconoGerminacion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M3.5 20.5 H20.5" />
      <path d="M12 20.5 V12" />
      <path d="M12 12 C8.6 12.6 5.8 10.6 4.8 6.4 C8.6 5.8 11.4 8.2 12 12 Z" />
      <path d="M12 12 C15.4 12.6 18.2 10.6 19.2 6.4 C15.4 5.8 12.6 8.2 12 12 Z" />
    </IconoEtapaBase>
  );
}

/* 2 · Vegetativo — la mata como masa: una copa lobulada sobre su tallo. */
export function IconoVegetativo(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 20.5 V15" />
      <path d="M8.5 15 C4.6 15 3.4 11.2 5.8 9.6 C4.6 6.8 8 4.9 10.2 6.3 C10.8 4.2 13.2 4.2 13.8 6.3 C16 4.9 19.4 6.8 18.2 9.6 C20.6 11.2 19.4 15 15.5 15 Z" />
    </IconoEtapaBase>
  );
}

/* 3 · Floración — la flor abierta como copa (tulipán) sobre su tallo, con una hoja. */
export function IconoFloracion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 20.5 V13.5" />
      <path d="M12 17.5 C9.8 17.5 8 16 7.4 13.8" />
      <path d="M6 4.5 C6 11.2 8.6 13.5 12 13.5 C15.4 13.5 18 11.2 18 4.5 C16.2 6.8 14 6.8 12 4.5 C10 6.8 7.8 6.8 6 4.5 Z" />
    </IconoEtapaBase>
  );
}

/* 4 · Fructificación — el fruto cuajado, con su pedúnculo y una hoja. */
export function IconoFructificacion(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M12 20.5 C8.8 20.5 6.2 17.8 6.2 14.6 C6.2 11.8 8.2 10.2 10.4 10.6 C11 10.7 11.6 11 12 11.4 C12.4 11 13 10.7 13.6 10.6 C15.8 10.2 17.8 11.8 17.8 14.6 C17.8 17.8 15.2 20.5 12 20.5 Z" />
      <path d="M12 11.4 V6.5" />
      <path d="M12.2 8.2 C13.2 6.4 15 5.8 16.8 6.2" />
    </IconoEtapaBase>
  );
}

/* 5 · Cosecha — canasta de campo: ancha, con su asa alta. */
export function IconoCosecha(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M8 10.5 C8 3.5 16 3.5 16 10.5" />
      <path d="M3.5 10.5 H20.5" />
      <path d="M5.5 10.5 L7.3 18.8 A2 2 0 0 0 9.3 20.5 H14.7 A2 2 0 0 0 16.7 18.8 L18.5 10.5" />
    </IconoEtapaBase>
  );
}

/* 6 · Producto — el frasco con hombros y su tapa: la cosecha guardada. */
export function IconoProducto(props) {
  return (
    <IconoEtapaBase {...props}>
      <path d="M8.5 3.5 H15.5 A1 1 0 0 1 16.5 4.5 V6.5 H7.5 V4.5 A1 1 0 0 1 8.5 3.5 Z" />
      <path d="M7.5 6.5 C5.2 7.5 4.5 9.5 4.5 12 V17.5 A3 3 0 0 0 7.5 20.5 H16.5 A3 3 0 0 0 19.5 17.5 V12 C19.5 9.5 18.8 7.5 16.5 6.5" />
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
