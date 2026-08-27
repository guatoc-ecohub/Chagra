import { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    Check,
    CloudSun,
    Droplets,
    Eye,
    HelpCircle,
    Leaf,
    MapPin,
    Mic,
    NotebookPen,
    ShieldCheck,
    Sprout,
    Wifi,
    WifiOff,
} from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import useAssetStore from '../../store/useAssetStore';
import useAlertStore from '../../store/useAlertStore';
import { fetchClimaSnapshot, getCachedClimaSnapshot, resolveClimaLocation } from '../../services/climaService';
import { fetchSkyConditions, getCachedSkyConditions } from '../../services/skyConditionService';
import { buildClimaHoy } from '../../services/hoyEnFincaService';
import ClimaIconoVivo from './ClimaIconoVivo';
import './campesino-home-a.css';

const ROUTES = {
    primary: 'sanidad_sintoma',
    firstPlant: 'germinacion',
    speak: 'agente',
    register: 'registro_unificado',
    crops: 'hoy_finca',
    learn: 'aprende',
    market: 'mercados',
};

function useOfflineState() {
    const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

    useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    return online;
}

function useCachedWeather() {
    const geo = useMemo(() => resolveClimaLocation(), []);
    const [snapshot, setSnapshot] = useState(() => (
        geo ? getCachedClimaSnapshot(geo.lat, geo.lng, geo.elevation) : getCachedClimaSnapshot()
    ));
    const [sky, setSky] = useState(() => (
        geo ? getCachedSkyConditions(geo.lat, geo.lng, geo.elevation) : null
    ));

    useEffect(() => {
        let alive = true;
        if (!geo) return () => { alive = false; };
        const args = geo.elevation == null
            ? { lat: geo.lat, lng: geo.lng }
            : { lat: geo.lat, lng: geo.lng, elevation: geo.elevation };
        fetchClimaSnapshot(args).then((next) => {
            if (alive && next) setSnapshot(next);
        }).catch(() => {});
        fetchSkyConditions(args).then((next) => {
            if (alive && next) setSky(next);
        }).catch(() => {});
        return () => { alive = false; };
    }, [geo]);

    return useMemo(() => buildClimaHoy({
        snapshot,
        sky,
        elevationM: geo?.elevation ?? null,
    }), [snapshot, sky, geo]);
}

function LeafMark() {
    return <span className="cpa-mark" aria-hidden="true"><Leaf size={20} strokeWidth={2.5} /></span>;
}

function WeatherCard({ clima, onNavigate }) {
    const hasWeather = Boolean(clima?.hasData);
    return (
        <section className="cpa-card cpa-weather" aria-labelledby="cpa-weather-title">
            <div className="cpa-card-heading"><span className="cpa-kicker">EL TIEMPO</span><CloudSun size={19} aria-hidden="true" /></div>
            <h2 id="cpa-weather-title">Hoy en su finca</h2>
            {hasWeather ? (
                <button type="button" className="cpa-weather-main" onClick={() => onNavigate('hoy_finca')} aria-label="Ver el estado del tiempo y la agenda de hoy">
                    <ClimaIconoVivo condition={clima.condition} frost={clima.tempMinC != null && clima.tempMinC <= 0} size={44} />
                    <span>
                        <strong>{clima.label}</strong>
                        {clima.tempMaxC != null && <small>{Math.round(clima.tempMaxC)}°{clima.tempMinC != null ? ` / ${Math.round(clima.tempMinC)}°` : ''}</small>}
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                </button>
            ) : (
                <div className="cpa-weather-empty">
                    <p>El clima aparece cuando hay una ubicación guardada y señal.</p>
                    <button type="button" onClick={() => onNavigate('hoy_finca')}>Revisar el día <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
            )}
            <p className="cpa-card-note"><MapPin size={14} aria-hidden="true" /> Datos guardados en este teléfono</p>
        </section>
    );
}

function StepGuide({ hasPlants, onNavigate }) {
    return (
        <section className="cpa-card cpa-guide" aria-labelledby="cpa-guide-title">
            <div className="cpa-card-heading"><span className="cpa-kicker">APRENDER HACIENDO</span><span className="cpa-step-count">1 / 3</span></div>
            <h2 id="cpa-guide-title">Observe antes de actuar</h2>
            <p className="cpa-guide-lead">{hasPlants ? 'Una mirada cercana ayuda a cuidar la comida antes de aplicar algo.' : 'Una primera siembra empieza por elegir qué quiere cuidar y anotarlo.'}</p>
            <ol className="cpa-steps">
                <li><span><Check size={15} aria-hidden="true" /></span><strong>Mire</strong><small>hoja, tallo y suelo</small></li>
                <li><span><Check size={15} aria-hidden="true" /></span><strong>Cuente</strong><small>qué cambió</small></li>
                <li><span><Check size={15} aria-hidden="true" /></span><strong>Decida</strong><small>un paso seguro</small></li>
            </ol>
            <button type="button" className="cpa-text-link" onClick={() => onNavigate('aprende')}>Ver una guía corta <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
    );
}

function CompanionCard({ onNavigate }) {
    return (
        <section className="cpa-card cpa-companion" aria-labelledby="cpa-companion-title">
            <div className="cpa-companion-avatar" aria-hidden="true"><ChagraAgentAvatar estado="acompana" size={92} /></div>
            <div className="cpa-companion-copy">
                <span className="cpa-kicker">SU COMPAÑERO</span>
                <h2 id="cpa-companion-title">Chagra está aquí</h2>
                <p>Hable, muestre una foto o pregunte por un cultivo.</p>
                <button type="button" className="cpa-small-action" onClick={() => onNavigate(ROUTES.speak)}><Mic size={16} aria-hidden="true" /> Hablar ahora</button>
            </div>
        </section>
    );
}

export default function CampesinoHomeA({ onNavigate }) {
    const plantsCount = useAssetStore((state) => state.plants.length);
    const activeAlerts = useAlertStore((state) => state.activeAlerts);
    const online = useOfflineState();
    const clima = useCachedWeather();
    const hasPlants = plantsCount > 0;
    const primary = hasPlants
        ? { title: 'Revise una mata', detail: 'Diga qué ve. Primero observe, luego decide qué hacer.', route: ROUTES.primary, icon: Eye }
        : { title: 'Prepare una siembra', detail: 'Elija una semilla y dé el primer paso para producir comida.', route: ROUTES.firstPlant, icon: Sprout };
    const PrimaryIcon = primary.icon;

    return (
        <div className="cpa-shell" data-testid="campesino-home-a">
            <a className="cpa-skip" href="#cpa-main">Saltar al contenido principal</a>
            <header className="cpa-topbar">
                <div className="cpa-brand" aria-label="Chagra, cuaderno de campo"><LeafMark /><span>CHAGRA</span></div>
                <div className="cpa-top-actions">
                    <span className={`cpa-connection ${online ? 'is-online' : 'is-offline'}`} role="status">
                        {online ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
                        {online ? 'Listo para guardar' : 'Sin internet'}
                    </span>
                    <button type="button" className="cpa-icon-button" onClick={() => onNavigate('faq')} aria-label="Abrir ayuda"><HelpCircle size={21} aria-hidden="true" /></button>
                </div>
            </header>

            <main id="cpa-main" className="cpa-main">
                <section className="cpa-intro" aria-labelledby="cpa-title">
                    <div className="cpa-intro-kicker"><span /> SU CUADERNO DE CAMPO</div>
                    <h1 id="cpa-title">Hoy, una cosa que ayude a su finca.</h1>
                    <p className="cpa-intro-copy">Empiece por un paso pequeño. Lo que observe aquí queda listo para volver a verlo, incluso sin internet.</p>
                    <div className="cpa-primary-stack">
                        <button type="button" className="cpa-primary" onClick={() => onNavigate(primary.route)}>
                            <span className="cpa-primary-icon"><PrimaryIcon size={29} strokeWidth={2.2} aria-hidden="true" /></span>
                            <span className="cpa-primary-label"><strong>{primary.title}</strong><small>{primary.detail}</small></span>
                            <ArrowRight className="cpa-primary-arrow" size={22} aria-hidden="true" />
                        </button>
                        <button type="button" className="cpa-voice" onClick={() => onNavigate(ROUTES.speak)}>
                            <span className="cpa-voice-icon"><Mic size={23} aria-hidden="true" /></span>
                            <span><strong>Cuénteme qué necesita</strong><small>Toque y hable. No tiene que escribir.</small></span>
                            <ArrowRight size={19} aria-hidden="true" />
                        </button>
                    </div>
                    <div className="cpa-proof" aria-label="Estado de su finca">
                        <div><strong>{plantsCount}</strong><span>plantas guardadas</span></div>
                        <div><strong>{activeAlerts.length}</strong><span>avisos pendientes</span></div>
                        <div><strong>Sí</strong><span>guarda sin internet</span></div>
                    </div>
                </section>

                <aside className="cpa-aside" aria-label="Información y acompañamiento"><WeatherCard clima={clima} onNavigate={onNavigate} /><CompanionCard onNavigate={onNavigate} /></aside>
                <StepGuide hasPlants={hasPlants} onNavigate={onNavigate} />

                <section className="cpa-more" aria-labelledby="cpa-more-title">
                    <div className="cpa-more-heading"><div><span className="cpa-kicker">CUANDO LO NECESITE</span><h2 id="cpa-more-title">Otros caminos de su finca</h2></div><p>Accesos claros, sin llenar la pantalla.</p></div>
                    <div className="cpa-paths">
                        <button type="button" onClick={() => onNavigate(ROUTES.register)}><NotebookPen size={22} aria-hidden="true" /><span><strong>Anotar lo que hizo</strong><small>Cosecha, labor o hallazgo</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => onNavigate(ROUTES.crops)}><ShieldCheck size={22} aria-hidden="true" /><span><strong>Ver mis cultivos</strong><small>Su finca y sus registros</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => onNavigate(ROUTES.learn)}><BookOpen size={22} aria-hidden="true" /><span><strong>Aprender paso a paso</strong><small>Guías para hacer en la finca</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                        <button type="button" onClick={() => onNavigate(ROUTES.market)}><Droplets size={22} aria-hidden="true" /><span><strong>Mirar el mercado</strong><small>Lo que puede vender o comprar</small></span><ArrowRight size={17} aria-hidden="true" /></button>
                    </div>
                </section>
            </main>
            <footer className="cpa-footer">Chagra funciona primero en su teléfono. <button type="button" onClick={() => onNavigate('perfil')}>Configurar mi finca</button></footer>
        </div>
    );
}
