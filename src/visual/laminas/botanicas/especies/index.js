/*
 * especies — el catálogo de las 21 láminas, ordenado por PISO TÉRMICO.
 *
 * Son 21 y no 20 porque la papa criolla se ganó lámina propia: comparte
 * género con la papa pero tiene otro ciclo (90-120 días contra 150-180), no
 * tiene dormancia (hay que renovar semilla cada vuelta) y aguanta menos la
 * gota. Meterla como "una variedad más" en la lámina de la papa habría
 * borrado justo lo que un campesino necesita saber para sembrarla.
 *
 * El orden por piso térmico es del corpus, no del diseño: responde la primera
 * pregunta que se hace ante una mata nueva — "¿eso se da aquí?".
 */
import { PISO_FRIO } from './pisoFrio.js';
import { PISO_TEMPLADO } from './pisoTemplado.js';
import { PISO_CALIDO } from './pisoCalido.js';

export * from './pisoFrio.js';
export * from './pisoTemplado.js';
export * from './pisoCalido.js';
export { PISO_FRIO, PISO_TEMPLADO, PISO_CALIDO };

/** Las 21, en orden de altura: del páramo al valle. */
export const ESPECIES = [...PISO_FRIO, ...PISO_TEMPLADO, ...PISO_CALIDO];

/** Índice por id, para pedir una lámina por nombre. */
export const POR_ID = Object.fromEntries(ESPECIES.map((e) => [e.id, e]));

/** Busca por id, por nombre común o por CUALQUIER nombre regional — que es
 *  como pregunta la gente: nadie llega diciendo "Cucurbita moschata", llega
 *  diciendo auyama, zapallo o calabaza según de dónde sea. */
export function buscaEspecie(termino) {
  const t = termino
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const limpia = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return (
    ESPECIES.find((e) => limpia(e.id) === t) ||
    ESPECIES.find((e) => limpia(e.nombre) === t) ||
    ESPECIES.find((e) => limpia(e.cientifico) === t) ||
    ESPECIES.find((e) => (e.regionales || []).some((r) => limpia(r) === t)) ||
    null
  );
}

/** Todas las especies de un piso térmico. */
export const porPiso = (piso) => ESPECIES.filter((e) => e.piso === piso);

/** Índice inverso de síntomas → especies que lo padecen. Sirve para la
 *  pregunta que de verdad se hace en campo: "vi polvo naranja, ¿qué es y qué
 *  más se me puede enfermar así?". */
export const POR_SINTOMA = ESPECIES.reduce((acc, e) => {
  for (const enf of e.enfermedades || []) {
    (acc[enf.sintoma] ||= []).push({ especie: e.id, enfermedad: enf.nombre, folk: enf.folk });
  }
  return acc;
}, {});

/** Cobertura declarada: qué tan bien documentada está cada lámina. La
 *  colección se audita a sí misma — quien la use sabe dónde pisa firme. */
export const COBERTURA = ESPECIES.map((e) => ({
  id: e.id,
  fuente: e.fuente,
  huecos: [
    ...(e.sinDato || []),
    ...(e.hoja?.sinDato ? [e.hoja.sinDato] : []),
    ...(e.flor?.sinDato ? [e.flor.sinDato] : []),
    ...(e.raiz?.sinDato ? [e.raiz.sinDato] : []),
  ],
  enfermedadesDocumentadas: (e.enfermedades || []).filter((x) => x.fuente === 'corpus').length,
  enfermedadesTotales: (e.enfermedades || []).length,
}));
