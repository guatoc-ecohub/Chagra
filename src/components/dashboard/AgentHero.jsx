import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Mic, Square, Camera, X } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { captureAndCompress } from '../../services/photoService';
import { isAnalyzableImageAttachment } from '../../services/agentOutboxAttachment';
import useAgentOutboxStore from '../../store/useAgentOutboxStore';
import useAssetStore from '../../store/useAssetStore';
import useAlertStore from '../../store/useAlertStore';
import { agentSounds } from '../../services/agentSoundService';
import AgentRedMenu from './AgentRedMenu';
// Routing ÚNICO de un pick de la MANO, compartido con la conversación.
import { mapCapabilityPick } from '../agent/capabilityRouting';
import { AGENT_HERO_CHIPS } from '../../data/exampleQuestions';
import { useTheme } from '../../hooks/useTheme';
import {
    getProfile,
    saveProfile,
    getNotificationStyle,
} from '../../services/userProfileService';
import { buildCropSuggestions } from '../../data/cropSuggestions';
import { syncManager } from '../../services/syncManager';
import { iconForTheme } from './themeIcon';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import Angelita from '../../visual/agente/Angelita';
import { lunarPhase, solarTimes, moonPathD } from '../../utils/skyEphemeris';
import { resolveClimaLocation, getCachedClimaSnapshot } from '../../services/climaService';
import {
    fetchSkyConditions,
    getCachedSkyConditions,
    classifySkyCondition,
    applySensorCalibration,
} from '../../services/skyConditionService';

/**
 * AgentHero — la PORTADA INMERSIVA del agente Chagra, PRIMERA PANTALLA COMPLETA
 * del home (≈100dvh). Es el PORT FIEL 1:1 del diseño del operador en oracle-lab
 * (`demo-agente.html` / `demo-agente-biopunk.html` / `demo-agente-minimalista.html`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PORT FIEL 2026-06-06 (instrucciones exactas del operador, vía screenshots en
 * vivo). Reemplaza la portada "aproximada" anterior (avatar 3D + halo conic que
 * el operador rechazó ~6 veces). Esta versión porta el demo a la letra:
 *
 *   ┌─────────────────────────────────────────────┐
 *   │  ⬡ Chagra              [🌾 Campesino|🔬 Exp] │ ← marca (ícono del tema +
 *   │     tu mano en el campo                      │   wordmark) · toggle nivel
 *   │                                              │
 *   │            ☀ (sol)         🐦 colibrí 2D     │ ← ESCENA por tema:
 *   │         ╱╲    ╱╲   ╱╲                         │   nature: sol+montañas+colibrí
 *   │     ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  (montañas 3 capas)       │   biopunk: red/grafo eléctrico
 *   │                                              │   minimal: sobrio + toque verde
 *   │  Buenos días.                                │ ← saludo (cambia con el toggle:
 *   │  Soy Chagra.                                 │   campesino "Buenos días" /
 *   │  Pregúntame sobre tu cultivo…                │   experto "Hola")
 *   │  [¿Qué siembro?] [Plagas] [Clima]            │ ← chips
 *   │  ╭───────────────────────────────────────╮  │
 *   │  │ Pregúntale a Chagra…                  │  │ ← compositor pill anclado
 *   │  │ Ⓐ            📷 📎      🎤  ⬆          │  │   Ⓐ (izq) despliega la red
 *   │  ╰───────────────────────────────────────╯  │   de capacidades EN el hero
 *   └─────────────────────────────────────────────┘
 *
 * QUÉ ES FIEL AL DEMO:
 *   - Escena nature: sol radial + montañas en 3 capas (paths exactos del demo,
 *     fill #cbb992/#a98f64/#7d6a45) + polen + colibrí 2D (SVG del demo, ocre/teal).
 *   - Escena biopunk: void + grid de circuito + grafo VIVO (aristas que se
 *     "cablean", nodos que pulsan, corriente/sparks) + micelio/raíces + esporas
 *     + colibrí 2D. TODO portado del demo biopunk.
 *   - Escena minimal: trazo botánico monoline que se dibuja + horizonte fino +
 *     un toque verde tenue (sobrio, sin colibrí, sin sol/astro, sin montañas ni
 *     grafo) — limpio crema/papel 1:1 con demo-agente-minimalista.html.
 *   - El colibrí 2D vuela en bio-punk y nature; en minimalista NO aparece (la
 *     escena limpia del demo no lo lleva).
 *   - Ícono del tema (THEMES[tema].icon del demo) en la marca y en el botón Ⓐ.
 *   - Toggle Campesino/Experto cableado al motor REAL `nivel_respuestas`
 *     (simple/detallado en userProfileService) — mueve el perfil de verdad y
 *     cambia el saludo, como el demo (COPY.campesino/experto).
 *   - Botón Ⓐ a la izquierda del compositor despliega la red de capacidades
 *     (AgentRedMenu) INTEGRADA al hero: el saludo/chips se pliegan y la red
 *     brota en la zona-respiro, sobre el mismo lienzo del tema (operador
 *     2026-06-09: nada de bottom-sheet/modal aparte). Cada rama rutea real.
 *
 * QUÉ NO SE PORTÓ (y por qué, honesto):
 *   - El avatar 3D (ChagraAgentAvatar) + halo conic: ELIMINADOS por orden del
 *     operador ("menos es más"). El protagonista es el colibrí 2D + el sol.
 *   - Las burbujas de conversación de ejemplo del demo (.thread con respuestas
 *     groundeadas hardcodeadas): el demo las simula; aquí el chat REAL vive en
 *     AgentScreen. Tocar Ⓐ→capacidad o escribir/enviar lleva al chat real.
 *
 * WIRING multimodal conservado intacto (era inviolable):
 *   - <textarea> auto-grow (Enter=enviar, Shift+Enter=nueva línea).
 *   - 🎤 micrófono → graba audio (useVoiceRecorder + flujo whisper del agente).
 *   - 📷 cámara/foto → toma o elige foto (photoService + visión en el agente).
 *   - 📎 adjuntar → file picker (solo imágenes — B2).
 *   - ⬆️ enviar. Al enviar: PERSISTE en la outbox durable (IndexedDB) ANTES de
 *     navegar. Cero pérdida de datos (ver agentOutboxService).
 *
 * Respeta prefers-reduced-motion para todas las animaciones ambientales (sol,
 * polen, colibrí, grafo, sparks, trazo) y la transición de envío.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ÍCONOS DEL TEMA — importados desde themeIcon.jsx (compartido con TopBar)
// ─────────────────────────────────────────────────────────────────────────────
// THEME_ICON e iconForTheme ahora viven en ./themeIcon.jsx
// para evitar import circular y duplicación.

// ¿Es de noche? (operador 2026-06-06: sol de día, luna de noche en la escena).
// Fallback puro por hora (6am-7pm) cuando NO hay coordenadas de la finca; con
// coordenadas el hero usa solarTimes() (salida/puesta de sol reales ±2 min).
function isNightNow(hour) {
    const h = Number.isInteger(hour)
        ? hour
        : (typeof Date !== 'undefined' ? new Date().getHours() : 9);
    return h < 6 || h >= 19;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTEFACTO SOL/LUNA REALISTA (caso Choachí 2026-06).
//
// Antes: sol radiante SIEMPRE de día y luna creciente FIJA de noche — pura
// hora del reloj, cero clima real. En Choachí (altoandino, nubosidad orográfica
// crónica) el artefacto prometía sol en días muy nublados.
//
// Ahora: la condición viene de skyConditionService (nubosidad real Open-Meteo
// + corrección orográfica por piso térmico + modulación ENSO, sesgo de
// honestidad: solo degrada hacia más nube) y la luna dibuja su FASE REAL
// (skyEphemeris.moonPathD — astronomía válida; mostrar la fase ≠ recomendar
// labores por ella, eso es folclore vetado por ADR-033).
// ─────────────────────────────────────────────────────────────────────────────

// Nube puffy compartida por las variantes (parcial/nublado/niebla/lluvia).
const CLOUD_D = 'M16 42 q-9 0 -9 -8 q0 -8 8 -8 q3 -9 13 -9 q9 0 12 8 q9 1 9 9 q0 8 -9 8 z';

function SkyAstro({ night, condition, moonFraction }) {
    const cloudy = condition === 'nublado' || condition === 'niebla' || condition === 'lluvia';

    if (night) {
        const moon = moonPathD(moonFraction, 32, 30, 12);
        return (
            <svg viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                    <radialGradient id="ap-moon" cx="42%" cy="38%" r="65%">
                        <stop offset="0%" stopColor="#fdfbf2" />
                        <stop offset="100%" stopColor="#d9e2f2" />
                    </radialGradient>
                </defs>
                {/* lado oscuro del disco, apenas insinuado */}
                <circle cx="32" cy="30" r="12" fill="#2b3650" opacity=".5" />
                {moon.kind === 'full' && <circle cx="32" cy="30" r="12" fill="url(#ap-moon)" />}
                {moon.kind === 'partial' && <path d={moon.d} fill="url(#ap-moon)" />}
                {moon.kind === 'new' && (
                    <circle cx="32" cy="30" r="12" fill="none" stroke="#94a3c4" strokeWidth="0.9" opacity=".55" />
                )}
                {/* cráteres tenues sobre la zona iluminada */}
                {moon.kind !== 'new' && (
                    <>
                        <circle cx="29" cy="25" r="1.9" fill="#c3cde2" opacity=".4" />
                        <circle cx="35" cy="33" r="1.3" fill="#c3cde2" opacity=".35" />
                    </>
                )}
                {/* nubes nocturnas reales delante de la luna */}
                {cloudy && (
                    <path d={CLOUD_D} fill="#39435e" opacity=".88" transform="translate(8 16) scale(.78)" />
                )}
                {condition === 'lluvia' && (
                    <g stroke="#7fa6d9" strokeWidth="2" strokeLinecap="round" opacity=".8">
                        <line x1="24" y1="52" x2="22" y2="58" />
                        <line x1="33" y1="52" x2="31" y2="58" />
                        <line x1="42" y1="52" x2="40" y2="58" />
                    </g>
                )}
            </svg>
        );
    }

    // ── Día: el sol que se ve es el que el cielo real permite ──
    return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <radialGradient id="ap-sun" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff3cf" />
                    <stop offset="100%" stopColor="#f5b733" />
                </radialGradient>
            </defs>
            {condition === 'despejado' && (
                <>
                    <g stroke="#f5b733" strokeWidth="2.4" strokeLinecap="round" opacity=".85">
                        <line x1="32" y1="4" x2="32" y2="13" />
                        <line x1="32" y1="51" x2="32" y2="60" />
                        <line x1="4" y1="32" x2="13" y2="32" />
                        <line x1="51" y1="32" x2="60" y2="32" />
                        <line x1="12" y1="12" x2="18" y2="18" />
                        <line x1="46" y1="46" x2="52" y2="52" />
                        <line x1="52" y1="12" x2="46" y2="18" />
                        <line x1="18" y1="46" x2="12" y2="52" />
                    </g>
                    <circle cx="32" cy="32" r="13" fill="url(#ap-sun)" />
                </>
            )}
            {condition === 'parcial' && (
                <>
                    {/* sol asomado arriba-izquierda, rayos cortos */}
                    <g stroke="#f5b733" strokeWidth="2" strokeLinecap="round" opacity=".7">
                        <line x1="24" y1="4" x2="24" y2="10" />
                        <line x1="6" y1="22" x2="12" y2="22" />
                        <line x1="9" y1="8" x2="14" y2="13" />
                        <line x1="39" y1="8" x2="34" y2="13" />
                    </g>
                    <circle cx="24" cy="22" r="10" fill="url(#ap-sun)" />
                    <path d={CLOUD_D} fill="#e6ecf5" stroke="#9aa7ba" strokeWidth="1" opacity=".95" transform="translate(8 14) scale(.82)" />
                </>
            )}
            {(condition === 'nublado' || condition === 'niebla') && (
                <>
                    {/* resplandor apagado detrás de la nube — honesto, sin rayos */}
                    <circle cx="26" cy="20" r="9" fill="url(#ap-sun)" opacity=".35" />
                    <path d={CLOUD_D} fill="#dfe5ee" stroke="#94a1b5" strokeWidth="1.1" opacity=".95" transform="translate(4 10) scale(.92)" />
                    <path d={CLOUD_D} fill="#c7cfdc" stroke="#8d99ad" strokeWidth="1.1" opacity=".9" transform="translate(16 22) scale(.62)" />
                    {condition === 'niebla' && (
                        <g stroke="#a9b3c4" strokeWidth="2.2" strokeLinecap="round" opacity=".85">
                            <line x1="12" y1="52" x2="40" y2="52" />
                            <line x1="20" y1="58" x2="50" y2="58" />
                        </g>
                    )}
                </>
            )}
            {condition === 'lluvia' && (
                <>
                    <path d={CLOUD_D} fill="#cdd5e2" stroke="#8d99ad" strokeWidth="1.1" opacity=".95" transform="translate(6 10) scale(.9)" />
                    <g stroke="#5d96d8" strokeWidth="2" strokeLinecap="round" opacity=".85">
                        <line x1="22" y1="48" x2="20" y2="56" />
                        <line x1="32" y1="48" x2="30" y2="56" />
                        <line x1="42" y1="48" x2="40" y2="56" />
                    </g>
                </>
            )}
        </svg>
    );
}

function greetingForNow(nivel) {
    if (nivel === 'detallado') return 'Hola.';
    const h = typeof Date !== 'undefined' ? new Date().getHours() : 9;
    if (h < 12) return 'Buenos días.';
    if (h < 19) return 'Buenas tardes.';
    return 'Buenas noches.';
}

// Subtítulo bajo el saludo — campesino vs experto, copy del demo
// (COPY.campesino.greetSub / COPY.experto.greetSub), castellanizado.
const SUB_CAMPESINO = 'Pregúntame sobre tu cultivo, las plagas, el clima o los precios. Hablo claro, como en el campo.';
const SUB_EXPERTO = 'Asistente agroecológico con grounding. Cada respuesta cita su fuente; puedes pedirle "cómo lo sé" para ver la herramienta y los parámetros.';

// Fuente única de los chips del home (compartida con el test del punto de
// acceso #1, regla react-refresh/only-export-components).
const QUICK_CHIPS = AGENT_HERO_CHIPS;

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
}

// Duración de la transición premium de envío (shimmer + lift del compositor)
// antes de montar el AgentScreen. 520ms con easing suave (operador 2026-05-31:
// 280ms se sentía brusco). Bajo reduced-motion el retardo es 0. Exportado para
// tests.
export const SEND_TRANSITION_MS = 520;

export default function AgentHero({ onNavigate }) {
    const [text, setText] = useState('');
    // Adjunto en staging (SIEMPRE una foto). B2 (2026-06-02): el agente solo
    // "ve" imágenes vía visión, así que el compositor solo acepta fotos.
    const [attachment, setAttachment] = useState(null);
    const [pickError, setPickError] = useState('');
    const [busy, setBusy] = useState(false);
    // Fase de la transición de envío: 'idle' | 'sending'.
    const [phase, setPhase] = useState('idle');
    // Menú Ⓐ (la red de capacidades). Integrado AL hero (operador 2026-06-09:
    // nada de bottom-sheet aparte): al abrir, el saludo/chips se PLIEGAN y la
    // red brota en la zona-respiro, sobre el mismo lienzo del tema.
    // menuOpen=montado · menuClosing=animando el cierre antes de desmontar.
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuClosing, setMenuClosing] = useState(false);
    const menuCloseTimerRef = useRef(null);
    // Bug #51 móvil: el `:active { transform: scale(.92) }` del CSS mueve el
    // botón bajo el dedo entre touchstart/touchend → navegador cancela el
    // click. Marcamos que el touchEnd ya navegó para ignorar el ghost-click.
    const navigatedByTouchRef = useRef(false);
    // Campana de alertas/tareas (importada del demo biopunk 2026-06-11):
    // panel con "Alertas ambientales" (useAlertStore) + "Tareas de campo"
    // (pendientes farmOS, offline-first vía syncManager). Mutuamente
    // excluyente con el menú Ⓐ, como en el demo.
    const [notifOpen, setNotifOpen] = useState(false);
    const [pendingTasks, setPendingTasks] = useState([]);
    // Nivel de respuestas del perfil (campesino=simple / experto=detallado).
    // Lo leemos del perfil real al montar; el toggle lo persiste de verdad.
    const [nivel, setNivel] = useState(() => {
        const v = getProfile()?.nivel_respuestas;
        return v === 'detallado' ? 'detallado' : 'simple';
    });

    const textareaRef = useRef(null);
    const cameraInputRef = useRef(null);
    // Ancla de la red Ⓐ: el botón del agente en el compositor ES la raíz
    // geométrica del menú (operador 2026-06-10: una sola Ⓐ — la red nace
    // del botón real, no de un nodo duplicado dentro del menú).
    const aButtonRef = useRef(null);

    // Sistema de temas REAL de la app (data-theme en <html>, persiste en
    // localStorage). Aquí solo LEEMOS el tema para pintar el ícono de la marca
    // y del botón Ⓐ; el switcher completo vive en Perfil → Apariencia.
    const { theme } = useTheme();

    // ── markSwap del demo: al cambiar de tema, el ícono Ⓐ hace la
    // micro-animación de intercambio (scale+rotate). Solo en CAMBIO de tema,
    // no en el primer paint (el demo guarda `first = name !== THEME`).
    const prevThemeRef = useRef(theme);
    const themeSwapped = prevThemeRef.current !== theme;
    useEffect(() => { prevThemeRef.current = theme; }, [theme]);
    // ── Perfil real para sugerencias contextuales ─────────────────────────────
    const profile = getProfile();
    const altitud = profile?.finca_altitud || profile?.altitud || null;

    // ── Escena: sol/luna REALISTA (nubosidad real + fase lunar real) ──────────
    // Ubicación GUARDADA del perfil (misma fuente que el clima — NO geo en vivo).
    const climaLoc = useMemo(() => {
        try { return resolveClimaLocation(); } catch (_) { return null; }
    }, []);

    // Día/noche por salida/puesta de sol REALES de la finca; fallback por hora.
    const night = useMemo(() => {
        try {
            if (climaLoc && Number.isFinite(climaLoc.lat) && Number.isFinite(climaLoc.lng)) {
                const st = solarTimes(new Date(), climaLoc.lat, climaLoc.lng);
                if (st.sunrise && st.sunset) return !st.isDaylight;
            }
        } catch (_) { /* fallback hora local */ }
        return isNightNow();
    }, [climaLoc]);

    // Nubosidad real (Open-Meteo directo, cache 30 min). Pinta el cache al
    // primer paint y refresca en background. Offline → null y el clasificador
    // cae al prior climatológico por piso térmico (honesto, no sol por defecto).
    const [skySnap, setSkySnap] = useState(() => (
        climaLoc ? getCachedSkyConditions(climaLoc.lat, climaLoc.lng, climaLoc.elevation) : null
    ));
    useEffect(() => {
        if (!climaLoc) return undefined;
        let alive = true;
        fetchSkyConditions({ lat: climaLoc.lat, lng: climaLoc.lng, elevation: climaLoc.elevation })
            .then((s) => { if (alive && s) setSkySnap(s); })
            .catch(() => { /* nunca rompe el hero */ });
        return () => { alive = false; };
    }, [climaLoc]);

    // Condición honesta del cielo: nubosidad + piso térmico + ENSO (solo
    // degrada hacia más nube). applySensorCalibration es el hook para los
    // sensores de campo futuros (hoy identidad — sin sensores desplegados).
    const sky = useMemo(() => {
        let ensoPhase = 'neutral';
        try { ensoPhase = getCachedClimaSnapshot()?.enso_status?.phase || 'neutral'; } catch (_) { /* neutral */ }
        const elevationM = Number.isFinite(Number(altitud))
            ? Number(altitud)
            : (Number.isFinite(Number(climaLoc?.elevation)) ? Number(climaLoc.elevation) : null);
        return applySensorCalibration(classifySkyCondition({
            cloudCoverPct: skySnap?.current?.cloud_cover_pct ?? null,
            weatherCode: skySnap?.current?.weather_code ?? null,
            precipMm: skySnap?.current?.precip_mm ?? null,
            elevationM,
            ensoPhase,
        }), null);
    }, [skySnap, altitud, climaLoc]);

    // Fase lunar REAL (astronomía — skyEphemeris). Solo para DIBUJARLA.
    const moonFraction = useMemo(() => {
        try { return lunarPhase(new Date(), { latitude: climaLoc?.lat ?? 4 }).fraction; } catch (_) { return 0.25; }
    }, [climaLoc]);

    // ── Sugerencias contextuales ROTATIVAS basadas en los cultivos reales ─────
    // Deterministas (cropSuggestions: cultivos del store × mes × piso térmico).
    // NO llaman al LLM (regla dura del home). Si no hay cultivos → [] y caemos al
    // subtítulo genérico actual.
    const plants = useAssetStore((s) => s.plants);
    const cropSuggestions = buildCropSuggestions(plants, { altitud });
    const [suggestionIdx, setSuggestionIdx] = useState(0);

    // ── Chip de alerta real (clima/helada) ────────────────────────────────────
    const activeAlerts = useAlertStore((s) => s.activeAlerts);
    // Prioriza danger > warning; ignora info (poco accionable en el chip).
    const topAlert =
        activeAlerts.find((a) => a.severity === 'danger') ||
        activeAlerts.find((a) => a.severity === 'warning') ||
        null;
    // Preferencia de estilo: 'demo' (campana de la portada + chip, default) |
    // 'actual' (campanita clásica del TopBar). Operador 2026-06-11 (bug "dos
    // campanas"): la pref decide cuál ÚNICA campana se renderiza — con 'demo'
    // la de la portada vive aquí y el TopBar no pinta la suya; con 'actual'
    // es al revés. Re-lee en vivo cuando cambia en Perfil.
    const [notifStyle, setNotifStyle] = useState(() => getNotificationStyle());
    useEffect(() => {
        const onStyleChanged = () => setNotifStyle(getNotificationStyle());
        window.addEventListener('chagra:notif-style-changed', onStyleChanged);
        return () => window.removeEventListener('chagra:notif-style-changed', onStyleChanged);
    }, []);
    const showHeroBell = notifStyle === 'demo';
    const showAlertChip = notifStyle === 'demo' && Boolean(topAlert);

    const sendToOutbox = useAgentOutboxStore((s) => s.send);
    const {
        isRecording,
        audioLevel,
        durationMs,
        start: startRecord,
        stop: stopRecord,
        reset: resetRecord,
        error: recorderError,
    } = useVoiceRecorder();

    // Limpia el ObjectURL del preview al desmontar o cambiar de adjunto.
    useEffect(() => {
        return () => {
            if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        };
    }, [attachment]);

    // Rotación de las sugerencias contextuales cada ~5s (operador 2026-06-06:
    // "rotan para mostrar info distinta"). Solo si hay >1 sugerencia y el
    // usuario no pidió reduced-motion. Determinístico en su orden (cropSuggestions).
    useEffect(() => {
        if (cropSuggestions.length <= 1 || prefersReducedMotion()) return undefined;
        const id = window.setInterval(() => {
            setSuggestionIdx((i) => (i + 1) % cropSuggestions.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [cropSuggestions.length]);

    // Si la lista de cultivos cambia (sync), evita un índice fuera de rango.
    useEffect(() => {
        if (suggestionIdx >= cropSuggestions.length) setSuggestionIdx(0);
    }, [cropSuggestions.length, suggestionIdx]);

    // Auto-grow del textarea: crece hasta ~5 líneas, luego scrollea.
    const autoGrow = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    };

    /**
     * Navega al agente con una transición premium (shimmer + lift del
     * compositor). Respeta reduced-motion (sin retardo de animación).
     */
    const launchToAgent = useCallback(() => {
        const reduce = prefersReducedMotion();
        setPhase('sending');
        try { agentSounds.start(); } catch { /* sonido opcional */ }
        const go = () => onNavigate?.('agente');
        if (reduce) {
            go();
        } else {
            window.setTimeout(go, SEND_TRANSITION_MS);
        }
    }, [onNavigate]);

    /**
     * Persiste la consulta en la outbox DURABLE y navega. Orden estricto:
     * (1) persistir → (2) navegar. Si la persistencia falla NO navegamos en
     * silencio: dejamos el texto/adjunto para reintentar (cero pérdida).
     *
     * BUG mano-bloqueada (operador 2026-06-10, repro tests/mano-bloqueo): el
     * `busy=true` SOLO se reseteaba en el catch (fallo de persistencia). En el
     * camino feliz quedaba `true` para SIEMPRE, confiando en que `launchToAgent`
     * desmontara el hero. Pero la transición es diferida (SEND_TRANSITION_MS) y
     * si la navegación NO desmonta el hero (la vista 'agente' no monta, navegar
     * es no-op, o el operador sigue viendo la mano), `busy` quedaba pegado →
     * `AgentRedMenu` recibe `disabled=true` → `.arm-root.arm-disabled`
     * (pointer-events:none) → la MANO MUERTA hasta recargar (los nodos
     * páramo/silvopastoreo/restauración "no hacían nada y bloqueaban la mano").
     *
     * Fix: `busy` se libera SIEMPRE en `finally`. La mano nunca queda muerta;
     * si la navegación desmonta el hero, el setState post-unmount es no-op
     * inofensivo; si NO desmonta, la mano vuelve a estar viva de inmediato.
     */
    const send = async (payload) => {
        if (busy) return;
        setBusy(true);
        try {
            await sendToOutbox(payload);
            setText('');
            if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
            setAttachment(null);
            launchToAgent();
        } catch (err) {
            console.error('[AgentHero] no se pudo guardar la consulta, no navego:', err);
        } finally {
            // Reset incondicional: la mano NUNCA debe quedar bloqueada. En éxito,
            // la navegación desmonta el hero poco después (setState no-op); en
            // fallo, el operador puede reintentar con la mano viva.
            setBusy(false);
        }
    };

    const handleSendText = () => {
        const trimmed = text.trim();
        if (attachment) {
            send({
                kind: attachment.kind,
                text: trimmed,
                blob: attachment.blob,
                mime: attachment.mime,
                fileName: attachment.fileName,
            });
            return;
        }
        if (!trimmed) {
            // Comportamiento del demo (`sendField()` vacío → `openSheet()`):
            // enviar sin nada escrito abre el menú didáctico de capacidades
            // en vez de morir en silencio.
            openMenu();
            return;
        }
        send({ kind: 'text', text: trimmed });
    };

    const handleChipSend = (prompt) => {
        if (busy) return;
        send({ kind: 'text', text: prompt });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    // ── Toggle Campesino/Experto → mueve nivel_respuestas DE VERDAD ───────────
    // simple = Campesino · detallado = Experto. Persiste en el perfil (el mismo
    // campo que lee buildUserProfileBlock para el system-prompt del LLM).
    const setNivelRespuestas = (next) => {
        if (next === nivel) return;
        setNivel(next);
        try { saveProfile({ nivel_respuestas: next }); } catch { /* perfil opcional */ }
    };

    // ── Menú Ⓐ (red de capacidades INTEGRADA al hero) ────────────────────────
    // Abrir = plegar saludo/chips y brotar la red en la zona-respiro.
    // Cerrar = breve fade de salida (MENU_CLOSE_MS) y desmontar; con
    // prefers-reduced-motion el cierre es inmediato.
    const MENU_CLOSE_MS = 300;
    const openMenu = () => {
        window.clearTimeout(menuCloseTimerRef.current);
        setMenuClosing(false);
        setNotifOpen(false); // campana y red Ⓐ son mutuamente excluyentes (demo)
        setMenuOpen(true);
    };
    const closeMenu = () => {
        if (prefersReducedMotion()) {
            setMenuOpen(false);
            setMenuClosing(false);
            return;
        }
        setMenuClosing(true);
        menuCloseTimerRef.current = window.setTimeout(() => {
            setMenuOpen(false);
            setMenuClosing(false);
        }, MENU_CLOSE_MS);
    };
    const toggleMenu = () => {
        if (menuOpen && !menuClosing) closeMenu();
        else openMenu();
    };

    // ── Campana 🔔 (alertas + tareas) — import del demo biopunk ─────────────
    // Las tareas pendientes vienen del MISMO camino offline-first que el
    // PendingTasksWidget (syncManager cachea farmOS); sin red, falla suave y
    // el badge cuenta solo las alertas locales.
    // failedTxCount: cambios en quarantine (sin sincronizar). Cuando esta
    // campana es la ÚNICA (estilo 'demo'), los errores reales de sync de la
    // campanita clásica NO se pierden: viven aquí (operador 2026-06-11).
    const [failedTxCount, setFailedTxCount] = useState(0);
    useEffect(() => {
        let alive = true;
        Promise.resolve()
            .then(() => syncManager.fetchPendingTasksFromFarmOS())
            .then((tasks) => { if (alive && Array.isArray(tasks)) setPendingTasks(tasks); })
            .catch(() => { /* offline: el badge usa solo las alertas */ });
        Promise.resolve()
            .then(() => syncManager.getFailedTransactions())
            .then((txs) => { if (alive) setFailedTxCount(Array.isArray(txs) ? txs.length : 0); })
            .catch(() => { /* sin IDB: el badge usa solo alertas+tareas */ });
        return () => { alive = false; };
    }, [notifOpen]);
    const notifCount = activeAlerts.length + pendingTasks.length + (failedTxCount > 0 ? 1 : 0);
    const toggleNotif = () => {
        setNotifOpen((open) => {
            if (!open && menuOpen) closeMenu(); // excluyentes, como el demo
            return !open;
        });
    };

    // Limpia el timer de cierre al desmontar y cierra con Escape (a11y).
    useEffect(() => () => window.clearTimeout(menuCloseTimerRef.current), []);
    useEffect(() => {
        if (!menuOpen && !notifOpen) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (notifOpen) setNotifOpen(false);
            else closeMenu();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menuOpen, notifOpen]);

    // Despacha una capacidad de la red a su routing real. Usa el routing ÚNICO
    // compartido con la conversación (mapCapabilityPick en agent/AgentShell):
    // una sola definición de cómo se enruta un pick — `ask` → pregunta, `nav` →
    // navegar, `photo` → cámara. soon/unavailable son no-op (los gatea la red).
    const pickCapability = (cap) => {
        const acted = mapCapabilityPick(cap, {
            onAsk: (prompt) => handleChipSend(prompt),
            onNav: (view) => {
                try { agentSounds.start(); } catch { /* opcional */ }
                onNavigate?.(view);
            },
            // Abre el selector de foto del compositor (visión del agente). El
            // usuario elige/toma la foto y la envía como item 'photo'.
            onPhoto: () => cameraInputRef.current?.click(),
        });
        if (acted) closeMenu();
    };

    // ── Micrófono ─────────────────────────────────────────────────────────────
    const handleMic = async () => {
        if (busy) return;
        if (isRecording) {
            const result = await stopRecord();
            if (result && result.blob) {
                send({
                    kind: 'voice',
                    text: text.trim(),
                    blob: result.blob,
                    mime: result.mimeType || result.blob.type,
                    meta: { durationMs: result.durationMs },
                });
            }
        } else {
            resetRecord();
            try { agentSounds.listen(); } catch { /* opcional */ }
            startRecord();
        }
    };

    // ── Cámara / foto ───────────────────────────────────────────────────────────
    const handlePhotoPick = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const looksLikeImage =
            (file.type && file.type.startsWith('image/')) ||
            isAnalyzableImageAttachment({ mime: file.type, fileName: file.name });
        if (!looksLikeImage) {
            setPickError('Por ahora solo puedo ver fotos. Mándame una foto de tu planta o cultivo.');
            return;
        }
        setPickError('');
        setBusy(true);
        try {
            const { blob, mime } = await captureAndCompress(file);
            const previewUrl = URL.createObjectURL(blob);
            setAttachment({ blob, mime, fileName: file.name || 'foto.jpg', previewUrl, kind: 'photo' });
            requestAnimationFrame(() => textareaRef.current?.focus());
        } catch (err) {
            console.error('[AgentHero] no se pudo procesar la foto:', err);
            setPickError('No pude ver bien esa foto. Prueba con otra, con buena luz.');
        } finally {
            setBusy(false);
        }
    };

    const clearAttachment = () => {
        if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        setAttachment(null);
        setPickError('');
    };

    const canSend = !busy && (text.trim().length > 0 || Boolean(attachment));
    const recSeconds = Math.floor((durationMs || 0) / 1000);
    const expertoActive = nivel === 'detallado';

    return (
        <section
            aria-label="Agente Chagra"
            className={['agentport agentport-immersive relative w-full flex flex-col', phase !== 'sending' ? 'agentport-idle' : ''].join(' ')}
            data-nivel={nivel}
        >
            {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- Technical comments in CSS */}
            <style>{`
                /* ============================================================
                   AgentHero — PORTADA INMERSIVA · PORT FIEL del demo del
                   operador (oracle-lab demo-agente*.html). Estructura vertical
                   1:1 del demo:
                     · marca (ícono del tema + wordmark) + toggle Campesino/Exp
                     · ESCENA ambiente por tema (detrás de todo):
                         nature  → sol + montañas 3 capas + polen + colibrí 2D
                         biopunk → void + grid + grafo vivo + raíces + colibrí
                         minimal → trazo monoline + horizonte + toque verde
                     · saludo grande + subtítulo (cambian con el toggle)
                     · fila de chips
                     · compositor pill anclado (Ⓐ izq · cámara/adjuntar · mic/▶)
                   El acento (teal/ocre/verde) y las superficies salen de los
                   tokens theme-aware (--t-accent-rgb, --c-*), así los 3 temas
                   coinciden con su demo sin parchar a mano.
                   ============================================================ */
                .agentport {
                    font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, 'Segoe UI', sans-serif;
                    --ap-r-grande: 26px;
                    /* CRÍTICO: transparente para dejar ver el fondo biopunk */
                    background: transparent;
                }
                [data-theme="minimalista"] .agentport { --ap-r-grande: 22px; }

                .agentport-immersive {
                    min-height: 100dvh;
                    padding: 0 16px 14px;
                    overflow: hidden; /* la escena ambiente no desborda el screenful */
                    /* CRÍTICO: transparente para dejar ver el fondo biopunk */
                    background: transparent;
                }
                /* Estado idle (sin conversacion activa): el hero ocupa el primer
                   screenful completo, como los demos. Los modulos del home
                   siguen accesibles por scroll debajo del hero. */
                .agentport-immersive.agentport-idle {
                    min-height: 100dvh;
                    flex-shrink: 0;
                }
                /* El indicador de "hay más contenido abajo" es ÚNICO: el botón
                   funcional "Mis módulos" (con su flecha animada) al final del
                   hero. Antes había además un ::after decorativo aquí que
                   DUPLICABA la flecha y dejaba un hueco vertical feo entre el
                   compositor y lo que sigue (bug espaciado 2026-06-19). Removido:
                   una sola flecha, sin dead-space. */

                /* ===================== ESCENA AMBIENTE ===================== */
                .agentport-scene {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                /* — SOL (nature) — radial cálido en la zona-respiro, respira.
                   Solo nature. Posicionado bajo la marca, en el aire abierto
                   de la escena (como el amanecer del demo), no tapado por el
                   chrome del TopBar/marca. Ajustado top 8% para evitar que
                   el toggle Campesino/Experto lo tape. */
                .agentport-sun {
                    position: absolute;
                    top: 9%;
                    /* CENTRADO como el demo (.sun left:50%) — antes left:25% lo
                       dejaba desplazado y desvaído a un lado (operador 2026-06-20:
                       "sol como el demo"). */
                    left: 50%;
                    transform: translateX(-50%);
                    width: 240px;
                    height: 240px;
                    border-radius: 50%;
                    /* stops del demo (.sun: #fff4d6 0% → #ffe6a8 45% → transparente
                       72%) — el mid-stop sólido (no .55) le da el cuerpo cálido
                       del amanecer del demo, no un halo lavado. */
                    background: radial-gradient(
                        circle,
                        #fff4d6 0%,
                        #ffe6a8 45%,
                        rgba(255, 214, 140, 0) 72%
                    );
                    filter: blur(0.3px);
                    animation: agentport-sun-glow 9s ease-in-out infinite;
                    display: none;
                }
                [data-theme="nature"] .agentport-scene.is-day .agentport-sun { display: block; }
                /* Honestidad climática: el sol radial grande de nature se apaga
                   cuando el cielo REAL está cubierto (caso Choachí) y se
                   atenúa con cielo parcial. La nube manda, no el reloj. */
                [data-theme="nature"] .agentport-scene.is-day.sky-parcial .agentport-sun { opacity: .55; animation: none; }
                [data-theme="nature"] .agentport-scene.is-day.sky-nublado .agentport-sun,
                [data-theme="nature"] .agentport-scene.is-day.sky-niebla .agentport-sun,
                [data-theme="nature"] .agentport-scene.is-day.sky-lluvia .agentport-sun {
                    opacity: .22;
                    animation: none;
                }
                @keyframes agentport-sun-glow {
                    0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
                    50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
                }

                /* — SOL/LUNA delicados (operador 2026-06-06) — astro pequeño y
                   sutil, integrado en la escena de CADA tema, según la hora.
                   Vive arriba en el aire abierto. Día = sol; noche = luna. El sol
                   radial grande de nature (.agentport-sun) sigue solo en nature
                   de día; este astro pequeño es universal y delicado. */
                .agentport-astro {
                    position: absolute;
                    /* top 11% lo dejaba DETRÁS del toggle Campesino/Experto en
                       viewport de teléfono (390px): el astro quedaba invisible.
                       Baja al aire abierto entre el toggle y el saludo. */
                    top: 19%;
                    right: 10%;
                    width: 54px;
                    height: 54px;
                    z-index: 1;
                    opacity: .9;
                    filter: drop-shadow(0 0 10px rgba(255, 236, 180, .35));
                    animation: agentport-astro-breathe 8s ease-in-out infinite;
                }
                .agentport-astro.is-moon { filter: drop-shadow(0 0 10px rgba(200, 220, 255, .35)); }
                /* nature ya tiene el sol radial grande de día — el astro chico
                   solo se oculta cuando el cielo REAL está despejado; con
                   nube/niebla/lluvia el astro ES el que cuenta la verdad. */
                [data-theme="nature"] .agentport-scene.is-day.sky-despejado .agentport-astro { display: none; }
                /* minimalista: SIN elementos de nature (sol/montañas/polen/astro) — el
                   demo limpio solo lleva trazo botánico + horizonte (2026-06-20). */
                [data-theme="minimalista"] .agentport-astro { display: none; }
                [data-theme="minimalista"] .agentport-sun { display: none !important; }
                [data-theme="minimalista"] .agentport-mtn { display: none !important; }
                [data-theme="minimalista"] .agentport-pollen { display: none !important; }
                .agentport-astro svg { width: 100%; height: 100%; display: block; }
                @keyframes agentport-astro-breathe {
                    0%, 100% { opacity: .85; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.04); }
                }

                /* — MONTAÑAS 3 capas (nature) — paths + fills exactos del demo
                   (demo-agente.html .mtn). Ancladas al PIE (bottom:0) como el
                   demo: la silueta llena el tercio inferior y las cumbres asoman
                   detrás de chips/compositor — antes (bottom:18%) quedaban
                   desvaídas/flotando a media pantalla (operador 2026-06-20:
                   "reforzar montañas"). preserveAspectRatio:none deja que el SVG
                   se estire a lo ancho real del teléfono, igual que el demo. */
                .agentport-mtn {
                    position: absolute;
                    left: 0; right: 0; bottom: 0;
                    height: 320px;
                    display: none;
                }
                [data-theme="nature"] .agentport-mtn { display: block; }
                .agentport-mtn svg { display: block; width: 100%; height: 100%; }

                /* — POLEN (nature) — partículas flotando. */
                .agentport-pollen {
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255, 213, 128, 0.8);
                    filter: blur(0.4px);
                    animation: agentport-float-up linear infinite;
                    will-change: transform, opacity;
                    display: none;
                }
                [data-theme="nature"] .agentport-pollen { display: block; }
                @keyframes agentport-float-up {
                    0% { transform: translateY(20px) translateX(0); opacity: 0; }
                    12% { opacity: 0.9; }
                    50% { transform: translateY(-50px) translateX(6px); opacity: 0.55; }
                    88% { opacity: 0.4; }
                    100% { transform: translateY(-120px) translateX(-4px); opacity: 0; }
                }

                /* ===== ESCENA BIO-PUNK: red viva (grafo eléctrico) ===== */
                /* Toda la red bio-punk solo se ve en bio-punk (default theme,
                   sin data-theme) — la ocultamos en nature/minimalista. */
                .agentport-bp { display: block; }
                [data-theme] .agentport-bp { display: none; }
                body:not([data-custom-bg]) [data-theme="biopunk"] .agentport-bp { display: block; }
                :global(body[data-custom-bg]) .agentport-bp, body[data-custom-bg] .agentport-bp { display: none !important; }

                /* base oscura con glow teal central + glow inferior (HYTA) */
                .agentport-void {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(120% 80% at 50% 8%, #0e2a2e 0%, #0b1a20 34%, #0a1118 56%, #0a0e14 100%),
                        radial-gradient(80% 50% at 80% 90%, rgba(25,201,154,.10) 0%, transparent 60%);
                }
                /* malla / rejilla tenue de "circuito" */
                .agentport-grid {
                    position: absolute; inset: 0; opacity: .5;
                    background-image:
                        linear-gradient(rgba(25,201,154,.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(25,201,154,.05) 1px, transparent 1px);
                    background-size: 34px 34px;
                    -webkit-mask-image: radial-gradient(120% 90% at 50% 10%, #000 30%, transparent 78%);
                            mask-image: radial-gradient(120% 90% at 50% 10%, #000 30%, transparent 78%);
                }
                /* SVG del grafo: aristas que se "cablean" + nodos + corriente */
                .agentport-net { position: absolute; inset: 0; width: 100%; height: 100%; }
                .agentport-net .edge {
                    stroke: #19c79a; stroke-width: 1.4; fill: none; opacity: 0;
                    stroke-dasharray: var(--len, 160); stroke-dashoffset: var(--len, 160);
                    animation: agentport-wire 5.6s cubic-bezier(.22,.61,.36,1) infinite;
                }
                .agentport-net .edge.b { stroke: #3be8a6; }
                @keyframes agentport-wire {
                    0% { stroke-dashoffset: var(--len, 160); opacity: 0; }
                    18% { opacity: .6; }
                    55% { stroke-dashoffset: 0; opacity: .55; }
                    80% { opacity: .22; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
                .agentport-net .node {
                    fill: #19c79a; filter: drop-shadow(0 0 5px rgba(25,201,154,.9));
                    animation: agentport-node-pulse 4.2s cubic-bezier(.22,.61,.36,1) infinite;
                }
                .agentport-net .node.br { fill: #3be8a6; }
                .agentport-net .node.amber { fill: #f0a060; filter: drop-shadow(0 0 5px rgba(240,160,96,.8)); }
                @keyframes agentport-node-pulse { 0%,100% { opacity: .35; r: 2.4; } 50% { opacity: 1; r: 3.4; } }
                /* destellos de "corriente" que recorren aristas clave */
                .agentport-net .spark { fill: #cffff2; filter: drop-shadow(0 0 6px #19f0c0); }
                .agentport-net .spark.s1 { animation: agentport-run1 4.4s linear infinite; }
                .agentport-net .spark.s2 { animation: agentport-run2 5.2s linear infinite; animation-delay: 1.1s; }
                .agentport-net .spark.s3 { animation: agentport-run3 6s linear infinite; animation-delay: 2.3s; }
                @keyframes agentport-run1 { 0% { transform: translate(60px,18px); opacity: 0; } 10% { opacity: 1; } 50% { transform: translate(30px,150px); opacity: 1; } 60% { opacity: 0; } 100% { opacity: 0; } }
                @keyframes agentport-run2 { 0% { transform: translate(60px,18px); opacity: 0; } 12% { opacity: 1; } 50% { transform: translate(96px,150px); opacity: 1; } 62% { opacity: 0; } 100% { opacity: 0; } }
                @keyframes agentport-run3 { 0% { transform: translate(330px,40px); opacity: 0; } 12% { opacity: 1; } 55% { transform: translate(250px,260px); opacity: 1; } 65% { opacity: 0; } 100% { opacity: 0; } }
                /* esporas/datos que suben */
                .agentport-spore {
                    position: absolute; border-radius: 50%; background: rgba(25,240,192,.85);
                    box-shadow: 0 0 8px 1px rgba(25,201,154,.7);
                    animation: agentport-float-up-bp linear infinite; will-change: transform, opacity;
                }
                @keyframes agentport-float-up-bp {
                    0% { transform: translateY(20px) translateX(0); opacity: 0; }
                    12% { opacity: .95; }
                    50% { transform: translateY(-60px) translateX(7px); opacity: .7; }
                    88% { opacity: .4; }
                    100% { transform: translateY(-140px) translateX(-5px); opacity: 0; }
                }
                /* raíces / micelio luminoso anclado abajo */
                .agentport-roots { position: absolute; left: 0; right: 0; bottom: 0; height: 42%; }
                .agentport-roots svg { position: absolute; bottom: 0; width: 100%; height: 100%; display: block; }
                .agentport-roots .r {
                    stroke: #13b893; fill: none; stroke-linecap: round; opacity: .5;
                    filter: drop-shadow(0 0 4px rgba(25,201,154,.5));
                }

                /* ===== ESCENA MINIMALISTA: trazo botánico + horizonte ===== */
                .agentport-min { display: none; }
                [data-theme="minimalista"] .agentport-min { display: block; }
                /* toque verde tenue (sobrio) — sin montañas ni grafo */
                [data-theme="minimalista"] .agentport-scene::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(120% 60% at 50% 0%, rgba(47,110,90,0.07) 0%, transparent 60%);
                }
                .agentport-sprig {
                    position: absolute; top: -8px; right: -14px; width: 180px; height: 180px;
                    opacity: .5; color: #2f6e5a;
                }
                .agentport-sprig svg { width: 100%; height: 100%; display: block; }
                .agentport-sprig path {
                    stroke-dasharray: var(--len, 520); stroke-dashoffset: var(--len, 520);
                    animation: agentport-draw 1.6s cubic-bezier(.16,.84,.3,1) .25s forwards;
                }
                @keyframes agentport-draw { to { stroke-dashoffset: 0; } }
                .agentport-horizon {
                    position: absolute; left: 0; right: 0; bottom: 96px; height: 1px;
                    background: linear-gradient(90deg, transparent, #e3ddd0, transparent); opacity: .7;
                }

                /* ===== COLIBRÍ 2D — vuela en bio-punk y nature ===== */
                /* El SVG base es ocre/teal (nature). En bio-punk recibe un glow
                   neón vía drop-shadow. En MINIMALISTA NO vuela: el demo
                   (demo-agente-minimalista.html) es limpio crema/papel — solo el
                   trazo botánico (.agentport-sprig) + horizonte, sin colibrí ni
                   sol/montañas ("menos es más", operador 2026-06-20). */
                .agentport-hummer {
                    position: absolute; top: 28%; left: 16%; z-index: 2;
                    animation: agentport-fly 18s cubic-bezier(.22,.61,.36,1) infinite;
                    transform-origin: center; will-change: transform;
                }
                .agentport-hummer svg { display: block; filter: drop-shadow(0 6px 6px rgba(90,60,20,.18)); }
                /* bio-punk = tema base (sin data-theme): glow de miel (ámbar) */
                .agentport-hummer svg { filter: drop-shadow(0 0 8px rgba(240,178,60,.6)) drop-shadow(0 0 16px rgba(240,200,120,.3)); }
                [data-theme="nature"] .agentport-hummer svg { filter: drop-shadow(0 6px 6px rgba(90,60,20,.18)); }
                /* minimalista: SIN colibrí (escena limpia del demo). */
                [data-theme="minimalista"] .agentport-hummer { display: none !important; }
                .agentport-hummer .wing {
                    transform-origin: 18px 26px;
                    animation: agentport-flap .14s ease-in-out infinite alternate;
                }
                @keyframes agentport-flap {
                    from { transform: rotate(-24deg) scaleY(1); }
                    to { transform: rotate(18deg) scaleY(.72); }
                }
                @keyframes agentport-fly {
                    0% { transform: translate(0,0) rotate(0deg); }
                    18% { transform: translate(58px,-28px) rotate(-5deg); }
                    38% { transform: translate(138px,8px) rotate(3.5deg); }
                    54% { transform: translate(92px,48px) rotate(7deg); }
                    74% { transform: translate(22px,20px) rotate(-2.5deg); }
                    100% { transform: translate(0,0) rotate(0deg); }
                }

                /* ===================== TOGGLE SUPERIOR ===================== */
                .agentport-topbar {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: calc(86px + env(safe-area-inset-top)) 0 6px;
                    flex: none;
                }
                .agentport-brand { display: flex; align-items: flex-start; gap: 9px; min-width: 0; }
                .agentport-mark {
                    width: 34px; height: 34px; flex: none; display: inline-flex;
                    filter: drop-shadow(0 2px 3px rgba(0,0,0,.25));
                }
                .agentport-mark svg { width: 100%; height: 100%; display: block; }
                .agentport-brand-copy { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
                .agentport-name {
                    font-weight: 800; font-size: 1.1rem; letter-spacing: -.01em;
                    color: rgb(var(--c-slate-100)); line-height: 1.05;
                }
                .agentport-name small {
                    display: block; font-weight: 600; font-size: .6rem; letter-spacing: .16em;
                    text-transform: uppercase; margin-top: -1px;
                    /* matiz profundo del acento (.brand small del demo:
                       #a8612f nature · #19c79a biopunk · #1d4639 minimal) */
                    color: rgb(var(--t-accent-deep-rgb, var(--t-accent-rgb)));
                }
                /* toggle Campesino | Experto (.modeToggle del demo) */
                .agentport-mode {
                    display: flex; flex: none;
                    background: rgb(var(--c-surface-card) / 0.65);
                    border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 22px; padding: 3px;
                    backdrop-filter: blur(6px);
                    box-shadow: 0 2px 8px -4px rgba(0,0,0,.35);
                }
                .agentport-mode button {
                    border: none; background: transparent; font: inherit; cursor: pointer;
                    font-size: .72rem; font-weight: 700; padding: 6px 10px; border-radius: 18px;
                    /* slate-500 = inactivo del demo (nature --cafe-3 #8a7350 MEDIDO) */
                    color: rgb(var(--c-slate-500));
                    display: flex; align-items: center; gap: 4px; white-space: nowrap;
                    transition: background .3s cubic-bezier(.22,.61,.36,1), color .3s ease, transform .15s ease;
                }
                .agentport-mode button:active { transform: scale(.94); }
                .agentport-mode button.is-active {
                    background: rgb(var(--t-accent-rgb)); color: #fff;
                    box-shadow: 0 3px 8px -3px rgb(var(--t-accent-rgb) / 0.6);
                }
                /* en bio-punk el acento es muy claro → tinta oscura legible */
                [data-theme="biopunk"] .agentport-mode button.is-active { color: #04231b; }
                .agentport:not([data-theme]) .agentport-mode button.is-active { color: #04231b; }

                /* botón de perfil (engranaje) — arriba-derecha, junto al toggle.
                   Abre la pantalla de Perfil (prefs). Discreto, redondo. */
                .agentport-profile {
                    width: 38px; height: 38px; flex: none; border-radius: 50%;
                    display: inline-flex; align-items: center; justify-content: center;
                    background: rgb(var(--c-surface-card) / 0.65);
                    border: 1px solid rgb(var(--c-surface-border));
                    color: rgb(var(--c-slate-300)); cursor: pointer;
                    backdrop-filter: blur(6px);
                    box-shadow: 0 2px 8px -4px rgba(0,0,0,.35);
                    transition: transform .16s cubic-bezier(.22,.61,.36,1), color .2s ease, border-color .2s ease;
                }
                .agentport-profile:hover { color: rgb(var(--c-slate-100)); border-color: rgb(var(--t-accent-rgb) / 0.5); }
                .agentport-profile:active { transform: scale(.92); }
                .agentport-headtools { display: flex; align-items: center; gap: 8px; flex: none; }

                /* "Abrir Chagra IA" — botón redondo con el avatar del agente.
                   Entrada explícita al overlay desde la portada (tarea #51). */
                .agentport-open {
                    width: 52px; height: 52px; flex: none; border-radius: 50%;
                    display: inline-flex; align-items: center; justify-content: center;
                    overflow: hidden; padding: 0; cursor: pointer;
                    background: rgb(var(--c-surface-card) / 0.65);
                    border: 1px solid rgb(var(--c-surface-border));
                    backdrop-filter: blur(6px);
                    box-shadow: 0 2px 8px -4px rgba(0,0,0,.35);
                    transition: transform .16s cubic-bezier(.22,.61,.36,1),
                                border-color .2s ease, box-shadow .25s ease;
                }
                .agentport-open:hover { border-color: rgb(var(--t-accent-rgb) / 0.5); }
                .agentport-open:active { transform: scale(.92); }

                /* ============ CAMPANA DE ALERTAS/TAREAS (demo biopunk) ============
                   Import 1:1 del .bellbtn + .notifPanel del demo-agente-biopunk:
                   campana redonda con anillo que respira + badge ámbar; panel que
                   baja desde el header con "Alertas ambientales" y "Tareas de
                   campo". Colores via tokens → theme-aware en los 3 temas. */
                .agentport-bell {
                    position: relative; width: 38px; height: 38px; flex: none;
                    border-radius: 50%; display: inline-flex; align-items: center;
                    justify-content: center; cursor: pointer; font-size: 1.05rem;
                    background: rgb(var(--c-surface-card) / 0.65);
                    border: 1px solid rgb(var(--c-surface-border));
                    backdrop-filter: blur(6px);
                    box-shadow: 0 2px 8px -4px rgba(0,0,0,.35);
                    transition: transform .16s cubic-bezier(.22,.61,.36,1),
                                background .25s ease, border-color .25s ease, box-shadow .25s ease;
                }
                /* el anillo solo respira cuando HAY pendientes (badge > 0) */
                .agentport-bell.has-items:not(.is-open) {
                    animation: agentport-pulse-ring 3.6s cubic-bezier(.22,.61,.36,1) infinite;
                }
                .agentport-bell:active { transform: scale(.9); }
                .agentport-bell.is-open {
                    background: rgb(var(--t-accent-rgb)); border-color: rgb(var(--t-accent-rgb));
                    animation: none;
                    box-shadow: 0 0 20px -3px rgb(var(--t-accent-rgb) / 0.85);
                }
                .agentport-bell .bicon { transition: transform .3s cubic-bezier(.22,.61,.36,1); }
                .agentport-bell.is-open .bicon { transform: rotate(8deg); }
                .agentport-bell .badge {
                    position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px;
                    padding: 0 4px; border-radius: 9px; font-size: .62rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center; line-height: 1;
                    background: rgb(var(--c-amber-400)); color: #3a2208;
                    border: 1.5px solid rgb(var(--c-surface));
                    box-shadow: 0 0 10px -1px rgb(var(--c-amber-400) / 0.85);
                }
                .agentport-notif {
                    position: absolute; left: 12px; right: 12px;
                    top: calc(150px + env(safe-area-inset-top));
                    z-index: 30; display: flex; flex-direction: column; overflow: hidden;
                    max-height: 56dvh;
                    background: rgb(var(--c-surface-card) / 0.97);
                    border: 1px solid rgb(var(--t-accent-rgb) / 0.4);
                    border-radius: 20px;
                    box-shadow: 0 22px 48px -18px rgba(0,0,0,.55),
                                0 0 36px -10px rgb(var(--t-accent-rgb) / 0.3);
                    transform-origin: top right;
                    animation: agentport-notif-in .42s cubic-bezier(.32,.72,0,1) both;
                }
                @keyframes agentport-notif-in {
                    from { opacity: 0; transform: translateY(-14px) scale(.97); }
                    to { opacity: 1; transform: none; }
                }
                .agentport-notif .nph {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 13px 16px 9px; flex: none;
                    border-bottom: 1px solid rgb(var(--c-surface-border));
                }
                .agentport-notif .nph .nt {
                    font-weight: 800; font-size: .96rem; color: rgb(var(--c-slate-100));
                    display: flex; align-items: center; gap: 7px;
                }
                .agentport-notif .nph .nclose {
                    border: none; cursor: pointer; width: 28px; height: 28px;
                    border-radius: 50%; font-size: 1rem;
                    display: flex; align-items: center; justify-content: center;
                    background: rgb(var(--t-accent-rgb) / 0.12);
                    color: rgb(var(--t-accent-deep-rgb, var(--t-accent-rgb)));
                    transition: background .2s ease, transform .15s ease;
                }
                .agentport-notif .nph .nclose:active { transform: scale(.9); }
                .agentport-notif-body {
                    overflow-y: auto; -webkit-overflow-scrolling: touch;
                    padding: 8px 12px 12px; overscroll-behavior: contain;
                }
                .agentport-notif .nsec {
                    font-size: .62rem; font-weight: 800; letter-spacing: .16em;
                    text-transform: uppercase; color: rgb(var(--c-slate-500));
                    margin: 9px 6px 6px;
                }
                .agentport-notif .nitem {
                    display: flex; align-items: flex-start; gap: 11px;
                    background: rgb(var(--c-surface-raised));
                    border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 14px; padding: 10px 12px; margin-bottom: 7px;
                }
                .agentport-notif .nitem .nico {
                    width: 34px; height: 34px; flex: none; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.15rem;
                    background: rgb(var(--t-accent-rgb) / 0.12);
                    border: 1px solid rgb(var(--t-accent-rgb) / 0.25);
                }
                .agentport-notif .nitem.is-danger .nico {
                    background: rgb(244 63 94 / 0.12); border-color: rgb(244 63 94 / 0.4);
                }
                .agentport-notif .nitem .ntxt { flex: 1; min-width: 0; }
                .agentport-notif .nitem .ntit {
                    display: block; font-weight: 700; font-size: .88rem;
                    color: rgb(var(--c-slate-100)); line-height: 1.3;
                }
                .agentport-notif .nitem .nmeta {
                    display: block; font-size: .74rem; margin-top: 3px;
                    color: rgb(var(--c-slate-300)); line-height: 1.35;
                }
                .agentport-notif .nitem .due { font-weight: 800; color: rgb(var(--c-amber-500)); }
                .agentport-notif .nitem.is-danger .due { color: rgb(244 63 94); }
                .agentport-notif .nempty {
                    text-align: center; font-size: .8rem; color: rgb(var(--c-slate-400));
                    padding: 10px 6px;
                }
                .agentport-notif-foot {
                    padding: 7px 16px 12px; text-align: center; flex: none;
                    font-size: .68rem; color: rgb(var(--c-slate-500));
                    border-top: 1px solid rgb(var(--c-surface-border));
                }
                .agentport-notif-foot b { color: rgb(var(--t-accent-deep-rgb, var(--t-accent-rgb))); }

                /* chip de UBICACIÓN — debajo de la marca, conectado al logo.
                   📍 Vereda · Municipio · altitud. */
                .agentport-loc {
                    margin-top: 4px;
                    display: inline-flex; align-items: center; gap: 5px; max-width: min(72vw, 360px);
                    padding: 4px 8px; border-radius: 12px;
                    background: rgb(var(--c-surface-card) / 0.55);
                    border: 1px solid rgb(var(--t-accent-rgb) / 0.22);
                    color: rgb(var(--c-slate-300)); font-size: .68rem; font-weight: 650;
                    line-height: 1.1; backdrop-filter: blur(6px);
                    box-shadow: 0 2px 8px -5px rgba(0,0,0,.35);
                }
                .agentport-loc .pin { color: rgb(var(--t-accent-rgb)); font-size: .8rem; flex: none; }
                .agentport-loc .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                /* chip de ALERTA real (clima/helada) — estilo demo: borde de
                   acento llamativo, ⚠. Vive bajo el saludo, sobre los chips. */
                .agentport-alert {
                    position: relative; z-index: 1; display: flex; align-items: center; gap: 9px;
                    margin: 0 0 12px; padding: 11px 13px; border-radius: 16px;
                    background: rgb(var(--c-surface-card));
                    border: 1.5px solid rgb(var(--t-accent-rgb) / 0.65);
                    box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0.45);
                    animation: agentport-alert-pulse 2.6s cubic-bezier(.22,.61,.36,1) infinite;
                }
                .agentport-alert.is-danger {
                    border-color: rgb(244 63 94 / 0.8);
                    animation-name: agentport-alert-pulse-danger;
                }
                .agentport-alert .ico { font-size: 1.2rem; flex: none; line-height: 1; }
                .agentport-alert .txt { flex: 1; min-width: 0; }
                .agentport-alert .at { font-weight: 800; font-size: .9rem; color: rgb(var(--c-slate-100)); }
                .agentport-alert .am { font-size: .8rem; color: rgb(var(--c-slate-300)); line-height: 1.35; margin-top: 1px; }
                @keyframes agentport-alert-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0); }
                    50% { box-shadow: 0 0 0 4px rgb(var(--t-accent-rgb) / 0.16); }
                }
                @keyframes agentport-alert-pulse-danger {
                    0%, 100% { box-shadow: 0 0 0 0 rgb(244 63 94 / 0); }
                    50% { box-shadow: 0 0 0 4px rgb(244 63 94 / 0.18); }
                }

                /* ===================== CUERPO DEL HERO ===================== */
                /* Patrón del demo: un area flexible ocupa el espacio entre el
                   header y el compositor. El contenido se justifica al fondo y
                   el compositor queda como ultimo hijo visible del hero. */
                .agentport-hero-body {
                    position: relative;
                    z-index: 1;
                    flex: 1 1 auto;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    overflow: hidden;
                }
                /* Con la mano abierta el cuerpo NO recorta y se ELEVA sobre el
                   compositor (z 4): las ramas de la red bajan POR FUERA del borde
                   inferior del cuerpo y pintan ENCIMA del compositor hasta el
                   centro del botón Ⓐ (que vive dentro del compositor, debajo).
                   #1726 dejó el cuerpo en z-index:1 < compositor:4 y con
                   overflow:hidden → el tramo final de cada rama quedaba (a)
                   recortado por el cuerpo y (b) tapado por el fondo del
                   compositor → "líneas que mueren en el vacío" (regresión del
                   fix #1668). El SVG de la red es pointer-events:none, así que el
                   compositor sigue usable (solo el panel de la mano captura
                   toques). Al cerrar vuelve a su estado base para que la escena
                   ambiente no desborde el screenful. */
                .agentport-hero-body.is-open { overflow: visible; z-index: 5; }

                /* ===================== ZONA-RESPIRO ===================== */
                /* Espacio "respiro" donde vive la mano/red al abrir Ⓐ. El stage
                   no participa en el alto: queda contenido dentro del cuerpo
                   flexible para no empujar ni romper el composer. */
                .agentport-stage {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    min-height: 0;
                    overflow: hidden;
                    pointer-events: none;
                }
                /* Abierto: overflow VISIBLE para que las ramas viajen hasta la Ⓐ
                   y se suelden a su disco (rimPoint en AgentRedMenu.layout). El
                   z-index sube por encima del compositor (z 4) para que el tramo
                   final de cada rama pinte SOBRE el borde del compositor y llegue
                   al centro del botón — continuidad raíz↔red sin corte. El SVG es
                   pointer-events:none, así que el tap sigue cayendo en el
                   compositor/botón; solo el panel de la mano captura toques. */
                .agentport-stage.is-open {
                    pointer-events: auto;
                    overflow: visible;
                    z-index: 5;
                }

                .agentport-content {
                    position: relative;
                    z-index: 3;
                    flex: 1 1 auto;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                }

                /* ===================== SALUDO ===================== */
                .agentport-greet {
                    position: relative; z-index: 1; margin-bottom: 12px; flex: none;
                    animation: agentport-rise 0.8s cubic-bezier(0.16, 0.84, 0.3, 1) both;
                }
                .agentport-hi {
                    font-size: 1.92rem; line-height: 1.12; font-weight: 800;
                    letter-spacing: -0.02em; color: rgb(var(--c-slate-100));
                }
                [data-theme="minimalista"] .agentport-hi { font-weight: 700; letter-spacing: -0.025em; }
                .agentport-hi .chagra-wordmark { color: rgb(var(--t-accent-rgb)); }
                .agentport-sub {
                    margin-top: 8px; font-size: 1rem; line-height: 1.5;
                    /* slate-400 = .greet .sub del demo (nature --cafe-2 #6b5638
                       MEDIDO; en biopunk acerca al teal-grisáceo del demo) */
                    color: rgb(var(--c-slate-400)); max-width: 34ch;
                    transition: opacity 0.4s ease;
                }
                [data-nivel="detallado"] .agentport-sub { font-size: 0.92rem; }
                @keyframes agentport-rise {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* ===================== CHIPS ===================== */
                .agentport-chiprow {
                    position: relative; z-index: 1; display: flex; gap: 8px;
                    overflow-x: auto; padding: 2px 0 12px; scrollbar-width: none; flex: none;
                }
                .agentport-chiprow::-webkit-scrollbar { display: none; }
                .agentport-chip {
                    flex: none; display: inline-flex; align-items: center; gap: 7px;
                    background: rgb(var(--c-surface-card)); border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 18px; padding: 9px 13px; font-size: 0.85rem; font-weight: 600;
                    color: rgb(var(--c-slate-100)); white-space: nowrap; cursor: pointer;
                    box-shadow: 0 2px 7px -5px rgba(0, 0, 0, 0.4);
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
                }
                [data-theme="minimalista"] .agentport-chip { border-radius: 16px; font-weight: 500; }
                .agentport-chip:hover { border-color: rgb(var(--t-accent-rgb) / 0.45); }
                .agentport-chip:active { transform: scale(0.94); }
                .agentport-chip:disabled { opacity: 0.5; cursor: not-allowed; }
                .agentport-chip-e { font-size: 1.05rem; line-height: 1; }

                /* ===================== COMPOSITOR ===================== */
                .agentport-composer {
                    position: relative;
                    z-index: 4;
                    flex: none;
                    margin-bottom: 24px;
                }
                .agentport-bar {
                    display: flex; align-items: center; gap: 8px;
                    background: rgb(var(--c-surface-raised)); border: 1px solid rgb(var(--c-surface-border));
                    border-radius: var(--ap-r-grande); padding: 7px 8px;
                    box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.32);
                    transition: border-color 0.25s ease, box-shadow 0.25s ease;
                }
                .agentport-bar.is-recording { border-color: rgb(244 63 94 / 0.6); }
                .agentport-bar:focus-within {
                    border-color: rgb(var(--t-accent-rgb) / 0.55);
                    box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.32), 0 0 0 3px rgb(var(--t-accent-rgb) / 0.12);
                }
                .agentport-iconbtn {
                    width: 44px; height: 44px; flex: none;
                    background: rgb(var(--c-surface-card)); border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    color: rgb(var(--c-slate-400)); cursor: pointer; position: relative;
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                background 0.25s ease, border-color 0.25s ease, color 0.2s ease;
                }
                .agentport-iconbtn:hover { color: rgb(var(--c-slate-100)); border-color: rgb(var(--t-accent-rgb) / 0.5); }
                .agentport-iconbtn:active { transform: scale(0.9); }
                .agentport-iconbtn:disabled { opacity: 0.4; cursor: not-allowed; }

                /* Botón Ⓐ — herramienta. Ícono del tema dentro; anillo que respira
                   (pulseRing del demo) y se rellena con el acento al abrir. */
                .agentport-tool { padding: 7px; }
                .agentport-tool .agentport-tool-ico { width: 100%; height: 100%; display: inline-flex; }
                .agentport-tool .agentport-tool-ico svg { width: 100%; height: 100%; display: block; }
                .agentport-tool:not(.is-open) {
                    animation: agentport-pulse-ring 3.6s cubic-bezier(.22,.61,.36,1) infinite;
                }
                /* Abierto = la Ⓐ ES la raíz viva de la red: se rellena con el
                   acento y respira (glow suave) — la misma savia de las ramas
                   que brotan de ella en la zona-respiro (un solo organismo). */
                .agentport-tool.is-open {
                    background: rgb(var(--t-accent-rgb)); border-color: rgb(var(--t-accent-rgb));
                    animation: agentport-root-breathe 3.4s ease-in-out infinite;
                }
                @keyframes agentport-root-breathe {
                    0%, 100% { box-shadow: 0 0 12px -2px rgb(var(--t-accent-rgb) / 0.55); }
                    50% { box-shadow: 0 0 24px 2px rgb(var(--t-accent-rgb) / 0.85); }
                }
                /* al abrir, el ícono se vuelve blanco para contrastar con el acento
                   (cubre también los rellenos de la Ⓐ de herramientas: cabeza del
                   azadón, hoja y punta del machete) */
                .agentport-tool.is-open .agentport-tool-ico path,
                .agentport-tool.is-open .agentport-tool-ico line,
                .agentport-tool.is-open .agentport-tool-ico circle[stroke] { stroke: #fff; }
                .agentport-tool.is-open .agentport-tool-ico circle[fill],
                .agentport-tool.is-open .agentport-tool-ico polygon[fill],
                .agentport-tool.is-open .agentport-tool-ico path[fill]:not([fill="none"]) { fill: #fff; }
                @keyframes agentport-pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0.45); }
                    70% { box-shadow: 0 0 0 12px rgb(var(--t-accent-rgb) / 0); }
                    100% { box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0); }
                }
                /* markSwap del demo: micro-animación al INTERCAMBIAR el ícono
                   del tema (scale .6 + rotate -12° → overshoot → reposo). */
                .agentport-tool-ico.agentport-swap,
                .agentport-mark.agentport-swap {
                    animation: agentport-mark-swap .5s cubic-bezier(.16,.84,.3,1);
                }
                @keyframes agentport-mark-swap {
                    0% { transform: scale(.6) rotate(-12deg); opacity: .2; }
                    60% { transform: scale(1.08) rotate(3deg); }
                    100% { transform: scale(1) rotate(0); opacity: 1; }
                }

                .agentport-mic-on {
                    background: rgb(244 63 94) !important; border-color: rgb(244 63 94) !important;
                    color: #fff !important; box-shadow: 0 4px 14px -4px rgb(244 63 94 / 0.5);
                }
                /* ENVIAR = el colibrí (operador 2026-06-06). Botón redondo de
                   acento con el colibrí 2D del demo dentro (.send-hummer). Al
                   tocar → envía (toda la lógica intacta). */
                .agentport-send {
                    width: 46px; height: 46px; flex: none; border: none; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    overflow: hidden; padding: 0;
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                box-shadow 0.25s ease, background 0.2s ease;
                }
                .agentport-send:not(:disabled) { box-shadow: 0 4px 14px -4px rgb(var(--t-accent-rgb) / 0.7); }
                .agentport-send:not(:disabled):active { transform: scale(0.86); }
                .agentport-send:disabled { background: rgb(var(--c-slate-700)); cursor: not-allowed; }
                /* sin texto/adjunto el botón sigue VIVO (demo: vacío → abre el
                   menú Ⓐ) pero baja el volumen para no competir con el acento */
                .agentport-send:not(.agent-send-accent):not(:disabled) {
                    background: rgb(var(--c-slate-700));
                    box-shadow: none;
                }
                .agentport-send .send-hummer { width: 30px; height: 22px; display: block; }
                .agentport-send .send-hummer svg { width: 100%; height: 100%; display: block; }
                /* En el botón de enviar el colibrí va en CREMA/blanco para
                   contrastar sobre el acento sólido (teal/ocre/verde), pase lo
                   que pase con el tema. Recoloreamos las piezas del SVG. */
                .agentport-send .send-hummer svg ellipse,
                .agentport-send .send-hummer svg circle:not([r="1.4"]):not([r="1"]) { fill: #fffdf5; }
                .agentport-send .send-hummer svg path[fill] { fill: #fbf6e7; }
                .agentport-send .send-hummer svg path[stroke] { stroke: #f3ecd6; }
                .agentport-send .send-hummer svg circle[r="1.4"] { fill: #1a3a32; } /* ojo */
                .agentport-send:not(:disabled) .send-hummer svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
                .agentport-send:disabled .send-hummer { opacity: .55; }

                .agentport-hint { text-align: center; font-size: 0.72rem; margin-top: 9px; color: rgb(var(--c-slate-500)); }
                /* el Ⓐ del hint usa el matiz profundo (.hintbar b del demo) */
                .agentport-hint b { color: rgb(var(--t-accent-deep-rgb, var(--t-accent-rgb))); font-weight: 700; }

                .agentport-scrollcue {
                    position: absolute;
                    left: 16px;
                    right: 16px;
                    bottom: calc(4px + env(safe-area-inset-bottom));
                    z-index: 5;
                    height: 28px;
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: rgb(var(--c-slate-400));
                    font: inherit;
                    font-size: .72rem;
                    font-weight: 650;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color .2s ease;
                }
                .agentport-scrollcue:hover { color: rgb(var(--c-slate-200)); }
                .agentport-scrollcue span { line-height: 1; }
                .agentport-scrollcue svg { display: block; margin-top: -1px; }

                /* ============== MENÚ Ⓐ INTEGRADO (la red en el hero) ==============
                   Nada de bottom-sheet/scrim/modal (operador 2026-06-09: "que se
                   abra APARTE del agente lo vuelve feo"). Mecánica: al tocar Ⓐ,
                   el saludo+chips se PLIEGAN (grid 1fr→0fr) y la zona-respiro
                   (flex:1) absorbe el espacio; allí BROTA la red, full-bleed y
                   transparente, sobre la misma escena del tema. El compositor no
                   se mueve: el árbol crece desde el mismo lienzo donde está Ⓐ. */

                /* plegado fluido del saludo/alerta/chips al abrir el menú */
                .agentport-foldaway {
                    display: grid; grid-template-rows: 1fr;
                    transition: grid-template-rows .5s cubic-bezier(.32,.72,0,1),
                                opacity .32s ease;
                }
                .agentport-foldaway.is-folded {
                    grid-template-rows: 0fr; opacity: 0; pointer-events: none;
                }
                .agentport-foldaway-in { min-height: 0; overflow: hidden; }

                /* panel de la red: vive DENTRO de la zona-respiro, sin caja */
                .agentport-redpanel {
                    position: absolute; inset: 0;
                    display: flex; flex-direction: column;
                    animation: agentport-red-in .5s cubic-bezier(.32,.72,0,1) both;
                }
                .agentport-redpanel.is-closing {
                    transition: opacity .28s ease, transform .28s ease;
                    opacity: 0; transform: translateY(10px) scale(.985);
                    pointer-events: none;
                }
                @keyframes agentport-red-in {
                    from { opacity: 0; transform: translateY(16px) scale(.985); }
                    to { opacity: 1; transform: none; }
                }
                .agentport-red-h { flex: none; text-align: center; padding: 0 14px 2px; }
                .agentport-red-h .t {
                    font-size: 1.02rem; font-weight: 800; letter-spacing: -.01em;
                    color: rgb(var(--c-slate-100));
                }
                .agentport-red-h .s {
                    display: block; font-size: .78rem; line-height: 1.4; margin-top: 2px;
                    color: rgb(var(--c-slate-300));
                }
                /* overflow VISIBLE: las raicillas/vena bajan del lienzo al
                   botón Ⓐ real (un solo trazo, sin clip en el borde). */
                .agentport-red-body { flex: 1 1 auto; min-height: 0; position: relative; overflow: visible; }

                /* con la red abierta, la escena ambiente baja el volumen (misma
                   pantalla, foco en la red — no un modal encima) */
                .agentport-sun, .agentport-astro, .agentport-mtn, .agentport-pollen,
                .agentport-hummer, .agentport-net, .agentport-spore,
                .agentport-roots, .agentport-sprig { transition: opacity .5s ease; }
                .agentport-scene.is-quiet .agentport-sun,
                .agentport-scene.is-quiet .agentport-astro,
                .agentport-scene.is-quiet .agentport-mtn,
                .agentport-scene.is-quiet .agentport-pollen,
                .agentport-scene.is-quiet .agentport-hummer,
                .agentport-scene.is-quiet .agentport-net,
                .agentport-scene.is-quiet .agentport-spore,
                .agentport-scene.is-quiet .agentport-roots,
                .agentport-scene.is-quiet .agentport-sprig { opacity: .14; }

                /* Transición de envío: shimmer + lift (contrato de tests). */
                @keyframes chagra-send-shimmer {
                    0% { transform: translateX(-130%); opacity: 0; }
                    25% { opacity: 1; } 70% { opacity: 1; }
                    100% { transform: translateX(130%); opacity: 0; }
                }
                @keyframes chagra-send-lift {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    35% { transform: translateY(-4px) scale(1.012); opacity: 1; }
                    100% { transform: translateY(-16px) scale(0.978); opacity: 0.82; }
                }
                .chagra-composer-shimmer::after {
                    content: ''; position: absolute; inset: 0; border-radius: inherit;
                    background: linear-gradient(100deg, transparent 12%, rgb(var(--t-accent-rgb) / 0.55) 50%, transparent 88%);
                    animation: chagra-send-shimmer 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                    pointer-events: none; overflow: hidden;
                }
                .chagra-composer-sending { animation: chagra-send-lift 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }

                @media (prefers-reduced-motion: reduce) {
                    .agentport-sun, .agentport-pollen, .agentport-spore,
                    .agentport-hummer, .agentport-hummer .wing { animation: none !important; }
                    .agentport-pollen, .agentport-spore { opacity: 0.5; }
                    .agentport-net .edge { opacity: .4 !important; stroke-dashoffset: 0 !important; animation: none !important; }
                    .agentport-net .node { opacity: .85 !important; animation: none !important; }
                    .agentport-net .spark { display: none !important; }
                    .agentport-sprig path { stroke-dashoffset: 0 !important; animation: none !important; }
                    .agentport-tool:not(.is-open) { animation: none !important; }
                    .agentport-tool.is-open { animation: none !important; }
                    .agentport-bell, .agentport-notif,
                    .agentport-tool-ico.agentport-swap { animation: none !important; }
                    .agentport-greet { animation: none !important; }
                    .agentport-foldaway, .agentport-redpanel { transition: none !important; animation: none !important; }
                    .chagra-composer-shimmer::after, .chagra-composer-sending { animation: none !important; }
                }
            `}</style>

            {/* ===================== ESCENA AMBIENTE (por tema) ===================== */}
            <div
                className={[
                    'agentport-scene',
                    'is-day', // Siempre claro, sin importar la hora (fix temas siempre claros)
                    `sky-${sky.condition}`,
                    menuOpen && !menuClosing ? 'is-quiet' : '',
                ].join(' ')}
                data-sky={sky.condition}
                data-sky-degraded={sky.degraded ? 'true' : 'false'}
                aria-hidden="true"
            >
                {/* — SOL/LUNA realista: nubosidad real Open-Meteo + corrección
                     orográfica andina + ENSO de día; FASE LUNAR real de noche
                     (mostrarla es astronomía; recomendar labores por ella sería
                     folclore — ADR-033). data-sky habilita la validación E2E. — */}
                <div
                    className={['agentport-astro', night ? 'is-moon' : 'is-day'].join(' ')}
                    title={sky.label}
                >
                    <SkyAstro night={night} condition={sky.condition} moonFraction={moonFraction} />
                </div>

                {/* — NATURE: sol + montañas 3 capas + polen — */}
                <div className="agentport-sun" />
                <div className="agentport-mtn">
                    <svg viewBox="0 0 412 320" preserveAspectRatio="none" height="320">
                        {/* capa lejana */}
                        <path d="M0 220 L70 150 L150 205 L230 120 L320 200 L412 140 L412 320 L0 320 Z" fill="#cbb992" opacity=".55" />
                        {/* capa media */}
                        <path d="M0 250 L90 175 L180 245 L270 165 L360 240 L412 200 L412 320 L0 320 Z" fill="#a98f64" opacity=".7" />
                        {/* capa cercana */}
                        <path d="M0 290 L110 215 L210 285 L300 220 L412 280 L412 320 L0 320 Z" fill="#7d6a45" />
                    </svg>
                </div>
                <span className="agentport-pollen" style={{ left: '24%', bottom: '22%', width: 5, height: 5, animationDuration: '11s' }} />
                <span className="agentport-pollen" style={{ left: '70%', bottom: '18%', width: 4, height: 4, animationDuration: '13s', animationDelay: '2.5s' }} />
                <span className="agentport-pollen" style={{ left: '48%', bottom: '30%', width: 6, height: 6, animationDuration: '15s', animationDelay: '5s' }} />
                <span className="agentport-pollen" style={{ left: '82%', bottom: '26%', width: 4, height: 4, animationDuration: '12s', animationDelay: '1.5s' }} />

                {/* — BIO-PUNK: void + grid + grafo vivo + raíces + esporas — */}
                <div className="agentport-bp">
                    <div className="agentport-void" />
                    <div className="agentport-grid" />
                    <svg className="agentport-net" viewBox="0 0 412 470" preserveAspectRatio="xMidYMid slice">
                        {/* aristas (cada una con su largo para el dibujado progresivo) */}
                        <path className="edge" style={{ '--len': 120, animationDelay: '0s' }} d="M60 70 L150 120" />
                        <path className="edge b" style={{ '--len': 150, animationDelay: '.5s' }} d="M150 120 L96 220" />
                        <path className="edge" style={{ '--len': 170, animationDelay: '.9s' }} d="M150 120 L256 96" />
                        <path className="edge" style={{ '--len': 140, animationDelay: '1.3s' }} d="M256 96 L330 170" />
                        <path className="edge b" style={{ '--len': 160, animationDelay: '1.7s' }} d="M256 96 L210 210" />
                        <path className="edge" style={{ '--len': 150, animationDelay: '2.1s' }} d="M96 220 L210 210" />
                        <path className="edge" style={{ '--len': 170, animationDelay: '2.5s' }} d="M210 210 L330 170" />
                        <path className="edge b" style={{ '--len': 150, animationDelay: '2.9s' }} d="M210 210 L150 320" />
                        <path className="edge" style={{ '--len': 150, animationDelay: '3.3s' }} d="M330 170 L300 290" />
                        <path className="edge" style={{ '--len': 150, animationDelay: '3.7s' }} d="M150 320 L300 290" />
                        {/* nodos */}
                        <circle className="node br" cx="60" cy="70" r="3" style={{ animationDelay: '0s' }} />
                        <circle className="node" cx="150" cy="120" r="3" style={{ animationDelay: '.4s' }} />
                        <circle className="node amber" cx="256" cy="96" r="3" style={{ animationDelay: '.8s' }} />
                        <circle className="node" cx="96" cy="220" r="3" style={{ animationDelay: '1.2s' }} />
                        <circle className="node br" cx="210" cy="210" r="3" style={{ animationDelay: '1.6s' }} />
                        <circle className="node" cx="330" cy="170" r="3" style={{ animationDelay: '2s' }} />
                        <circle className="node" cx="150" cy="320" r="3" style={{ animationDelay: '2.4s' }} />
                        <circle className="node amber" cx="300" cy="290" r="3" style={{ animationDelay: '2.8s' }} />
                        {/* corriente recorriendo aristas clave */}
                        <circle className="spark s1" cx="0" cy="0" r="2.4" />
                        <circle className="spark s2" cx="0" cy="0" r="2.2" />
                        <circle className="spark s3" cx="0" cy="0" r="2.4" />
                    </svg>
                    <div className="agentport-roots">
                        <svg viewBox="0 0 412 200" preserveAspectRatio="none">
                            <path className="r" style={{ strokeWidth: 3 }} d="M206 200 C206 150 206 130 206 110" />
                            <path className="r" style={{ strokeWidth: 2.4 }} d="M206 130 C160 120 120 130 70 100" />
                            <path className="r" style={{ strokeWidth: 2.4 }} d="M206 130 C252 120 300 132 350 96" />
                            <path className="r" style={{ strokeWidth: 1.8, opacity: .35 }} d="M206 150 C176 144 150 150 120 130" />
                            <path className="r" style={{ strokeWidth: 1.8, opacity: .35 }} d="M206 150 C236 144 270 152 300 132" />
                            <path className="r" style={{ strokeWidth: 1.6, opacity: .3 }} d="M70 100 C50 92 40 86 26 70" />
                            <path className="r" style={{ strokeWidth: 1.6, opacity: .3 }} d="M350 96 C372 88 384 82 398 66" />
                        </svg>
                    </div>
                    <span className="agentport-spore" style={{ left: '22%', bottom: '20%', width: 5, height: 5, animationDuration: '11s' }} />
                    <span className="agentport-spore" style={{ left: '68%', bottom: '16%', width: 4, height: 4, animationDuration: '13s', animationDelay: '2.5s' }} />
                    <span className="agentport-spore" style={{ left: '46%', bottom: '28%', width: 6, height: 6, animationDuration: '15s', animationDelay: '5s' }} />
                    <span className="agentport-spore" style={{ left: '82%', bottom: '24%', width: 4, height: 4, animationDuration: '12s', animationDelay: '1.5s' }} />
                    <span className="agentport-spore" style={{ left: '34%', bottom: '34%', width: 3, height: 3, animationDuration: '14s', animationDelay: '3.5s' }} />
                </div>

                {/* — MINIMALISTA: trazo botánico monoline + horizonte — */}
                <div className="agentport-min">
                    <div className="agentport-sprig">
                        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path style={{ '--len': 230 }} d="M168 18 C150 60 132 96 110 128 C96 150 86 168 82 186" />
                            <path style={{ '--len': 60 }} d="M133 76 C150 70 166 72 178 60" />
                            <path style={{ '--len': 60 }} d="M118 104 C134 100 150 102 162 90" />
                            <path style={{ '--len': 60 }} d="M104 132 C120 128 136 130 148 118" />
                            <path style={{ '--len': 60 }} d="M146 50 C140 36 142 24 152 14" />
                        </svg>
                    </div>
                    <div className="agentport-horizon" />
                </div>

                {/* — ANGELITA — la abeja agente vuela en bio-punk y nature
                     ("solo abejita", operador 2026-07-18: el colibrí jubiló).
                     En minimalista se oculta vía CSS: el demo limpio no lleva
                     fauna. — */}
                <div className="agentport-hummer">
                    <Angelita estado="acompana" size={68} title="Angelita acompaña la portada" />
                </div>
            </div>

            {/* ===================== TOGGLE Campesino/Experto ===================== */}
            <header className="agentport-topbar">
                <div className="agentport-headtools">
                    {/* "Abrir Chagra IA": entrada EXPLÍCITA al overlay del agente
                        (AgentScreen) desde la portada del home. Bug móvil tarea #51
                        (2026-06-21): el `:active { transform: scale(.92) }` del CSS
                        cambia la geometría del botón entre touchstart y touchend;
                        en iOS Safari + algunos Chrome Android el navegador cancela
                        el click sintético. Fix: interceptamos el touchend con
                        preventDefault (suprime ghost-click) y navegamos directo.
                        launchToAgent navega con la transición premium ya probada. */}
                    <button
                        type="button"
                        onClick={() => {
                            if (navigatedByTouchRef.current) {
                                navigatedByTouchRef.current = false;
                                return;
                            }
                            launchToAgent();
                        }}
                        onTouchEnd={(e) => {
                            if (e?.cancelable) e.preventDefault();
                            navigatedByTouchRef.current = true;
                            launchToAgent();
                        }}
                        aria-label="Abrir Chagra IA"
                        title="Abrir Chagra IA"
                        className="agentport-open"
                    >
                        <ChagraAgentAvatar size={48} state="idle" ariaLabel="Chagra IA" />
                    </button>

                    <div className="agentport-mode" role="tablist" aria-label="Nivel de respuestas">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={!expertoActive}
                            onClick={() => setNivelRespuestas('simple')}
                            className={!expertoActive ? 'is-active' : ''}
                        >
                            🌾 Campesino
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={expertoActive}
                            onClick={() => setNivelRespuestas('detallado')}
                            className={expertoActive ? 'is-active' : ''}
                        >
                            🔬 Experto
                        </button>
                    </div>

                    {/* Engranaje de perfil REMOVIDO (operador 2026-06-06): era
                        redundante — el ícono de usuario del TopBar ya abre el menú
                        con Ajustes/Salir. */}

                    {/* Campana de alertas/tareas — import del demo biopunk.
                        Badge = alertas activas + tareas de campo + sync con
                        errores. Solo con estilo 'demo' (es LA campana única;
                        con 'actual' la única es la del TopBar). */}
                    {showHeroBell && (
                        <button
                            type="button"
                            onClick={toggleNotif}
                            aria-label="Alertas y tareas pendientes"
                            aria-expanded={notifOpen}
                            className={[
                                'agentport-bell',
                                notifOpen ? 'is-open' : '',
                                notifCount > 0 ? 'has-items' : '',
                            ].join(' ')}
                        >
                            <span className="bicon" aria-hidden="true">🔔</span>
                            {notifCount > 0 && <span className="badge">{notifCount}</span>}
                        </button>
                    )}
                </div>
            </header>

            {/* ============ PANEL DE ALERTAS / TAREAS (demo biopunk) ============ */}
            {showHeroBell && notifOpen && (
                <section className="agentport-notif" aria-label="Alertas y tareas de campo">
                    <div className="nph">
                        <div className="nt">🔔 Alertas y tareas</div>
                        <button
                            type="button"
                            className="nclose"
                            aria-label="Cerrar alertas"
                            onClick={() => setNotifOpen(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="agentport-notif-body">
                        <div className="nsec">Alertas ambientales</div>
                        {activeAlerts.length === 0 && (
                            <p className="nempty">Sin alertas ambientales por ahora.</p>
                        )}
                        {activeAlerts.map((a) => (
                            <div
                                key={a.type || a.title}
                                className={['nitem', a.severity === 'danger' ? 'is-danger' : ''].join(' ')}
                            >
                                <span className="nico" aria-hidden="true">{a.icon || '⚠️'}</span>
                                <span className="ntxt">
                                    <span className="ntit">{a.title}</span>
                                    {a.message && <span className="nmeta">{a.message}</span>}
                                </span>
                            </div>
                        ))}
                        {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- TODO: migrate to messages.js (ADR-050) */}
                        <div className="nsec">Tareas de campo</div>
                        {pendingTasks.length === 0 && (
                            <p className="nempty">No tienes tareas de campo pendientes.</p>
                        )}
                        {pendingTasks.map((t) => (
                            <div
                                key={t.id || t.title}
                                className={[
                                    'nitem',
                                    t.severity === 'critical' || t.severity === 'high' ? 'is-danger' : '',
                                ].join(' ')}
                            >
                                <span className="nico" aria-hidden="true">🧑‍🌾</span>
                                <span className="ntxt">
                                    <span className="ntit">{t.title}</span>
                                    {t.deadline && (
                                        <span className="nmeta"><span className="due">{t.deadline}</span></span>
                                    )}
                                </span>
                            </div>
                        ))}
                        {/* Errores reales de sincronización (quarantine) — al ser
                            esta la campana única, el estado de sync de la
                            campanita clásica vive aquí (operador 2026-06-11). */}
                        {failedTxCount > 0 && (
                            <>
                                <div className="nsec">Cambios por subir</div>
                                <div className="nitem is-danger">
                                    <span className="nico" aria-hidden="true">📡</span>
                                    <span className="ntxt">
                                        <span className="ntit">
                                            {failedTxCount === 1
                                                ? '1 cambio no se pudo subir todavía'
                                                : `${failedTxCount} cambios no se pudieron subir todavía`}
                                        </span>
                                        <span className="nmeta">Tus datos siguen guardados en el teléfono. Revisa la conexión e intenta de nuevo.</span>
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="agentport-notif-foot">
                        Lo clave te lo digo en el saludo. Aquí guardo <b>el resto</b>.
                    </div>
                </section>
            )}

            <div className={['agentport-hero-body', menuOpen && !menuClosing ? 'is-open' : ''].join(' ')}>
                {/* ============ ZONA-RESPIRO (escena detrás · red Ⓐ al abrir) ============
                    Con el menú abierto, la red de capacidades BROTA aquí mismo —
                    integrada al lienzo del hero, sin sheet ni scrim. */}
                <div
                    className={['agentport-stage', menuOpen && !menuClosing ? 'is-open' : ''].join(' ')}
                    aria-hidden={menuOpen ? undefined : 'true'}
                >
                    {menuOpen && (
                        <div
                            className={['agentport-redpanel', menuClosing ? 'is-closing' : ''].join(' ')}
                            role="group"
                            aria-label="Capacidades de Chagra"
                        >
                            <div className="agentport-red-h">
                                <span className="t">La mano de Chagra</span>
                                <span className="s">
                                    {expertoActive
                                        ? 'Cada rama, una capacidad conectada. Las opacas están por llegar.'
                                        : 'Mi mano en tu campo: cada rama es una ayuda. Las opacas llegan pronto.'}
                                </span>
                            </div>
                            <div className="agentport-red-body">
                                <AgentRedMenu onPick={pickCapability} disabled={busy} anchorRef={aButtonRef} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="agentport-content">
                    {/* ======= SALUDO + ALERTA + CHIPS (se pliegan al abrir el menú Ⓐ) ======= */}
                    <div className={['agentport-foldaway', menuOpen && !menuClosing ? 'is-folded' : ''].join(' ')}>
                    <div className="agentport-foldaway-in">
                    {/* ===================== SALUDO ===================== */}
                    <div className="agentport-greet">
                        <h2 className="agentport-hi">
                            {greetingForNow(nivel)}<br />Soy <span className="chagra-wordmark">Chagra</span>.
                        </h2>
                        {/* Sugerencia contextual ROTATIVA bajo "Soy Chagra": si el usuario
                            tiene cultivos registrados, mostramos un consejo agronómico
                            determinístico (cultivo × mes × piso térmico) que rota cada 5s.
                            Si no tiene cultivos, cae al subtítulo genérico de siempre. */}
                        {cropSuggestions.length > 0 ? (
                            <p
                                className="agentport-sub"
                                key={suggestionIdx}
                                aria-live="polite"
                                data-testid="agentport-suggestion"
                            >
                                {cropSuggestions[suggestionIdx % cropSuggestions.length]}
                            </p>
                        ) : (
                            <p className="agentport-sub">
                                {expertoActive ? SUB_EXPERTO : SUB_CAMPESINO}
                            </p>
                        )}
                    </div>

                    {/* CHIP DE ALERTA real (clima/helada). Solo si el estilo de
                        notificación es 'demo' (default) y hay una alerta activa. En
                        'actual' la campanita del TopBar la cubre. */}
                    {showAlertChip && (
                        <div
                            className={['agentport-alert', topAlert.severity === 'danger' ? 'is-danger' : ''].join(' ')}
                            role="status"
                            data-testid="agentport-alert"
                        >
                            <span className="ico" aria-hidden="true">⚠️</span>
                            <span className="txt">
                                <span className="at">{topAlert.title}</span>
                                {topAlert.message && <span className="am">{topAlert.message}</span>}
                            </span>
                        </div>
                    )}

                    {/* ===================== CHIPS ===================== */}
                    <div className="agentport-chiprow">
                        {QUICK_CHIPS.map((chip) => (
                            <button
                                key={chip.label}
                                type="button"
                                onClick={() => handleChipSend(chip.prompt)}
                                disabled={busy}
                                className="agentport-chip"
                            >
                                <span aria-hidden="true" className="agentport-chip-e">{chip.icon}</span>
                                {chip.label}
                            </button>
                        ))}
                    </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* ===================== COMPOSITOR MULTIMODAL ===================== */}
            <div className="agentport-composer">
                <div
                    className={[
                        'agentport-bar relative overflow-hidden flex-col !items-stretch',
                        isRecording ? 'is-recording' : '',
                        phase === 'sending' ? 'chagra-composer-shimmer chagra-composer-sending' : '',
                    ].join(' ')}
                >
                    {/* Preview del adjunto en staging */}
                    {attachment && (
                        <div className="flex items-center gap-3 px-2 pt-1.5">
                            {attachment.previewUrl ? (
                                <img
                                    src={attachment.previewUrl}
                                    alt="Foto adjunta"
                                    className="w-14 h-14 rounded-xl object-cover border border-[rgb(var(--c-surface-border))]"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-[rgb(var(--c-surface-card))] border border-[rgb(var(--c-surface-border))] flex items-center justify-center">
                                    <Camera size={20} className="text-[rgb(var(--c-slate-400))]" aria-hidden="true" />
                                </div>
                            )}
                            <span className="flex-1 text-xs text-[rgb(var(--c-slate-300))] truncate">
                                {attachment.kind === 'photo' ? 'Foto lista para enviar' : attachment.fileName}
                            </span>
                            <button
                                type="button"
                                onClick={clearAttachment}
                                aria-label="Quitar adjunto"
                                className="shrink-0 w-7 h-7 rounded-full bg-[rgb(var(--c-surface-card))] border border-[rgb(var(--c-surface-border))] hover:border-[rgb(var(--t-accent-rgb)/0.5)] flex items-center justify-center text-[rgb(var(--c-slate-400))]"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {/* Fila 1: texto (o estado grabando) */}
                    {isRecording ? (
                        <div className="flex items-center gap-3 px-3 py-3 min-h-[52px]">
                            <span className="relative flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                            </span>
                            {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- TODO: migrate to messages.js (ADR-050) */}
                            <span className="flex-1 text-base text-rose-500 font-medium tabular-nums">
                                Grabando… {recSeconds}s
                            </span>
                            <span
                                aria-hidden="true"
                                className="h-6 w-1.5 rounded-full bg-rose-400 origin-bottom transition-transform"
                                style={{ transform: `scaleY(${Math.max(0.2, Math.min(1, audioLevel || 0.2))})` }}
                            />
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => { setText(e.target.value); autoGrow(e.target); }}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder={attachment ? 'Añade una nota a tu foto (opcional)…' : 'Pregúntale a Chagra…'}
                            aria-label="Escribe tu pregunta al agente"
                            className="w-full bg-transparent resize-none px-3 py-3 text-base text-[rgb(var(--c-slate-100))] placeholder:text-[rgb(var(--c-slate-500))] focus:outline-none leading-snug"
                            disabled={busy}
                        />
                    )}

                    {/* Fila 2: Ⓐ a la izquierda · cámara/adjuntar · mic/enviar a la derecha */}
                    <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                        {/* Botón Ⓐ — despliega/pliega la red de capacidades EN el
                            hero. Es LA raíz de la red (única Ⓐ): el menú lee su
                            posición vía aButtonRef y las ramas brotan de aquí. */}
                        <button
                            type="button"
                            ref={aButtonRef}
                            onClick={toggleMenu}
                            disabled={isRecording}
                            aria-label="Ver todo lo que puede hacer Chagra"
                            aria-expanded={menuOpen && !menuClosing}
                            className={['agentport-iconbtn agentport-tool !w-11 !h-11', menuOpen && !menuClosing ? 'is-open' : ''].join(' ')}
                        >
                            {/* key={theme}: al cambiar el tema el ícono se REMONTA →
                                corre el markSwap del demo (y la "forja" de la Ⓐ de
                                herramientas vuelve a dibujarse trazo a trazo). */}
                            <span
                                key={theme}
                                className={['agentport-tool-ico', themeSwapped ? 'agentport-swap' : ''].join(' ')}
                                aria-hidden="true"
                            >
                                {iconForTheme(theme)}
                            </span>
                        </button>

                        {/* Cámara / foto — toma una foto O elige de la galería.
                            B2: solo imágenes (el agente solo "ve" fotos). El botón
                            de adjuntar (clip) se quitó (operador 2026-06-06): la
                            cámara ya cubre tomar foto y galería. */}
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={busy || isRecording}
                            aria-label="Tomar o elegir foto"
                            className="agentport-iconbtn !w-10 !h-10"
                        >
                            <Camera size={19} aria-hidden="true" />
                        </button>

                        <div className="flex-1" />

                        {/* Micrófono (toggle grabar/detener) */}
                        <button
                            type="button"
                            onClick={handleMic}
                            disabled={busy}
                            aria-label={isRecording ? 'Detener y enviar audio' : 'Grabar audio'}
                            aria-pressed={isRecording}
                            className={['agentport-iconbtn !w-11 !h-11', isRecording ? 'agentport-mic-on' : ''].join(' ')}
                        >
                            {isRecording ? <Square size={16} strokeWidth={2.5} aria-hidden="true" /> : <Mic size={18} strokeWidth={2.5} aria-hidden="true" />}
                        </button>

                        {/* Enviar — usa el mismo colibrí foto/video del FAB global.
                            Comportamiento del demo: con el campo VACÍO no se apaga;
                            tocarlo abre el menú didáctico de capacidades. */}
                        <button
                            type="button"
                            onClick={handleSendText}
                            disabled={busy || isRecording}
                            aria-label="Enviar al agente"
                            className={['agentport-send', canSend ? 'agent-send-accent' : ''].join(' ')}
                            style={{
                              width: '44px',
                              height: '44px',
                              padding: '0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}
                        >
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                              <ChagraAgentAvatar size={44} state={canSend ? 'idle' : 'listening'} ariaLabel="Enviar al agente" />
                            </div>
                        </button>
                    </div>

                    {/* Input oculto de foto — solo imágenes (B2). SIN `capture`:
                        permite tomar foto O elegir de la galería (operador
                        2026-06-06). */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoPick}
                    />
                </div>

                {/* Hint bajo la pill (réplica de .hintbar del demo). Con la red
                    abierta muta a la línea de fuentes (antes pie del sheet). */}
                {!isRecording && !attachment && (
                    <p className="agentport-hint">
                        {menuOpen && !menuClosing ? (
                            <>Chagra responde con información de <b>AGROSAVIA</b>, <b>ICA</b> e <b>IDEAM</b>.</>
                        ) : (
                            <>Toca <b>Ⓐ</b> para ver todo lo que sé hacer, o escríbeme aquí</>
                        )}
                    </p>
                )}

                {recorderError && (
                    <p className="mt-2 text-xs text-rose-500 px-1" role="alert">
                        No pude acceder al micrófono. Revisa los permisos.
                    </p>
                )}

                {pickError && (
                    <p className="mt-2 text-xs text-[rgb(160,76,20)] px-1" role="alert">
                        {pickError}
                    </p>
                )}
            </div>

            {/* Scroll-down indicator: muestra al operador que hay modulos debajo.
                Solo visible cuando el agente esta idle (sin conversacion activa).
                Fix para bug reportado 3 veces: el operador no veia los botones
                de modulos porque AgentHero ocupaba 100dvh. */}
            {phase === 'idle' && (
                <button
                    type="button"
                    onClick={() => {
                        const target = document.querySelector('[data-testid="seguimiento-cards"]');
                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="agentport-scrollcue"
                    aria-label="Ver modulos del home"
                >
                    <div className="flex flex-col items-center gap-1">
                        <span>Mis modulos</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>
                </button>
            )}

        </section>
    );
}
