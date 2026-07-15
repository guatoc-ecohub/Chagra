/*
 * estiercol/ — LA MIERDA VOLVIÉNDOSE GAS Y ABONO, en una sola puerta.
 *
 * El módulo del problema más real y menos glamoroso de la finca: el estiércol
 * que apesta, cría mosca y pelea con el vecino. Dos piezas abiertas en canal
 * (el biodigestor de manga y la biocompostera de tres cajones), el círculo que
 * las une, y —afuera del círculo— el montón mal llevado soltando al aire la
 * plata que se pierde.
 *
 * La verdad técnica sale de `Chagra-strategy/ops/corpus-maestros/
 * teacher-cerdos-gallinas.jsonl` y está citada donde manda: cada cabecera dice
 * qué regla del corpus obedece esa geometría. Si una lección cambia, se cambia
 * ahí y aquí — no se maquilla.
 *
 * Uso (importar PEREZOSO: adentro vive three):
 *
 *   const EscenaEstiercol = lazy(() => import('../estiercol'));
 *   <EscenaEstiercol tier={tier} reducedMotion={reducedMotion} />
 *
 * Las piezas se pueden montar sueltas dentro de OTRO `<Canvas>` (por ejemplo
 * una lámina que solo quiera la manga en corte):
 *
 *   import { Biodigestor } from '../estiercol';
 *   <Biodigestor perfil={perfilDeTier(tier)} params={paramsDeTier(tier)} clima="frio" />
 *
 * OJO con el corte: las piezas nacen cortadas en z=0 conservando la mitad de
 * atrás. Se leen SOLO desde +Z — no las rote pensando que son modelos cerrados.
 */
export { default } from './EscenaEstiercol.jsx';
export { default as EscenaEstiercol } from './EscenaEstiercol.jsx';

export { default as Biodigestor } from './Biodigestor.jsx';
export { default as Biocompostera, MontonMalLlevado } from './Biocompostera.jsx';
export { default as CicloCerrado } from './CicloCerrado.jsx';

/* el ADN compartido: paleta, tier, la mano que dibuja torcido y el anillo */
export {
  PALETA_ESTIERCOL,
  HUMOS,
  PARAMS_TIER,
  paramsDeTier,
  ANILLO,
  ESTACIONES,
  TRAMOS,
  estacion,
  posEstacion,
  puntoAnillo,
  manoAlzada,
  torcerConLaMano,
} from './estiercol.geom.js';

/* la manga: medidas, física del sello de agua y régimen térmico */
export {
  MANGA,
  NIVEL,
  T_NIVEL,
  ZANJA,
  ENTRADA,
  SALIDA,
  VALVULA,
  COCINA,
  CLIMAS,
  LLAMA,
  fraccionLodo,
} from './biodigestor.geom.js';

/* la compostera: cajones, fases de temperatura y el contraejemplo */
export { CAJON, FASES, GROSOR, MONTON_MALO, cajonX, capasDelMonton } from './compostera.geom.js';
