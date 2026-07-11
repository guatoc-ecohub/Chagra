import { resolveLaminaFiable } from './laminasFiables.js';
import '../effects/effects.css';
import './laminas.css';

/*
 * AgentLamina — el ADJUNTO de lámina que el agente incrusta en una respuesta
 * (DR "el agente dibuja de forma fiable", 2026-07-11). Recibe un `slug` del
 * conjunto CERRADO `LAMINAS_FIABLES` + `props` de enum cerrado y monta la
 * lámina LOCAL correspondiente, envuelta en el auto-dibujado ("se dibuja
 * sola") de `src/visual/effects`.
 *
 * CONTRATO CLAVE (degradación segura): si el `slug` NO está en el registro, o
 * si `props` trae algo fuera del enum, `resolveLaminaFiable` devuelve null y
 * AgentLamina renderiza NADA → la burbuja queda como solo texto. Nunca llega
 * un byte de SVG desde el modelo: el arte es 100% local y verificado a mano.
 *
 * Este componente valida SOLO reglas #1 y #2 del gate (slug ∈ registro, prop ∈
 * enum). La regla #3 (que la especie/proposición esté ATERRIZADA en la
 * evidencia del turno) la revalida el handler del agente aguas arriba — el arte
 * no sabe de grounding. Ver `resolveLaminaFiable`.
 *
 * Móvil-first (ancho completo, 320px), self-contained (sin CDN), contraste AA
 * (tinta sepia sobre papel crema). `prefers-reduced-motion` = lámina completa y
 * quieta en su fotograma final (lo garantiza effects.css / laminas.css).
 *
 * @param {Object} props
 * @param {string} props.slug - Slug de LAMINAS_FIABLES (p.ej. 'milpa', 'maiz').
 * @param {Record<string, string>} [props.props] - Props de dominio (enum
 *   cerrado): p.ej. `{ activo: 'tuberculo' }` o `{ etapa: 'cosecha' }`.
 * @param {string} [props.titulo] - Título opcional sobre la lámina (letra de
 *   cuaderno). Si se omite, se usa el `nombre` del registro.
 * @param {boolean} [props.mostrarTitulo=true] - Mostrar el título/rótulo.
 * @param {string|number} [props.drawKey] - Cambiarlo re-monta la lámina para
 *   re-disparar el auto-dibujado ("dibujar otra vez"). Opcional.
 * @param {string} [props.className] - Clases extra sobre el contenedor.
 */
export default function AgentLamina({
  slug,
  props: laminaProps = {},
  titulo,
  mostrarTitulo = true,
  drawKey,
  className,
}) {
  const resolved = resolveLaminaFiable(slug, laminaProps);
  // Regla del contrato: slug inválido o prop fuera de enum → no dibuja nada.
  if (!resolved) return null;

  const { Component, props: safeProps, meta } = resolved;
  const rotulo = titulo || meta.nombre;

  return (
    <figure
      className={['lam-agente', className].filter(Boolean).join(' ')}
      data-testid="agent-lamina"
      data-lamina-slug={slug}
    >
      {mostrarTitulo && rotulo && (
        <figcaption className="lam-agente-tit">{rotulo}</figcaption>
      )}
      {/* `key` re-monta la lámina cuando cambia drawKey → el auto-dibujado se
          vuelve a disparar. En el chat, el turno es estable: dibuja una vez. */}
      <div className="lam-agente-hoja" key={drawKey ?? slug}>
        <Component {...safeProps} className="lam-agente-svg" />
      </div>
    </figure>
  );
}
