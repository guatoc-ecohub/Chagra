/**
 * Reglas puras de densidad para los rótulos del valle 3D.
 *
 * Se mantienen fuera del componente para probar el contrato de legibilidad
 * sin montar React Three Fiber ni depender de una GPU.
 */

// Un solo portal puede mostrar nombre completo. El faro puede sumar el segundo
// título cuando recibe foco, manteniendo el máximo visual en dos.
export const MAX_PLENAS_POR_BANDA = 1;

const ANCHO_MOVIL = 600;
const RADIO_CHIPS_MOVIL_MAX = 210;
const RADIO_CHIPS_MOVIL_FRACCION = 0.46;

/**
 * Elige qué anclas pueden conservar nombre completo en la banda actual.
 * En 'lejos' el criterio es únicamente proximidad al centro del encuadre.
 * En las otras bandas se conserva el foco semántico ya existente.
 */
export function seleccionarIdsPlenos({ puntos, banda, candidata }) {
  const elegibles = puntos.filter((p) => p.elegible);
  if (banda === 'lejos') {
    return new Set(
      [...elegibles]
        .sort((a, b) => a.dc - b.dc)
        .slice(0, MAX_PLENAS_POR_BANDA)
        .map((p) => p.id),
    );
  }
  return candidata ? new Set([candidata]) : new Set();
}

/**
 * Reduce la nube de chips en pantallas estrechas. El lugar enfocado conserva
 * su acceso aunque quede fuera del radio visual central.
 */
export function chipEnRadioMovil({ dc, ancho, esFoco = false }) {
  if (esFoco || ancho > ANCHO_MOVIL) return true;
  const radio = Math.min(ancho * RADIO_CHIPS_MOVIL_FRACCION, RADIO_CHIPS_MOVIL_MAX);
  return dc <= radio;
}
