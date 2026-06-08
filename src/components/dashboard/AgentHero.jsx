import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Camera, X } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { captureAndCompress } from '../../services/photoService';
import { isAnalyzableImageAttachment } from '../../services/agentOutboxAttachment';
import useAgentOutboxStore from '../../store/useAgentOutboxStore';
import useAssetStore from '../../store/useAssetStore';
import useAlertStore from '../../store/useAlertStore';
import { agentSounds } from '../../services/agentSoundService';
import { AGENT_HERO_CHIPS } from '../../data/exampleQuestions';
import { useTheme } from '../../hooks/useTheme';
import {
    getProfile,
    saveProfile,
    getNotificationStyle,
} from '../../services/userProfileService';
import { buildCropSuggestions } from '../../data/cropSuggestions';
import { iconForTheme } from './themeIcon';
import ChagraAgentAvatar from '../ChagraAgentAvatar';

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
 *   │  │ Ⓐ            📷 📎      🎤  ⬆          │  │   Ⓐ (izq) abre el menú de
 *   │  ╰───────────────────────────────────────╯  │   capacidades (bottom-sheet)
 *   └─────────────────────────────────────────────┘
 *
 * QUÉ ES FIEL AL DEMO:
 *   - Escena nature: sol radial + montañas en 3 capas (paths exactos del demo,
 *     fill #cbb992/#a98f64/#7d6a45) + polen + colibrí 2D (SVG del demo, ocre/teal).
 *   - Escena biopunk: void + grid de circuito + grafo VIVO (aristas que se
 *     "cablean", nodos que pulsan, corriente/sparks) + micelio/raíces + esporas
 *     + colibrí 2D. TODO portado del demo biopunk.
 *   - Escena minimal: trazo botánico monoline que se dibuja + horizonte fino +
 *     un toque verde tenue (sobrio, sin montañas ni grafo).
 *   - El colibrí 2D vuela en los TRES temas.
 *   - Ícono del tema (THEMES[tema].icon del demo) en la marca y en el botón Ⓐ.
 *   - Toggle Campesino/Experto cableado al motor REAL `nivel_respuestas`
 *     (simple/detallado en userProfileService) — mueve el perfil de verdad y
 *     cambia el saludo, como el demo (COPY.campesino/experto).
 *   - Botón Ⓐ a la izquierda del compositor abre un bottom-sheet (.sheet del
 *     demo) con TODAS las capacidades reales de Chagra, cada una con su routing.
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
// Noche = antes de las 6am o desde las 7pm. Puro, fácil de testear vía hora.
function isNightNow(hour) {
    const h = Number.isInteger(hour)
        ? hour
        : (typeof Date !== 'undefined' ? new Date().getHours() : 9);
    return h < 6 || h >= 19;
}

// Colibrí 2D del demo (SVG .hummer). Se usa tanto en la escena ambiente (vuela)
// como DENTRO del botón de enviar (operador 2026-06-06: "el colibrí es enviar").
// Se factoriza para que ambos usos compartan exactamente el mismo trazo.
function HummerSvg({ width = 62, height = 46, flap = true }) {
    return (
        <svg width={width} height={height} viewBox="0 0 62 46" aria-hidden="true">
            {/* cuerpo */}
            <ellipse cx="34" cy="28" rx="11" ry="6.5" fill="#2f7d6b" />
            <ellipse cx="34" cy="27" rx="9" ry="4.2" fill="#3fa489" />
            {/* cabeza */}
            <circle cx="46" cy="24" r="6" fill="#2a6f60" />
            <circle cx="48.5" cy="22.5" r="1.4" fill="#11332c" />
            {/* gorguera roja */}
            <path d="M44 28 q5 2 8 0 q-3 4 -8 3 z" fill="#d05038" />
            {/* pico largo */}
            <path d="M52 24 L62 19" stroke="#3a2a18" strokeWidth="2" strokeLinecap="round" />
            {/* cola */}
            <path d="M23 28 L8 22 M23 30 L8 32" stroke="#256155" strokeWidth="3" strokeLinecap="round" />
            {/* ala (animada solo cuando vuela en la escena) */}
            <g className={flap ? 'wing' : undefined}>
                <path d="M30 24 C18 6 6 8 2 16 C12 18 22 24 30 30 Z" fill="#4fb89a" opacity=".9" />
            </g>
        </svg>
    );
}

// Saludos por hora del día. En modo "experto" (nivel detallado) el demo abre
// con "Hola." en vez de "Buenos días." (COPY.experto.greetHi). Replicamos.
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

/**
 * CAPACIDADES de Chagra para el menú Ⓐ (bottom-sheet .sheet del demo).
 *
 * Son las capacidades REALES de la app — derivadas de los chips del home
 * (AGENT_HERO_CHIPS), de lo que el agente SÍ sabe hacer (HelpAgentSection) y de
 * las tools del catálogo. Cada una declara su `route`:
 *   - kind 'ask'   → envía un prompt por la outbox real → AgentScreen (mismo
 *                    camino que escribir/enviar). Es lo que el demo simula.
 *   - kind 'nav'   → navega a una pantalla dedicada existente (voz, activos…).
 *   - kind 'photo' → abre el selector de foto del compositor (visión del agente).
 *
 * El operador pidió incluir explícitamente "agregar planta por voz o foto".
 * `tool` es la etiqueta técnica (visible en modo experto), igual que el demo.
 */
const CAPABILITIES = [
    {
        id: 'siembra', icon: '🌱',
        title: '¿Qué siembro?',
        desc: 'Qué sembrar según tu clima y tu altura.',
        tool: 'get_species',
        route: { kind: 'ask', prompt: '¿Qué puedo sembrar este mes en mi zona?' },
    },
    {
        id: 'plaga', icon: '🐛',
        title: 'Plaga',
        desc: 'Controlar una plaga sin veneno.',
        tool: 'get_pest_controllers',
        route: { kind: 'ask', prompt: '¿Cómo controlo plagas sin químicos?' },
    },
    {
        id: 'bio', icon: '🧪',
        title: 'Biopreparado',
        desc: 'Receta casera para fortalecer tu cultivo.',
        tool: 'get_biopreparados',
        route: { kind: 'ask', prompt: '¿Cómo hago un biopreparado para fortalecer mis matas?' },
    },
    {
        id: 'foto', icon: '📷',
        title: 'Agregar planta por foto',
        desc: 'Tómale una foto y la identifico y registro.',
        tool: 'vision_identify',
        route: { kind: 'photo' },
    },
    {
        id: 'voz', icon: '🎤',
        title: 'Agregar planta por voz',
        desc: 'Dime qué sembraste y lo registro en tu finca.',
        tool: 'voice_capture',
        route: { kind: 'nav', view: 'voz' },
    },
    {
        id: 'clima', icon: '🌦️',
        title: 'Clima',
        desc: 'El clima de tu finca esta semana.',
        tool: 'get_clima',
        route: { kind: 'ask', prompt: 'Dame el reporte del clima de mi zona esta semana.' },
    },
    {
        id: 'cal', icon: '📅',
        title: 'Calendario',
        desc: 'Cuándo sembrar y cuándo cosechar.',
        tool: 'get_calendario',
        route: { kind: 'ask', prompt: '¿Cuándo siembro y cuándo cosecho en mi zona?' },
    },
    {
        id: 'plantas', icon: '🌿',
        title: 'Mis plantas',
        desc: 'Ver y manejar lo que tienes en la finca.',
        tool: 'assets',
        route: { kind: 'nav', view: 'activos' },
    },
];

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
    // Menú Ⓐ (bottom-sheet de capacidades). false=cerrado | true=abierto.
    const [sheetOpen, setSheetOpen] = useState(false);
    // Nivel de respuestas del perfil (campesino=simple / experto=detallado).
    // Lo leemos del perfil real al montar; el toggle lo persiste de verdad.
    const [nivel, setNivel] = useState(() => {
        const v = getProfile()?.nivel_respuestas;
        return v === 'detallado' ? 'detallado' : 'simple';
    });

    const textareaRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Sistema de temas REAL de la app (data-theme en <html>, persiste en
    // localStorage). Aquí solo LEEMOS el tema para pintar el ícono de la marca
    // y del botón Ⓐ; el switcher completo vive en Perfil → Apariencia.
    const { theme } = useTheme();

    // ── Escena: sol de día / luna de noche (operador 2026-06-06) ──────────────
    const night = isNightNow();

    // ── Perfil real para sugerencias contextuales ─────────────────────────────
    const profile = getProfile();
    const altitud = profile?.finca_altitud || profile?.altitud || null;

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
    // Preferencia de estilo: 'demo' (chip, default) | 'actual' (campanita del
    // TopBar). En 'actual' NO pintamos el chip aquí (la campanita ya lo cubre).
    const notifStyle = getNotificationStyle();
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
        if (!trimmed) return;
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

    // ── Menú Ⓐ (bottom-sheet de capacidades) ─────────────────────────────────
    const toggleSheet = () => setSheetOpen((o) => !o);
    const closeSheet = () => setSheetOpen(false);

    // Despacha una capacidad del sheet a su routing real.
    const pickCapability = (cap) => {
        closeSheet();
        const r = cap.route;
        if (r.kind === 'ask') {
            handleChipSend(r.prompt);
        } else if (r.kind === 'nav') {
            try { agentSounds.start(); } catch { /* opcional */ }
            onNavigate?.(r.view);
        } else if (r.kind === 'photo') {
            // Abre el selector de foto del compositor (visión del agente). El
            // usuario elige/toma la foto y la envía como item 'photo'.
            cameraInputRef.current?.click();
        }
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
            setPickError('No pude procesar esa foto. Inténtalo de nuevo con otra imagen.');
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
            className="agentport agentport-immersive relative w-full flex flex-col"
            data-nivel={nivel}
        >
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
                    top: 8%;
                    left: 25%;
                    transform: translateX(-50%);
                    width: 240px;
                    height: 240px;
                    border-radius: 50%;
                    background: radial-gradient(
                        circle,
                        rgba(255, 244, 214, 0.95) 0%,
                        rgba(255, 230, 168, 0.55) 45%,
                        rgba(255, 214, 140, 0) 72%
                    );
                    filter: blur(0.3px);
                    animation: agentport-sun-glow 9s ease-in-out infinite;
                    display: none;
                }
                [data-theme="nature"] .agentport-scene.is-day .agentport-sun { display: block; }
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
                    top: 11%;
                    right: 14%;
                    width: 46px;
                    height: 46px;
                    z-index: 1;
                    opacity: .9;
                    filter: drop-shadow(0 0 10px rgba(255, 236, 180, .35));
                    animation: agentport-astro-breathe 8s ease-in-out infinite;
                }
                .agentport-astro.is-moon { filter: drop-shadow(0 0 10px rgba(200, 220, 255, .35)); }
                [data-theme="nature"] .agentport-astro.is-day { display: none; } /* nature ya tiene el sol radial grande de día */
                .agentport-astro svg { width: 100%; height: 100%; display: block; }
                @keyframes agentport-astro-breathe {
                    0%, 100% { opacity: .85; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.04); }
                }

                /* — MONTAÑAS 3 capas (nature) — paths exactos del demo. La
                   banda de silueta se ancla en el tercio inferior de la
                   zona-respiro (bottom ~30%) para que las cumbres asomen sobre
                   el saludo, como el horizonte del demo, en vez de quedar
                   enterradas al fondo de la pantalla detrás del compositor. */
                .agentport-mtn {
                    position: absolute;
                    left: 0; right: 0; bottom: 30%;
                    height: 230px;
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
                [data-theme="biopunk"] .agentport-bp { display: block; }

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

                /* ===== COLIBRÍ 2D — vuela en los 3 temas ===== */
                /* El SVG base es ocre/teal (nature). En bio-punk recibe un glow
                   neón vía drop-shadow; en minimal queda tenue/sobrio. */
                .agentport-hummer {
                    position: absolute; top: 28%; left: 16%; z-index: 2;
                    animation: agentport-fly 18s cubic-bezier(.22,.61,.36,1) infinite;
                    transform-origin: center; will-change: transform;
                }
                .agentport-hummer svg { display: block; filter: drop-shadow(0 6px 6px rgba(90,60,20,.18)); }
                /* bio-punk = tema base (sin data-theme): glow neón teal */
                .agentport-hummer svg { filter: drop-shadow(0 0 8px rgba(25,201,154,.7)) drop-shadow(0 0 16px rgba(25,240,192,.35)); }
                [data-theme="nature"] .agentport-hummer svg { filter: drop-shadow(0 6px 6px rgba(90,60,20,.18)); }
                [data-theme="minimalista"] .agentport-hummer { opacity: .85; }
                [data-theme="minimalista"] .agentport-hummer svg { filter: drop-shadow(0 4px 5px rgba(31,36,33,.14)); }
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
                    text-transform: uppercase; color: rgb(var(--t-accent-rgb)); margin-top: -1px;
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
                    color: rgb(var(--c-slate-400));
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

                /* ===================== ZONA-RESPIRO ===================== */
                /* Espacio "respiro" donde vive la escena (sol/montañas/grafo/
                   colibrí). Sin avatar 3D: el protagonista es el colibrí 2D. */
                .agentport-stage {
                    position: relative;
                    z-index: 1;
                    flex: 1 1 auto;
                    min-height: 180px;
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
                    color: rgb(var(--c-slate-300)); max-width: 34ch;
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
                .agentport-composer { position: relative; z-index: 1; flex: none; }
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
                .agentport-tool.is-open {
                    background: rgb(var(--t-accent-rgb)); border-color: rgb(var(--t-accent-rgb));
                    animation: none;
                }
                /* al abrir, el ícono se vuelve blanco para contrastar con el acento */
                .agentport-tool.is-open .agentport-tool-ico path,
                .agentport-tool.is-open .agentport-tool-ico line { stroke: #fff; }
                .agentport-tool.is-open .agentport-tool-ico circle[fill] { fill: #fff; }
                @keyframes agentport-pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0.45); }
                    70% { box-shadow: 0 0 0 12px rgb(var(--t-accent-rgb) / 0); }
                    100% { box-shadow: 0 0 0 0 rgb(var(--t-accent-rgb) / 0); }
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
                .agentport-hint b { color: rgb(var(--t-accent-rgb)); font-weight: 700; }

                /* ===================== BOTTOM SHEET (menú Ⓐ) ===================== */
                .agentport-scrim {
                    position: fixed; inset: 0; background: rgba(10, 8, 4, 0.5);
                    backdrop-filter: blur(2px); opacity: 0; pointer-events: none;
                    transition: opacity 0.42s cubic-bezier(.32,.72,0,1); z-index: 60;
                }
                .agentport-scrim.is-open { opacity: 1; pointer-events: auto; }
                .agentport-sheet {
                    position: fixed; left: 0; right: 0; bottom: 0; z-index: 61;
                    max-width: 640px; margin: 0 auto;
                    background: rgb(var(--c-surface-raised));
                    border-radius: 26px 26px 0 0;
                    box-shadow: 0 -16px 40px -16px rgba(0, 0, 0, 0.55);
                    border-top: 1px solid rgb(var(--c-surface-border));
                    transform: translateY(110%); transition: transform 0.5s cubic-bezier(.32,.72,0,1);
                    max-height: 84dvh; display: flex; flex-direction: column; will-change: transform;
                }
                .agentport-sheet.is-open { transform: translateY(0); }
                .agentport-grab { width: 42px; height: 5px; background: rgb(var(--c-surface-border)); border-radius: 5px; margin: 10px auto 4px; flex: none; }
                .agentport-sheet-h { padding: 6px 22px 4px; text-align: center; flex: none; }
                .agentport-sheet-h .t { font-size: 1.18rem; font-weight: 800; color: rgb(var(--c-slate-100)); letter-spacing: -.01em; }
                .agentport-sheet-h .s { font-size: .86rem; color: rgb(var(--c-slate-300)); margin-top: 4px; line-height: 1.45; }
                [data-nivel="detallado"] .agentport-sheet-h .s { font-size: .8rem; }
                .agentport-caps {
                    padding: 12px 16px 8px; overflow-y: auto; -webkit-overflow-scrolling: touch;
                    display: flex; flex-direction: column; gap: 9px; overscroll-behavior: contain;
                }
                .agentport-cap {
                    display: flex; align-items: flex-start; gap: 13px; width: 100%; font: inherit; text-align: left;
                    background: rgb(var(--c-surface-card)); border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 18px; padding: 13px 14px; cursor: pointer;
                    transition: transform .16s cubic-bezier(.22,.61,.36,1), background .18s ease, box-shadow .2s ease, border-color .2s ease;
                    box-shadow: 0 3px 10px -7px rgba(0,0,0,.5);
                }
                [data-theme="minimalista"] .agentport-cap { border-radius: 14px; }
                .agentport-cap:active { transform: scale(.98); }
                .agentport-cap:hover { border-color: rgb(var(--t-accent-rgb) / 0.45); box-shadow: 0 0 18px -7px rgb(var(--t-accent-rgb) / 0.5); }
                .agentport-cap:disabled { opacity: .55; cursor: not-allowed; }
                .agentport-cap .ico {
                    width: 46px; height: 46px; flex: none; border-radius: 13px;
                    display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
                    background: rgb(var(--t-accent-rgb) / 0.12); border: 1px solid rgb(var(--t-accent-rgb) / 0.22);
                }
                .agentport-cap .txt { flex: 1; min-width: 0; }
                .agentport-cap .ct { font-weight: 800; font-size: .98rem; color: rgb(var(--c-slate-100)); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
                .agentport-cap .cd { font-size: .86rem; color: rgb(var(--c-slate-300)); line-height: 1.4; margin-top: 2px; }
                /* etiqueta técnica de la tool: solo experto (nivel detallado) */
                .agentport-cap .tool-id { display: none; font-size: .66rem; font-weight: 700; color: rgb(var(--t-accent-rgb)); margin-top: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
                [data-nivel="detallado"] .agentport-cap .tool-id {
                    display: inline-block; background: rgb(var(--t-accent-rgb) / 0.08);
                    border: 1px solid rgb(var(--t-accent-rgb) / 0.2); padding: 2px 7px; border-radius: 7px;
                }
                .agentport-cap .arrow { align-self: center; color: rgb(var(--t-accent-rgb)); font-size: 1.1rem; flex: none; transition: transform .16s ease; }
                .agentport-cap:active .arrow { transform: translateX(2px); }
                .agentport-sheet-foot { padding: 6px 22px calc(18px + env(safe-area-inset-bottom)); text-align: center; font-size: .72rem; color: rgb(var(--c-slate-500)); flex: none; }
                .agentport-sheet-foot b { color: rgb(var(--t-accent-rgb)); }

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
                    .agentport-greet { animation: none !important; }
                    .chagra-composer-shimmer::after, .chagra-composer-sending { animation: none !important; }
                }
            `}</style>

            {/* ===================== ESCENA AMBIENTE (por tema) ===================== */}
            <div
                className={['agentport-scene', night ? 'is-night' : 'is-day'].join(' ')}
                aria-hidden="true"
            >
                {/* — SOL/LUNA delicado, universal, según hora (operador 2026-06-06) — */}
                <div className={['agentport-astro', night ? 'is-moon' : 'is-day'].join(' ')}>
                    {night ? (
                        <svg viewBox="0 0 64 64" aria-hidden="true">
                            {/* luna creciente delicada */}
                            <defs>
                                <radialGradient id="ap-moon" cx="42%" cy="38%" r="65%">
                                    <stop offset="0%" stopColor="#fdfbf2" />
                                    <stop offset="100%" stopColor="#d9e2f2" />
                                </radialGradient>
                            </defs>
                            <path
                                d="M44 8 a26 26 0 1 0 12 40 a20 20 0 1 1 -12 -40 z"
                                fill="url(#ap-moon)"
                            />
                            <circle cx="28" cy="24" r="2.2" fill="#cfd8ea" opacity=".7" />
                            <circle cx="22" cy="38" r="1.6" fill="#cfd8ea" opacity=".55" />
                            <circle cx="33" cy="42" r="1.3" fill="#cfd8ea" opacity=".5" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 64 64" aria-hidden="true">
                            {/* sol delicado con rayos finos */}
                            <defs>
                                <radialGradient id="ap-sun" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#fff3cf" />
                                    <stop offset="100%" stopColor="#f5b733" />
                                </radialGradient>
                            </defs>
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
                        </svg>
                    )}
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

                {/* — COLIBRÍ 2D — vuela en los 3 temas (SVG del demo nature) — */}
                <div className="agentport-hummer">
                    <HummerSvg />
                </div>
            </div>

            {/* ===================== TOGGLE Campesino/Experto ===================== */}
            <header className="agentport-topbar">
                <div className="agentport-headtools">
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
                </div>
            </header>

            {/* ===================== ZONA-RESPIRO (escena vive detrás) ===================== */}
            <div className="agentport-stage" aria-hidden="true" />

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
                        {/* Botón Ⓐ — abre el menú de capacidades (bottom-sheet) */}
                        <button
                            type="button"
                            onClick={toggleSheet}
                            disabled={isRecording}
                            aria-label="Ver todo lo que puede hacer Chagra"
                            aria-expanded={sheetOpen}
                            className={['agentport-iconbtn agentport-tool !w-11 !h-11', sheetOpen ? 'is-open' : ''].join(' ')}
                        >
                            <span className="agentport-tool-ico" aria-hidden="true">{iconForTheme(theme)}</span>
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

                        {/* Enviar — usa el mismo colibrí foto/video del FAB global. */}
                        <button
                            type="button"
                            onClick={handleSendText}
                            disabled={!canSend}
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
                              <ChagraAgentAvatar size={38} state={canSend ? 'idle' : 'listening'} ariaLabel="Enviar al agente" />
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

                {/* Hint bajo la pill (réplica de .hintbar del demo). */}
                {!isRecording && !attachment && (
                    <p className="agentport-hint">
                        Toca <b>Ⓐ</b> para ver todo lo que sé hacer, o escríbeme aquí
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

            {/* ===================== SCRIM + BOTTOM SHEET (menú Ⓐ) ===================== */}
            <div
                className={['agentport-scrim', sheetOpen ? 'is-open' : ''].join(' ')}
                onClick={closeSheet}
                aria-hidden="true"
            />
            <section
                className={['agentport-sheet', sheetOpen ? 'is-open' : ''].join(' ')}
                role="dialog"
                aria-modal={sheetOpen}
                aria-label="Capacidades de Chagra"
                aria-hidden={!sheetOpen}
            >
                <div className="agentport-grab" aria-hidden="true" />
                <div className="agentport-sheet-h">
                    <div className="t">¿En qué te ayudo?</div>
                    <div className="s">
                        {expertoActive
                            ? 'Capacidades enrutadas a herramientas. Toca una para empezar.'
                            : 'Toca una opción y te ayudo. Toda respuesta viene con su fuente.'}
                    </div>
                </div>
                <div className="agentport-caps">
                    {CAPABILITIES.map((cap) => (
                        <button
                            key={cap.id}
                            type="button"
                            className="agentport-cap"
                            onClick={() => pickCapability(cap)}
                            disabled={busy}
                        >
                            <span className="ico" aria-hidden="true">{cap.icon}</span>
                            <span className="txt">
                                <span className="ct">{cap.title}</span>
                                <span className="cd">{cap.desc}</span>
                                <span className="tool-id">{cap.tool}()</span>
                            </span>
                            <span className="arrow" aria-hidden="true">›</span>
                        </button>
                    ))}
                </div>
                <div className="agentport-sheet-foot">
                    Chagra responde con información de <b>AGROSAVIA</b>, <b>ICA</b> e <b>IDEAM</b>.
                </div>
            </section>
        </section>
    );
}
