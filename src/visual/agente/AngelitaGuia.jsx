import { Angelita } from './Angelita.jsx';
import BurbujaAngelita from './BurbujaAngelita.jsx';
import { useAngelitaGuia } from '../../hooks/useAngelitaGuia.js';
import './angelita-guia.css';

/*
 * <AngelitaGuia> — Angelita vuela hasta un elemento real de la pantalla, lo
 * señala/invita/mira (el gesto que usted declaró — reutiliza
 * angelitaEstados.js, CERO estados nuevos) y explica QUÉ hay ahí, con
 * criterio agroecológico real. Reutilizable en CUALQUIER vista 2D.
 *
 * ADOPCIÓN EN OTRA PANTALLA (las 3 líneas que hacen falta):
 *
 *   const refTanque = useRef(null);
 *   const paradas = [{ id: 'tanque', ref: refTanque, texto: 'El agua de lluvia no trae cloro…', gesto: 'invita' }];
 *   <AngelitaGuia paradas={paradas} />
 *
 * (el elemento en cuestión solo necesita `ref={refTanque}` en su JSX de
 * siempre — nada más cambia en la pantalla).
 *
 * QUÉ HACE, en dos piezas fijas (angelita-guia.css):
 *   1. Un avatarcito flotante (`.ang-guia`) que el hook posiciona junto al
 *      elemento — perchado en su esquina, sin tapar el texto de abajo.
 *   2. Una franja angosta y fija al pie (`.ang-guia__panel`) con su burbuja
 *      (BurbujaAngelita, la misma de siempre) y la navegación del recorrido
 *      — SIEMPRE en el mismo sitio, así el usuario sabe dónde mirar y dónde
 *      cerrarla. Un recorrido de una sola parada oculta la navegación y
 *      cambia "Siguiente" por "Entendido".
 *
 * PRINCIPIO MISS MINUTES: presencia que informa sin invadir — nunca bloquea
 * la interacción (el resto de la pantalla queda 100% operable), nunca exige
 * atención (el usuario avanza a su ritmo, no hay avance automático), y se
 * cierra con un toque. Con `recordarCierreId`, cerrarla la apaga para
 * siempre en este dispositivo — no vuelve a insistir.
 *
 * Reduced-motion: sin vuelo entre paradas ni entrada animada del panel — el
 * mensaje se lee exactamente igual, solo que quieto (el hook decide, aquí
 * solo se refleja con `data-ang-quieta`).
 *
 * @param {Object} props
 * @param {import('../../hooks/useAngelitaGuia').ParadaGuia[]} props.paradas
 * @param {boolean} [props.activo=true]
 * @param {number} [props.tamano=64]
 * @param {string} [props.recordarCierreId] — persistir el cierre en este dispositivo.
 * @param {number} [props.demoraInicialMs] — pisa la espera antes de aparecer
 *   (default del hook: 550ms; útil para tests o para un host que dispara la
 *   guía desde una acción explícita del usuario, sin necesidad de esperar).
 * @param {string} [props.className] — clases extra para el avatarcito flotante.
 */
export function AngelitaGuia({
  paradas = [],
  activo = true,
  tamano = 64,
  recordarCierreId = undefined,
  demoraInicialMs = undefined,
  className = '',
}) {
  const guia = useAngelitaGuia(paradas, { activo, tamano, recordarCierreId, demoraInicialMs });

  if (!guia.parada) return null;

  const estiloFlotador = {
    '--ang-guia-x': `${guia.posicion?.x ?? 0}px`,
    '--ang-guia-y': `${guia.posicion?.y ?? 0}px`,
  };
  const avanzar = guia.esUltima ? guia.cerrar : guia.siguiente;

  return (
    <>
      <div
        className={`ang-guia ${className}`.trim()}
        style={estiloFlotador}
        data-ang-quieta={guia.quieta ? '1' : undefined}
        data-ang-vista={guia.enVista ? '1' : '0'}
        hidden={!guia.visible}
      >
        <button
          type="button"
          className="ang-guia__cuerpo"
          onClick={avanzar}
          aria-label={guia.esUltima ? 'Angelita: cerrar la guía' : 'Angelita: ver lo siguiente'}
        >
          <Angelita estado={guia.parada.gesto} direccion={guia.direccion} size={tamano} />
        </button>
      </div>

      {guia.visible && (
        <div className="ang-guia__panel" role="group" aria-label="Guía de Angelita">
          <BurbujaAngelita
            mensaje={guia.parada.texto}
            tipo={guia.parada.tipo}
            className="ang-guia__burbuja"
          />
          <div className="ang-guia__nav">
            {guia.total > 1 && (
              <span className="ang-guia__paso" aria-hidden="true">
                {guia.indice + 1}/{guia.total}
              </span>
            )}
            {!guia.esPrimera && (
              <button type="button" className="ang-guia__btn" onClick={guia.anterior}>
                ← Antes
              </button>
            )}
            <button type="button" className="ang-guia__btn ang-guia__btn--principal" onClick={avanzar}>
              {guia.esUltima ? 'Entendido' : 'Siguiente →'}
            </button>
            <button
              type="button"
              className="ang-guia__cerrar"
              aria-label="Cerrar la guía de Angelita"
              onClick={guia.cerrar}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AngelitaGuia;
