import {
  AbejaAngelita, Colibri, RanaAndina, Lombriz, Mariposa,
} from '../../visual/creatures/index.js';

/**
 * CriaturaFinca — hace que las criaturas del juego "Mi Finca Viva" sean sus
 * PERSONAJES rubber-hose de verdad, no emojis de adorno (spec belleza-juegos,
 * regla de oro #1: los actores animados como protagonistas).
 *
 * Mapea la criatura del JUEGO (fincaGameService CREATURES, referida por `id`)
 * a su personaje rubber-hose de la casa (src/visual/creatures). Solo mapeos
 * FIELES — una lombriz ES la Lombriz, una abeja ES Angelita. Las que aún no
 * tienen un SVG fiel de la casa (mariquita, quetzal) caen a su emoji: honestidad
 * visual, jamás un bicho disfrazado de otro (verify-before-claim, también en arte).
 *
 * Cero three, cero geometría nueva: reusa los SVG ya aprobados (memoria
 * feedback-svg-rubberhose-en-mundos-3d). Cada personaje trae por dentro su
 * vida idle (aleteo, parpadeo, line-boil) cuando `animated`.
 */
export const CRIATURA_JUEGO_SVG = Object.freeze({
  lombriz: Lombriz,
  mariposa: Mariposa,
  abeja: AbejaAngelita,
  rana: RanaAndina,
  colibri: Colibri,
});

/** ¿La criatura del juego tiene un personaje rubber-hose fiel? */
export function criaturaTieneSvg(id) {
  return Boolean(CRIATURA_JUEGO_SVG[id]);
}

/**
 * Dibuja UNA criatura del juego como su personaje rubber-hose (protagonista),
 * con respaldo a emoji para las que aún no tienen SVG fiel.
 *
 * @param {Object} props
 * @param {string} props.id        id de la criatura del juego (lombriz, abeja, …)
 * @param {string} [props.emoji]   emoji de respaldo (para las sin SVG fiel)
 * @param {string} [props.nombre]  nombre accesible
 * @param {number} [props.size]    px del personaje
 * @param {boolean} [props.fantasma]  silueta "aún no desbloqueada" (gris, tenue)
 * @param {boolean} [props.animated]  vida idle (default true; off si fantasma)
 * @param {string} [props.className]
 */
export function CriaturaFinca({
  id,
  emoji,
  nombre,
  size = 44,
  fantasma = false,
  animated = true,
  className = '',
}) {
  const Comp = CRIATURA_JUEGO_SVG[id];
  const estiloFantasma = fantasma
    ? { filter: 'grayscale(1) brightness(0.62) contrast(0.9)', opacity: 0.34 }
    : undefined;

  if (!Comp) {
    // Sin personaje fiel → emoji (honesto). Bloqueada = interrogante tenue.
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          fontSize: `${Math.round(size * 0.82)}px`,
          lineHeight: 1,
          display: 'inline-flex',
          ...(fantasma ? { filter: 'grayscale(1)', opacity: 0.3 } : null),
        }}
      >
        {fantasma ? '❔' : emoji}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-flex', lineHeight: 0, ...estiloFantasma }}
    >
      <Comp size={size} animated={animated && !fantasma} title={nombre || id} />
    </span>
  );
}

export default CriaturaFinca;
