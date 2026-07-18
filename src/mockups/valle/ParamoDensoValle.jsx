/*
 * ParamoDensoValle — el FRAILEJONAL del páramo del valle (la franja alta, al
 * fondo de la ladera).
 *
 * Regla dura del operador: ningún lote puede parecer monocultivo. El páramo
 * "está bien ubicado pero parece monocultivo" cuando son cuatro frailejones
 * clonados. Un frailejonal de verdad es un PAISAJE CON GRADIENTE DE EDAD
 * (Espeletia crece ~1 cm/año): jóvenes al ras, adultos, viejos de tronco alto —
 * cada mata mira distinto (cabecea) y mide distinto. Y no está solo: lo
 * acompañan el PAJONAL (mortiño con bayas de agraz + romerillo fino) y el suelo
 * de piedra con líquen y musgo. Así el alto se lee VIVO, no estampado:
 *
 *   · Frailejón (Espeletia)  — la firma: roseta plateada afelpada sobre columna
 *                              vestida de enagua. Viene en 4 edades (joven/
 *                              adulto/viejo/en flor) → gradiente, nunca clones.
 *   · Mortiño (Vaccinium)    — arbusto bajo del agraz andino (bayas azul-moradas).
 *   · Romerillo              — cojín de follaje fino amarillo-verde (el pajonal).
 *   · Roca con líquen + musgo — el suelo del páramo.
 *
 * Reusa las mallas por especie de floraParamo.geom (las mismas del bosque de
 * niebla del Ent) → combina con todo el valle. Aquí solo se SIEMBRAN.
 *
 * Presupuesto (tier-safe): una geometría por especie/edad → un InstancedMesh
 * (~8 draw-calls). Siembra determinista. Sin animación (paisaje quieto):
 * trivial en tier bajo y con reducedMotion.
 *
 * Cableado (lo hace el host — este archivo NO toca la escena):
 *   <ParamoDensoValle alturaDe={alturaTerreno} tier={tier} />
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  geomFrailejon,
  geomMortino,
  geomRomerillo,
  geomRoca,
  geomMusgo,
} from '../../visual/mundo3d/bosque/floraParamo.geom.js';
import {
  rngDe,
  cajaDe,
  sembrarLote,
  tintarLote,
} from './siembraValle.js';
import { Banco } from './BancoValle.jsx';

/* ── La zona por defecto: la franja del páramo (fondo de la ladera), al
      centro-izquierda, sin pisar el bosque de la ladera derecha. ── */
export const ZONA_PARAMO = [
  { cx: -3.0, cz: -7.8, rx: 5.2, rz: 2.6 },
  { cx: 2.6, cz: -8.6, rx: 3.0, rz: 1.8 },
];

export const CLAROS_PARAMO = [];

/*
 * Presupuesto por tier (instancias, no draw-calls). El frailejón es el grueso,
 * repartido en cuatro edades; el pajonal y el suelo rellenan entre columnas.
 */
const CUPOS_TIER = {
  alto: {
    frailejonJoven: 8, frailejon: 10, frailejonViejo: 5, frailejonFlor: 3,
    mortino: 40, romerillo: 40, roca: 10, musgo: 12, q: 1,
  },
  medio: {
    frailejonJoven: 5, frailejon: 6, frailejonViejo: 3, frailejonFlor: 1,
    mortino: 22, romerillo: 22, roca: 5, musgo: 6, q: 0.62,
  },
  bajo: {
    frailejonJoven: 3, frailejon: 4, frailejonViejo: 1, frailejonFlor: 0,
    mortino: 8, romerillo: 8, roca: 2, musgo: 3, q: 0.42,
  },
};

/*
 * Bandas de escala por EDAD del frailejón (la altura real la da su geom, que
 * crece con la edad). `lean` = ladeo por instancia (cada mata cabecea) → el
 * frailejonal no se lee clonado. El pajonal y el suelo van bajos.
 */
const ESTRATO = {
  frailejonJoven: { escMin: 0.5, escMax: 0.72, esp: 0.55, lean: 0.14 },
  frailejon: { escMin: 0.62, escMax: 0.9, esp: 0.62, lean: 0.15 },
  frailejonViejo: { escMin: 0.72, escMax: 1.0, esp: 0.68, lean: 0.17 },
  frailejonFlor: { escMin: 0.66, escMax: 0.9, esp: 0.6, lean: 0.12 },
  mortino: { escMin: 0.4, escMax: 0.74, esp: 0, hundir: 0.02 },
  romerillo: { escMin: 0.4, escMax: 0.8, esp: 0, hundir: 0.02 },
  roca: { escMin: 0.7, escMax: 1.5, esp: 0.5, hundir: 0 },
  musgo: { escMin: 0.7, escMax: 1.6, esp: 0, hundir: 0 },
};

/**
 * El frailejonal denso del valle. Montar dentro del <Canvas> del valle.
 *
 * @param {{
 *   alturaDe?: ((x:number, z:number) => number) | null,
 *   tier?: 'alto'|'medio'|'bajo',
 *   zona?: Array<{cx:number, cz:number, rx:number, rz:number}>,
 *   claros?: Array<{x:number, z:number, r:number}>,
 *   nocturno?: boolean,
 *   semilla?: number,
 * }} props
 */
export default function ParamoDensoValle({
  alturaDe = null,
  tier = 'medio',
  zona = ZONA_PARAMO,
  claros = CLAROS_PARAMO,
  nocturno = false,
  semilla = 6301,
}) {
  const cupo = CUPOS_TIER[tier] || CUPOS_TIER.medio;

  /* Cuatro edades de frailejón + pajonal + suelo. Las rocas y el musgo son
     mallas de un solo argumento (seed): un ejemplar variado por banco. */
  const geos = useMemo(() => {
    const q = cupo.q;
    return {
      frailejonJoven: geomFrailejon({ q, edad: 0.28 }, 611),
      frailejon: geomFrailejon({ q, edad: 0.6 }, 612),
      frailejonViejo: geomFrailejon({ q, edad: 0.92 }, 613),
      frailejonFlor: geomFrailejon({ q, edad: 0.66, flor: true }, 614),
      mortino: geomMortino({ q }, 615),
      romerillo: geomRomerillo({ q }, 616),
      roca: geomRoca(617),
      musgo: geomMusgo(618),
    };
  }, [cupo.q]);

  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );

  /* La siembra: un solo flujo de RNG entrevera las cuatro edades + pajonal +
     suelo → gradiente de edad, nada clonado. Tinte frío del alto andino. */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const bancos = {
      frailejonJoven: sembrarLote(cupo.frailejonJoven, zona, claros, alturaDe, r, ESTRATO.frailejonJoven),
      frailejon: sembrarLote(cupo.frailejon, zona, claros, alturaDe, r, ESTRATO.frailejon),
      frailejonViejo: sembrarLote(cupo.frailejonViejo, zona, claros, alturaDe, r, ESTRATO.frailejonViejo),
      frailejonFlor: sembrarLote(cupo.frailejonFlor, zona, claros, alturaDe, r, ESTRATO.frailejonFlor),
      mortino: sembrarLote(cupo.mortino, zona, claros, alturaDe, r, ESTRATO.mortino),
      romerillo: sembrarLote(cupo.romerillo, zona, claros, alturaDe, r, ESTRATO.romerillo),
      roca: sembrarLote(cupo.roca, zona, claros, alturaDe, r, ESTRATO.roca),
      musgo: sembrarLote(cupo.musgo, zona, claros, alturaDe, r, ESTRATO.musgo),
    };
    for (const items of Object.values(bancos)) {
      tintarLote(items, r, nocturno, caja, { frio: 0.3, brilloVar: 0.16 });
    }
    return bancos;
  }, [cupo, zona, claros, alturaDe, nocturno, semilla]);

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = tier === 'alto';

  return (
    <group>
      {/* El suelo del páramo: piedra con líquen y montículos de musgo. */}
      <Banco geo={geos.roca} mat={mat} items={siembra.roca} />
      <Banco geo={geos.musgo} mat={mat} items={siembra.musgo} />
      {/* El pajonal: mortiño (bayas de agraz) + romerillo fino. */}
      <Banco geo={geos.mortino} mat={mat} items={siembra.mortino} />
      <Banco geo={geos.romerillo} mat={mat} items={siembra.romerillo} />
      {/* El frailejonal: cuatro edades entreveradas (gradiente, no clones). */}
      <Banco geo={geos.frailejonJoven} mat={mat} items={siembra.frailejonJoven} castShadow={sombra} />
      <Banco geo={geos.frailejon} mat={mat} items={siembra.frailejon} castShadow={sombra} />
      <Banco geo={geos.frailejonViejo} mat={mat} items={siembra.frailejonViejo} castShadow={sombra} />
      <Banco geo={geos.frailejonFlor} mat={mat} items={siembra.frailejonFlor} castShadow={sombra} />
    </group>
  );
}
