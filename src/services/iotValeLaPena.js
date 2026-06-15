import VT from '../data/iot-vale-la-pena.json';

/**
 * Evalua si vale la pena instalar IoT segun condiciones de la finca.
 * @param {object} [condiciones]
 * @param {boolean} [condiciones.visitaDiaria]
 * @param {boolean} [condiciones.altoValor]
 * @param {number} [condiciones.presupuesto]
 * @param {boolean} [condiciones.coberturaCelular]
 * @param {boolean} [condiciones.quiereAutomatizar]
 * @returns {{vale: boolean, razon: string, costo?: string}}
 */
export function valeLaPenaIoT({ visitaDiaria, altoValor, presupuesto, coberturaCelular, quiereAutomatizar } = {}) {
  if (quiereAutomatizar) return { vale: false, razon: VT.no_vale_la_pena_si[3] };
  if (!coberturaCelular) return { vale: false, razon: VT.no_vale_la_pena_si[4] };
  if (presupuesto < 300000) return { vale: false, razon: VT.no_vale_la_pena_si[2] };
  if (visitaDiaria) return { vale: false, razon: VT.no_vale_la_pena_si[0] };
  if (!altoValor) return { vale: false, razon: 'Cultivo a cielo abierto o de bajo valor — el ojo del campesino + pluviometro manual ganan' };
  return { vale: true, razon: VT.vale_la_pena_si[1], costo: VT.costo_total_orientativo };
}
