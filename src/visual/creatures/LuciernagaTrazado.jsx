import { TRAZADOS } from './trazadoPayloads.js';
import { TrazadoBase } from './trazadoBase.jsx';
import './trazadoCreature.css';

/** Luciérnaga trazada desde la lámina aprobada, sin geometría añadida. */
export function LuciernagaTrazado({
  size = 64,
  className = '',
  animated = true,
  title = 'Luciérnaga',
  linterna = 'normal',
  style = undefined,
  onClick = undefined,
  onDoubleClick = undefined,
  ...rest
}) {
  const estado = ['normal', 'fuerte', 'apagada'].includes(linterna) ? linterna : 'normal';
  return (
    <TrazadoBase
      markup={TRAZADOS.luciernaga}
      creature="luciernaga"
      size={size}
      title={title}
      animated={animated}
      className={`trazado-luciernaga trazado-luciernaga-${estado} ${className}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      data={{ 'data-linterna': estado, ...rest }}
    />
  );
}

export default LuciernagaTrazado;
