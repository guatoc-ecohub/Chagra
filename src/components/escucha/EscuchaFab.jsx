/**
 * EscuchaFab — botón flotante persistente que activa la escucha manos libres.
 *
 * Es el trigger de HOY (tap). El de MAÑANA es el wake-word "hola Chagra":
 * ambos llaman `activarEscucha()` (escuchaService) — el widget no distingue.
 *
 * Diseño: espejo del AgentFab (colibrí, abajo-derecha): este vive ABAJO A LA
 * IZQUIERDA, 62px (tamaño guante), micrófono grande + la ramita de la mano de
 * Chagra como firma, acento del tema por --t-accent-rgb.
 *
 * Estado REPOSO ("respira suave"): aurora de gradiente que respira detrás,
 * un filo de luz cónico que orbita el borde y dos pings desfasados que
 * brotan — el botón se siente VIVO sin gritar. Todo CSS (transform/opacity,
 * GPU) y apagado con prefers-reduced-motion (queda un aro estático claro).
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React from 'react';
import { Mic } from 'lucide-react';
import { activarEscucha } from '../../services/escuchaService';
import './escucha.css';

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
      {/* Capa viva del reposo: aurora que respira + filo de luz que orbita. */}
      <span className="escucha-fab-aurora" aria-hidden="true" />
      <span className="escucha-fab-giro" aria-hidden="true" />
      <span className="escucha-fab-ping" aria-hidden="true" />
      <span className="escucha-fab-ping escucha-fab-ping-b" aria-hidden="true" />
      <Mic size={27} strokeWidth={2.4} aria-hidden="true" />
      {/* La firma de la marca: la ramita con nodos que brota (mano de Chagra) */}
      <svg
        className="escucha-fab-brotecito"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M8 13V7" />
        <path d="M8 7L5.6 4.8M8 7l2.3-2.4" />
        <circle cx="4.9" cy="4" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="11" cy="3.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
