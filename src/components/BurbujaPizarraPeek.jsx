import React, { useEffect, useRef } from 'react';
import { Eye, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import Typewriter from './Typewriter';
import './burbuja-pizarra-peek.css';

/**
 * <BurbujaPizarraPeek> — el ASOMO (peek) del compai al TOCARLO (rediseño
 * 2026-08-27; el asomo de madera anterior lo desaprobó el operador por grande e
 * invasivo).
 *
 * Ahora es una PIZARRA DE COLEGIO chiquita: superficie verde-pizarra, el aviso
 * escrito en TIZA a máquina (Typewriter, el mismo primitivo del valle) y, bajo
 * ella, TRES controles claros:
 *
 *   - Ver      (ojo)      → abre el panel de lectura con el mensaje completo.
 *   - Escuchar (bocina)   → lee EN VOZ el aviso REAL (no una frase enlatada).
 *   - Callar   (bocina ×) → silencia los avisos (useAngelitaStore.silenciar()).
 *
 * DOS REGLAS DURAS (2026-08-27) que rige este componente:
 *   R1 — NUNCA tapa la pantalla de Chagra: es compacto, se ancla arriba del FAB
 *        y crece hacia arriba. NO hay fondo/overlay de pantalla completa.
 *   R2 — El contenido es AYUDA real al usuario (el aviso), no relleno ni un
 *        anuncio de sí mismo.
 *
 * Para cerrar al tocar afuera NO se usa un div que cubra la app (eso la tapaba):
 * un listener liviano de `pointerdown` en el documento descarta el asomo si el
 * toque cae fuera de la pizarra. Con cleanup, sin overlay.
 *
 * El descubrimiento de más acciones (hablar, foto, callar-hoy) NO vive aquí: es
 * la mano/red micorriza (AgentRedMenu). Mientras esa red se cablea al FAB,
 * `onMas` (opcional) abre el menú compacto de siempre — un paso más, nunca en
 * primer plano.
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
export default function BurbujaPizarraPeek({
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

  // Cerrar al tocar AFUERA sin tapar la app: un listener liviano en el
  // documento (no un overlay de pantalla completa). Si el toque cae fuera de la
  // pizarra, se descarta. El evento que abrió el peek ya terminó su propagación
  // antes de que corra este efecto, así que no se auto-cierra al abrir.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) {
        onCerrar?.();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onCerrar]);

  const texto = String(mensaje || '').trim()
    || 'Estoy pendiente de su chagra. Toque para ver o escuchar.';

  return (
    <div
      ref={cajaRef}
      className="burbuja-pizarra-peek"
      data-testid="compai-fab-peek"
      data-compai-no-drag="true"
      role="dialog"
      aria-label={`Aviso de ${nombre}`}
    >
      {/* La pizarra: el aviso va escrito en tiza (typewriter) encima. */}
      <div className="burbuja-pizarra-peek__tabla">
        <button
          type="button"
          onClick={onCerrar}
          className="burbuja-pizarra-peek__cerrar"
          aria-label="Descartar este aviso"
          title="Descartar"
        >
          <span aria-hidden="true">×</span>
        </button>
        <span className="burbuja-pizarra-peek__sr">{nombre} le dice: </span>
        <p className="burbuja-pizarra-peek__texto">
          <Typewriter texto={texto} animado={false} />
        </p>
      </div>

      {/* Los tres controles, BAJO la pizarra (decisión: Ver/Escuchar/Callar). */}
      <div className="burbuja-pizarra-peek__controles" role="group" aria-label="Qué hacer con este aviso">
        <button
          ref={primerControlRef}
          type="button"
          onClick={onVer}
          className="burbuja-pizarra-peek__control"
          aria-label="Ver el mensaje completo"
        >
          <Eye size={15} strokeWidth={2.2} aria-hidden="true" />
          <span>Ver</span>
        </button>
        <button
          type="button"
          onClick={onEscuchar}
          className="burbuja-pizarra-peek__control"
          aria-label="Escuchar este aviso en voz alta"
        >
          <Volume2 size={15} strokeWidth={2.2} aria-hidden="true" />
          <span>Escuchar</span>
        </button>
        <button
          type="button"
          onClick={onCallar}
          className="burbuja-pizarra-peek__control"
          aria-pressed={silenciado}
          aria-label={silenciado ? 'Ya está en silencio' : 'Que se quede callado'}
        >
          <VolumeX size={15} strokeWidth={2.2} aria-hidden="true" />
          <span>Callar</span>
        </button>
        {onMas && (
          <button
            type="button"
            onClick={onMas}
            className="burbuja-pizarra-peek__control burbuja-pizarra-peek__control--mas"
            aria-label="Más opciones"
            title="Más opciones"
          >
            <MoreHorizontal size={15} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
