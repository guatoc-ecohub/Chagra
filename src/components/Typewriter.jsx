import { useEffect, useRef, useState } from 'react';
import './typewriter.css';

/**
 * <Typewriter> — efecto máquina de escribir reutilizable, bello y sólido.
 *
 * Nació para la burbuja de Angelita (la abeja compañera) pero no sabe nada de
 * ella: recibe un texto y lo revela grafema a grafema con un cursor que
 * respira. Cualquier superficie de la app puede usarlo.
 *
 * Decisiones de diseño (por qué es "sólido"):
 *
 * 1. LAYOUT ESTABLE: el texto completo se renderiza invisible desde el primer
 *    frame (el "molde") y la "tinta" animada se pinta encima en absoluto. La
 *    caja contenedora NO crece letra a letra — una burbuja/tarjeta toma su
 *    tamaño final de una vez y no tiembla mientras escribe.
 *
 * 2. GRAFEMAS, no chars: usa Intl.Segmenter cuando existe, para no partir
 *    tildes combinadas ni emojis a mitad de code point. Fallback Array.from.
 *
 * 3. RITMO HUMANO: pausa breve extra tras puntuación (coma respira, punto
 *    respira más) — se siente hablado, no metralleta.
 *
 * 4. ACCESIBLE:
 *    - prefers-reduced-motion → muestra el texto completo SIN animar (y sin
 *      cursor parpadeante). También se puede forzar con `animado={false}`.
 *    - Lectores de pantalla: el texto completo vive en un span visualmente
 *      oculto desde el inicio; la tinta animada va con aria-hidden. El lector
 *      narra la frase entera de una vez, nunca letra por letra.
 *
 * 5. CERO dependencias, cero red, timers limpiados al desmontar o al cambiar
 *    el texto (cambiar `texto` reinicia la escritura).
 *
 * API:
 *   @param {string}   texto        - lo que se escribe. Cambiarlo reinicia.
 *   @param {number}   [velocidadMs=26]  - ms por grafema (base del ritmo).
 *   @param {number}   [retardoMs=140]   - espera antes de la primera letra.
 *   @param {boolean}  [cursor=true]     - mostrar el cursor que parpadea.
 *   @param {boolean}  [animado=true]    - false = texto completo de una vez
 *                                         (además del respeto automático a
 *                                         prefers-reduced-motion).
 *   @param {Function} [onTerminado]     - callback al terminar de escribir.
 *   @param {string}   [className]       - clases extra para el contenedor.
 */

/** Pausa extra (multiplicador de velocidadMs) tras signos de puntuación. */
const PAUSA_PUNTUACION = {
  ',': 5,
  ';': 6,
  ':': 6,
  '.': 10,
  '?': 10,
  '!': 10,
  '…': 12,
  '—': 5,
};

/** Parte un texto en grafemas sin romper tildes ni emojis. */
function segmentarGrafemas(texto) {
  const s = String(texto ?? '');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
      return Array.from(seg.segment(s), (parte) => parte.segment);
    } catch {
      /* fallback abajo */
    }
  }
  return Array.from(s);
}

/** ¿El usuario pidió menos movimiento? (seguro en SSR/tests: false). */
function reducirMovimiento() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function Typewriter({
  texto,
  velocidadMs = 26,
  retardoMs = 140,
  cursor = true,
  animado = true,
  onTerminado = null,
  className = '',
}) {
  const textoStr = String(texto ?? '');
  const sinAnimar = !animado || reducirMovimiento();

  // Cuántos grafemas van pintados. Sin animación arranca completo.
  const [visibles, setVisibles] = useState(() =>
    sinAnimar ? segmentarGrafemas(textoStr).length : 0,
  );
  const [terminado, setTerminado] = useState(sinAnimar);
  const onTerminadoRef = useRef(onTerminado);
  onTerminadoRef.current = onTerminado;

  useEffect(() => {
    const grafemas = segmentarGrafemas(textoStr);
    if (sinAnimar || grafemas.length === 0) {
      setVisibles(grafemas.length);
      setTerminado(true);
      if (grafemas.length > 0 && typeof onTerminadoRef.current === 'function') {
        onTerminadoRef.current();
      }
      return undefined;
    }
    // Reinicio limpio al cambiar el texto.
    setVisibles(0);
    setTerminado(false);
    let vivo = true;
    let timer = null;
    let i = 0;
    const paso = () => {
      if (!vivo) return;
      i += 1;
      setVisibles(i);
      if (i >= grafemas.length) {
        setTerminado(true);
        if (typeof onTerminadoRef.current === 'function') onTerminadoRef.current();
        return;
      }
      // El ritmo: base + respiro tras la puntuación que ACABA de pintarse.
      const recien = grafemas[i - 1];
      const factor = PAUSA_PUNTUACION[recien] || 1;
      timer = setTimeout(paso, velocidadMs * factor);
    };
    timer = setTimeout(paso, Math.max(0, retardoMs));
    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [textoStr, velocidadMs, retardoMs, sinAnimar]);

  const grafemas = segmentarGrafemas(textoStr);
  const tinta = grafemas.slice(0, visibles).join('');
  const mostrarCursor = cursor && !sinAnimar;

  return (
    <span className={`tw ${terminado ? 'tw--terminado' : ''} ${className}`.trim()}>
      {/* El molde: texto completo invisible que fija el tamaño desde el
          primer frame — la caja no crece letra a letra. */}
      <span className="tw__molde" aria-hidden="true">
        {textoStr}
      </span>
      {/* La tinta: lo ya escrito, pintado encima del molde. */}
      <span className="tw__tinta" aria-hidden="true">
        {tinta}
        {mostrarCursor && <span className="tw__cursor" />}
      </span>
      {/* Para lectores de pantalla: la frase entera, de una vez. */}
      <span className="tw__sr">{textoStr}</span>
    </span>
  );
}
