import { TRAZADOS } from './trazadoPayloads.js';
import { TrazadoBase } from './trazadoBase.jsx';
import './trazadoCreature.css';

/**
 * Chivito de páramo trazado desde la lámina aprobada.
 *
 * El registro punk es una piel alternativa del mismo personaje y solo entra
 * cuando el estado es actuando. En reposo, la piel siempre es la normal.
 */
export function ChivitoTrazado({
  size = 64,
  className = '',
  animated = true,
  title = 'Chivito de páramo',
  modo = 'normal',
  actuando = false,
  punk = false,
  style,
  onClick,
  onDoubleClick,
  ...rest
}) {
  const esPunk = Boolean(punk && (actuando || modo === 'actuando'));
  return (
    <TrazadoBase
      markup={esPunk ? TRAZADOS.punk : TRAZADOS.normal}
      creature="chivito-páramo"
      size={size}
      title={title}
      animated={animated}
      className={`trazado-chivito ${esPunk ? 'trazado-chivito-punk' : 'trazado-chivito-normal'} ${className}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      data={{ 'data-modo': esPunk ? 'actuando' : 'normal', ...rest }}
    />
  );
}

export default ChivitoTrazado;
