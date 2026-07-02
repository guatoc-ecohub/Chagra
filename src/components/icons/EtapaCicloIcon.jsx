/**
 * EtapaCicloIcon.jsx — componente del set de iconos por etapa de ciclo.
 * La lógica de resolución y los mapas viven en ./etapaCicloIcons.js (archivo
 * sin JSX, exportable a servicios/tests sin romper react-refresh).
 */
import React from 'react';
import { getEtapaIcon } from './etapaCicloIcons.js';

/**
 * Icono de etapa de ciclo de vida con métrica consistente.
 *
 * @param {object} props
 * @param {string} [props.code] - código de etapa (sowing, flowering…).
 * @param {string} [props.nombre] - label en español (Floración, Cosecha…).
 * @param {number} [props.size] - 16 por defecto (legible en cards/chips).
 * @param {number} [props.strokeWidth] - 2 por defecto (métrica del set).
 * @param {string} [props.className]
 */
export default function EtapaCicloIcon({ code, nombre, size = 16, strokeWidth = 2, className = '' }) {
  // getEtapaIcon SELECCIONA un componente lucide constante de módulo (no crea
  // componentes por render) — createElement directo evita el falso positivo
  // de react-hooks/static-components sin desactivar la regla.
  return React.createElement(getEtapaIcon({ code, nombre }), {
    size,
    strokeWidth,
    className,
    'aria-hidden': 'true',
  });
}
