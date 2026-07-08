/**
 * EscuchaFab — la SEMILLA EN REPOSO: botón flotante que activa la escucha
 * manos libres. (Hoy deshabilitado en App — el trigger vivo es el wake-word
 * "hola Chagra"; ambos llaman `activarEscucha()` y el widget no distingue.)
 *
 * Visual: mismo organismo que el overlay ("la semilla que despierta") pero
 * dormido — una semilla bioluminiscente con membranas que mutan despacio,
 * un corazón que late lub-dub como luciérnaga lejana, y raicillas que ya
 * agarraron tierra donde vive. Al tocarla, germina (abre el overlay).
 *
 * Tamaño guante (62px), abajo-izquierda (espejo del AgentFab colibrí).
 * Acento por --t-accent-rgb (indirección de temas).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React from 'react';
import { Mic } from 'lucide-react';
import { activarEscucha } from '../../services/escuchaService';
import { blobPath } from './organico';
import './escucha.css';

/* Membranas de la semilla: deterministas (siempre la misma criatura). */
const MEMBRANA_1 = blobPath(36, 36, 26, 2.2, 0.13);
const MEMBRANA_2 = blobPath(36, 36, 30, 5.9, 0.11);

export default function EscuchaFab() {
  return (
    <button
      type="button"
      className="escucha-fab"
      data-testid="escucha-fab"
      aria-label="Hablar con Chagra sin usar las manos"
      title="Manos libres: toque y hable — «lléveme al mercado» o pregunte lo que necesite"
      onClick={() => activarEscucha({ fuente: 'tap' })}
    >
      <svg className="escucha-fab-vida" viewBox="0 0 72 72" aria-hidden="true">
        <path className="escucha-fab-membrana esc-fm1" d={MEMBRANA_1} />
        <path className="escucha-fab-membrana esc-fm2" d={MEMBRANA_2} />
        {/* Raicillas: la semilla ya agarró tierra donde vive. */}
        <g className="escucha-fab-raicillas">
          <path d="M28 60 C 26 65, 21 66, 17 70" />
          <path d="M36 62 C 36 66, 38 69, 37 72" />
          <path d="M44 60 C 47 64, 52 65, 55 69" />
        </g>
      </svg>
      <span className="escucha-fab-corazon" aria-hidden="true" />
      <Mic size={26} strokeWidth={2.4} aria-hidden="true" />
      {/* Una luciérnaga pasa de visita cada tanto. */}
      <span className="escucha-fab-luci" aria-hidden="true" />
    </button>
  );
}
