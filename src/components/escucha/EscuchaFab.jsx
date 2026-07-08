/**
 * EscuchaFab — botón flotante persistente que activa la escucha manos libres.
 *
 * Es el trigger de HOY (tap). El de MAÑANA es el wake-word "hola Chagra":
 * ambos llaman `activarEscucha()` (escuchaService) — el widget no distingue.
 *
 * Diseño: "LA PRESENCIA" en miniatura — un mini-portal de espacio profundo
 * (mismo lenguaje del overlay): el marco lleva el acento del tema (Chagra),
 * adentro un núcleo de luz suspendido LEVITA con dos motas en órbita, y el
 * micrófono flota sobre la luz. Un pulso de presencia se dilata cada 4s
 * ("aquí se habla" sin fastidiar; apagado con prefers-reduced-motion).
 * Vive ABAJO A LA IZQUIERDA (espejo del AgentFab), 62px tamaño guante.
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
      <span className="escucha-fab-pulso" aria-hidden="true" />
      {/* El otro lado en miniatura: espacio + órbita + núcleo suspendido */}
      <span className="escucha-fab-espacio" aria-hidden="true">
        <span className="escucha-fab-orbita">
          <span className="escucha-fab-mota escucha-fab-mota-a" />
          <span className="escucha-fab-mota escucha-fab-mota-b" />
        </span>
        <span className="escucha-fab-nucleo" />
      </span>
      <Mic className="escucha-fab-mic" size={26} strokeWidth={2.4} aria-hidden="true" />
      {/* La firma: un destello de 4 puntas — la Presencia deja su chispa */}
      <svg
        className="escucha-fab-destello"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M7 0.5 L8.3 5.7 L13.5 7 L8.3 8.3 L7 13.5 L5.7 8.3 L0.5 7 L5.7 5.7 Z" />
      </svg>
    </button>
  );
}
