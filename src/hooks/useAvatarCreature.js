import usePrefsStore, { AVATAR_CREATURE_DEFAULT } from '../store/usePrefsStore';
import { CREATURES } from '../visual/creatures/index.js';

/**
 * useAvatarCreature — el animal que la persona eligió como SU avatar.
 *
 * Resuelve el slug persistido en usePrefsStore (`avatarCreatureId`) contra el
 * registro CREATURES (src/visual/creatures) y devuelve el personaje completo:
 *
 *   const { id, Component, nombre, cientifico } = useAvatarCreature();
 *   <Component size={64} />
 *
 * Data-driven: cualquier bicho nuevo que aterrice en CREATURES (p. ej. el
 * borugo) queda disponible sin tocar este hook. Si el slug guardado no existe
 * en el registro (typo, bicho retirado), cae al default: la abeja Angelita.
 *
 * Consumidores conocidos: ProfileScreen (cédula), OnboardingCondensado
 * (paso identidad) y — próximamente — el valle 3D (protagonista elegido).
 */
export default function useAvatarCreature() {
  const avatarCreatureId = usePrefsStore((s) => s.avatarCreatureId);
  return resolveAvatarCreature(avatarCreatureId);
}

/** Resolución pura slug→personaje (usable fuera de React). */
export function resolveAvatarCreature(slug) {
  const id = slug && CREATURES[slug] ? slug : AVATAR_CREATURE_DEFAULT;
  const meta = CREATURES[id];
  return { id, Component: meta.Component, nombre: meta.nombre, cientifico: meta.cientifico };
}

export { AVATAR_CREATURE_DEFAULT };
