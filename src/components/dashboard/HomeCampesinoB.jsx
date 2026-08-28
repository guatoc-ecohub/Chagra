/* eslint-disable chagra-i18n/no-hardcoded-spanish -- portada campesina B, copy de producto en español CO. */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CloudRain,
  Droplets,
  HeartPulse,
  Leaf,
  MapPin,
  Mic,
  Mountain,
  Package,
  ShieldAlert,
  Sprout,
  Sun,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import useAssetStore from '../../store/useAssetStore';
import useCosechaStore from '../../store/useCosechaStore';
import {
  CLIMA_UPDATED_EVENT,
  fetchClimaSnapshot,
  getCachedClimaSnapshot,
} from '../../services/climaService';
import { getProfile, getProfileMunicipio } from '../../services/userProfileService';
import './home-campesino-b.css';

const hourGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
};

const firstText = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

function climateInfo(snapshot) {
  if (!snapshot) return null;
  const forecast = snapshot.openmeteo?.forecast_7d?.[0] || snapshot.forecast_7d?.[0] || {};
  const condition = firstText(
    forecast.label,
    forecast.condition_label,
    forecast.condition,
    snapshot.openmeteo?.condition,
  );
  const temperature = forecast.temp_max_c ?? forecast.temperature_max_c ?? forecast.temperature_c;
  const rain = forecast.precipitation_probability ?? forecast.precipitation_probability_max;
  return {
    label: condition || 'Pronóstico guardado',
    temperature: Number.isFinite(Number(temperature)) ? `${Math.round(Number(temperature))} °C` : '',
    rain: Number.isFinite(Number(rain)) ? `${Math.round(Number(rain))}% de lluvia` : '',
    location: snapshot.location_context || {},
  };
}

function alertInfo(snapshot, iotAlerts) {
  const source = snapshot?.alertas_locales?.[0]
    || snapshot?.openmeteo?.alertas?.[0]
    || iotAlerts?.[0];
  if (!source) return null;
  const title = firstText(source.title, source.titulo, source.name, source.label, source.type);
  const detail = firstText(source.message, source.mensaje, source.description, source.descripcion, source.detail);
  if (!title && !detail) return null;
  return { title: title || 'Aviso de su finca', detail };
}

function harvestInfo(summary) {
  if (!summary || summary.totalHarvests === 0) {
    return {
      title: 'Aún no hay cosechas anotadas',
      detail: 'Cuando recoja algo, cuénteselo a Chagra.',
    };
  }
  const kilos = Number(summary.totalKg);
  const detail = Number.isFinite(kilos) && kilos > 0
    ? `${kilos.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg registrados`
    : 'Registro real de su finca';
  return {
    title: `${summary.totalHarvests} ${summary.totalHarvests === 1 ? 'cosecha anotada' : 'cosechas anotadas'}`,
    detail,
  };
}

function FincaIllustration() {
  return (
    <svg className="cb-scene-svg" viewBox="0 0 720 420" role="img" aria-label="Ilustración de una finca entre montañas, con cultivos, casa y agua">
      <defs>
        <linearGradient id="cb-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b8d9d4" />
          <stop offset="1" stopColor="#f0d7a1" />
        </linearGradient>
        <linearGradient id="cb-hill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6d9275" />
          <stop offset="1" stopColor="#315944" />
        </linearGradient>
        <linearGradient id="cb-field" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9eaa60" />
          <stop offset="1" stopColor="#547246" />
        </linearGradient>
      </defs>
      <rect width="720" height="420" fill="url(#cb-sky)" />
      <circle cx="600" cy="85" r="43" fill="#f5c568" opacity=".9" />
      <path d="M0 235 120 138 205 207 326 84 446 208 560 124 720 232V420H0Z" fill="#8bad9b" opacity=".82" />
      <path d="M0 262 150 188 255 246 390 155 510 240 640 166 720 224V420H0Z" fill="url(#cb-hill)" />
      <path d="M0 312Q172 238 340 300t380-16V420H0Z" fill="url(#cb-field)" />
      <path d="M0 352Q190 280 368 345t352-35" fill="none" stroke="#cad48d" strokeWidth="9" opacity=".8" />
      <path d="M0 380Q180 308 350 370t370-32" fill="none" stroke="#3d6148" strokeWidth="5" opacity=".65" />
      <g className="cb-scene-crops" fill="none" stroke="#264f38" strokeLinecap="round">
        <path d="M78 350v-54M58 328l20-15M98 330l-20-18M128 340v-60M108 315l20-16M148 320l-20-18M180 330v-52M160 309l20-15M200 310l-20-16" strokeWidth="7" />
        <path d="M78 302q-14-19-27-9M78 312q15-21 28-9M128 288q-14-19-27-9M128 298q15-21 28-9M180 280q-14-19-27-9M180 291q15-21 28-9" strokeWidth="12" />
      </g>
      <g transform="translate(500 260)">
        <path d="M0 62h116v72H0Z" fill="#f3e3bd" />
        <path d="m-14 64 72-55 72 55Z" fill="#b85036" />
        <path d="M49 98h25v36H49Z" fill="#7d523d" />
        <rect x="12" y="82" width="24" height="20" rx="2" fill="#6c9990" />
        <path d="M-5 140q60-32 128 0" fill="none" stroke="#cfb875" strokeWidth="7" />
      </g>
      <g transform="translate(430 299)">
        <path d="M0 90q25-75 50-90 25 15 50 90" fill="#d8e6d0" opacity=".9" />
        <path d="M22 90q12-40 28-65 18 26 31 65" fill="none" stroke="#5d9e9a" strokeWidth="7" />
      </g>
      <g fill="#284d38">
        <path d="M360 285h12v76h-12Z" /><path d="m336 300 30-54 30 54Z" /><path d="m327 326 39-66 39 66Z" />
        <path d="M666 286h10v70h-10Z" /><path d="m646 302 25-48 25 48Z" /><path d="m639 325 32-58 32 58Z" />
      </g>
      <path d="M0 410q160-24 320 0t400 0" fill="none" stroke="#e7c87c" strokeWidth="6" opacity=".7" />
    </svg>
  );
}

function VoiceButton({ onClick, compact = false }) {
  return (
    <button type="button" className={`cb-voice-button ${compact ? 'cb-voice-button-compact' : ''}`} onClick={onClick}>
      <span className="cb-mic-disc" aria-hidden="true"><Mic size={compact ? 19 : 24} strokeWidth={2.5} /></span>
      <span>{compact ? 'Hablar con Compai' : 'Toque y hable con Compai'}</span>
      {!compact && <ArrowRight size={20} aria-hidden="true" />}
    </button>
  );
}

export default function HomeCampesinoB({ onNavigate, onLogout }) {
  const profile = useMemo(() => getProfile(), []);
  const plantsCount = useAssetStore((state) => state.plants?.length || 0);
  const landsCount = useAssetStore((state) => state.lands?.length || 0);
  const iotAlertsState = useAssetStore((state) => state.iotAlerts);
  const iotAlerts = iotAlertsState || [];
  const harvestSummary = useCosechaStore((state) => state.summary);
  const [snapshot, setSnapshot] = useState(() => getCachedClimaSnapshot());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [speaking, setSpeaking] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const onlineNow = () => setOnline(true);
    const offlineNow = () => setOnline(false);
    const onClimate = (event) => setSnapshot(event.detail || getCachedClimaSnapshot());
    window.addEventListener('online', onlineNow);
    window.addEventListener('offline', offlineNow);
    window.addEventListener(CLIMA_UPDATED_EVENT, onClimate);
    if (navigator.onLine && !snapshot) fetchClimaSnapshot().then((value) => value && setSnapshot(value));
    return () => {
      window.removeEventListener('online', onlineNow);
      window.removeEventListener('offline', offlineNow);
      window.removeEventListener(CLIMA_UPDATED_EVENT, onClimate);
      window.speechSynthesis?.cancel();
    };
  }, [snapshot]);

  useEffect(() => {
    useCosechaStore.getState().loadHarvests();
  }, []);

  const climate = climateInfo(snapshot);
  const alert = alertInfo(snapshot, iotAlerts);
  const harvest = harvestInfo(harvestSummary);
  const greeting = hourGreeting(new Date().getHours());
  const name = firstText(profile.nombre) || 'campesino';
  const location = climate?.location || {};
  const locationText = firstText(location.vereda, location.municipio, profile.vereda, getProfileMunicipio());
  const altitude = Number(profile.finca_altitud);
  const locationDetail = [locationText, Number.isFinite(altitude) && altitude > 0 ? `${Math.round(altitude)} msnm` : ''].filter(Boolean).join(' · ');

  const readHome = () => {
    const text = `${greeting}, ${name}. ${climate ? `El clima guardado dice: ${climate.label}.` : 'Todavía no hay un pronóstico guardado.'} Puede hablar con Compai, registrar lo que hizo hoy o cuidar una mata.`;
    if (!window.speechSynthesis) {
      setToast('Su navegador no tiene lectura de voz disponible.');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const go = (view, data) => onNavigate?.(view, data);

  return (
    <div className="cb-home">
      <a className="cb-skip-link" href="#contenido-campesino">Saltar al contenido</a>
      <header className="cb-topbar">
        <button type="button" className="cb-brand" onClick={() => go('dashboard')} aria-label="Ir al inicio de Chagra">
          <span className="cb-brand-mark" aria-hidden="true">✳</span>
          <span><b>CHAGRA</b><small>su finca, a su manera</small></span>
        </button>
        <div className="cb-top-actions">
          <span className={`cb-connection ${online ? 'is-online' : 'is-offline'}`} role="status">
            {online ? <Wifi size={17} aria-hidden="true" /> : <WifiOff size={17} aria-hidden="true" />}
            {online ? 'Con señal' : 'Sin señal'}
          </span>
          <button type="button" className="cb-top-button" onClick={() => go('perfil')} aria-label="Abrir mi perfil">{name === 'campesino' ? 'Mi finca' : name}</button>
          {onLogout && <button type="button" className="cb-logout" onClick={onLogout}>Salir</button>}
        </div>
      </header>

      <main id="contenido-campesino" className="cb-main">
        <section className="cb-hero" aria-labelledby="saludo-campesino">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow"><span className="cb-live-dot" aria-hidden="true" /> HOY EN SU FINCA</p>
            <h1 id="saludo-campesino">{greeting},<br /><span>{name}</span></h1>
            <p className="cb-location">
              <MapPin size={18} aria-hidden="true" />
              <span>{locationDetail || 'Ubique su finca para recibir consejos de su clima'}</span>
            </p>
            <p className="cb-compai-kicker"><span aria-hidden="true">✦</span> Compai, su compañero de finca</p>
            <div className="cb-hero-actions">
              <VoiceButton onClick={() => go('agente')} />
              <button type="button" className="cb-listen" onClick={readHome}>
                <span aria-hidden="true">{speaking ? '■' : '🔊'}</span> {speaking ? 'Parar lectura' : 'Escuchar esta página'}
              </button>
            </div>
            <p className="cb-voice-note">No tiene que aprender botones. Cuéntele a Compai qué necesita.</p>
          </div>
          <div className="cb-hero-scene">
            <div className="cb-scene-label"><Leaf size={16} aria-hidden="true" /> La vida de su finca</div>
            <FincaIllustration />
            <div className="cb-scene-caption"><b>Sembrar · cuidar · cosechar</b><span>Un paso cada vez</span></div>
          </div>
        </section>

        {!alertDismissed && alert && (
          <section className="cb-alert" aria-label="Aviso de su finca">
            <span className="cb-alert-icon" aria-hidden="true"><ShieldAlert size={24} /></span>
            <div><strong>{alert.title}</strong><p>{alert.detail || 'Revise el aviso antes de trabajar.'}</p></div>
            <button type="button" className="cb-alert-action" onClick={() => go('hoy_finca')}>Ver aviso <ChevronRight size={17} aria-hidden="true" /></button>
            <button type="button" className="cb-close" onClick={() => setAlertDismissed(true)} aria-label="Cerrar aviso"><X size={20} /></button>
          </section>
        )}

        <section className="cb-today" aria-labelledby="hoy-en-finca">
          <div className="cb-today-mark"><CloudRain size={21} aria-hidden="true" /><span>EL DÍA EN SU FINCA</span></div>
          <div className="cb-today-copy">
            <h2 id="hoy-en-finca">Empiece por mirar lo que tiene anotado</h2>
            <p>
              {climate
                ? `Para hoy tiene un dato guardado: ${climate.label}${climate.temperature ? `, hasta ${climate.temperature}` : ''}.`
                : online
                  ? 'Cuando llegue el dato del clima, aparecerá aquí. También puede revisar su día sin esperar.'
                  : 'No hay señal ni un dato de clima guardado. Puede revisar sus registros en el teléfono.'}
            </p>
          </div>
          <button type="button" className="cb-today-button" onClick={() => go('hoy_finca')}>
            Ver el día <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>

        <section className="cb-section cb-first-step" aria-labelledby="primer-paso">
          <div className="cb-section-heading">
            <div><p className="cb-eyebrow">UNA COSA A LA VEZ</p><h2 id="primer-paso">¿Qué necesita hacer hoy?</h2></div>
            <span className="cb-step-count"><Check size={16} aria-hidden="true" /> paso claro</span>
          </div>
          <div className="cb-action-grid">
            <button type="button" className="cb-action-card cb-action-register" onClick={() => go('registro_unificado')}>
              <span className="cb-action-icon"><Mic size={24} aria-hidden="true" /></span><span><b>Cuéntele qué pasó</b><small>Siembra, labor, cosecha o algo raro.</small></span><ArrowRight size={20} aria-hidden="true" />
            </button>
            <button type="button" className="cb-action-card cb-action-protect" onClick={() => go('sanidad_sintoma')}>
              <span className="cb-action-icon"><Sprout size={24} aria-hidden="true" /></span><span><b>Cuide una mata</b><small>Diga qué le ve y busque una orientación.</small></span><ArrowRight size={20} aria-hidden="true" />
            </button>
            <button type="button" className="cb-action-card cb-action-calendar" onClick={() => go('calendario_finca')}>
              <span className="cb-action-icon"><CalendarDays size={24} aria-hidden="true" /></span><span><b>Vea su calendario</b><small>Siembra, abono y cosecha en un solo lugar.</small></span><ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="cb-section" aria-labelledby="estado-hoy">
          <div className="cb-section-heading"><div><p className="cb-eyebrow">EL ESTADO DE SU FINCA</p><h2 id="estado-hoy">Para trabajar con calma</h2></div><button type="button" className="cb-text-link" onClick={() => go('hoy_finca')}>Ver el día <ArrowRight size={17} aria-hidden="true" /></button></div>
          <div className="cb-status-grid">
            <article className="cb-status-card cb-weather-card"><span className="cb-status-icon"><CloudRain size={22} aria-hidden="true" /></span><div><b>{climate ? climate.label : 'Clima por consultar'}</b><p>{climate ? [climate.temperature, climate.rain].filter(Boolean).join(' · ') || 'Dato guardado en su teléfono' : online ? 'Cargando el dato de su finca' : 'Sin señal y sin dato guardado'}</p></div></article>
            <article className="cb-status-card cb-health-card"><span className="cb-status-icon"><HeartPulse size={22} aria-hidden="true" /></span><div><b>Salud, mata por mata</b><p>{plantsCount ? 'Observe una mata y cuéntele a Chagra lo que ve.' : 'Registre una mata para empezar a observarla.'}</p></div></article>
            <article className="cb-status-card cb-harvest-card"><span className="cb-status-icon"><Package size={22} aria-hidden="true" /></span><div><b>{harvest.title}</b><p>{harvest.detail}</p></div></article>
          </div>
        </section>

        <section className="cb-section cb-quick-section" aria-labelledby="accesos-rapidos">
          <div className="cb-section-heading"><div><p className="cb-eyebrow">ACCESOS RÁPIDOS</p><h2 id="accesos-rapidos">Lo que más se consulta</h2></div></div>
          <div className="cb-chips">
            <button type="button" className="cb-chip" onClick={() => go('directorio')}><Sprout size={18} aria-hidden="true" /> ¿Qué puedo sembrar?</button>
            <button type="button" className="cb-chip" onClick={() => go('biopreparados')}><Leaf size={18} aria-hidden="true" /> Biopreparado</button>
            <button type="button" className="cb-chip" onClick={() => go('mi_cosecha')}><Package size={18} aria-hidden="true" /> Mi cosecha</button>
            <button type="button" className="cb-chip" onClick={() => go('agua')}><Droplets size={18} aria-hidden="true" /> Agua de la finca</button>
            <button type="button" className="cb-chip" onClick={() => go('aprende')}><BookOpen size={18} aria-hidden="true" /> Aprender haciendo</button>
          </div>
        </section>

        <section className="cb-bottom-grid" aria-label="Resumen y mundos de su finca">
          <article className="cb-summary-card">
            <div className="cb-summary-header"><div><p className="cb-eyebrow">SU FINCA EN UN VISTAZO</p><h2>Lo que ya está guardado</h2></div><span className="cb-offline-note"><Check size={15} aria-hidden="true" /> en este teléfono</span></div>
            <div className="cb-metrics"><div><strong>{plantsCount}</strong><span>matas</span></div><div><strong>{landsCount}</strong><span>zonas</span></div><div><strong>{harvestSummary?.totalHarvests ?? 0}</strong><span>cosechas</span></div></div>
            <p className="cb-summary-foot">Sus registros siguen disponibles aunque se vaya la señal.</p>
          </article>
          <article className="cb-worlds-card"><div className="cb-worlds-heading"><div><p className="cb-eyebrow">SUS MUNDOS</p><h2>Entre por donde lo necesite</h2></div><Mountain size={30} aria-hidden="true" /></div><div className="cb-world-links"><button type="button" onClick={() => go('mundo', { mundo: 'semillero' })}><span>🌱</span><b>Sembrar</b><small>semillero</small><ChevronRight size={17} /></button><button type="button" onClick={() => go('mundo', { mundo: 'sanidad' })}><span>🛡️</span><b>Cuidar</b><small>sanidad</small><ChevronRight size={17} /></button><button type="button" onClick={() => go('mundo', { mundo: 'mercado' })}><span>🧺</span><b>Cosechar</b><small>mercado</small><ChevronRight size={17} /></button></div></article>
        </section>

        <footer className="cb-footer"><Sun size={18} aria-hidden="true" /><span>Chagra le acompaña con datos de su finca, no con suposiciones.</span></footer>
      </main>

      {toast && <div className="cb-toast" role="status">{toast}<button type="button" onClick={() => setToast('')} aria-label="Cerrar mensaje"><X size={16} /></button></div>}
    </div>
  );
}
