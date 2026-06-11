import PSA from '../data/psa.json';

export function evaluarPSA(perfil = {}) {
  const { altitud, enCuenca, enParamo, interes } = perfil;
  const modalidades = [];
  if (enCuenca) modalidades.push(PSA.modalidades[0]);
  if (enParamo || altitud > 3000) modalidades.push(PSA.modalidades[1]);
  if (interes === 'carbono') modalidades.push(PSA.modalidades[2]);
  const elegible = modalidades.length > 0;
  return { elegible, modalidades, requisitos: PSA.requisitos_campesino, monto: PSA.monto_orientativo, autoridad: PSA.autoridad };
}
