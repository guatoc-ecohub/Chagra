/**
 * onboarding-harness.jsx — Entry del harness visual del onboarding por perfil.
 *
 * Monta el componente REAL `OnboardingProfile` (src/components) con un perfil
 * semilla inyectado en localStorage antes de renderizar, para que el test
 * VISUAL capture la pregunta de ROL y las preguntas dependientes del perfil
 * sin atravesar el router/auth de la app completa.
 *
 * Solo se usa en tests/visual (no entra al bundle de producción — no está
 * referenciado por index.html ni por el router de la app).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import OnboardingProfile from '../../src/components/OnboardingProfile.jsx';

const params = new URLSearchParams(window.location.search);

// Perfil semilla (base64 de un JSON) → localStorage, para que OnboardingProfile
// arranque con vocación/rol ya escogidos y muestre la pregunta pertinente.
try {
  const seedRaw = params.get('seed');
  if (seedRaw) {
    const json = JSON.parse(atob(seedRaw));
    localStorage.setItem('chagra:profile:v1', JSON.stringify(json));
  }
} catch (e) {
  // semilla inválida → onboarding arranca vacío (igual sirve para captura).
  console.warn('[harness] seed inválida:', e);
}

createRoot(document.getElementById('onb-root')).render(
  <OnboardingProfile onComplete={() => {}} onClose={() => {}} />,
);
