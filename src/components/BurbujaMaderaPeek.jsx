import React, { useEffect, useRef } from 'react';
import { Eye, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import Typewriter from './Typewriter';
import './burbuja-madera-peek.css';

/**
 * <BurbujaMaderaPeek> — el ASOMO (peek) del compai al TOCARLO (decisión del
 * operador 2026-08-27, superficie del FAB).
 *
 * El auditor pedía «que el tap muestre el último mensaje». Antes el toque abría
 * un menú (o navegaba pesado al agente); ahora asoma una burbuja de TABLA DE
 * MADERA —veteada, cálida, de finca— con el ÚLTIMO aviso escrito a máquina
 * (Typewriter, el mismo primitivo del valle) y, encima de ella, TRES controles
 * claros:
 *
 *   - Ver      (ojo)      → abre el panel de lectura con el mensaje completo.
 *   - Escuchar (bocina)   → lee EN VOZ el aviso REAL (no una frase enlatada).
 *   - Callar   (bocina ×) → silencia los avisos (useAngelitaStore.silenciar()).
 *
 * El descubrimiento de más acciones (hablar, foto, callar-hoy) NO vive aquí: es
 * la mano/red micorriza (AgentRedMenu). Para no dejar esas acciones sin camino
 * mientras esa red se cablea al FAB, `onMas` (opcional) abre el menú compacto
 * de siempre — un paso más, nunca en primer plano.
 *
 * Accesibilidad: role="dialog" con nombre; los controles son <button> con
 * nombre accesible propio; el texto lo narra Typewriter (frase entera de una
 * vez, aria). prefers-reduced-motion: sin animación de entrada (CSS) y el
 * typewriter muestra todo de una.
 *
 * Español de Colombia (usted), sin voseo.
 *
 * @param {Object}     props
 * @param {string}     props.mensaje       el último aviso a asomar.
 * @param {string}     [props.nombre]      nombre del compai (para el rótulo sr).
 * @param {boolean}    [props.silenciado]  si ya está en silencio (rótulo Callar).
 * @param {() => void} props.onVer         abrir el panel de lectura.
 * @param {() => void} props.onEscuchar    leer el aviso real en voz alta.
 * @param {() => void} props.onCallar      silenciar los avisos.
 * @param {() => void} [props.onMas]       abrir el menú de más acciones.
 * @param {() => void} props.onCerrar      descartar el asomo.
 */
export default function BurbujaMaderaPeek({
  mensaje,
  nombre = 'Chagra IA',
  silenciado = false,
  onVer,
  onEscuchar,
  onCallar,
  onMas,
  onCerrar,
}) {
  const cajaRef = useRef(null);
  const primerControlRef = useRef(null);

  // Cierra con Escape y mueve el foco al primer control al asomar — el teclado
  // no puede quedar peor que el toque.
  useEffect(() => {
    primerControlRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCerrar?.(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onCerrar]);

  const texto = String(mensaje || '').trim()
    || 'Estoy con usted. Tóqueme para ver, escuchar o pedir silencio.';

  return (
    <>
      {/* Fondo invisible: un toque afuera descarta el asomo. */}
      <div
        onClick={onCerrar}
        onTouchStart={onCerrar}
        aria-hidden="true"
        className="burbuja-madera-peek__backdrop"
      />
      <div
        ref={cajaRef}
        className="burbuja-madera-peek"
        data-testid="compai-fab-peek"
        role="dialog"
        aria-label={`Aviso de ${nombre}`}
      >
        {/* Veta decorativa + tabla: el texto va escrito a máquina encima. */}
        <div className="burbuja-madera-peek__tabla">
          <button
            type="button"
            onClick={onCerrar}
            className="burbuja-madera-peek__cerrar"
            aria-label="Descartar este aviso"
            title="Descartar"
          >
            <span aria-hidden="true">×</span>
          </button>
          <span className="burbuja-madera-peek__sr">{nombre} le dice: </span>
          <p className="burbuja-madera-peek__texto">
            <Typewriter texto={texto} velocidadMs={18} />
          </p>
        </div>

        {/* Los tres controles, ENCIMA de la tabla (decisión: Ver/Escuchar/Callar). */}
        <div className="burbuja-madera-peek__controles" role="group" aria-label="Qué hacer con este aviso">
          <button
            ref={primerControlRef}
            type="button"
            onClick={onVer}
            className="burbuja-madera-peek__control"
            aria-label="Ver el mensaje completo"
          >
            <Eye size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Ver</span>
          </button>
          <button
            type="button"
            onClick={onEscuchar}
            className="burbuja-madera-peek__control"
            aria-label="Escuchar este aviso en voz alta"
          >
            <Volume2 size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Escuchar</span>
          </button>
          <button
            type="button"
            onClick={onCallar}
            className="burbuja-madera-peek__control"
            aria-pressed={silenciado}
            aria-label={silenciado ? 'Ya está en silencio' : 'Que se quede callado'}
          >
            <VolumeX size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Callar</span>
          </button>
          {onMas && (
            <button
              type="button"
              onClick={onMas}
              className="burbuja-madera-peek__control burbuja-madera-peek__control--mas"
              aria-label="Más opciones"
              title="Más opciones"
            >
              <MoreHorizontal size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
