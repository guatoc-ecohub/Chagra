/* eslint-disable chagra-i18n/no-hardcoded-spanish -- UI copy ES-CO de la
 * pantalla puente OAuth (mismo criterio que App.jsx/AssetsDashboard); la
 * migración a messages.js (ADR-050) se trackea aparte. */
import React, { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../services/authService';
import { setCurrentOperator } from '../services/operatorIdentityService';
import { setActiveTenantId } from '../services/tenantContext';
import useOllamaWarmStore from '../store/useOllamaWarmStore';
import { prewarmCorpus } from '../services/ragRetriever';
import ChagraGrowLoader from './ChagraGrowLoader';
import ChagraAgentAvatarColibri from './ChagraAgentAvatarColibri';

/**
 * OAuthCallback — pantalla puente del flujo Authorization Code + PKCE.
 *
 * Se monta cuando la app detecta la ruta /callback (o #callback) con los
 * params `code` + `state` que farmOS devuelve tras el redirect de
 * /oauth/authorize. Intercambia el code por tokens (PKCE), persiste la sesión
 * y delega al caller (App) la navegación al dashboard o de vuelta al login.
 *
 * IMPORTANTE: este flujo SOLO completa si el backend farmOS tiene:
 *   - el redirect_uri de la PWA registrado en el cliente OAuth, y
 *   - PKCE habilitado en ese cliente.
 * Mientras eso no esté listo en producción, el camino vivo sigue siendo el
 * password grant del LoginScreen (ver authService PASSWORD_GRANT_*).
 *
 * @param {object} props
 * @param {() => void} props.onSuccess - callback tras login PKCE exitoso.
 * @param {(error: string) => void} props.onError - callback si el intercambio falla.
 */
export default function OAuthCallback({ onSuccess, onError }) {
  const [status, setStatus] = useState('procesando');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Los params del code/state pueden venir en query (?code=...&state=...)
      // o, si la PWA enruta por hash, en el fragmento (#callback?code=...).
      // Soportamos ambos para no acoplarnos al modo de routing del deploy.
      let params = new URLSearchParams(window.location.search);
      if (!params.get('code')) {
        const hash = window.location.hash || '';
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          params = new URLSearchParams(hash.slice(qIndex + 1));
        }
      }

      const result = await handleOAuthCallback(params);
      if (cancelled) return;

      if (result.success) {
        // Activar identidad/tenant igual que el camino password grant del
        // LoginScreen. En PKCE no tenemos el username escrito por el operador
        // en un input; el subject del token lo resuelve el backend. Usamos el
        // state como semilla determinista de operador/tenant hasta que el
        // perfil real se hidrate desde farmOS post-login. Esto evita que el
        // dashboard arranque con 'default-hash' / sin scope de tenant.
        const subjectSeed = params.get('state') || 'pkce-user';
        try {
          await setCurrentOperator(subjectSeed);
        } catch (err) {
          console.warn('[OAuthCallback] setCurrentOperator failed:', err);
        }
        try {
          setActiveTenantId(subjectSeed);
        } catch (err) {
          console.warn('[OAuthCallback] setActiveTenantId failed:', err);
        }
        // Foto de perfil cross-device (2026-06-15): igual que LoginScreen,
        // traer del servidor la última foto del operador. Fire-and-forget.
        try {
          import('../services/operatorPhotoService.js')
            .then((m) => m.loadFromFarmOS())
            .catch(() => {});
        } catch (err) {
          console.warn('[OAuthCallback] operator photo load dispatch failed:', err);
        }
        try {
          useOllamaWarmStore.getState().startWarmup();
        } catch (err) {
          console.warn('[OAuthCallback] ollama warm-up dispatch failed:', err);
        }
        // Hotfix prod-down 2026-06-02: pre-cargar el corpus RAG en background
        // junto al warm-up de Ollama (ver LoginScreen). Fire-and-forget.
        try {
          prewarmCorpus();
        } catch (err) {
          console.warn('[OAuthCallback] corpus pre-warm dispatch failed:', err);
        }
        // Limpiar los params OAuth de la URL para que un refresh no reintente
        // el intercambio con un code ya consumido (one-time use).
        try {
          window.history.replaceState({}, document.title, window.location.origin + '/');
        } catch (_) { /* no-op en entornos sin history API */ }
        setStatus('ok');
        onSuccess();
      } else {
        setStatus('error');
        onError(result.error || 'No se pudo completar el inicio de sesión.');
      }
    };

    run().catch((err) => {
      if (cancelled) return;
      setStatus('error');
      onError(err?.message || 'Error inesperado en el callback de autenticación.');
    });

    return () => { cancelled = true; };
  }, [onSuccess, onError]);

  // Capa visual alineada con LoginScreen (lavada visual): mismo orbe del
  // Colibrí Barbudito, misma aurora esmeralda/cian y mensajes en USTED.
  // La lógica del intercambio PKCE de arriba NO cambia.
  return (
    <div className="relative min-h-[100dvh] w-full bg-slate-950 bg-biopunk-pattern flex flex-col justify-center items-center text-slate-100 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Aurora del páramo — misma firma de fondo del login. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 8%, rgba(16,185,129,0.20), transparent 70%), radial-gradient(55% 40% at 78% 22%, rgba(6,182,212,0.14), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-28 h-28 rounded-full bg-slate-900/70 backdrop-blur-sm ring-1 ring-muzo/40 shadow-neon-muzo flex items-center justify-center mb-6">
          <span aria-hidden="true" className="absolute inset-0 rounded-full ring-1 ring-muzo/20 animate-pulse" />
          <ChagraAgentAvatarColibri
            state="thinking"
            size={88}
            ariaLabel="Colibrí Barbudito, símbolo de Chagra"
          />
        </div>
        <ChagraGrowLoader size={64} showLabel labelText="Verificando su sesión…" />
        {status === 'error' && (
          <p
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 font-semibold text-center max-w-sm leading-snug"
          >
            No se pudo completar el inicio de sesión. Lo llevamos de vuelta a
            la pantalla de ingreso.
          </p>
        )}
      </div>
    </div>
  );
}
