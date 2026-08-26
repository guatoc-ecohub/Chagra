/**
 * Activa la portada campesino-first para el host de campesino.guatoc.co.
 *
 * El override de Vite permite probarla en dev y hacer rollout gradual. El
 * host canónico queda activo por defecto cuando la app se sirve allí.
 */
const FLAG_KEY = 'VITE_CAMPESINO_HOME';

export function campesinoHomeActivo() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (typeof raw === 'string') {
      const value = raw.trim().toLowerCase();
      if (value === 'false' || value === '0') return false;
      if (value === 'true' || value === '1') return true;
    }
    return typeof window !== 'undefined' && window.location.hostname === 'campesino.guatoc.co';
  } catch (_) {
    return false;
  }
}

export default campesinoHomeActivo;
