import { useId, useMemo } from 'react';

/**
 * Contenedor común para una piel generada. El payload llega de vtracer y
 * potrace; React solo resuelve el id del clip para permitir varias instancias.
 */
export function TrazadoBase({
  markup,
  creature,
  size,
  className = '',
  title,
  animated = true,
  data = {},
  style,
  onClick,
  onDoubleClick,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const html = useMemo(
    () => markup.replaceAll('__TRACE_CLIP__', `trace-clip-${uid}`),
    [markup, uid],
  );
  const rootClass = `trazado-creature ${className}`.trim();
  const rootStyle = { width: size, height: size, ...style };

  const content = (
    <div
      role="img"
      aria-label={title}
      className={rootClass}
      style={rootStyle}
      data-creature={creature}
      data-trazado-animated={animated ? 'true' : 'false'}
      {...data}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  if (!onClick && !onDoubleClick) return content;
  return (
    <button
      type="button"
      aria-label={title}
      className="trazado-creature-button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {content}
    </button>
  );
}
