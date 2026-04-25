import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import { authenticateUser } from '../services/authService';
import { version as APP_VERSION } from '../../package.json';
import ChagraGrowLoader from './ChagraGrowLoader';
import LegalLinks from './LegalLinks';

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
    const result = await authenticateUser(creds.username, creds.password);
    setLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      onSave(result.error || 'Error autenticando', true);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 bg-biopunk-pattern flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="w-32 h-32 bg-muzo/20 rounded-full flex items-center justify-center shadow-neon-muzo">
          <Sprout size={72} className="text-muzo-glow" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-muzo animate-bounce">Chagra</h1>
          <span className="text-sm text-slate-500 font-mono mt-2">v{APP_VERSION}</span>
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
