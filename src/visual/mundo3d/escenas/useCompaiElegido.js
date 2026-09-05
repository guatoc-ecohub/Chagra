import { useMemo } from 'react';
import useAgentAvatarType from '../../../hooks/useAgentAvatarType.js';
import { resolverCompai } from './compaiRegistry.js';

/**
 * Puente vivo entre la elección del usuario y el mundo 3D. Lee el avatar elegido
 * (useAgentAvatarType, que ya sincroniza entre pestañas por el evento
 * `chagra:agent-avatar-changed` y por `storage`) y devuelve el compañero 3D
 * resuelto. Cuando el usuario cambia de avatar, este hook re-resuelve y la escena
 * intercambia de compañero SIN recargar.
 *
 * @returns {import('./compaiRegistry.js').CompaiEntry}
 */
export default function useCompaiElegido() {
  const [avatarType] = useAgentAvatarType();
  return useMemo(() => resolverCompai(avatarType), [avatarType]);
}
