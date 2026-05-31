import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import { authenticateUser, initiateAuthorizationCodeFlow, generateOAuthState } from '../services/authService';
import { setCurrentOperator } from '../services/operatorIdentityService';
import { setActiveTenantId } from '../services/tenantContext';
import { version as APP_VERSION } from '../../package.json';
import ChagraGrowLoader from './ChagraGrowLoader';
import LegalLinks from './LegalLinks';
import WelcomeStatsHero from './WelcomeStatsHero';
import useOllamaWarmStore from '../store/useOllamaWarmStore';
import useThemeBackgroundStore, { getBackgroundSrc } from '../store/useThemeBackgroundStore';

export default function LoginScreen({ onLoginSuccess, onSave }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  // Selector de fondos: en login mostramos el fondo curado elegido como
  // capa de foto detrás del patrón biopunk. Suscribimos solo el id (string)
  // para evitar React #185. 'default' sigue mostrando solo slate + biopunk.
  const selectedBackground = useThemeBackgroundStore((s) => s.selected);
  const loginBgSrc = selectedBackground === 'default' ? null : getBackgroundSrc(selectedBackground);

  // Camino PKCE (Authorization Code + PKCE) — recomendado y futuro único método.
  // Redirige a farmOS /oauth/authorize; el retorno lo maneja la vista
  // OAuthCallback (ruta /callback). Coexiste con el password grant de abajo
  // como fallback hasta que el redirect_uri esté registrado en farmOS y PKCE
  // esté habilitado en el cliente (pasos backend del operador). Si esos pasos
  // no están listos, farmOS rechaza el authorize y el operador vuelve acá.
  const [redirecting, setRedirecting] = useState(false);
  const handlePkceLogin = async () => {
    setRedirecting(true);
    try {
      const state = generateOAuthState();
      await initiateAuthorizationCodeFlow(state); // navega fuera de la SPA
    } catch (err) {
      setRedirecting(false);
      onSave(
        `No se pudo iniciar el login seguro: ${err?.message || 'error desconocido'}. Usa usuario y contraseña.`,
        true,
      );
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!creds.username || !creds.password) {
      onSave('Ingresa usuario y contraseña', true);
      return;
    }

    setLoading(true);
    // 2026-05-23 auditoría Antigravity bug #10: si `authenticateUser` throw
    // (network error, JSON parse fail, CORS, AbortError) sin try/catch, el
    // botón quedaba en "Procesando..." infinito sin feedback al usuario.
    // Fix: try/catch + finally garantizan que setLoading(false) corra siempre
    // y que el operador reciba un toast con la razón del fallo.
    let result;
    try {
      result = await authenticateUser(creds.username, creds.password);
    } catch (err) {
      // Errores de red, timeout, CORS, JSON malformado, fetch abortado.
      setLoading(false);
      const msg = err?.message
        ? `Error de conexión: ${err.message}. Revisa tu internet y vuelve a intentar.`
        : 'Error de conexión. Revisa tu internet y vuelve a intentar.';
      onSave(msg, true);
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
      setLoading(false);
      onLoginSuccess();
    } else {
      setLoading(false);
      // Mensaje contextual: si el servidor devolvió razón clara, mostrarla;
      // si no, mensaje amigable que sugiere acción (credenciales incorrectas).
      const errorMsg = result.error
        ? `${result.error}. Verifica usuario y contraseña.`
        : 'Usuario o contraseña incorrectos. Verifica e intenta de nuevo.';
      onSave(errorMsg, true);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-slate-950 bg-biopunk-pattern flex flex-col justify-start items-center p-6 text-slate-100 overflow-y-auto">
      {/* Capa de foto del fondo curado (si el operador eligió uno distinto
          al clásico). Detrás del contenido, con overlay de legibilidad. El
          patrón biopunk del wrapper queda encima reforzando cohesión. */}
      {loginBgSrc && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(2,6,23,0.62), rgba(2,6,23,0.86)), url('${loginBgSrc}')`,
          }}
        />
      )}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 pt-8">
        <div className="w-24 h-24 bg-muzo/20 rounded-full flex items-center justify-center shadow-neon-muzo">
          <Sprout size={56} className="text-muzo-glow" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-muzo animate-bounce">Chagra</h1>
          <span className="text-sm text-slate-500 font-mono mt-2">v{APP_VERSION}</span>
        </div>

        {/* Bug 2026-05-18 operator: 'antes de loguearme quiero estadísticas
            generales de todas las instalaciones de chagra en el login'.
            Stats globales del catálogo (especies, fichas pedagógicas,
            biopreparados) son públicos — visibles pre-auth. Plantas cuidadas
            del operador aparece como 0 hasta login. */}
        <div className="w-full">
          <WelcomeStatsHero mode="pre-login" />
        </div>

        {/* Camino principal recomendado: PKCE. Botón que redirige a farmOS
            /oauth/authorize. El password grant de abajo queda como fallback
            hasta que el backend habilite PKCE + registre el redirect_uri. */}
        <button
          type="button"
          onClick={handlePkceLogin}
          disabled={redirecting}
          className={`w-full mt-2 p-6 rounded-xl text-2xl font-black shadow-xl min-h-[80px] border-b-4 flex justify-center items-center ${
            redirecting
              ? 'bg-slate-800 border-slate-950 cursor-wait'
              : 'bg-muzo active:bg-muzo-glow border-emerald-900 text-slate-950'
          }`}
        >
          {redirecting ? <ChagraGrowLoader size={56} initialProgress={0.4} /> : 'Iniciar sesión'}
        </button>

        {/* Separador: el formulario usuario/contraseña queda como acceso
            alternativo (password grant legacy) hasta la fecha de deprecación. */}
        <div className="w-full flex items-center gap-3 mt-2" aria-hidden="true">
          <span className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">o con usuario</span>
          <span className="flex-1 h-px bg-slate-700" />
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Usuario</span>
            <input
              type="text"
              value={creds.username}
              onChange={e => setCreds(prev => ({ ...prev, username: e.target.value }))}
              className="p-5 rounded-xl bg-slate-900 border border-slate-700 text-2xl min-h-[64px]"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xl font-bold">Contraseña</span>
            <input
              type="password"
              value={creds.password}
              onChange={e => setCreds(prev => ({ ...prev, password: e.target.value }))}
              className="p-5 rounded-xl bg-slate-900 border border-slate-700 text-2xl min-h-[64px]"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className={`mt-4 p-6 rounded-xl text-2xl font-black shadow-xl min-h-[80px] border-b-4 flex justify-center items-center ${
              loading
                ? 'bg-slate-800 border-slate-950 cursor-wait'
                : 'bg-green-600 active:bg-green-500 border-green-800'
            }`}
          >
            {loading ? <ChagraGrowLoader size={56} initialProgress={0.4} /> : 'Ingresar'}
          </button>
        </form>

        <LegalLinks />
      </div>
    </div>
  );
}
