/**
 * onboarding-condensado-harness.jsx — Entry del harness de verificación del
 * ONBOARDING CONDENSADO (reescritura 2026-07-08).
 *
 * Monta el componente REAL `OnboardingCondensado` (src/components) con un
 * perfil semilla opcional (?seed=<base64-json>) SIN atravesar router/auth.
 * Solo se usa en tests/visual (no entra al bundle de producción — no está
 * referenciado por index.html ni por el router de la app).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
// themes.css vive en main.jsx (no en index.css): trae los tokens de tema
// (--t-accent-rgb) y las clases onboarding-piso-*/bienvenida-costura que el
// flujo condensado reusa. Sin él, los botones primarios salen sin estilo.
import '../../src/styles/themes.css';
import OnboardingCondensado from '../../src/components/OnboardingCondensado.jsx';

const params = new URLSearchParams(window.location.search);

try {
  const seedRaw = params.get('seed');
  if (seedRaw) {
    const json = JSON.parse(atob(seedRaw));
    localStorage.setItem('chagra:profile:v1', JSON.stringify(json));
  }
} catch (e) {
  console.warn('[harness] seed inválida:', e);
}

createRoot(document.getElementById('onb-root')).render(
  <OnboardingCondensado
    onComplete={(p) => {
      // Marca visible para que el script verifique el fin del flujo + perfil.
      window.__ONB2_DONE__ = p;
      document.title = 'onb2-done';
    }}
    onClose={() => {}}
  />,
);
