/* eslint-disable react-refresh/only-export-components --
 * Entry point del harness visual. createRoot monta directo en el DOM; no
 * exporta componentes y fast-refresh es irrelevante (recarga entera). */
/**
 * semaphore-harness.jsx — Harness AISLADO (sin router/auth) para verificar el
 * #2074 Semáforo de confianza científica del ChatBubble en los 3 estados
 * (verde/ámbar/rojo). Monta el ChatBubble REAL con metadata sintética.
 *
 * Uso: navegar a /tests/visual/semaphore-harness.html en el dev server.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import ChatBubble from '../../src/components/AgentScreen/ChatBubble.jsx';

const NOW = Date.now();

const CASES = [
  {
    id: 'verde',
    titulo: '🟢 Verde — Verificado',
    message: {
      role: 'assistant',
      content:
        'La gulupa (Passiflora edulis f. edulis) se siembra bien sobre los 1700 msnm en clima templado, con tutorado y buen drenaje.',
      timestamp: NOW,
      metadata: {
        tool_used: 'get_species',
        grounded: true,
        confianza: 'alta',
        grounding_semaphore: 'verde',
        grounding_reason:
          'Dato concordante en dos fuentes curadas del catálogo (ficha Agrosavia + publicación revisada por pares).',
        fuente: 'Agrosavia',
        fuente_url: 'https://repository.agrosavia.co/handle/20.500.12324/gulupa',
        doi: '10.1234/gulupa.2021',
      },
    },
  },
  {
    id: 'ambar',
    titulo: '🟡 Ámbar — Una fuente',
    message: {
      role: 'assistant',
      content:
        'El pronóstico indica lluvias intermitentes esta semana en tu vereda; evita aplicar foliares antes de un aguacero.',
      timestamp: NOW,
      metadata: {
        tool_used: 'get_clima_ideam',
        grounded: true,
        confianza: 'media',
        grounding_semaphore: 'ambar',
        grounding_reason:
          'Respaldo de una sola fuente institucional (IDEAM). Útil como referencia; contrástalo con tu observación en campo.',
        fuente: 'IDEAM',
        fuente_texto: true,
      },
    },
  },
  {
    id: 'rojo',
    titulo: '🔴 Rojo — Sin verificar',
    message: {
      role: 'assistant',
      content:
        'No tengo una fuente verificable para esa dosis exacta de biopreparado en tu cultivo. Puedo darte una guía general, pero confírmala con un técnico antes de aplicar.',
      timestamp: NOW,
      metadata: {
        tool_used: null,
        grounded: false,
        grounding_semaphore: 'rojo',
        grounding_reason:
          'El catálogo Chagra no tiene una fuente verificable para este dato puntual; la respuesta es tentativa (abstención honesta).',
      },
    },
  },
];

function Card({ id, titulo, message }) {
  return (
    <div
      id={`card-${id}`}
      data-state={id}
      className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <h2 className="text-sm font-bold text-emerald-300 mb-3 uppercase tracking-wider">
        {titulo}
      </h2>
      <ChatBubble message={message} promptText="pregunta de ejemplo" />
    </div>
  );
}

function Harness() {
  return (
    <div className="max-w-[440px] mx-auto p-4 space-y-2">
      <h1 className="text-xl font-black text-white uppercase tracking-widest text-center mb-2">
        Semáforo de confianza #2074
      </h1>
      <p className="text-xs text-slate-500 text-center mb-6">
        ChatBubble real · toca el chip para desplegar el motivo + procedencia.
      </p>
      {CASES.map((c) => (
        <Card key={c.id} {...c} />
      ))}
    </div>
  );
}

createRoot(document.getElementById('harness-root')).render(<Harness />);
