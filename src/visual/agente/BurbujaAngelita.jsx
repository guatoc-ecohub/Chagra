import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import Typewriter from '../../components/Typewriter';
import { aparienciaDeTipo } from './angelitaAvisoTipos';
import { activarEscucha } from '../../services/escuchaService';
import { correccionEnPantalla, recortarAviso } from './burbujaAngelitaUtils.js';
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
 * RESPONDER POR VOZ (#91): con `permiteEscucha`, la burbuja suma un botón de
 * micrófono que dispara `activarEscucha({ fuente: 'tip' })` — el mismo
 * contrato desacoplado que ya usa EscuchaFab (services/escuchaService.js):
 * abre el overlay "Chagra está escuchando" con el pipeline Whisper/Kokoro
 * real, sin que la burbuja sepa nada de grabar audio. Apagado por defecto:
 * cada llamador decide si el tip que muestra amerita una respuesta hablada
 * (un tip informativo no la necesita; un aviso que pregunta algo, sí).
 *
 * @param {Object} props
 * @param {string|null} props.mensaje — lo que dice Angelita (null → no pinta).
 * @param {string} [props.tipo] — uno de TIPOS_AVISO (angelitaAvisoTipos).
 * @param {boolean} [props.animado=true] — false apaga el typewriter (además
 *   del respeto automático a prefers-reduced-motion).
 * @param {number} [props.velocidadMs=26] — ritmo del typewriter.
 * @param {string} [props.className] — clases extra (posicionamiento del host).
 * @param {boolean} [props.permiteEscucha=false] — muestra el botón de
 *   "responder por voz" (#91).
 */
export default function BurbujaAngelita({
  mensaje,
  tipo = 'informativa',
  animado = true,
  velocidadMs = 16,
  className = '',
  permiteEscucha = false,
}) {
  /* NO SE SALE DE LA PANTALLA. Se mide después de pintar y se corrige en X.
     Los hooks van ANTES del `return null` — si no, React ve un número
     distinto de hooks entre renders y revienta. */
  const ref = useRef(null);
  const [desvioX, setDesvioX] = useState(0);

  const reencuadrar = useCallback(() => {
    const n = ref.current;
    if (!n) return;
    const ancho = globalThis.innerWidth || 0;
    const caja = n.getBoundingClientRect();
    /* SIN LAYOUT NO SE MIDE. Un rect de 0×0 significa que el nodo no está
       maquetado (jsdom en los tests, `display:none`, el frame antes del
       primer paint). Medir ahí daba una corrección basada en la nada y —como
       el rect nunca cambiaba— el cálculo no convergía nunca: bucle infinito
       de renders. Lo cazaron los tests con "Maximum update depth exceeded". */
    if (caja.width < 1 && caja.height < 1) return;
    /* El rect YA incluye el `translateX` aplicado, así que la corrección es
       incremental y converge sola: cuando la burbuja quede dentro, la
       corrección da 0 y el estado deja de cambiar. */
    setDesvioX((previo) => {
      const nuevo = previo + correccionEnPantalla(caja, ancho);
      return Math.abs(previo - nuevo) > 0.5 ? nuevo : previo;
    });
  }, []);

  useLayoutEffect(() => {
    if (!mensaje) return undefined;
    reencuadrar();
    // El personaje se MUEVE (vuela, husmea, entra a un mundo): la burbuja va
    // pegada a él, así que hay que re-medir mientras esté en pantalla. Un
    // intervalo corto y barato le gana a un ResizeObserver aquí, porque lo que
    // cambia no es el tamaño de la burbuja sino la posición del ancla en 3D.
    const t = setInterval(reencuadrar, 500);
    globalThis.addEventListener?.('resize', reencuadrar);
    globalThis.addEventListener?.('orientationchange', reencuadrar);
    return () => {
      clearInterval(t);
      globalThis.removeEventListener?.('resize', reencuadrar);
      globalThis.removeEventListener?.('orientationchange', reencuadrar);
    };
  }, [mensaje, reencuadrar]);

  if (!mensaje) return null;
  /* CORTO DE VERDAD (feedback del operador: "los avisos son muy largos y entre
     más largos más difíciles de leer"). Un aviso que no se lee de un vistazo no
     sirve: se corta en la primera frontera de frase que quepa, y si no hay
     ninguna, en la última palabra completa. Además evita el cajón vacío gigante
     mientras la máquina de escribir arranca. */
  const texto = recortarAviso(mensaje);
  const spec = aparienciaDeTipo(tipo);
  return (
    <div
      ref={ref}
      className={`angelita-burbuja angelita-burbuja--${tipo} ${className}`.trim()}
      role="status"
      aria-live="polite"
      style={{
        '--ab-acento': spec.acento,
        '--ab-borde': spec.borde,
        '--ab-fondo': spec.fondo,
        '--ab-fondo-icono': spec.fondoIcono,
        transform: desvioX ? `translateX(${desvioX}px)` : undefined,
      }}
    >
      <span className="angelita-burbuja__icono" aria-hidden="true">
        {spec.icono}
      </span>
      <span className="angelita-burbuja__texto">
        {/* El tipo, narrado (nunca solo color): */}
        <span className="angelita-burbuja__sr">{spec.aria}: </span>
        <Typewriter texto={texto} animado={animado} velocidadMs={velocidadMs} />
      </span>
      {permiteEscucha && (
        <button
          type="button"
          className="angelita-burbuja__escuchar"
          onClick={() => activarEscucha({ fuente: 'tip' })}
          aria-label="Responder por voz a este aviso"
          title="Hablar con Chagra sobre esto"
        >
          <Mic size={14} strokeWidth={2.4} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
