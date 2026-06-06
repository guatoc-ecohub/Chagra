import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Camera, Paperclip, ArrowUp, X } from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { captureAndCompress } from '../../services/photoService';
import { isAnalyzableImageAttachment } from '../../services/agentOutboxAttachment';
import useAgentOutboxStore from '../../store/useAgentOutboxStore';
import { agentSounds } from '../../services/agentSoundService';
import { AGENT_HERO_CHIPS } from '../../data/exampleQuestions';

// 2026-05-28: el R3F (ChagraAgentAvatarColibri3D) fue retirado del flujo.
// Operador: "no me gusta nada y desatina con todo lo que ya está".
// El wrapper ChagraAgentAvatar ya delega al avatar correcto según la
// preferencia del usuario (foto-realista / SVG / maíz), así que el
// dashboard simplemente lo monta y se ahorra ~600KB del bundle de three+R3F.

/**
 * AgentHero — protagonista del dashboard. El agente Chagra como puerta de
 * entrada, AHORA con la presentación PORTADA 1:1 del demo de diseño del
 * operador (oracle-lab `demo-agente*.html`): saludo "Soy Chagra" con la
 * palabra Chagra en el acento del tema, avatar vivo, y un COMPOSITOR tipo
 * "pill" con botones circulares y un botón de enviar redondo de acento.
 *
 * Rediseño 2026-06-06 (cuarto intento — los 3 previos solo parchaban color):
 * esta vez se portó el SISTEMA DE DISEÑO real del demo, no solo tokens:
 *   - radio de la pill = --r-grande del demo (26px nature/biopunk, 22px
 *     minimalista), botones circulares 44–46px, sombra cálida suave,
 *     tipografía -apple-system/Inter, saludo a 1.9rem peso 800.
 *   - los 3 temas (nature / minimalista / biopunk-base) salen "gratis" de la
 *     indirección de color (--c-* en index.css) + el acento del tema
 *     (--t-accent-rgb en themes.css): teal / ocre / verde EXACTOS del demo.
 *
 * El WIRING multimodal se conserva intacto (era inviolable):
 *  - <textarea> auto-grow (Enter=enviar, Shift+Enter=nueva línea).
 *  - 🎤 micrófono → graba audio (useVoiceRecorder + flujo whisper del agente).
 *  - 📷 cámara/foto → toma o elige foto (photoService + visión en el agente).
 *  - 📎 adjuntar → file picker (solo imágenes — B2).
 *  - ⬆️ enviar.
 *
 * Al enviar: el item se PERSISTE en la outbox durable (IndexedDB) ANTES de
 * navegar. El AgentScreen lo consume como burbuja "ya enviada" y arranca a
 * procesar (texto→LLM, audio→transcribe, foto→visión). Si el usuario da
 * "atrás" o cierra la app a mitad → al volver el item sigue ahí y no se pierde
 * ni se duplica (ver agentOutboxService).
 *
 * Respeta prefers-reduced-motion para la transición de envío.
 */

// Saludos por hora del día (el demo abre con "Buenos días. Soy Chagra.").
function greetingForNow() {
    const h = typeof Date !== 'undefined' ? new Date().getHours() : 9;
    if (h < 12) return 'Buenos días.';
    if (h < 19) return 'Buenas tardes.';
    return 'Buenas noches.';
}

const TIPS = [
    'Pregúntame sobre tu cultivo, las plagas, el clima o los precios.',
    'Escribe, habla o muéstrame una foto de tu planta.',
    'Tomo foto, escucho y recuerdo lo que me dices.',
    'Hablo claro, como en el campo, y respeto tu tierra.',
    'Pregúntame en voz: te entiendo con tu acento.',
];

// Fuente única de los chips del home. Importada del módulo de datos compartido
// para que el test del punto de acceso #1 los cubra sin exportar constantes
// desde un componente (regla react-refresh/only-export-components).
const QUICK_CHIPS = AGENT_HERO_CHIPS;

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
}

// Duración de la transición premium de envío (shimmer + lift del compositor +
// avatar 'thinking') antes de montar el AgentScreen. 2026-05-31 el operador
// reportó que 280ms se sentía brusco/apurado — lo subimos a 520ms con easing
// suave para que se perciba especial, no atropellado. Bajo reduced-motion el
// retardo es 0 (navega de inmediato, sin animación). Exportado para tests.
export const SEND_TRANSITION_MS = 520;

export default function AgentHero({ onNavigate }) {
    const [tipIndex, setTipIndex] = useState(0);
    const [text, setText] = useState('');
    // Adjunto en staging (SIEMPRE una foto) antes de enviar. { blob, mime,
    // fileName, previewUrl, kind: 'photo' }. B2 (2026-06-02): el agente solo
    // "ve" imágenes vía visión, así que el compositor solo acepta fotos.
    const [attachment, setAttachment] = useState(null);
    // Aviso breve cuando el usuario intenta adjuntar algo que no es una imagen
    // (algunos OS ignoran `accept="image/*"` y dejan elegir cualquier archivo).
    const [pickError, setPickError] = useState('');
    const [busy, setBusy] = useState(false);
    // Fase de la transición de envío: 'idle' | 'sending'. En 'sending' el
    // compositor hace un shimmer breve y el avatar pasa a 'thinking' antes de
    // navegar — sensación de "lanzar" la consulta hacia el chat.
    const [phase, setPhase] = useState('idle');

    const textareaRef = useRef(null);
    const cameraInputRef = useRef(null);
    const fileInputRef = useRef(null);

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

    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex((i) => (i + 1) % TIPS.length);
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    // Limpia el ObjectURL del preview al desmontar o cambiar de adjunto.
    useEffect(() => {
        return () => {
            if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        };
    }, [attachment]);

    // Auto-grow del textarea: crece hasta ~5 líneas, luego scrollea.
    const autoGrow = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    };

    /**
     * Navega al agente disparando una transición premium: el avatar pasa a
     * 'thinking', el compositor hace un shimmer corto de "enviando" y luego
     * monta el AgentScreen. Respeta reduced-motion (sin retardo de animación).
     */
    const launchToAgent = () => {
        const reduce = prefersReducedMotion();
        setPhase('sending');
        try { agentSounds.start(); } catch { /* sonido opcional */ }
        const go = () => onNavigate?.('agente');
        if (reduce) {
            go();
        } else {
            // Retardo para que el shimmer del compositor + el lift + el avatar
            // thinking se perciban completos antes del cambio de pantalla. A
            // 520ms con easing suave la transición se siente premium y elegante,
            // no apurada (operador 2026-05-31).
            window.setTimeout(go, SEND_TRANSITION_MS);
        }
    };

    /**
     * Persiste la consulta en la outbox DURABLE y navega. El orden es estricto:
     * (1) persistir → (2) navegar. Si la persistencia falla NO navegamos en
     * silencio: dejamos el texto/adjunto en el compositor para que el usuario
     * reintente (cero pérdida de datos).
     */
    const send = async (payload) => {
        if (busy) return;
        setBusy(true);
        try {
            await sendToOutbox(payload);
            // Limpiar el compositor solo tras confirmar persistencia.
            setText('');
            if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
            setAttachment(null);
            launchToAgent();
        } catch (err) {
            console.error('[AgentHero] no se pudo guardar la consulta, no navego:', err);
            setBusy(false);
            // El texto/adjunto permanecen — el usuario puede reintentar.
        }
    };

    const handleSendText = () => {
        const trimmed = text.trim();
        if (attachment) {
            // Foto/archivo + caption opcional → un solo item multimodal.
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

    // ── Micrófono ────────────────────────────────────────────────────────────
    const handleMic = async () => {
        if (busy) return;
        if (isRecording) {
            const result = await stopRecord();
            if (result && result.blob) {
                // El texto escrito (si lo hay) acompaña al audio como contexto.
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

    // ── Cámara / foto ─────────────────────────────────────────────────────────
    // B2 (2026-06-02): el agente SOLO "ve" imágenes (vía visión). El botón de
    // adjuntar y el de cámara usan `accept="image/*"`, pero algunos sistemas
    // operativos ignoran ese atributo y dejan elegir cualquier archivo. Por eso
    // validamos también acá: si lo elegido NO es una imagen, NO lo dejamos en
    // staging y avisamos claro y corto, en castellano colombiano. Reusamos
    // `isAnalyzableImageAttachment` para clasificar igual que el agente.
    const handlePhotoPick = async (e, kind) => {
        const file = e.target.files && e.target.files[0];
        // Permitir re-seleccionar el mismo archivo después.
        e.target.value = '';
        if (!file) return;
        const looksLikeImage =
            (file.type && file.type.startsWith('image/')) ||
            isAnalyzableImageAttachment({ mime: file.type, fileName: file.name });
        if (!looksLikeImage) {
            // No es una foto → rechazo claro, sin staging.
            setPickError('Por ahora solo puedo ver fotos. Mándame una foto de tu planta o cultivo.');
            return;
        }
        setPickError('');
        setBusy(true);
        try {
            // Reusa la compresión/normalización HEIC→JPEG de photoService.
            const { blob, mime } = await captureAndCompress(file);
            const previewUrl = URL.createObjectURL(blob);
            setAttachment({ blob, mime, fileName: file.name || 'foto.jpg', previewUrl, kind: 'photo' });
            // Devolver foco al textarea para que pueda escribir un caption.
            requestAnimationFrame(() => textareaRef.current?.focus());
        } catch (err) {
            console.error('[AgentHero] no se pudo procesar la foto:', err);
            setPickError('No pude procesar esa foto. Inténtalo de nuevo con otra imagen.');
        } finally {
            setBusy(false);
        }
        void kind;
    };

    const clearAttachment = () => {
        if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        setAttachment(null);
        setPickError('');
    };

    const canSend = !busy && (text.trim().length > 0 || Boolean(attachment));
    const recSeconds = Math.floor((durationMs || 0) / 1000);

    return (
        <section
            aria-label="Agente Chagra"
            className="agentport relative w-full px-4 pt-6 pb-4"
        >
            <style>{`
                /* ============================================================
                   AgentHero — PORT del demo de diseño (oracle-lab demo-agente*).
                   Sistema de diseño extraído de los <style> de los 3 demos:
                     --r-grande (pill)   26px nature/biopunk · 22px minimalista
                     botones circulares  46px (44 minimalista) · enviar 42 (40)
                     fuente              -apple-system, Inter, system-ui
                     saludo              1.9rem · peso 800 (700 minimalista)
                   El acento (teal/ocre/verde) y las superficies (crema/papel/
                   panel oscuro) salen de los tokens theme-aware ya existentes
                   (--t-accent-rgb en themes.css, --c-* en index.css), así los
                   3 temas coinciden con su demo respectivo sin parchar a mano.
                   ============================================================ */
                .agentport {
                    font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, 'Segoe UI', sans-serif;
                    /* radio de la pill y de las tarjetas — valor del demo. El
                       minimalista usa 22px (más sobrio); nature/biopunk 26px. */
                    --ap-r-grande: 26px;
                }
                [data-theme="minimalista"] .agentport { --ap-r-grande: 22px; }

                /* Saludo "Buenos días. Soy Chagra." — tipografía del demo. */
                .agentport-greet {
                    margin-bottom: 14px;
                    animation: agentport-rise 0.8s cubic-bezier(0.16, 0.84, 0.3, 1) both;
                }
                .agentport-hi {
                    font-size: 1.9rem;
                    line-height: 1.12;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    color: rgb(var(--c-slate-100));
                }
                [data-theme="minimalista"] .agentport-hi {
                    font-weight: 700;
                    letter-spacing: -0.025em;
                }
                .agentport-hi .agentport-chagra { /* "Chagra" en el acento del tema */ }
                .agentport-sub {
                    margin-top: 8px;
                    font-size: 1rem;
                    line-height: 1.5;
                    color: rgb(var(--c-slate-300));
                    max-width: 32ch;
                    transition: opacity 0.5s ease;
                }
                @keyframes agentport-rise {
                    from { opacity: 0; transform: translateY(18px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Barra de entrada = pill del demo (.bar). Superficie del tema,
                   borde fino, sombra cálida suave, radio --r-grande. */
                .agentport-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgb(var(--c-surface-raised));
                    border: 1px solid rgb(var(--c-surface-border));
                    border-radius: var(--ap-r-grande);
                    padding: 7px 8px;
                    box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.28);
                    transition: border-color 0.25s ease, box-shadow 0.25s ease;
                }
                .agentport-bar.is-recording {
                    border-color: rgb(244 63 94 / 0.6);
                }
                .agentport-bar:focus-within {
                    border-color: rgb(var(--t-accent-rgb) / 0.55);
                    box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.28),
                                0 0 0 3px rgb(var(--t-accent-rgb) / 0.12);
                }

                /* Botón circular de íconos (.iconbtn del demo): 46px, superficie
                   clara/panel, borde fino. */
                .agentport-iconbtn {
                    width: 44px; height: 44px; flex: none;
                    background: rgb(var(--c-surface-card));
                    border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    color: rgb(var(--c-slate-400));
                    cursor: pointer; position: relative;
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                background 0.25s ease, border-color 0.25s ease, color 0.2s ease;
                }
                .agentport-iconbtn:hover { color: rgb(var(--c-slate-100)); border-color: rgb(var(--t-accent-rgb) / 0.5); }
                .agentport-iconbtn:active { transform: scale(0.9); }
                .agentport-iconbtn:disabled { opacity: 0.4; cursor: not-allowed; }

                /* Botón micrófono mientras graba (acento rosa del estado activo). */
                .agentport-mic-on {
                    background: rgb(244 63 94) !important;
                    border-color: rgb(244 63 94) !important;
                    color: #fff !important;
                    box-shadow: 0 4px 14px -4px rgb(244 63 94 / 0.5);
                }

                /* Botón ENVIAR redondo de acento (.send del demo) — punto focal.
                   El relleno sólido del acento + color de tinta lo aporta la
                   clase compartida .agent-send-accent (themes.css), aquí solo la
                   geometría + glow. */
                .agentport-send {
                    width: 42px; height: 42px; flex: none;
                    border: none; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                box-shadow 0.25s ease, background 0.2s ease;
                }
                .agentport-send:not(:disabled) {
                    box-shadow: 0 4px 14px -4px rgb(var(--t-accent-rgb) / 0.7);
                }
                .agentport-send:not(:disabled):active { transform: scale(0.86); }
                .agentport-send:disabled {
                    background: rgb(var(--c-slate-700));
                    color: rgb(var(--c-slate-500));
                    cursor: not-allowed;
                }

                /* Chips de atajo (.qchip del demo): pill 18px, superficie, borde. */
                .agentport-chip {
                    flex: none; display: inline-flex; align-items: center; gap: 7px;
                    background: rgb(var(--c-surface-card));
                    border: 1px solid rgb(var(--c-surface-border));
                    border-radius: 18px;
                    padding: 9px 13px;
                    font-size: 0.85rem; font-weight: 600;
                    color: rgb(var(--c-slate-100));
                    white-space: nowrap; cursor: pointer;
                    box-shadow: 0 2px 7px -5px rgba(0, 0, 0, 0.4);
                    transition: transform 0.16s cubic-bezier(0.22, 0.61, 0.36, 1),
                                box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
                }
                [data-theme="minimalista"] .agentport-chip { border-radius: 16px; font-weight: 500; }
                .agentport-chip:hover { border-color: rgb(var(--t-accent-rgb) / 0.45); }
                .agentport-chip:active { transform: scale(0.94); }
                .agentport-chip:disabled { opacity: 0.5; cursor: not-allowed; }
                .agentport-chip-e { font-size: 1.05rem; line-height: 1; }

                /* Hint bar bajo la pill ("Toca para escribir, hablar o ver una
                   foto") — réplica de .hintbar del demo. */
                .agentport-hint {
                    text-align: center; font-size: 0.72rem; margin-top: 9px;
                    color: rgb(var(--c-slate-500));
                }
                .agentport-hint b { color: rgb(var(--t-accent-rgb)); font-weight: 700; }

                /* Avatar vivo (.brand .mark del demo, ampliado): respira, y el
                   halo del agente lo conserva themes.css (.chagra-hero-halo). */
                .chagra-hero-halo {
                    position: absolute;
                    inset: -8px;
                    border-radius: 9999px;
                    background: conic-gradient(
                        from 0deg,
                        rgba(132, 204, 22, 0.45),
                        rgba(16, 185, 129, 0.35),
                        rgba(6, 182, 212, 0.4),
                        rgba(132, 204, 22, 0.45)
                    );
                    filter: blur(18px);
                    animation: chagra-halo-rotate 22s linear infinite;
                    pointer-events: none;
                    opacity: 0.85;
                }
                .chagra-hero-halo-inner {
                    position: absolute;
                    inset: 6px;
                    border-radius: 9999px;
                    background: radial-gradient(circle, rgba(2, 6, 23, 0) 50%, rgba(2, 6, 23, 0.9) 100%);
                    pointer-events: none;
                }
                .chagra-hero-avatar-wrap {
                    animation: chagra-avatar-breathe 4s ease-in-out infinite;
                }
                @keyframes chagra-halo-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes chagra-avatar-breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.025); }
                }

                /* Transición de envío: shimmer + lift (sin cambios de contrato —
                   los tests buscan estas clases). */
                @keyframes chagra-send-shimmer {
                    0% { transform: translateX(-130%); opacity: 0; }
                    25% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { transform: translateX(130%); opacity: 0; }
                }
                @keyframes chagra-send-lift {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    35% { transform: translateY(-4px) scale(1.012); opacity: 1; }
                    100% { transform: translateY(-16px) scale(0.978); opacity: 0.82; }
                }
                .chagra-composer-shimmer::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background: linear-gradient(
                        100deg,
                        transparent 12%,
                        rgb(var(--t-accent-rgb) / 0.55) 50%,
                        transparent 88%
                    );
                    animation: chagra-send-shimmer 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                    pointer-events: none;
                    overflow: hidden;
                }
                .chagra-composer-sending {
                    animation: chagra-send-lift 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .chagra-hero-halo,
                    .chagra-hero-avatar-wrap { animation: none !important; }
                    .agentport-greet { animation: none !important; }
                    .chagra-composer-shimmer::after,
                    .chagra-composer-sending { animation: none !important; }
                }
            `}</style>

            {/* Saludo + avatar vivo. Toda la zona abre el agente directo (sin
                escribir) — atajo para quien solo quiere "entrar". Réplica del
                bloque .greet del demo + el avatar como "ser vivo". */}
            <button
                type="button"
                onClick={launchToAgent}
                className="relative w-full flex items-center gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--t-accent-rgb))] rounded-3xl"
                aria-label="Abrir agente Chagra"
            >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
                    <div className="chagra-hero-halo" aria-hidden="true" />
                    <div className="chagra-hero-halo-inner" aria-hidden="true" />
                    <div className="chagra-hero-avatar-wrap relative">
                        <ChagraAgentAvatar
                            state={phase === 'sending' || isRecording ? 'thinking' : 'idle'}
                            size={84}
                        />
                    </div>
                </div>

                <div className="agentport-greet min-w-0 flex-1">
                    <h2 className="agentport-hi">
                        {greetingForNow()}<br />Soy <span className="agentport-chagra chagra-wordmark">Chagra</span>.
                    </h2>
                    <p
                        key={tipIndex}
                        className="agentport-sub"
                        style={{ animation: 'fade-in 0.7s ease' }}
                    >
                        {TIPS[tipIndex]}
                    </p>
                </div>
            </button>

            {/* COMPOSITOR MULTIMODAL REAL — presentado como la "pill" del demo. */}
            <div className="mt-5 w-full max-w-xl mx-auto">
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
                                    <Paperclip size={20} className="text-[rgb(var(--c-slate-400))]" aria-hidden="true" />
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
                            {/* Mini visualizador del nivel de voz */}
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

                    {/* Fila 2: acciones — cámara/adjuntar a la izq · mic/enviar a la der */}
                    <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                        {/* Cámara / foto */}
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={busy || isRecording}
                            aria-label="Tomar o elegir foto"
                            className="agentport-iconbtn !w-10 !h-10"
                        >
                            <Camera size={19} aria-hidden="true" />
                        </button>
                        {/* Adjuntar foto — B2: solo imágenes (el agente solo ve fotos) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy || isRecording}
                            aria-label="Adjuntar una foto"
                            className="agentport-iconbtn !w-10 !h-10"
                        >
                            <Paperclip size={18} aria-hidden="true" />
                        </button>

                        <div className="flex-1" />

                        {/* Micrófono (toggle grabar/detener) */}
                        <button
                            type="button"
                            onClick={handleMic}
                            disabled={busy}
                            aria-label={isRecording ? 'Detener y enviar audio' : 'Grabar audio'}
                            aria-pressed={isRecording}
                            className={[
                                'agentport-iconbtn !w-11 !h-11',
                                isRecording ? 'agentport-mic-on' : '',
                            ].join(' ')}
                        >
                            {isRecording ? <Square size={16} strokeWidth={2.5} aria-hidden="true" /> : <Mic size={18} strokeWidth={2.5} aria-hidden="true" />}
                        </button>

                        {/* Enviar — botón redondo de acento (el .send del demo) */}
                        <button
                            type="button"
                            onClick={handleSendText}
                            disabled={!canSend}
                            aria-label="Enviar al agente"
                            className={['agentport-send', canSend ? 'agent-send-accent' : ''].join(' ')}
                        >
                            <ArrowUp size={18} strokeWidth={2.75} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Inputs ocultos — AMBOS solo imágenes (B2). La cámara abre
                        captura en vivo (capture="environment"); el adjuntar abre
                        la galería de fotos. El agente solo "ve" imágenes. */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoPick(e, 'photo')}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoPick(e, 'photo')}
                    />
                </div>

                {/* Hint bajo la pill (réplica de .hintbar del demo). */}
                {!isRecording && !attachment && (
                    <p className="agentport-hint">
                        Escribe, toca el <b>🎤</b> para hablar, o el <b>📷</b> para mostrarme una foto
                    </p>
                )}

                {recorderError && (
                    <p className="mt-2 text-xs text-rose-500 px-1" role="alert">
                        No pude acceder al micrófono. Revisa los permisos.
                    </p>
                )}

                {/* B2: aviso cuando se intenta adjuntar algo que no es una foto. */}
                {pickError && (
                    <p className="mt-2 text-xs text-[rgb(160,76,20)] px-1" role="alert">
                        {pickError}
                    </p>
                )}

                {/* Chips de sugerencia rápida — envían directo (consulta de texto). */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
        </section>
    );
}
