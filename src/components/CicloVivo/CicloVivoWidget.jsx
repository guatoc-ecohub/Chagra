/**
 * CicloVivoWidget.jsx — portal de "El Ciclo Vivo" en el home.
 * =====================================================================
 * Tarjeta insignia que resume el estado del ciclo y abre la vista full-screen
 * (`onNavigate('ciclo_vivo')`). El resumen de "cuántas funciones están activas /
 * parciales / en camino" sale de la MISMA fuente de verdad que la vista
 * (`/chagra-stats.json` → `capacidades`), así que la tarjeta también se
 * actualiza sola cuando un artefacto se enciende.
 */
import { useMemo, useState } from 'react';
import './cicloVivo.css';
import { GLYPHS } from './cicloVivoArte';
import { PHASES, resolverEstado, resolverEspecie } from './cicloVivoData';
import { useChagraStats } from '../../hooks/useChagraStats';
import { pisoTermicoFromAltitud } from '../../data/cropSuggestions';
import { getProfile } from '../../services/userProfileService';
import { useSipsaLatestPrice } from '../../hooks/useSipsaLatestPrice';

/** Cuenta funciones distintas del ciclo por estado, contra la fuente de verdad. */
function resumirEstados(capacidades) {
  const vistos = new Set();
  const conteo = { activo: 0, parcial: 0, proximamente: 0 };
  for (const fase of PHASES) {
    for (const fn of fase.functions) {
      if (vistos.has(fn.cap)) continue;
      vistos.add(fn.cap);
      const { estado } = resolverEstado(fn.cap, capacidades);
      if (conteo[estado] != null) conteo[estado] += 1;
    }
  }
  return conteo;
}

export default function CicloVivoWidget({ onNavigate }) {
  const { data: stats } = useChagraStats();
  const capacidades = stats && stats.capacidades ? stats.capacidades : null;
  const conteo = useMemo(() => resumirEstados(capacidades), [capacidades]);
  const [profile] = useState(() => {
    try { return getProfile() || {}; } catch { return {}; }
  });
  const spKey = resolverEspecie(
    profile.ciclo_vivo_especie,
    profile.piso_termico || pisoTermicoFromAltitud(profile.finca_altitud),
  );
  const sipsaPrice = useSipsaLatestPrice({ speciesKey: spKey });
  const priceText = sipsaPrice.summary.live
    ? `SIPSA ${sipsaPrice.summary.label}`
    : sipsaPrice.loading
      ? 'SIPSA consultando'
      : 'SIPSA sin dato';

  const abrir = () => { if (onNavigate) onNavigate('ciclo_vivo'); };

  return (
    <div className="cvivo-root">
      <button type="button" className="cvivo-card" onClick={abrir} aria-label="El Ciclo Vivo: recorra el ciclo de su cultivo">
        <span className="cvivo-card-emblem" aria-hidden="true">
          <svg viewBox="-40 -40 80 80" role="img">
            <circle r="37" fill="none" stroke="#C98A3D" strokeWidth="1.4" strokeDasharray="1 6" strokeLinecap="round" opacity=".5" />
            {PHASES.map((p, i) => {
              const a = (-90 + i * (360 / PHASES.length)) * Math.PI / 180;
              const x = (30 * Math.cos(a)).toFixed(1);
              const y = (30 * Math.sin(a)).toFixed(1);
              return <circle key={p.key} cx={x} cy={y} r="4.4" fill={p.color} opacity={i === 0 ? 1 : 0.85} />;
            })}
            <circle r="17" fill="#FFFDF8" stroke="rgba(232,184,75,.7)" strokeWidth="2" />
            <g dangerouslySetInnerHTML={{ __html: GLYPHS.semilla('#8B5E34') }} />
          </svg>
        </span>

        <span className="cvivo-card-body">
          <span className="cvivo-card-eyebrow">El Ciclo Vivo</span>
          <span className="cvivo-card-title">La rueda de su cultivo</span>
          <span className="cvivo-card-sub">De la semilla a la poscosecha: qué hacer y qué observar en cada fase.</span>
          <span className="cvivo-card-states">
            <span className="cvivo-state-pill activo">{conteo.activo} listas</span>
            {conteo.parcial > 0 ? <span className="cvivo-state-pill parcial">{conteo.parcial} parcial</span> : null}
            {conteo.proximamente > 0 ? <span className="cvivo-state-pill proximamente">{conteo.proximamente} en camino</span> : null}
            <span
              className={`cvivo-state-pill precio ${sipsaPrice.summary.live ? 'live' : 'quiet'}`}
              title={sipsaPrice.summary.sublabel || 'Sin dato SIPSA'}
            >
              {priceText}
            </span>
          </span>
        </span>

        <span className="cvivo-card-cta" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M9.2,5.4 L15.8,12 L9.2,18.6" fill="none" stroke="#C98A3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
