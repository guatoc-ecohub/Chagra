import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, WifiOff, ShieldCheck, Leaf, LogIn, AlertCircle } from 'lucide-react';
import { applyTheme, normalizeTheme, STORAGE_KEY, DEFAULT_THEME } from '../hooks/useTheme';
import { authenticateUser } from '../services/authService';
import { setCurrentOperator } from '../services/operatorIdentityService';
import { setActiveTenantId } from '../services/tenantContext';
import { version as APP_VERSION } from '../../package.json';
import ChagraGrowLoader from './ChagraGrowLoader';
import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';
import LegalLinks from './LegalLinks';
import WelcomeStatsHero from './WelcomeStatsHero';
import useOllamaWarmStore from '../store/useOllamaWarmStore';
import { prewarmCorpus } from '../services/ragRetriever';
import useThemeBackgroundStore, { getBackgroundSrc } from '../store/useThemeBackgroundStore';
import { friendlyMessage } from '../utils/friendlyErrors';

/**
 * LoginScreen — puerta de entrada de Chagra.
 *
 * Es la primera impresión del producto (piloto de campo + demos de
 * convocatorias), así que carga tres trabajos a la vez:
 *   1. Explicar QUÉ es Chagra y POR QUÉ confiarle los datos de la finca
 *      (señales de confianza junto a la marca: offline, datos propios,
 *      software libre).
 *   2. Dejar entrar rápido a quien ya tiene su usuario (formulario grande,
 *      con objetivos de toque amplios para dedos de campo).
 *   3. Mostrar el impacto real de la red Chagra (WelcomeStatsHero pre-login,
 *      cifras públicas del catálogo — pedido del operador 2026-05-18).
 *
 * LAVADA VISUAL v2 (feat/login-lavada-visual):
 *   - Responsive real en 3 tamaños: móvil chico (~360px) = columna única
 *     compacta (marca más contenida para que la tarjeta de ingreso asome sin
 *     scroll); móvil grande = la misma columna con más aire; desktop (lg+) =
 *     DOS columnas — la finca (marca + impacto) a la izquierda y la puerta
 *     (tarjeta de ingreso) a la derecha, centradas verticalmente.
 *   - Estados legibles al sol: error INLINE dentro de la tarjeta
 *     (role="alert", ámbar sobre panel oscuro, AA) además del toast global;
 *     carga que conserva la identidad esmeralda (no un botón gris "muerto")
 *     con anuncio aria-live para lectores de pantalla.
 *   - Firma biopunk contenida: hairline de circuito esmeralda→cian en el
 *     borde superior de la tarjeta; el resto queda quieto y disciplinado.
 *
 * Español colombiano en USTED, cálido y campesino (ingrese/escriba/revise).
 * NUNCA voseo argentino.
 *
 * NO cambia la lógica de autenticación: `handleLogin` conserva el mismo flujo
 * (authenticateUser → operador HMAC → tenant → foto → warm-up Ollama + corpus).
 * Solo se rediseñó la capa visual, los textos y la estructura. El estado
 * `formError` es puramente presentacional: refleja el mismo mensaje que ya
 * viaja por `onSave` para que el aviso quede pegado al formulario.
 */
export default function LoginScreen({ onLoginSuccess, onSave }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  // Error inline presentacional (espejo del toast onSave): en el campo, bajo
  // el sol, el toast global puede pasar desapercibido; el aviso dentro de la
  // tarjeta queda junto al botón que el operador acaba de tocar.
  const [formError, setFormError] = useState('');
  // Mostrar/ocultar la contraseña ayuda a quien escribe despacio o con poca
  // costumbre del teclado del teléfono a verificar lo que digitó (a11y +
  // baja alfabetización digital). Arranca oculta: el campo sigue siendo
  // type="password" en el primer render.
  const [showPassword, setShowPassword] = useState(false);
  // Selector de fondos: en login mostramos el fondo curado como capa de foto.
  // Suscribimos solo el id (string) para evitar React #185. SIEMPRE resolvemos
  // a una foto (getBackgroundSrc); el default universal es "Páramo completo"
  // (DEFAULT_BACKGROUND_SRC), así el login nunca muestra el patrón viejo.
  const selectedBackground = useThemeBackgroundStore((s) => s.selected);
  const loginBgSrc = getBackgroundSrc(selectedBackground);

  // FIX prod 2026-06-10: la login está diseñada en estilo BIOPUNK (dark) —
  // `bg-slate-950` + `bg-biopunk-pattern` + texto claro. Con el tema 'auto'
  // resolviendo a NATURE de día, los colores (vía CSS-vars de tema) se
  // invertían a oscuros → texto/formulario oscuro sobre fondo oscuro = login
  // INVISIBLE (pantalla negra en Android/Chrome de día). Forzamos biopunk
  // mientras se muestra el login y restauramos el tema del usuario al salir.
  useEffect(() => {
    applyTheme('biopunk');
    return () => {
      try { applyTheme(normalizeTheme(localStorage.getItem(STORAGE_KEY))); }
      catch { applyTheme(DEFAULT_THEME); }
    };
  }, []);

  // Un solo camino para avisar errores: mismo mensaje al toast global (onSave,
  // contrato existente) y al alert inline de la tarjeta. NO toca la lógica.
  const notifyError = (msg) => {
    setFormError(msg);
    onSave(msg, true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!creds.username || !creds.password) {
      notifyError('Escriba su usuario y su contraseña para ingresar.');
      return;
    }

    setFormError('');
    setLoading(true);
    // 2026-05-23 auditoría QA bug #10: si `authenticateUser` throw
    // (network error, JSON parse fail, CORS, AbortError) sin try/catch, el
    // botón quedaba en "Procesando..." infinito sin feedback al usuario.
    // Fix: try/catch + finally garantizan que setLoading(false) corra siempre
    // y que el operador reciba un toast con la razón del fallo.
    let result;
    try {
      result = await authenticateUser(creds.username, creds.password);
    } catch (err) {
      // Errores de red, timeout, CORS, JSON malformado, fetch abortado.
      // NUNCA exponer el mensaje crudo (podía pegar texto técnico de token/HTTP
      // al operador). friendlyMessage mapea a copy claro en español Colombia.
      setLoading(false);
      notifyError(friendlyMessage(err));
      return;
    }

    if (result.success) {
      // Activar Capa 1 HMAC (ADR-027.v): computa operator_id_hash determinista
      // vía HMAC-SHA256(username, PBKDF2(account_uuid_master, "chagra-salt-v1"))
      // y persiste en localStorage. Los consumidores (InventoryDashboard,
      // RecountDrawer, PlanEditor) dejan de usar 'default-hash-0...' fallback.
      try {
        await setCurrentOperator(creds.username);
      } catch (err) {
        // No bloquear login si falla crypto (browser sin Web Crypto API).
        // Componentes hacen fallback a default-hash. Tracking warning silenciosa.
        console.warn('[LoginScreen] setCurrentOperator failed:', err);
      }
      // ADR-036 MVP multi-finca: persistir el username como tenantId activo.
      // Lo consumen apiService (filter[uid.name]) y useAssetStore (scope IDB).
      // Si el tenantId cambia respecto al previo (re-login con otro usuario),
      // setActiveTenantId emite `tenantChanged` y los stores limpian su caché.
      try {
        setActiveTenantId(creds.username);
      } catch (err) {
        console.warn('[LoginScreen] setActiveTenantId failed:', err);
      }
      // Foto de perfil cross-device (2026-06-15): traer del servidor la última
      // foto del operador para este dispositivo. Fire-and-forget — no bloquea
      // el login y es no-throw (degrada al ícono por defecto si falla/offline).
      try {
        import('../services/operatorPhotoService.js')
          .then((m) => m.loadFromFarmOS())
          .catch(() => {});
      } catch (err) {
        console.warn('[LoginScreen] operator photo load dispatch failed:', err);
      }
      // NN4 fix 2026-05-23: disparar pre-warm del modelo Ollama configurado ANTES de
      // navegar al dashboard. Esto da ~15-30s de margen humano (el operador
      // mira el dashboard, escoge una tile, abre el agente) durante los
      // cuales el modelo se carga en GPU en background. Sin esto, la
      // primera query al agente caía al cold-start 116s. Fire-and-forget:
      // el store maneja el estado, AgentScreen lo lee y muestra banner si
      // todavía está warming cuando el operador llega al agente.
      // Idempotente: si por alguna razón se llama 2 veces, el store
      // dedupea internamente.
      try {
        useOllamaWarmStore.getState().startWarmup();
      } catch (err) {
        // No bloquear login si falla (ej. tests sin fetch global).
        console.warn('[LoginScreen] ollama warm-up dispatch failed:', err);
      }
      // Hotfix prod-down 2026-06-02: pre-cargar el corpus RAG en background
      // junto al warm-up de Ollama. Antes, loadCorpus() corría serial al
      // disparar la PRIMERA query (incluido un saludo) y colgaba ~3min. Pre-
      // cargándolo acá (fire-and-forget, no bloqueante) el corpus queda
      // cacheado durante el tiempo humano login→dashboard→agente.
      try {
        prewarmCorpus();
      } catch (err) {
        console.warn('[LoginScreen] corpus pre-warm dispatch failed:', err);
      }
      setLoading(false);
      onLoginSuccess();
    } else {
      setLoading(false);
      // Mensaje contextual en USTED: si el servidor devolvió razón clara,
      // mostrarla; si no, mensaje amigable que sugiere acción.
      const errorMsg = result.error
        ? `${result.error}. Revise su usuario y su contraseña.`
        : 'Usuario o contraseña incorrectos. Revíselos e intente de nuevo.';
      notifyError(errorMsg);
    }
  };

  // Al corregir un campo, retiramos el aviso inline (el toast global ya hizo
  // su ciclo). Presentacional puro.
  const updateCred = (field) => (e) => {
    const value = e.target.value;
    setCreds((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  return (
    <div className="login-screen relative min-h-[100dvh] w-full bg-slate-950 bg-biopunk-pattern flex flex-col items-center overflow-y-auto text-slate-100 px-5 sm:px-6 lg:px-10 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Capa 1 — Foto del páramo curado. Detrás de todo, con un gradiente de
          legibilidad (oscurece arriba y abajo) para que el texto siempre
          contraste, también a mediodía en campo abierto. El patrón biopunk del
          wrapper queda encima reforzando cohesión de marca. */}
      {loginBgSrc && (
        <div
          aria-hidden="true"
          className="login-bg-photo absolute inset-0 pointer-events-none bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(2,6,23,0.74), rgba(2,6,23,0.82) 55%, rgba(2,6,23,0.92)), url('${loginBgSrc}')`,
          }}
        />
      )}
      {/* Capa 2 — Aurora del páramo: dos resplandores suaves (esmeralda de Muzo
          + cian Morpho) que dan "vida" y profundidad detrás de la marca sin
          restar legibilidad. Puro CSS, sin assets nuevos. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 8%, rgba(16,185,129,0.20), transparent 70%), radial-gradient(55% 40% at 78% 22%, rgba(6,182,212,0.14), transparent 70%)',
        }}
      />

      {/* my-auto: centra el bloque cuando sobra alto (desktop / móvil grande)
          sin recortar arriba cuando falta (el wrapper scrollea normal).
          En lg+ pasa de columna a rejilla de dos columnas: la finca (marca +
          impacto) a la izquierda, la puerta (tarjeta) a la derecha. */}
      <main className="relative z-10 my-auto w-full max-w-md flex flex-col items-center gap-6 sm:gap-7 lg:max-w-5xl xl:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,27rem)] lg:items-center lg:gap-x-14 xl:gap-x-20 lg:gap-y-10 animate-fadeIn">
        {/* ─────────────────────────────────────────────────────────────
            MARCA — el Colibrí Barbudito (avatar botánico de Chagra IA)
            posado en un orbe neón. Personaje adulto y elegante, no mascota;
            es el rostro de la marca. En desktop la marca se alinea a la
            izquierda (lectura natural hacia la tarjeta de ingreso).
            ───────────────────────────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center gap-3 pt-1 sm:pt-2 lg:pt-0 lg:col-start-1 lg:row-start-1 lg:items-start lg:text-left">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full bg-slate-900/70 backdrop-blur-sm ring-1 ring-muzo/40 shadow-neon-muzo flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full ring-1 ring-muzo/20 animate-pulse"
            />
            <ChagraAgentAvatarColibri
              state="idle"
              size={84}
              ariaLabel="Colibrí Barbudito, símbolo de Chagra"
            />
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-muzo drop-shadow-[0_0_18px_rgba(16,185,129,0.45)]">
              Chagra
            </h1>
            <p className="mt-2 text-base sm:text-lg text-slate-200 font-medium leading-snug max-w-xs mx-auto lg:mx-0 lg:max-w-sm">
              El cuaderno vivo de su finca agroecológica
            </p>
            <p className="mt-1 text-sm text-slate-400 leading-snug max-w-xs mx-auto lg:mx-0 lg:max-w-sm">
              Registre, aprenda y cuide la tierra, con inteligencia que
              protege el páramo, aunque no tenga señal.
            </p>
          </div>

          {/* Señales de confianza — junto a la marca responden "¿por qué
              le daría mis datos?": local-first, sin extractivismo, código
              abierto. Chips compactos, legibles, con contraste AA. */}
          <ul className="flex flex-wrap justify-center gap-2 pt-1 lg:justify-start" aria-label="Compromisos de Chagra">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 border border-slate-700/70 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <WifiOff size={14} className="text-muzo-glow" aria-hidden="true" />
              Funciona sin internet
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 border border-slate-700/70 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <ShieldCheck size={14} className="text-muzo-glow" aria-hidden="true" />
              Sus datos son suyos
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 border border-slate-700/70 px-3 py-1.5 text-xs font-semibold text-emerald-200">
              <Leaf size={14} className="text-muzo-glow" aria-hidden="true" />
              Software libre
            </li>
          </ul>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            FORMULARIO — la acción principal. Tarjeta con superficie propia
            (blur + borde + hairline de circuito esmeralda→cian, la firma
            biopunk) para que se lea como un panel confiable sobre la foto.
            Campos grandes con ícono guía y objetivos de toque amplios.
            En desktop es la columna derecha, centrada verticalmente.
            ───────────────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden w-full rounded-3xl border border-slate-700/70 bg-slate-900/70 backdrop-blur-md shadow-2xl p-5 sm:p-6 lg:p-7 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center"
          aria-labelledby="login-heading"
        >
          {/* Firma: hairline de circuito en el borde superior de la tarjeta. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-muzo/80 to-morpho/0"
          />
          <h2 id="login-heading" className="text-xl font-bold text-slate-100 mb-1">
            Entre a su finca
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            Ingrese con el usuario que le entregaron para Chagra.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-5" aria-busy={loading}>
            <div className="flex flex-col gap-2">
              <label htmlFor="login-username" className="text-lg font-bold text-slate-100">
                Usuario
              </label>
              <div className="relative">
                <User
                  size={22}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-username"
                  type="text"
                  value={creds.username}
                  onChange={updateCred('username')}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-950/70 border border-slate-700 text-xl min-h-[64px] text-slate-100 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:bg-slate-950 disabled:opacity-60"
                  placeholder="Su usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="text-lg font-bold text-slate-100">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={22}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={creds.password}
                  onChange={updateCred('password')}
                  disabled={loading}
                  className="w-full pl-12 pr-14 py-4 rounded-xl bg-slate-950/70 border border-slate-700 text-xl min-h-[64px] text-slate-100 placeholder-slate-500 transition-colors focus:border-emerald-500 focus:bg-slate-950 disabled:opacity-60"
                  placeholder="Su contraseña"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[var(--tap-min,44px)] min-h-[var(--tap-min,44px)] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Error INLINE — espejo del toast, pegado a la acción. Ámbar
                sobre panel oscuro (AA), con ícono para lectura rápida al sol. */}
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 leading-snug"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`mt-1 min-h-[72px] sm:min-h-[80px] p-5 rounded-2xl text-2xl font-black flex justify-center items-center gap-3 border-b-4 transition-all active:translate-y-0.5 active:border-b-2 ${
                loading
                  ? 'bg-emerald-900/80 border-emerald-950 text-emerald-100 cursor-wait'
                  : 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 border-emerald-800 text-white shadow-neon-muzo'
              }`}
            >
              {loading ? (
                <>
                  <ChagraGrowLoader size={44} initialProgress={0.4} />
                  <span className="text-lg font-bold">Entrando…</span>
                </>
              ) : (
                <>
                  <LogIn size={26} aria-hidden="true" />
                  Ingresar
                </>
              )}
            </button>

            {/* Anuncio del estado de carga para lectores de pantalla (el
                cambio visual del botón no siempre se anuncia solo). */}
            <p aria-live="polite" className="sr-only">
              {loading ? 'Entrando a su finca, espere un momento.' : ''}
            </p>
          </form>

          {/* Reafirmación local-first / anti-extractivismo, al pie de la acción
              principal donde el productor decide entregar sus datos. */}
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
            <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              Chagra guarda todo en su teléfono. Nada se comparte ni se vende
              sin su permiso.
            </span>
          </p>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            IMPACTO — la red Chagra hoy. Cifras públicas del catálogo, visibles
            antes de entrar (pedido del operador 2026-05-18). En móvil va
            después del formulario (no estorba la entrada al campesino de
            afán); en desktop acompaña la marca en la columna izquierda.
            ───────────────────────────────────────────────────────────── */}
        <section className="w-full lg:col-start-1 lg:row-start-2" aria-label="La red Chagra hoy">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 text-center mb-3 lg:text-left">
            Lo que Chagra ya cuida
          </p>
          <WelcomeStatsHero mode="pre-login" />
        </section>

        {/* Pie — legales + versión, centrados bajo las dos columnas. */}
        <footer className="flex flex-col items-center gap-1 lg:col-span-2 lg:row-start-3">
          <LegalLinks />
          <p className="text-2xs text-slate-500 font-mono">
            Chagra v{APP_VERSION}
          </p>
        </footer>
      </main>
    </div>
  );
}
