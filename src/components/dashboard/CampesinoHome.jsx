/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Copy campesino de esta portada, pendiente de migración i18n ADR-050. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Eye, MapPin, Volume2, Wifi, WifiOff, X } from 'lucide-react';
import FincaVivaHero from './FincaVivaHero';
import AgentHero from './AgentHero';
import EstadoDelDiaCard from './EstadoDelDiaCard';
import NotificationsBell from '../NotificationsBell';
import BurbujaAngelita from '../../visual/agente/BurbujaAngelita';
import useAngelitaStore from '../../store/useAngelitaStore';
import useAlertStore from '../../store/useAlertStore';
import { useLogStore } from '../../store/useLogStore';
import { getProfile } from '../../services/userProfileService';
import { resolveClimaLocation } from '../../services/climaService';
import { selectChipDefs } from '../../services/profileChipSelector';
import { CAMPESINO_HOME_ROUTES } from '../../config/campesinoHomeRoutes';
import { canonicalizeCampesinoRoute, clean, readableAlert, selectActionDay } from './campesinoHomeLogic';
import { CAMPESINO_HOME_ACTIONS, CAMPESINO_HOME_SECONDARY_ACTIONS } from './campesinoHomeActions';
import './campesino-home.css';

function getLocationLabel() {
  const profile = getProfile() || {};
  const location = resolveClimaLocation({ profile }) || {};
  const place = clean(location.vereda) || clean(location.municipio) || clean(profile.municipio);
  const elevation = location.elevation ?? profile.finca_altitud;
  if (!place && !Number.isFinite(Number(elevation))) return 'Ubique su finca para ver el clima local';
  return [place, Number.isFinite(Number(elevation)) ? `${Math.round(Number(elevation)).toLocaleString('es-CO')} msnm` : '']
    .filter(Boolean)
    .join(' · ');
}

function ActionDayCard({ action, onNavigate }) {
  if (!action) {
    return (
      <section className="campesino-day-action is-calm" data-testid="accion-del-dia" aria-label="Acción del día">
        <div className="campesino-day-action__icon" aria-hidden="true"><Check size={22} /></div>
        <div>
          <p className="campesino-kicker">ACCIÓN DEL DÍA</p>
          <h2>Por ahora, todo tranquilo</h2>
          <p>No hay un aviso ni una labor pendiente. Registre lo que haga para que Chagra pueda acompañarle.</p>
        </div>
        <button type="button" className="campesino-inline-action" onClick={() => onNavigate(CAMPESINO_HOME_ROUTES.voz)}>
          Registrar <ChevronRight size={18} aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className={`campesino-day-action is-${action.kind}`} data-testid="accion-del-dia" aria-label={`Acción del día: ${action.title}`}>
      <div className="campesino-day-action__icon" aria-hidden="true">{action.kind === 'alerta' ? '⚠️' : '📋'}</div>
      <div className="campesino-day-action__body">
        <p className="campesino-kicker">ACCIÓN DEL DÍA</p>
        <h2>{action.title}</h2>
        {action.detail && <p>{action.detail}</p>}
      </div>
      <button type="button" className="campesino-inline-action" onClick={() => onNavigate(action.view, action.data)}>
        Ver <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

export default function CampesinoHome({ onNavigate, onLogout = null }) {
  const angelitaMessage = useAngelitaStore((state) => state.mensaje);
  const angelitaType = useAngelitaStore((state) => state.tipo);
  const silenciado = useAngelitaStore((state) => state.silenciado);
  const marcarHoyNo = useAngelitaStore((state) => state.marcarHoyNo);
  const activeAlerts = useAlertStore((state) => state.activeAlerts);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    useLogStore.getState().getPendingTasks().then((tasks) => {
      if (alive) setPendingTasks(Array.isArray(tasks) ? tasks : []);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const profile = useMemo(() => getProfile() || {}, []);
  const locationLabel = useMemo(() => getLocationLabel(), []);
  const pendingTask = pendingTasks[0] || null;
  const action = useMemo(
    () => selectActionDay(activeAlerts, pendingTask, angelitaMessage),
    [activeAlerts, pendingTask, angelitaMessage],
  );
  const bubbleMessage = useMemo(
    () => readableAlert(activeAlerts[0]) || angelitaMessage || (pendingTask && (clean(pendingTask.title) || clean(pendingTask.name) || clean(pendingTask.label))) || 'Hoy no hay un aviso pendiente. Puede registrar lo que haga en su finca.',
    [activeAlerts, angelitaMessage, pendingTask],
  );
  const chipDefs = useMemo(() => selectChipDefs(profile).slice(0, 4), [profile]);

  const navigate = useCallback((view, data) => {
    return onNavigate?.(canonicalizeCampesinoRoute(view), data);
  }, [onNavigate]);

  const speakBubble = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(bubbleMessage);
    utterance.lang = 'es-CO';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="campesino-home" data-testid="campesino-home">
      <header className="campesino-home__topbar">
        <div className="campesino-home__brand"><span aria-hidden="true">✳</span><strong>CHAGRA</strong></div>
        <div className="campesino-home__top-actions">
          <span className={`campesino-signal ${online ? 'is-online' : 'is-offline'}`} role="status">
            {online ? <Wifi size={17} aria-hidden="true" /> : <WifiOff size={17} aria-hidden="true" />}
            <span>{online ? 'Con señal' : 'Sin señal'}</span>
          </span>
          <NotificationsBell onNavigate={navigate} variant="f2" />
          <button type="button" className="campesino-profile" onClick={() => navigate('perfil')} aria-label="Abrir mi perfil">
            <span aria-hidden="true">👤</span>
          </button>
        </div>
      </header>

      <main className="campesino-home__content">
        <section className="campesino-home__context" aria-labelledby="campesino-home-title">
          <div>
            <p className="campesino-kicker">HOY EN SU FINCA</p>
            <h1 id="campesino-home-title">Buenos días, campesino</h1>
            <p className="campesino-location"><MapPin size={18} aria-hidden="true" /> {locationLabel}</p>
          </div>
          <span className="campesino-date">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </section>

        {bubbleVisible && !silenciado && (
          <section className="campesino-compai" aria-label="Aviso de Chagra" data-testid="campesino-compai">
            <div className="campesino-compai__message">
              <BurbujaAngelita mensaje={bubbleMessage} tipo={angelitaType || (activeAlerts.length ? 'alerta' : 'informativa')} animado={false} />
            </div>
            <div className="campesino-compai__actions">
              <button type="button" onClick={() => navigate('hoy_finca')}><Eye size={16} aria-hidden="true" /> Ver aviso</button>
              <button type="button" onClick={speakBubble}><Volume2 size={16} aria-hidden="true" /> Escuchar</button>
              <button type="button" onClick={() => { marcarHoyNo(); setBubbleVisible(false); }} aria-label="Callar avisos por hoy" title="Callar hoy"><X size={17} aria-hidden="true" /></button>
            </div>
          </section>
        )}

        <AgentHero onNavigate={navigate} variant="campesino" featuredIds={chipDefs.map((chip) => chip.id)} />

        <ActionDayCard action={action} onNavigate={navigate} />

        <section className="campesino-home__day" aria-label="El día en su finca">
          <div className="campesino-section-heading"><div><p className="campesino-kicker">EL DÍA EN SU FINCA</p><h2>Vea el tiempo y sus pendientes</h2></div><span aria-hidden="true">🌦️</span></div>
          <EstadoDelDiaCard onNavigate={navigate} />
        </section>

        <section className="campesino-home__actions" aria-labelledby="campesino-actions-title">
          <div className="campesino-section-heading"><div><p className="campesino-kicker">PASO A PASO</p><h2 id="campesino-actions-title">¿Qué necesita hacer?</h2></div></div>
          <div className="campesino-action-grid">
            {CAMPESINO_HOME_ACTIONS.map((item) => (
              <button key={item.id} type="button" className="campesino-action-tile" onClick={() => navigate(item.view, item.data)}>
                <span className="campesino-action-tile__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.title}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <nav className="campesino-secondary" aria-label="Más de su finca">
          {CAMPESINO_HOME_SECONDARY_ACTIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => navigate(item.view)}>
              {item.label} <ChevronRight size={16} aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div className="campesino-home__finca-visual" aria-hidden="true">
          <FincaVivaHero onNavigate={navigate} onOpenAgent={() => navigate('agente')} titulo="Su finca" />
        </div>
      </main>

      {onLogout && <button type="button" className="sr-only" onClick={onLogout}>Cerrar sesión</button>}
    </div>
  );
}
