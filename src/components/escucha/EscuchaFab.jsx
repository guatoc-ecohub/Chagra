/**
 * EscuchaFab — botón flotante persistente que activa la escucha manos libres.
 *
 * Es el trigger de HOY (tap). El de MAÑANA es el wake-word "hola Chagra":
 * ambos llaman `activarEscucha()` (escuchaService) — el widget no distingue.
 *
 * Diseño: "EL UMBRAL en miniatura" — espejo del AgentFab (colibrí, derecha):
 * este vive ABAJO A LA IZQUIERDA, 62px (tamaño guante). Un disco de vacío
 * índigo con un núcleo de luz latiendo detrás del micrófono, un anillo
 * holográfico girando lentísimo y dos motas en órbita: la presencia dormida,
 * esperando que le hablen (todo se detiene con prefers-reduced-motion).
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
      <span className="escucha-fab-nucleo" aria-hidden="true" />
      <span className="escucha-fab-anillo" aria-hidden="true" />
      <span className="escucha-fab-orbita" aria-hidden="true">
        <span className="escucha-fab-mota" />
        <span className="escucha-fab-mota m2" />
      </span>
      <Mic size={27} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
