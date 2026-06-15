import HARDWARE from '../data/iot-hardware.json';

/**
 * Estima el costo de hardware IoT para una finca.
 * @param {object} [opciones]
 * @param {boolean} [opciones.incluirCamara=true]
 * @param {boolean} [opciones.incluirSHT30=true]
 * @param {string} [opciones.bateria='18650']
 * @returns {object}
 */
export function estimarCostoIoT({ incluirCamara = true, incluirSHT30 = true, bateria = '18650' } = {}) {
  const costos = { hardware: 0, recurrente_mensual: 21000 };
  if (incluirCamara) costos.hardware += 80000;
  if (incluirSHT30) costos.hardware += 100000;
  costos.hardware += 15000; // capacitivo
  costos.hardware += 15000; // BH1750
  if (bateria === 'LiFePO4') costos.hardware += 167000;
  else costos.hardware += 25000; // 18650
  costos.hardware += 90000; // panel
  costos.total = costos.hardware + costos.recurrente_mensual;
  costos.fuente = HARDWARE.fuente;
  return costos;
}
