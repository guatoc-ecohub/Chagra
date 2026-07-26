/**
 * CicloVivoFullView.jsx — vista full-screen de "El Ciclo Vivo" (rueda v3).
 * =====================================================================
 * La planta ES la rueda: la raíz (especie) en el centro, el tallo espirala por
 * las 7 fases. Cada fase abre un panel con sus chips de función, y cada chip se
 * pinta según su ESTADO REAL, que sale de la fuente única de verdad
 * `/chagra-stats.json` → `capacidades` (ver hooks/useChagraStats +
 * scripts/gen-chagra-stats.mjs). Cuando un artefacto pasa a 'activo' en esa
 * tabla, su chip se enciende solo — sin tocar este componente.
 *
 * Especie: automática por piso térmico, con override que se guarda en el perfil.
 * Estética: port 1:1 de la v3 aprobada (cicloVivo.css + cicloVivoWheel).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import './cicloVivo.css';
import { GLYPHS, EYE_SVG_INNER } from './cicloVivoArte';
import { buildWheelSvg } from './cicloVivoWheel';
import {
  PHASES, SPECIES, SPECIES_ORDER, MOTOR_CAPS, WHEEL_CAPTION, DEFAULT_PHASE_INDEX,
  resolverEspecie, resolverEstado, ESTADO_BADGE,
} from './cicloVivoData';
import { useChagraStats } from '../../hooks/useChagraStats';
import { getProfile, saveProfile } from '../../services/userProfileService';
import { pisoTermicoFromAltitud } from '../../data/cropSuggestions';
import { getDeviceAltitude } from '../../services/altitudeService';

const PISO_LABEL = { calido: 'Cálido', templado: 'Templado', frio: 'Frío', paramo: 'Páramo' };
const PROFILE_ESPECIE_KEY = 'ciclo_vivo_especie';

/* ---- Iconos utilitarios (misma familia de trazo redondo de la v3) ---- */
function Chev({ color = '#C98A3D', size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2,5.4 L15.8,12 L9.2,18.6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevL({ color = '#6B5A47', size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.8,5.4 L8.2,12 L14.8,18.6" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CameraIco() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4,7.5 L8.4,7.5 L10,5.2 L14,5.2 L15.6,7.5 L20,7.5 Q21.5,7.5 21.5,9 L21.5,17.5 Q21.5,19 20,19 L4,19 Q2.5,19 2.5,17.5 L2.5,9 Q2.5,7.5 4,7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="18.6" cy="10.1" r=".95" fill="currentColor" />
    </svg>
  );
}
/** Glifo de fase (inner SVG generado por GLYPHS[key]). */
function PhaseGlyph({ phaseKey, color, size, viewBox }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: GLYPHS[phaseKey](color) }} />
  );
}

export default function CicloVivoFullView({ onBack, onNavigate }) {
  const { data: stats } = useChagraStats();
  const capacidades = stats && stats.capacidades ? stats.capacidades : null;

  // Especie + piso térmico. Piso: perfil primero; altitud del dispositivo como
  // refinamiento best-effort (no bloquea el render). Se lee una sola vez.
  const [profile] = useState(() => { try { return getProfile(); } catch { return {}; } });
  const [piso, setPiso] = useState(() => {
    if (profile.piso_termico && PISO_LABEL[profile.piso_termico]) return profile.piso_termico;
    return pisoTermicoFromAltitud(profile.finca_altitud);
  });
  const [altitud, setAltitud] = useState(() => {
    const n = Number(profile.finca_altitud);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  });
  const [spKey, setSpKey] = useState(() => resolverEspecie(profile[PROFILE_ESPECIE_KEY], piso));

  // Si el perfil no trae altitud, intentamos la del dispositivo (best-effort).
  useEffect(() => {
    if (altitud != null) return undefined;
    let alive = true;
    getDeviceAltitude().then((m) => {
      if (!alive || m == null) return;
      const p = pisoTermicoFromAltitud(m);
      setAltitud(Math.round(m));
      if (p) {
        setPiso(p);
        // Solo re-sugerimos la especie si el usuario no tiene override propio.
        if (!profile[PROFILE_ESPECIE_KEY]) setSpKey(() => resolverEspecie(null, p));
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [altitud, profile]);

  const [faseActiva, setFaseActiva] = useState(DEFAULT_PHASE_INDEX);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelIndex, setPanelIndex] = useState(DEFAULT_PHASE_INDEX);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const wheelRef = useRef(null);

  const sp = SPECIES[spKey] || SPECIES.maiz;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const openPanel = useCallback((i) => {
    setPanelIndex(i);
    setFaseActiva(i);
    setPanelOpen(true);
  }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  // Inyecta el SVG de la rueda de forma imperativa (como la v3) y delega los
  // clics de nodo por `data-idx`. Se reconstruye al cambiar especie o fase.
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return undefined;
    el.innerHTML = buildWheelSvg({ spKey, faseActiva });
    const onClick = (e) => {
      const node = e.target.closest('.cv-wnode');
      if (node) openPanel(Number(node.getAttribute('data-idx')));
    };
    const onKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const node = e.target.closest('.cv-wnode');
      if (node) { e.preventDefault(); openPanel(Number(node.getAttribute('data-idx'))); }
    };
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
    };
  }, [spKey, faseActiva, openPanel]);

  const cambiarEspecie = useCallback((key) => {
    if (!SPECIES[key]) return;
    setSpKey(key);
    try { saveProfile({ [PROFILE_ESPECIE_KEY]: key }); } catch { /* perfil no disponible: no bloquea */ }
    showToast('Listo: ahora ve el ciclo de ' + SPECIES[key].su.toLowerCase() + '.');
  }, [showToast]);

  const navegarCap = useCallback((estado, view, label) => {
    if (estado === 'proximamente') {
      showToast('«' + label + '» está en camino. Se lo avisamos cuando lo activemos.');
      return;
    }
    if (view && onNavigate) { onNavigate(view); return; }
    showToast('«' + label + '»: pronto podrá abrirlo desde aquí.');
  }, [onNavigate, showToast]);

  const curPhase = PHASES[faseActiva];

  return (
    <div className="cvivo-root">
      <div className="cvivo-fullscreen">
        <div className="cvivo-header">
          <button className="cvivo-back" onClick={onBack} aria-label="Volver al inicio">
            <ChevL color="#2F4A34" size={15} />
          </button>
          <div className="cvivo-floor-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <g stroke="#4A7BA0" strokeWidth="1.7" strokeLinecap="round" fill="none">
                <path d="M12,3 L12,21 M4.2,7.5 L19.8,16.5 M4.2,16.5 L19.8,7.5" />
                <path d="M9.8,4.6 L12,6.8 L14.2,4.6 M9.8,19.4 L12,17.2 L14.2,19.4" />
              </g>
            </svg>
            {piso ? PISO_LABEL[piso] : 'Piso térmico'}{altitud != null ? ' · ' + altitud + ' m' : ''}
          </div>
          <select
            className="cvivo-species-select"
            value={spKey}
            onChange={(e) => cambiarEspecie(e.target.value)}
            aria-label="Especie del cultivo"
          >
            {SPECIES_ORDER.map((k) => (
              <option key={k} value={k}>{SPECIES[k].emoji} {SPECIES[k].label}</option>
            ))}
          </select>
        </div>

        <div className="cvivo-title">
          <span className="cv-eyebrow">El Ciclo Vivo</span>
          <h1>El ciclo de {sp.su.toLowerCase()}</h1>
        </div>

        <div className="cv-wheel-stage">
          <svg
            ref={wheelRef}
            className="cv-wheel-svg"
            viewBox="0 14 342 318"
            role="img"
            aria-label={'Rueda del ciclo de vida de ' + sp.label}
          />
        </div>

        <p className="cv-metaphor-caption">{WHEEL_CAPTION}</p>

        <button
          className="cv-phase-cta"
          style={{ '--cv-pcolor': curPhase.color }}
          onClick={() => openPanel(faseActiva)}
        >
          <span className="cv-cta-glyph">
            <PhaseGlyph phaseKey={curPhase.key} color={curPhase.color} size={30} viewBox="-11.5 -11.5 23 23" />
          </span>
          <span className="cv-cta-text">
            <strong>{curPhase.name}</strong> — toque para ver qué hacer en esta fase
            <small>Cada función se enciende sola cuando queda lista</small>
          </span>
          <span className="cv-cta-arrow"><Chev /></span>
        </button>

        <MotorStrip capacidades={capacidades} onNav={navegarCap} />

        <div className={'cv-backdrop' + (panelOpen ? ' open' : '')} onClick={closePanel} />
        <PhasePanel
          open={panelOpen}
          index={panelIndex}
          faseActiva={faseActiva}
          species={sp}
          capacidades={capacidades}
          onClose={closePanel}
          onNav={navegarCap}
          onJump={(i) => openPanel((i + PHASES.length) % PHASES.length)}
        />

        <div className={'cv-toast' + (toast ? ' show' : '')} role="status">{toast}</div>
      </div>
    </div>
  );
}

/* ---- Tira "motor del agente" (capacidades transversales) ---- */
function MotorStrip({ capacidades, onNav }) {
  return (
    <div className="cv-motor">
      <p className="cv-motor-title">Motor del agente</p>
      <div className="cv-motor-chips">
        {MOTOR_CAPS.map((capId) => {
          const { estado, nota, view } = resolverEstado(capId, capacidades);
          const badge = ESTADO_BADGE[estado];
          const label = capId === 'rag_grounding' ? 'Respuestas con fuentes' : 'Acciones del agente';
          return (
            <button
              key={capId}
              type="button"
              className={'cv-chip is-' + estado}
              style={{ '--cv-pcolor': '#5B8A52' }}
              title={nota}
              onClick={() => onNav(estado, view, label)}
            >
              {label}
              {badge ? <span className="cv-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Panel de fase con sus chips de función ---- */
function PhasePanel({ open, index, faseActiva, species, capacidades, onClose, onNav, onJump }) {
  const p = PHASES[index];
  if (!p) return null;
  const prev = PHASES[(index + PHASES.length - 1) % PHASES.length];
  const next = PHASES[(index + 1) % PHASES.length];

  return (
    <div
      className={'cv-sheet' + (open ? ' open' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={'Fase ' + p.name}
      style={{ '--cv-pcolor': p.color }}
    >
      <div className="cv-sheet-grip"><div className="cv-sheet-handle" /></div>
      <button className="cv-sheet-close" aria-label="Cerrar" onClick={onClose}>
        <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6,6 L18,18 M18,6 L6,18" fill="none" stroke="#6B5A47" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="cv-sheet-header">
        <div className="cv-sheet-glyph">
          <PhaseGlyph phaseKey={p.key} color={p.color} size={38} viewBox="-12 -12 24 24" />
        </div>
        <div>
          <h2>{p.name}</h2>
          <div className="cv-sheet-sub">Etapa {index + 1} de 7 · ciclo de {species.su.toLowerCase()}</div>
        </div>
      </div>

      <div className="cv-dots">
        {PHASES.map((ph, idx) => {
          const cls = idx === index ? 'active' : (idx < faseActiva ? 'done' : '');
          return <span key={ph.key} className={'cv-dot ' + cls} style={{ '--cv-dc': ph.color }} />;
        })}
      </div>

      <h3 className="cv-section-title">Funciones de Chagra en esta etapa</h3>
      <div className="cv-chips">
        {p.functions.map((fn, idx) => {
          const { estado, nota, view } = resolverEstado(fn.cap, capacidades);
          const badge = ESTADO_BADGE[estado];
          const isPrimary = idx === 0 && estado === 'activo';
          const cls = 'cv-chip is-' + estado + (isPrimary ? ' is-primary' : '');
          return (
            <button
              key={fn.cap + ':' + idx}
              type="button"
              className={cls}
              style={{ '--cv-pcolor': p.color }}
              title={nota}
              aria-disabled={estado === 'proximamente'}
              onClick={() => onNav(estado, view, fn.label)}
            >
              {fn.camera ? <span className="cv-chip-ico"><CameraIco /></span> : null}
              {fn.label}
              {badge ? <span className="cv-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="cv-observe-box">
        <svg className="cv-observe-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: EYE_SVG_INNER }} />
        <div><strong>Qué observar:</strong> {species.observe[index]}</div>
      </div>

      <div className="cv-panel-nav">
        <button style={{ '--cv-npc': prev.color }} onClick={() => onJump(index - 1)}>
          <span className="cv-nav-chev"><ChevL /></span>
          <span className="cv-mini-glyph"><PhaseGlyph phaseKey={prev.key} color={prev.color} size={18} viewBox="-11.5 -11.5 23 23" /></span>
          {prev.name}
        </button>
        <button style={{ '--cv-npc': next.color }} onClick={() => onJump(index + 1)}>
          {next.name}
          <span className="cv-mini-glyph"><PhaseGlyph phaseKey={next.key} color={next.color} size={18} viewBox="-11.5 -11.5 23 23" /></span>
          <span className="cv-nav-chev"><Chev color="#6B5A47" size={12} /></span>
        </button>
      </div>
    </div>
  );
}
