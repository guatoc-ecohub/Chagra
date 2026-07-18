import Typewriter from '../../components/Typewriter';
import { aparienciaDeTipo } from './angelitaAvisoTipos';
import './angelitaBurbuja.css';

/**
 * <BurbujaAngelita> — la burbuja con la voz de Angelita: typewriter + color
 * por tipo de aviso + ícono que desambigua sin color.
 *
 * Autocontenida (CSS propio, cero dependencia de rotulosValle3D.css) para
 * poder vivir en el valle 3D hoy y en cualquier otra superficie mañana.
 * Reemplaza 1:1 al div `.valle-abeja__burbuja` dentro del <Html> de
 * CompaneroAbeja (el cableado exacto está en el reporte de esta rama).
 *
 * Accesibilidad:
 *   - role="status" + aria-live="polite": el lector narra el mensaje entero
 *     una sola vez (el Typewriter le da el texto completo desde el inicio).
 *   - El tipo se narra con texto oculto ("Alerta importante de su finca…"),
 *     no solo con el tinte.
 *   - El ícono va aria-hidden (decorativo: su semántica ya está narrada).
 *   - prefers-reduced-motion: el Typewriter muestra todo de una y la entrada
 *     de la burbuja no anima (CSS).
 *
 * @param {Object} props
 * @param {string|null} props.mensaje — lo que dice Angelita (null → no pinta).
 * @param {string} [props.tipo] — uno de TIPOS_AVISO (angelitaAvisoTipos).
 * @param {boolean} [props.animado=true] — false apaga el typewriter (además
 *   del respeto automático a prefers-reduced-motion).
 * @param {number} [props.velocidadMs=26] — ritmo del typewriter.
 * @param {string} [props.className] — clases extra (posicionamiento del host).
 */
export default function BurbujaAngelita({
  mensaje,
  tipo = 'informativa',
  animado = true,
  velocidadMs = 26,
  className = '',
}) {
  if (!mensaje) return null;
  const spec = aparienciaDeTipo(tipo);
  return (
    <div
      className={`angelita-burbuja angelita-burbuja--${tipo} ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={{
        '--ab-acento': spec.acento,
        '--ab-borde': spec.borde,
        '--ab-fondo': spec.fondo,
        '--ab-fondo-icono': spec.fondoIcono,
      }}
    >
      <span className="angelita-burbuja__icono" aria-hidden="true">
        {spec.icono}
      </span>
      <span className="angelita-burbuja__texto">
        {/* El tipo, narrado (nunca solo color): */}
        <span className="angelita-burbuja__sr">{spec.aria}: </span>
        <Typewriter texto={mensaje} animado={animado} velocidadMs={velocidadMs} />
      </span>
    </div>
  );
}
