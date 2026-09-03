/**
 * Bandera de la portada campesina B.
 *
 * La versión B queda activa por defecto en esta rama para que el worktree
 * sirva como preview desplegable. `VITE_HOME_CAMPESINO_B=false` permite al
 * coordinador volver temporalmente al dashboard anterior sin tocar código.
 */
export function homeCampesinoBActivo() {
  try {
    const raw = import.meta.env?.VITE_HOME_CAMPESINO_B;
    if (typeof raw === 'string' && raw.trim().toLowerCase() === 'false') return false;
    if (raw === false || raw === '0') return false;
    return true;
  } catch (_) {
    return true;
  }
}
