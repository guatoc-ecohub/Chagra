import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Camera, Paperclip, ArrowUp, X } from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { captureAndCompress } from '../../services/photoService';
import { isAnalyzableImageAttachment } from '../../services/agentOutboxAttachment';
import useAgentOutboxStore from '../../store/useAgentOutboxStore';
import { agentSounds } from '../../services/agentSoundService';

// 2026-05-28: el R3F (ChagraAgentAvatarColibri3D) fue retirado del flujo.
// Operador: "no me gusta nada y desatina con todo lo que ya está".
// El wrapper ChagraAgentAvatar ya delega al avatar correcto según la
// preferencia del usuario (foto-realista / SVG / maíz), así que el
// dashboard simplemente lo monta y se ahorra ~600KB del bundle de three+R3F.

/**
 * AgentHero — protagonista del dashboard. El agente Chagra como ser vivo,
 * grande, respirando, y AHORA con un COMPOSITOR MULTIMODAL REAL como puerta
 * de entrada.
 *
 * Antes (≤1.0.18) la "caja de entrada" era un <div role=button> falso: al
 * tocarla navegaba al AgentScreen y solo PRE-RELLENABA el texto. No escribía,
 * no grababa, no fotografiaba — era un teaser.
 *
 * Ahora es un compositor de verdad:
 *  - <textarea> auto-grow (Enter=enviar, Shift+Enter=nueva línea).
 *  - 🎤 micrófono → graba audio (useVoiceRecorder + flujo whisper del agente).
 *  - 📷 cámara/foto → toma o elige foto (photoService + visión en el agente).
 *  - 📎 adjuntar → file picker (imagen/archivo).
 *  - ⬆️ enviar.
 *
 * Al enviar: el item se PERSISTE en la outbox durable (IndexedDB) ANTES de
 * navegar. El AgentScreen lo consume como burbuja "ya enviada" y arranca a
 * procesar (texto→LLM, audio→transcribe, foto→visión). Si el usuario da
 * "atrás" o cierra la app a mitad → al volver el item sigue ahí y no se pierde
 * ni se duplica (ver agentOutboxService).
 *
 * El alma del diseño previo se conserva: avatar vivo + halo cónico + headline +
 * tips rotativos. Respeta prefers-reduced-motion para la transición de envío.
 */

const TIPS = [
    'Escribe, habla o muéstrame una foto de tu cultivo.',
    'Cuéntame qué estás sembrando hoy.',
    'Tomo foto, escucho, recuerdo lo que me dices.',
    'Sé del campo colombiano y respeto tu tierra.',
    'Pregúntame en voz, te entiendo con tu acento.',
];

const QUICK_CHIPS = [
    { icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué puedo sembrar este mes en mi zona?' },
    { icon: '🐛', label: 'Plagas', prompt: '¿Cómo controlo plagas sin químicos?' },
    { icon: '🌧️', label: 'Clima', prompt: 'Dame el reporte del clima de mi zona.' },
];

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
            className="relative w-full px-4 pt-6 pb-4"
        >
            <style>{`
                @keyframes chagra-halo-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes chagra-avatar-breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.025); }
                }
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
                .chagra-composer-shimmer::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    /* Brillo más ancho y visible que recorre el compositor de
                       lado a lado — la sensación de "lanzar" la consulta. */
                    background: linear-gradient(
                        100deg,
                        transparent 12%,
                        rgba(163, 230, 53, 0.55) 50%,
                        transparent 88%
                    );
                    /* Más lento (520ms) + easing suave (no ease-out brusco) para
                       que el barrido se perciba elegante, no un flash. */
                    animation: chagra-send-shimmer 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                    pointer-events: none;
                    overflow: hidden;
                }
                .chagra-composer-sending {
                    /* Lift suave y un pelín más largo, sincronizado con el
                       retardo de navegación (SEND_TRANSITION_MS). Easing
                       cubic-bezier "salida suave" para que se sienta digno. */
                    animation: chagra-send-lift 0.52s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .chagra-hero-halo,
                    .chagra-hero-avatar-wrap { animation: none !important; }
                    .chagra-composer-shimmer::after,
                    .chagra-composer-sending { animation: none !important; }
                }
            `}</style>

            {/* Avatar vivo + headline. Toda la zona del avatar abre el agente
                directo (sin escribir) — atajo para quien solo quiere "entrar". */}
            <button
                type="button"
                onClick={launchToAgent}
                className="relative w-full flex flex-col items-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-3xl"
                aria-label="Abrir agente Chagra"
            >
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-3">
                    <div className="chagra-hero-halo" aria-hidden="true" />
                    <div className="chagra-hero-halo-inner" aria-hidden="true" />
                    <div className="chagra-hero-avatar-wrap relative">
                        <ChagraAgentAvatar
                            state={phase === 'sending' || isRecording ? 'thinking' : 'idle'}
                            size={140}
                        />
                    </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">
                    Pregúntale a <span className="bg-gradient-to-r from-emerald-300 to-lime-300 bg-clip-text text-transparent">Chagra</span>
                </h2>
                <p
                    key={tipIndex}
                    className="text-sm sm:text-base text-slate-400 font-medium px-2 leading-snug max-w-md transition-opacity duration-700"
                    style={{ animation: 'fade-in 0.7s ease' }}
                >
                    {TIPS[tipIndex]}
                </p>
            </button>

            {/* COMPOSITOR MULTIMODAL REAL */}
            <div className="mt-5 w-full max-w-xl mx-auto">
                <div
                    className={[
                        'relative overflow-hidden rounded-2xl bg-white/[0.06] backdrop-blur-xl border transition-colors',
                        isRecording ? 'border-rose-500/60' : 'border-white/10 focus-within:border-emerald-500/60',
                        phase === 'sending' ? 'chagra-composer-shimmer chagra-composer-sending' : '',
                    ].join(' ')}
                >
                    {/* Preview del adjunto en staging */}
                    {attachment && (
                        <div className="flex items-center gap-3 px-3 pt-3">
                            {attachment.previewUrl ? (
                                <img
                                    src={attachment.previewUrl}
                                    alt="Foto adjunta"
                                    className="w-14 h-14 rounded-lg object-cover border border-white/15"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-800 border border-white/15 flex items-center justify-center">
                                    <Paperclip size={20} className="text-slate-300" aria-hidden="true" />
                                </div>
                            )}
                            <span className="flex-1 text-xs text-slate-300 truncate">
                                {attachment.kind === 'photo' ? 'Foto lista para enviar' : attachment.fileName}
                            </span>
                            <button
                                type="button"
                                onClick={clearAttachment}
                                aria-label="Quitar adjunto"
                                className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {/* Estado grabando: barra de nivel + cronómetro */}
                    {isRecording ? (
                        <div className="flex items-center gap-3 px-4 py-3.5 min-h-[56px]">
                            <span className="relative flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                            </span>
                            <span className="flex-1 text-base text-rose-200 font-medium tabular-nums">
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
                            placeholder={attachment ? 'Añade una nota a tu foto (opcional)…' : 'Escribe tu pregunta al agente…'}
                            aria-label="Escribe tu pregunta al agente"
                            className="w-full bg-transparent resize-none px-4 py-3.5 text-base text-slate-100 placeholder:text-slate-400 focus:outline-none leading-snug"
                            disabled={busy}
                        />
                    )}

                    {/* Barra de acciones del compositor */}
                    <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0.5">
                        {/* Cámara / foto */}
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={busy || isRecording}
                            aria-label="Tomar o elegir foto"
                            className="w-9 h-9 rounded-full hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-slate-300 disabled:opacity-40 transition-colors"
                        >
                            <Camera size={19} aria-hidden="true" />
                        </button>
                        {/* Adjuntar foto — B2: solo imágenes (el agente solo ve fotos) */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy || isRecording}
                            aria-label="Adjuntar una foto"
                            className="w-9 h-9 rounded-full hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-slate-300 disabled:opacity-40 transition-colors"
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
                                'w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40',
                                isRecording
                                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/30'
                                    : 'bg-white/10 hover:bg-white/20 text-slate-100',
                            ].join(' ')}
                        >
                            {isRecording ? <Square size={16} strokeWidth={2.5} aria-hidden="true" /> : <Mic size={18} strokeWidth={2.5} aria-hidden="true" />}
                        </button>

                        {/* Enviar */}
                        <button
                            type="button"
                            onClick={handleSendText}
                            disabled={!canSend}
                            aria-label="Enviar al agente"
                            className={[
                                'w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95',
                                canSend
                                    ? 'bg-gradient-to-br from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/30'
                                    : 'bg-white/8 text-slate-500 cursor-not-allowed',
                            ].join(' ')}
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

                {recorderError && (
                    <p className="mt-2 text-xs text-rose-300 px-1" role="alert">
                        No pude acceder al micrófono. Revisa los permisos.
                    </p>
                )}

                {/* B2: aviso cuando se intenta adjuntar algo que no es una foto. */}
                {pickError && (
                    <p className="mt-2 text-xs text-amber-300 px-1" role="alert">
                        {pickError}
                    </p>
                )}

                {/* Chips de sugerencia rápida — envían directo (consulta de texto) */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {QUICK_CHIPS.map((chip) => (
                        <button
                            key={chip.label}
                            type="button"
                            onClick={() => handleChipSend(chip.prompt)}
                            disabled={busy}
                            className="shrink-0 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-sm text-slate-200 font-medium transition-all flex items-center gap-2 backdrop-blur-md disabled:opacity-50"
                        >
                            <span aria-hidden="true" className="text-base leading-none">{chip.icon}</span>
                            {chip.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
