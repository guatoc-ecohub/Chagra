/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI español intencional; ADR-050 i18n pendiente */
/*
 * HiloVidaVista — el hilo textual de la "vida vista" del valle.
 *
 * Una capa de PROSA CÁLIDA, DOM puro (cero three), que narra lo que el 3D
 * enseña con luz y movimiento: "Su finca amanece serena. La abeja Angelita
 * ronda el cafetal. Hay algo que atender en sanidad." Sirve a dos personas a
 * la vez:
 *
 *  - quien usa lector de pantalla (la narración vive en un `aria-live`
 *    cortés que anuncia los cambios sin interrumpir), y
 *  - quien simplemente prefiere LEER el estado de su finca de un vistazo.
 *
 * CONTRATO: consume estado por props y NUNCA lo fabrica — si un dato no
 * llega, describe lo neutro. Los vocabularios son los MISMOS del framework
 * visual (no inventa estados nuevos):
 *
 *   cielo      { luz: 'amanecer'|'dia'|'atardecer'|'noche',
 *                condicion: 'soleado'|'nublado'|'lluvia'|'niebla' }
 *              — el shape de `_cielo.js` / CieloParametrico.
 *   animo      'pleno'|'sereno'|'atento'|'sediento'|'descansa'
 *              — el ánimo real de AbejaAngelita (salud de la finca).
 *   energia    0..1 — la energía de Angelita (misma prop del valle).
 *   lugar      string opcional — dónde ronda la abeja ("el cafetal").
 *   pendientes array opcional [{ id, tema, texto?, view? }] — asuntos REALES
 *              (alertas de sanidad, riego…). `undefined` = no se sabe (se
 *              omite la frase); `[]` = se sabe que no hay (se dice en paz).
 *   onIrA      (view, pendiente) => void — opcional; con ella, cada
 *              pendiente con `view` gana un botón "Atender" que re-rutea a
 *              la vista 2D REAL (regla de oro de reachability del framework).
 *   reducedMotion  bool — apaga el pulso decorativo (además del media query).
 *
 * CABLEO SUGERIDO (para el host que ya arma el valle — no lo hace este
 * archivo): montar junto al `<Mundo>` / Valle3D con el MISMO estado que ya
 * alimenta a la abeja y al cielo:
 *
 *   import HiloVidaVista from './visual/mundo3d/HiloVidaVista.jsx';
 *   <HiloVidaVista
 *     cielo={cielo} animo={animo} energia={energia}
 *     lugar={lugarActual} pendientes={alertasHoy}
 *     onIrA={(view) => onNavigate(view)}
 *     reducedMotion={reducedMotion}
 *   />
 */
import './HiloVidaVista.css';
import { componerHilo } from './_hiloVida.js';

/* ── El componente ──────────────────────────────────────────────────────── */

export default function HiloVidaVista({
  cielo,
  animo = 'sereno',
  energia = 1,
  lugar,
  pendientes,
  onIrA,
  reducedMotion = false,
  className = '',
}) {
  const frases = componerHilo({ cielo, animo, energia, lugar, pendientes });
  const accionables = typeof onIrA === 'function'
    ? (Array.isArray(pendientes) ? pendientes : [])
        .filter((p) => p && p.view)
        .slice(0, 3)
    : [];

  return (
    <section
      className={`hilo-vida ${className}`.trim()}
      data-reduced={reducedMotion ? 'true' : undefined}
      aria-label="La vida de su finca, contada en palabras"
    >
      <span className="hilo-vida__pulso" aria-hidden="true" />
      {/* La narración es la región viva: cortés y atómica, para que el
          lector de pantalla anuncie el hilo COMPLETO cuando cambie, sin
          interrumpir lo que la persona esté haciendo. Los botones viven
          FUERA de la región para no re-anunciarse como texto. */}
      <p className="hilo-vida__texto" aria-live="polite" aria-atomic="true">
        {frases.join(' ')}
      </p>
      {accionables.length > 0 && (
        <ul className="hilo-vida__acciones" aria-label="Pendientes de la finca">
          {accionables.map((p, i) => (
            <li key={p.id ?? p.view ?? i}>
              <button
                type="button"
                className="hilo-vida__accion"
                onClick={() => onIrA(p.view, p)}
              >
                Atender {p.tema || 'pendiente'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
