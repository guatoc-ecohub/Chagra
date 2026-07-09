/* eslint-disable react-hooks/set-state-in-effect -- El set de estado en el
   efecto refleja el resultado (síncrono o asíncrono) de consultar/montar la
   capability Pro; mismo patrón que GuildSuggestions.jsx (capa 3 enriquecida). */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Copy mínimo de fallback en
   español Colombia, pendiente de migrar a src/config/messages.js (ADR-050). */
import React, { useEffect, useState } from 'react';
import { registry } from '../core/moduleRegistry';

/**
 * EspirituProScreen — entrada pública GATED a la experiencia inmersiva de
 * "finca viva" (capability `avatar-espiritu`), provista por un módulo Pro
 * del repo privado (chagra-pro).
 *
 * ADR-002/011 — asimetría de imports: esta pantalla NO contiene NADA del
 * código visual de la experiencia. Solo consulta la capability vía el
 * registry; si un módulo Pro está registrado, lo monta y renderiza su
 * componente; si no, degrada a un fallback discreto (sin UI de la
 * experiencia).
 *
 * Gate: permisivo por ahora (cualquier cuenta que tenga el módulo Pro
 * cargado), pero estructuralmente gated — la experiencia SOLO aparece cuando
 * la capability está presente (build con VITE_PRO_MODULES_PATH + módulo Pro
 * servido). En el build puro OSS no hay módulo → fallback, cero UI extra.
 *
 * @param {{ onBack?: () => void, variant?: string }} props
 *   `variant` es opcional (follow-up: selector de tema). Sin él, el módulo
 *   Pro usa su tema por defecto.
 */
export default function EspirituProScreen({ onBack, variant }) {
  const [Comp, setComp] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'unavailable'

  useEffect(() => {
    let alive = true;
    const mods = registry.byCapability('avatar-espiritu');
    if (mods.length === 0) {
      setStatus('unavailable');
      return undefined;
    }
    mods[0]
      .mount()
      .then((m) => {
        if (!alive) return;
        if (m && m.default) {
          setComp(() => m.default);
          setStatus('ready');
        } else {
          setStatus('unavailable');
        }
      })
      .catch(() => {
        if (alive) setStatus('unavailable');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'ready' && Comp) {
    // El módulo Pro provee la experiencia completa (a pantalla) con su propio
    // onBack. `variant` queda disponible para el selector de tema (follow-up).
    return <Comp onBack={onBack} variant={variant} />;
  }

  const shell = {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1.5rem',
    textAlign: 'center',
    color: '#cbd5e1',
    background: '#0f172a',
  };

  if (status === 'loading') {
    return (
      <div style={shell} data-testid="espiritu-pro-loading">
        <span style={{ fontSize: '2rem' }} aria-hidden="true">
          🌱
        </span>
        <p style={{ opacity: 0.8 }}>Cargando…</p>
      </div>
    );
  }

  // 'unavailable' → fallback discreto: sin UI de la experiencia.
  return (
    <div style={shell} data-testid="espiritu-pro-unavailable">
      <p style={{ opacity: 0.8, maxWidth: '28rem' }}>
        Esta función no está disponible en su plan.
      </p>
      {typeof onBack === 'function' && (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155',
            background: 'transparent',
            color: '#cbd5e1',
            cursor: 'pointer',
          }}
        >
          Volver
        </button>
      )}
    </div>
  );
}
