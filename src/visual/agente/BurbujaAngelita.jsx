import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Typewriter from '../../components/Typewriter';
import { aparienciaDeTipo } from './angelitaAvisoTipos';
import './angelitaBurbuja.css';

/** Aire mínimo entre la burbuja y el borde de la pantalla (px). */
const MARGEN_PANTALLA = 10;

/**
 * Cuánto hay que correr la burbuja para que quepa entera en la pantalla.
 *
 * EL BUG QUE ARREGLA (visto en captura, 430 px de ancho): la burbuja va
 * anclada al personaje con `<Html center>` — o sea CENTRADA en su posición de
 * pantalla. Cuando el compAI anda cerca de un borde, media burbuja se sale y
 * el aviso queda cortado. En un teléfono modesto —que es el aparato del
 * usuario— eso significa que el tip sencillamente no se puede leer.
 *
 * Es la misma regla que ya aplica `useAngelitaGuia.calcularPuestoGuia` para
 * las paradas de la guía: nunca tapar, nunca salirse. Pura y testeable — no
 * toca el DOM, sólo calcula.
 *
 * @param {{left:number,right:number}} caja — rect de la burbuja.
 * @param {number} anchoPantalla
 * @param {number} [margen]
 * @returns {number} px a sumar en X (negativo = correr a la izquierda).
 */
export function correccionEnPantalla(caja, anchoPantalla, margen = MARGEN_PANTALLA) {
  if (!caja || !Number.isFinite(anchoPantalla) || anchoPantalla <= 0) return 0;
  const sobraDerecha = caja.right - (anchoPantalla - margen);
  const faltaIzquierda = margen - caja.left;
  // Si se sale por los DOS lados es que no cabe: se pega a la izquierda y el
  // `max-width` del CSS se encarga del resto. Peor sería centrarla y perder
  // texto por ambos bordes.
  if (sobraDerecha > 0 && faltaIzquierda > 0) return faltaIzquierda;
  if (sobraDerecha > 0) return -sobraDerecha;
  if (faltaIzquierda > 0) return faltaIzquierda;
  return 0;
}

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
  velocidadMs = 16,
  className = '',
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
    // Se mide SIN el desvío ya aplicado, para no acumular corrección sobre
    // corrección en cada re-medida (scroll, rotación de pantalla…).
    const caja = n.getBoundingClientRect();
    const crudo = { left: caja.left - desvioX, right: caja.right - desvioX };
    const nuevo = correccionEnPantalla(crudo, ancho);
    setDesvioX((previo) => (Math.abs(previo - nuevo) > 0.5 ? nuevo : previo));
  }, [desvioX]);

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
    </div>
  );
}
