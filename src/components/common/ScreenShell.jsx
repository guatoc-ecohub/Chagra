import React from 'react';
import { ArrowLeft, Home, HelpCircle } from 'lucide-react';
import NotificationsBell from '../NotificationsBell';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import { useTheme } from '../../hooks/useTheme';
import { iconForTheme } from '../dashboard/themeIcon';
import './screen-shell-f2.css';

/**
 * Helper para navegación global desde ScreenShell sin necesidad de prop
 * drilling. Dispara CustomEvent que App.jsx escucha y navega al view
 * solicitado.
 *
 * Operador 2026-05-28: "el boton de alertas y ayuda debe ser visible
 * en el top" en TODA la app — no solo dashboard. Sin esto, los CTAs
 * Help + Alertas solo aparecen en TopBar del dashboard y desaparecen
 * en pantallas secundarias.
 */
function navigateGlobal(view) {
    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: view }));
}

/**
 * ScreenShell, layout común para vistas full-screen (Fase 13.6).
 *
 * Extrae el patrón repetitivo usado por AssetsDashboard, WorkerHistory y
 * la vista de Bodega. Cumple DRY: header consistente + botón back + área
 * principal scrollable.
 *
 * BUGFIX 2026-05-28: el header ahora SIEMPRE incluye 3 botones globales
 * a la derecha (Home + Alertas + Ayuda) — visibles en TODA la app, no
 * solo en el dashboard. Click → dispatchEvent('chagra:nav', view).
 * App.jsx tiene el listener que llama setCurrentView correspondiente.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * MODO "Finca Viva" (F2) — fase 1 de la integración de temas (2026-06-24):
 * cuando la flag VITE_FINCA_VIVA_HOME_PERFIL está ON, el shell adopta la
 * DISPOSICIÓN del home F2 (topbar con aire, marca con el ícono del agente del
 * tema, pastillas redondas) y hereda la PIEL del tema activo (nature cálido /
 * biopunk neón-oscuro / minimalista claro-sobrio) en vez de las cards slate
 * oscuras fijas. La piel sale de la indirección --c-* (themes.css/index.css) +
 * el lenguaje del home (screen-shell-f2.css), reaccionando a data-luz noche
 * igual que la portada. Arregla los hallazgos de paridad del ux-audit
 * (P1-3 campana, P2-1 cards slate). DECISIÓN del operador: la finca-viva es la
 * disposición; los temas son la piel.
 *
 * Con la flag OFF (default, PROD) el shell conserva EXACTAMENTE su markup y
 * comportamiento actual — esta feature se shippa DARK en producción.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 * @param {import('react').ComponentType<{size?: number, className?: string}>} [props.icon]
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.actions]
 */
export const ScreenShell = ({ title, onBack, onHome, icon: Icon, children, actions }) => {
    const handleHome = onHome || (() => navigateGlobal('dashboard'));

    // La flag se evalúa una sola vez (no cambia en runtime: import.meta.env).
    // Con OFF se cae al shell legacy idéntico al de prod.
    const fincaViva = fincaVivaHomePerfilActivo();
    if (fincaViva) {
        return (
            <ScreenShellF2
                title={title}
                onBack={onBack}
                handleHome={handleHome}
                Icon={Icon}
                actions={actions}
            >
                {children}
            </ScreenShellF2>
        );
    }

    return (
        // FIX fondo (2026-05-28): el wrapper era `bg-slate-950` SÓLIDO y tapaba
        // por completo la imagen `--app-bg-image` que App.jsx escribe en el
        // <body> (el operador "no veía la foto del fondo" al elegirla en Perfil).
        // Ahora el wrapper es transparente y el <main> usa un scrim semi-opaco
        // (bg-slate-950/55) en vez de slate-950 sólido, dejando que la foto del
        // body se vea claramente detrás del contenido sin perder legibilidad.
        <div className="h-[100dvh] text-white flex flex-col overflow-hidden">
            <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {onBack && (
                        <button
                            onClick={/** @type {React.MouseEventHandler} */(onBack)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                            aria-label="Volver"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <button
                        onClick={/** @type {React.MouseEventHandler} */(handleHome)}
                        className="p-3 bg-slate-800 hover:bg-emerald-700/40 hover:text-emerald-200 active:bg-emerald-700/60 rounded-full transition-colors text-emerald-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label="Volver al inicio"
                        title="Volver al inicio"
                    >
                        <Home size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                        {Icon && <Icon className="text-morpho shrink-0" size={20} />}
                        {title}
                    </h1>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {actions}
                    {/* Globales: Ayuda (ámbar, jerarquía alta) + Alertas (bell). */}
                    <button
                        type="button"
                        onClick={() => navigateGlobal('help')}
                        aria-label="Manual de uso: cómo usar Chagra"
                        title="Manual de uso"
                        className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-500/40 text-amber-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <HelpCircle size={22} aria-hidden="true" strokeWidth={2.5} />
                    </button>
                    <NotificationsBell onNavigate={navigateGlobal} />
                </div>
            </header>
            {/* Feedback piloto #5 (Lili 2026-05-18): los FABs flotantes
                (AgentFab, banners) tapaban los CTAs del final de cada screen.
                Padding-bottom defensivo que respeta safe-area iOS + alto
                suficiente para los FABs apilados verticalmente. */}
            {/* BUGFIX 2026-05-28 operador: el main tenía `bg-biopunk-pattern`
                hardcoded que TAPABA la imagen del catálogo seleccionada desde
                Perfil (el operador veía la foto solo en dashboard, no en
                screens secundarias). El bg vivo ya está aplicado al body
                vía `body.app-bg-biodiversidad` (App.jsx escribe --app-bg-image).
                Aquí solo dejamos el scrim semi-transparente para legibilidad
                del contenido — la imagen del body se ve a través del scrim. */}
            <main className="flex-1 overflow-y-auto bg-slate-950/55 pb-[max(env(safe-area-inset-bottom),0px)_+_120px]">{children}</main>
        </div>
    );
};

/**
 * ScreenShellF2 — variante "Finca Viva" del shell (solo flag ON). Misma API
 * funcional que el shell legacy (back/home/help/bell + título + ícono), pero
 * con la DISPOSICIÓN del home F2 y la PIEL del tema activo. Las clases
 * .screen-shell-f2-* (screen-shell-f2.css) resuelven color contra los tokens
 * --c-* del tema, así que una sola estructura sirve a las 3 pieles.
 */
function ScreenShellF2({ title, onBack, handleHome, Icon, actions, children }) {
    const { theme } = useTheme();
    return (
        <div className="screen-shell-f2" data-testid="screen-shell-f2">
            <header className="screen-shell-f2-topbar">
                <div className="screen-shell-f2-left">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="screen-shell-f2-pill"
                            aria-label="Volver"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    {/* Marca: la A del agente del tema activo (la misma del home
                        F2 / TopBar). Decorativa (el botón Inicio de al lado hace
                        la navegación); aria-hidden para no duplicar el control. */}
                    <button
                        type="button"
                        onClick={handleHome}
                        className="screen-shell-f2-brand"
                        aria-label="Chagra: ir al inicio"
                        title="Chagra"
                    >
                        <span aria-hidden="true">{iconForTheme(theme)}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleHome}
                        className="screen-shell-f2-pill is-home"
                        aria-label="Inicio"
                        title="Inicio"
                    >
                        <Home size={18} />
                    </button>
                    <h1 className="screen-shell-f2-title">
                        {Icon && (
                            <span className="screen-shell-f2-title-icon">
                                <Icon size={20} />
                            </span>
                        )}
                        {title}
                    </h1>
                </div>
                <div className="screen-shell-f2-right">
                    {actions}
                    <button
                        type="button"
                        onClick={() => navigateGlobal('help')}
                        aria-label="Manual de uso: cómo usar Chagra"
                        title="Manual de uso"
                        className="screen-shell-f2-help"
                    >
                        <HelpCircle size={22} aria-hidden="true" strokeWidth={2.5} />
                    </button>
                    {/* Campana REDONDA del demo del home (ux-audit P1-3) — misma
                        lógica de notificaciones, forma F2 theme-aware. */}
                    <NotificationsBell onNavigate={navigateGlobal} variant="f2" />
                </div>
            </header>
            <main className="screen-shell-f2-main">{children}</main>
        </div>
    );
}

export default ScreenShell;
