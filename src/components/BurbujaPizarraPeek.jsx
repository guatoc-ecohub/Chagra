import React, { useEffect, useRef } from 'react';
import { Eye, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import './burbuja-pizarra-peek.css';

/**
 * <BurbujaPizarraPeek> — el ASOMO (peek) del compai al TOCARLO.
 *
 * REDISEÑO 2026-08-27 (v2, alta gama): el operador desaprobó DOS versiones
 * previas: (1) el asomo de MADERA (grande, invasivo, «asquerosa»); (2) la
 * primera pizarra que ESCRIBÍA el aviso a máquina (Typewriter) — el texto en
 * movimiento le daba MAREO. Reglas duras de esta versión:
 *
 *   R1 — PIZARRA DE COLEGIO, no madera. Superficie de pizarra (verde-slate
 *        oscuro) enmarcada en un riel fino oscuro (NUNCA tablón café). El aviso
 *        va escrito en TIZA (crema).
 *   R2 — ESTÁTICO. El aviso APARECE y se queda QUIETO: nada de máquina de
 *        escribir, nada de texto que se desplace. La única transición es una
 *        aparición de OPACIDAD muy corta del recuadro entero (no mueve el
 *        texto). Con `prefers-reduced-motion: reduce`, ni eso.
 *   R3 — SIN elementos repetidos: un solo tablero, el aviso una sola vez, un
 *        cierre, una fila de controles con íconos distintos. Cero burbuja doble.
 *   R4 — NUNCA tapa la pantalla de Chagra: compacto, anclado ARRIBA del FAB,
 *        crece hacia arriba. NO hay overlay de pantalla completa.
 *   R5 — El contenido es AYUDA real (el aviso), no relleno ni un anuncio de sí
 *        mismo.
 *
 * Tres controles bajo la pizarra (íconos distintos, sin repetir):
 *   - Ver      (ojo)      → abre el panel de lectura con el mensaje completo.
 *   - Escuchar (bocina)   → lee EN VOZ el aviso REAL (no una frase enlatada).
 *   - Callar   (bocina ×) → silencia los avisos (useAngelitaStore.silenciar()).
 *   - Más      (···)      → sólo si el FAB lo habilita: abre el menú compacto.
 *
 * Para cerrar al tocar afuera NO se usa un div que cubra la app (eso la tapaba):
 * un listener liviano de `pointerdown` en el documento descarta el asomo si el
 * toque cae fuera de la pizarra. Con cleanup, sin overlay.
 *
 * Accesibilidad: role="dialog" con nombre; el aviso es texto plano (no se
 * fragmenta letra por letra, el lector lo narra entero); los controles son
 * <button> con nombre accesible propio; el foco entra al primer control.
 *
 * Español de Colombia (usted), sin voseo.
 *
 * @param {Object}     props
 * @param {string}     props.mensaje       el último aviso a asomar.
 * @param {string}     [props.nombre]      nombre del compai (rótulo de la tiza).
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
      {/* La pizarra: riel fino oscuro (marco) + tablero de slate con grano de
          tiza. El grano y las «marcas de borrador» son pseudo-elementos
          decorativos (::before/::after en el CSS), no nodos repetidos. */}
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

        {/* Rótulo de la tiza: quién le habla, en pequeño, con un subrayado de
            tiza dibujado a mano (SVG estático). El aviso es el héroe; esto es
            sólo el encabezado del «tablero». */}
        <p className="burbuja-pizarra-peek__rotulo">
          {nombre}
          <svg
            className="burbuja-pizarra-peek__subrayado"
            viewBox="0 0 120 8"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {/* trazo irregular, como una raya de gis: no es una línea recta */}
            <path d="M2 5.2 C 22 3.1, 44 6.4, 66 4.2 S 104 3.0, 118 4.6" />
          </svg>
        </p>

        {/* El aviso, escrito en tiza. ESTÁTICO: texto plano, aparece y se queda
            quieto. Una sola vez en el DOM (sin molde/tinta del typewriter). */}
        <p className="burbuja-pizarra-peek__texto">{texto}</p>
      </div>

      {/* Los tres controles, BAJO la pizarra (Ver / Escuchar / Callar). */}
      <div className="burbuja-pizarra-peek__controles" role="group" aria-label="Qué hacer con este aviso">
        <button
          ref={primerControlRef}
          type="button"
          onClick={onVer}
          className="burbuja-pizarra-peek__control"
          aria-label="Ver el mensaje completo"
        >
          <Eye size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>Ver</span>
        </button>
        <button
          type="button"
          onClick={onEscuchar}
          className="burbuja-pizarra-peek__control"
          aria-label="Escuchar este aviso en voz alta"
        >
          <Volume2 size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>Escuchar</span>
        </button>
        <button
          type="button"
          onClick={onCallar}
          className="burbuja-pizarra-peek__control"
          aria-pressed={silenciado}
          aria-label={silenciado ? 'Ya está en silencio' : 'Que se quede callado'}
        >
          <VolumeX size={15} strokeWidth={1.6} aria-hidden="true" />
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
            <MoreHorizontal size={15} strokeWidth={1.6} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
