import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, X } from 'lucide-react';
import {
  getActiveDemoRoleMeta,
  clearDemo,
  DEMO_CHANGED_EVENT,
} from '../services/demoProfile';

/**
 * DemoModeBanner — banner global del SWITCH DE DEMO POR PERFIL (solo OPERADOR).
 *
 * Cuando el operador activa el modo demo (desde ProfileScreen → pestaña
 * Avanzado), simula cómo ve la app un perfil concreto (campesino, urbano,
 * ganadero, restaurador, guía de glaciar, socio, técnico). Este banner deja
 * SIEMPRE claro que lo que se ve NO es la vista real del operador sino una
 * SIMULACIÓN — "MODO DEMO — viendo como <perfil>" — y ofrece un botón para
 * salir del demo de un toque.
 *
 * SEGURIDAD / INVISIBILIDAD:
 *   El contenido se calcula con `getActiveDemoRoleMeta()`, que está GATED por
 *   `esOperadorActual()` dentro de demoProfile. Para un usuario real devuelve
 *   null → este banner NO renderiza nada. Es decir, el banner es estructural-
 *   mente invisible e inalcanzable para usuarios reales, igual que el switch.
 *
 * REACTIVIDAD:
 *   Escucha `DEMO_CHANGED_EVENT` para aparecer/cambiar/desaparecer en caliente
 *   sin recargar, en sincronía con el home y los chips.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
export default function DemoModeBanner() {
  // Metadatos del rol simulado activo (o null si no hay demo / no es operador).
  const [roleMeta, setRoleMeta] = useState(() => {
    try {
      return getActiveDemoRoleMeta();
    } catch (_) {
      return null;
    }
  });

  // Re-leer el rol activo en cada cambio del demo (activar/cambiar/salir).
  useEffect(() => {
    const refresh = () => {
      try {
        setRoleMeta(getActiveDemoRoleMeta());
      } catch (_) {
        setRoleMeta(null);
      }
    };
    try {
      window.addEventListener(DEMO_CHANGED_EVENT, refresh);
      return () => {
        try {
          window.removeEventListener(DEMO_CHANGED_EVENT, refresh);
        } catch (_) {
          /* noop */
        }
      };
    } catch (_) {
      return () => {};
    }
  }, []);

  const handleSalir = useCallback(() => {
    try {
      clearDemo();
    } catch (_) {
      /* noop */
    }
    // El evento DEMO_CHANGED ya dispara el refresh; igual limpiamos local por
    // si el entorno no propagó el evento (defensa en profundidad).
    setRoleMeta(null);
  }, []);

  // Sin demo activo (o usuario real): no renderizar nada.
  if (!roleMeta) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="demo-mode-banner"
      className="fixed inset-x-0 top-0 z-[90] flex items-center gap-2 px-3 py-2 bg-amber-600/95 text-slate-950 shadow-lg border-b border-amber-300"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
    >
      <FlaskConical size={18} className="shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0 text-sm font-bold leading-tight">
        <span className="uppercase tracking-wide">Modo demo</span>
        <span className="font-normal"> — viendo como </span>
        <span>{roleMeta.emoji} {roleMeta.label}</span>
      </p>
      <button
        type="button"
        onClick={handleSalir}
        aria-label="Salir del modo demo"
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 active:scale-95 transition text-xs font-bold"
      >
        <X size={14} aria-hidden="true" />
        Salir del demo
      </button>
    </div>
  );
}
