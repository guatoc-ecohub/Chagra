import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Droplets,
  Grid2x2,
  Home,
  Leaf,
  MapPinned,
  Mountain,
  MessageSquareMore,
  Sprout,
  Tractor,
  Trees,
} from 'lucide-react';
import EscenaValle from '../visual/mundo3d/escenas/EscenaValle.jsx';
import IrisVoz from '../visual/voz';
import { useTierPerformance } from '../visual/mundo3d/usePerformanceMonitor.jsx';
import './ShellApp3D.css';

const DEFAULT_WORLD_ROUTES = [
  { label: 'Agua', icon: Droplets, view: 'mundo', data: { mundo: 'agua' } },
  { label: 'Suelo', icon: Mountain, view: 'mundo', data: { mundo: 'suelo' } },
  { label: 'Clima', icon: Leaf, view: 'mundo', data: { mundo: 'clima' } },
  { label: 'Cultivos', icon: Sprout, view: 'mundo_cultivos' },
  { label: 'Animales', icon: Trees, view: 'animales' },
  { label: 'Mercados', icon: Grid2x2, view: 'mundo', data: { mundo: 'mercado' } },
  { label: 'Bodega', icon: Tractor, view: 'bodega' },
];

function isReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function dispatchNavigate(onNavigate, view, data) {
  if (typeof onNavigate === 'function') {
    onNavigate(view, data ?? null);
    return;
  }
  window.dispatchEvent(new CustomEvent('chagra:nav', { detail: data ? { view, data } : view }));
}

function ShellActionButton({ label, subtitle, icon: Icon, onClick, emphasis = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shell-app-3d__pill${emphasis ? ' shell-app-3d__pill--emphasis' : ''}`}
      aria-label={label}
      title={title || label}
    >
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span className="shell-app-3d__voice-label">
        <span>{label}</span>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </button>
  );
}

function WorldChip({ label, icon: Icon, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shell-app-3d__chip"
      data-active={active ? 'true' : 'false'}
      aria-label={label}
      title={label}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

export default function ShellApp3D({ onNavigate, onBack }) {
  const reducedMotion = isReducedMotion();
  const rendimiento = useTierPerformance({ reducedMotion, valle3d: true });
  const tierInicial = rendimiento.tierInicial || 'medio';
  const presupuesto = rendimiento.presupuesto || {};
  const esCompacto = tierInicial === 'bajo' || (presupuesto.maxCriaturasAmbientales ?? 0) <= 1;

  const mundosRapidos = useMemo(
    () => (esCompacto ? DEFAULT_WORLD_ROUTES.slice(0, 3) : DEFAULT_WORLD_ROUTES),
    [esCompacto],
  );

  const estadoShell = tierInicial === 'bajo'
    ? '3D reducido, shell esencial'
    : tierInicial === 'medio'
      ? '3D frugal, shell completo'
      : '3D pleno, shell completo';

  const ir = (view, data) => dispatchNavigate(onNavigate, view, data);

  return (
    <section
      className={`shell-app-3d${esCompacto ? ' shell-app-3d--compact' : ''}`}
      aria-label="Shell 3D de Chagra"
      data-tier={tierInicial}
    >
      <div className="shell-app-3d__scene" aria-hidden="true">
        <EscenaValle
          reducedMotion={reducedMotion}
          tier={tierInicial}
          animo="sereno"
          energia={1}
          hayAlerta={false}
          onHotspot={(kind, payload) => {
            if (kind === 'mundo' && payload?.mundoId) {
              ir('mundo', { mundo: payload.mundoId });
            }
            if (kind === 'alerta') {
              ir('hoy_finca');
            }
          }}
        />
      </div>
      <div className="shell-app-3d__scrim" aria-hidden="true" />

      <div className="shell-app-3d__chrome">
        <header className="shell-app-3d__bar shell-app-3d__topbar">
          <div className="shell-app-3d__brand">
            <span className="shell-app-3d__eyebrow">Chagra.app</span>
            <h1 className="shell-app-3d__title">Valle 3D-first</h1>
            <p className="shell-app-3d__meta">
              <span>El valle queda siempre detrás.</span>
              <span className="shell-app-3d__status" aria-live="polite">
                {estadoShell}
              </span>
            </p>
          </div>

          <div className="shell-app-3d__actions" aria-label="Acciones del shell 3D">
            <button
              type="button"
              onClick={() => (typeof onBack === 'function' ? onBack() : ir('dashboard'))}
              className="shell-app-3d__pill"
              aria-label="Volver al inicio clásico"
              title="Volver al inicio clásico"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Clásico</span>
            </button>
            <button
              type="button"
              onClick={() => ir('dashboard')}
              className="shell-app-3d__pill"
              aria-label="Ir al inicio"
              title="Ir al inicio"
            >
              <Home size={18} aria-hidden="true" />
              <span>Inicio</span>
            </button>
          </div>
        </header>

        <nav className="shell-app-3d__dock" aria-label="Controles siempre visibles del shell 3D">
          <div className="shell-app-3d__primary">
            <div className="shell-app-3d__primary-group">
              <ShellActionButton
                label="Agente"
                subtitle="Chat y voz"
                icon={MessageSquareMore}
                emphasis
                onClick={() => ir('agente')}
                title="Abrir el agente con chat y voz"
              />
              <button
                type="button"
                onClick={() => ir('voz')}
                className="shell-app-3d__pill shell-app-3d__pill--voice"
                aria-label="Abrir la voz de Chagra"
                title="Abrir la voz de Chagra"
              >
                <span className="shell-app-3d__voice-orb" aria-hidden="true">
                  <IrisVoz estado="reposo" size={46} />
                </span>
                <span className="shell-app-3d__voice-label">
                  <span>Voz</span>
                  <small>Entrada viva</small>
                </span>
              </button>
              <ShellActionButton
                label="Mundos"
                subtitle="Índice y atajos"
                icon={MapPinned}
                onClick={() => ir('mundo')}
                title="Abrir el índice de mundos"
              />
            </div>
            <p className="shell-app-3d__hint">
              Toque un landmark del valle para entrar a un mundo, o use los atajos para abrir agente, voz y navegación.
            </p>
          </div>

          <div className="shell-app-3d__rail" aria-label="Atajos de mundos">
            {mundosRapidos.map((item) => (
              <WorldChip
                key={`${item.view}-${item.label}`}
                label={item.label}
                icon={item.icon}
                active={false}
                onClick={() => ir(item.view, item.data || null)}
              />
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
