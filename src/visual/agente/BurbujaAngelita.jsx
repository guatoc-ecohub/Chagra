import Typewriter from '../../components/Typewriter';
import { aparienciaDeTipo } from './angelitaAvisoTipos';
import './angelitaBurbuja.css';

/* Un aviso que no se lee de un vistazo no sirve (feedback del operador: "los
   avisos son muy largos y entre más largos más difíciles de leer"). Se corta
   en la primera frontera de frase que quepa; si no hay ninguna, en la última
   palabra completa. Además evita que la máquina de escribir reserve un cajón
   enorme y vacío mientras arranca. */
const TOPE_AVISO = 105;
export function recortarAviso(texto, tope = TOPE_AVISO) {
  const t = String(texto || '').trim();
  if (t.length <= tope) return t;
  const cabe = t.slice(0, tope);
  const frase = Math.max(cabe.lastIndexOf('. '), cabe.lastIndexOf('? '), cabe.lastIndexOf('! '));
  if (frase > tope * 0.45) return t.slice(0, frase + 1).trim();
  const palabra = cabe.lastIndexOf(' ');
  return `${(palabra > 0 ? cabe.slice(0, palabra) : cabe).trim()}…`;
}

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
 * @param {string|null} props.mensaje - lo que dice Angelita (null no pinta).
 * @param {string} [props.tipo] - uno de TIPOS_AVISO (angelitaAvisoTipos).
 * @param {boolean} [props.animado=true] - false apaga el typewriter (además
 *   del respeto automático a prefers-reduced-motion).
 * @param {number} [props.velocidadMs=26] - ritmo del typewriter.
 * @param {string} [props.className] - clases extra (posicionamiento del host).
 */
export default function BurbujaAngelita({
  mensaje,
  tipo = 'informativa',
  animado = true,
  velocidadMs = 16,
  className = '',
}) {
  if (!mensaje) return null;
  /* CORTO DE VERDAD (feedback del operador: "los avisos son muy largos y entre
     más largos más difíciles de leer"). Un aviso que no se lee de un vistazo no
     sirve: se corta en la primera frontera de frase que quepa, y si no hay
     ninguna, en la última palabra completa. Además evita el cajón vacío gigante
     mientras la máquina de escribir arranca. */
  mensaje = recortarAviso(mensaje);
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
