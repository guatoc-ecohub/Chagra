import React, { useState, useEffect } from 'react';
import { Bell, X, CloudRain } from 'lucide-react';
import {
    isPushSupported,
    permissionStatus,
    requestPermission,
    subscribePush,
    isSubscribed,
} from '../services/pushService';

/**
 * NotifPermissionPrompt — modal opt-in para notificaciones push (FEAT-B #293).
 *
 * Aparece (1) en onboarding después del skip, (2) en Profile como opción
 * explícita. Solo aparece UNA vez por usuario — si ya respondió (granted
 * o denied), no se muestra de nuevo a menos que reset manual.
 *
 * Privacy-first copy: explica QUÉ recibirá el campesino, no marketing.
 *
 * Operator 2026-05-28 autopilot: el campesino abre Chagra una vez al día.
 * Sin push proactivas se entera tarde de helada/lluvia/calendario siembra.
 */

const DISMISSED_KEY = 'chagra:notif-prompt:dismissed:v1';

function wasDismissed() {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
}

function markDismissed() {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* ignore */ }
}

export default function NotifPermissionPrompt({ open, onClose }) {
    const [busy, setBusy] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        if (!open) return;
        // Check si ya subscribed o si browser no soporta
        setSupported(isPushSupported());
        if (isPushSupported()) {
            isSubscribed().then((sub) => {
                if (sub) {
                    markDismissed();
                    onClose?.();
                }
            });
        }
    }, [open, onClose]);

    if (!open) return null;

    const handleAccept = async () => {
        setBusy(true);
        setErrorMsg(null);
        try {
            const perm = await requestPermission();
            if (perm !== 'granted') {
                setErrorMsg('Permiso no concedido. Puedes activarlo después desde Perfil.');
                markDismissed();
                setTimeout(() => onClose?.(), 1800);
                return;
            }
            await subscribePush();
            markDismissed();
            onClose?.();
        } catch (err) {
            setErrorMsg(err?.message || 'No se pudo activar las notificaciones');
        } finally {
            setBusy(false);
        }
    };

    const handleDismiss = () => {
        markDismissed();
        onClose?.();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-prompt-title"
            className="fixed inset-0 z-[9200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-600/40 flex items-center justify-center">
                        <Bell size={22} className="text-emerald-300" />
                    </div>
                    <div>
                        <h2 id="notif-prompt-title" className="text-lg font-bold text-white">
                            ¿Te avisamos antes?
                        </h2>
                        <p className="text-xs text-slate-400">Solo cuando importa de verdad.</p>
                    </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Chagra puede mandarte un mensajito al teléfono cuando:
                </p>

                <ul className="space-y-2 mb-5">
                    <li className="flex items-start gap-2 text-sm text-slate-200">
                        <CloudRain size={16} className="mt-0.5 text-cyan-300 shrink-0" />
                        <span>Hay <strong className="text-rose-300">helada o lluvia fuerte</strong> en las próximas horas en tu zona.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="mt-0.5 text-emerald-300 shrink-0" aria-hidden="true">🌱</span>
                        <span>Es <strong className="text-emerald-300">buen día para sembrar</strong> lo que sirve en tu piso térmico.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="mt-0.5 text-amber-300 shrink-0" aria-hidden="true">🐛</span>
                        <span>Aparece <strong className="text-amber-300">una plaga conocida</strong> cerca de tu vereda.</span>
                    </li>
                </ul>

                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Solo te escribimos cuando hay algo serio. Puedes apagarlas cuando quieras
                    desde tu perfil. No mandamos publicidad, nunca.
                </p>

                {errorMsg && (
                    <p className="text-xs text-amber-300 mb-3 bg-amber-500/10 border border-amber-600/30 rounded-md px-3 py-2">
                        {errorMsg}
                    </p>
                )}

                {!supported ? (
                    <p className="text-xs text-amber-300 mb-3 bg-amber-500/10 border border-amber-600/30 rounded-md px-3 py-2">
                        Tu navegador no soporta notificaciones (iOS Safari requiere versión 16.4+).
                        Puedes seguir usando Chagra normal.
                    </p>
                ) : null}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        disabled={busy}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Ahora no
                    </button>
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={busy || !supported}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {busy ? 'Activando…' : 'Sí, avísame'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* eslint-disable react-refresh/only-export-components */
// Export helper para que otros componentes sepan si pueden mostrar el prompt
export function shouldShowNotifPrompt() {
    if (!isPushSupported()) return false;
    if (wasDismissed()) return false;
    if (permissionStatus() !== 'default') return false;
    return true;
}
