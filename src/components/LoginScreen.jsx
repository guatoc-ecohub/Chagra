import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import { authenticateUser } from '../services/authService';
import { setCurrentOperator } from '../services/operatorIdentityService';
import { version as APP_VERSION } from '../../package.json';
import ChagraGrowLoader from './ChagraGrowLoader';
import LegalLinks from './LegalLinks';
import WelcomeStatsHero from './WelcomeStatsHero';

export default function LoginScreen({ onLoginSuccess, onSave }) {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!creds.username || !creds.password) {
      onSave('Ingresa usuario y contraseña', true);
      return;
    }

    setLoading(true);
    try {
      const result = await authenticateUser(creds.username, creds.password);

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
        onLoginSuccess();
      } else {
        onSave(result.error || 'Error autenticando', true);
      }
    } catch (err) {
      // Auditoría agroecológica 2026-05-21 Pasada 9: sin este try/catch, si
      // authenticateUser lanza excepción (red rota, CORS, FarmOS 5xx no parsado),
      // setLoading(true) queda activo indefinido y la app se "congela" en
      // "Iniciando sesión...". El finally garantiza que loading siempre baje.
      console.error('[LoginScreen] handleLogin failed:', err);
      onSave('Error de red o servidor. Intenta de nuevo.', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 bg-biopunk-pattern flex flex-col justify-start items-center p-6 text-slate-100 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 pt-8">
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
