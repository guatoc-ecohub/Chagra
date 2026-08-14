/*
 * guacamayaIdentidad — LA IDENTIDAD DE LA GUACAMAYA, COMO DATOS.
 *
 * A diferencia de jaguarIdentidad.js/luciernagaIdentidad.js (bichos
 * DIBUJADOS a mano con el kit rubber-hose, `_rubberhose.jsx`), la guacamaya
 * REUSA el rig F24 del valle (`~/demos/3d/compai/rigs/guacamaya.*`, copiado
 * verbatim en `arte-valle/`) — regla dura del operador: nunca redibujar de
 * cero lo que ya existe (ver `GuacamayaCompai.jsx`). Este archivo es deliberadamente
 * más liviano: solo el slug y una PRESENCIA de placeholder (mismo shape que
 * JAGUAR_PRESENCIA/LUCIERNAGA_PRESENCIA) para que, si compaiRegistry.js suma
 * algún día una coreografía 3D propia, encuentre el contrato ya sembrado.
 *
 * PRIMERA PASADA (2026-08-14, unificación compAI a 7): los valores de
 * PRESENCIA son ESTIMADOS (Ara macao, ave grande — percha alta, vuela) sin
 * medición real en el mundo 3D. compaiRegistry.js NO consume esta presencia
 * todavía (la guacamaya sigue con `pendienteFable:true`, cae a Angelita en
 * 3D) — este export queda listo para cuando alguien la coreografíe.
 */

/** Slug estable de la guacamaya (data-creature, elenco, compaiRegistry). */
export const GUACAMAYA_SLUG = 'guacamaya';

export const GUACAMAYA_NOMBRE = 'Guacamaya';

/* GUACAMAYA_PRESENCIA — ave grande de dosel (Ara macao): percha alta, vuela
   (a diferencia del jaguar/oso, que son de suelo). Placeholder razonable, no
   medido — ver nota PRIMERA PASADA arriba. */
export const GUACAMAYA_PRESENCIA = {
  billboardBase: 56,
  billboardPorEnergia: 10,
  distancia: 6,
  percha: { x: 0.6, y: 0.9, z: 0.6 },
  rondaAltura: 1.4,
  sombra: {
    radio: 0.34,
    opacidad: 0.22,
    opacidadBase: 0.26,
    opacidadMin: 0.1,
    atenuaPorAltura: 0.22,
    ensanchaPorAltura: 0.04,
  },
};
