/*
 * CafetalDensoValle — el LOTE DE CAFÉ del valle, sembrado como AGROFORESTERÍA
 * real (no como plantación).
 *
 * El operador puso "regla dura": ningún lote puede parecer monocultivo, y el
 * café "está bien ubicado pero parece monocultivo". Un cafetal campesino de
 * verdad NO es una hilera de arbustos iguales: es café de sombra —los arbustos
 * bajo el TECHO de árboles de sombrío (guamo, nogal cafetero) y con MATAS DE
 * PLÁTANO intercaladas. Cuatro especies, cuatro alturas, cuatro siluetas → se
 * lee policultivo de un vistazo:
 *
 *   · Guamo (Inga)             — el parasol: copa ancha y plana, el techo de sombra.
 *   · Nogal cafetero           — el sombrío alto y recto (madera fina), asoma sobre
 *     (Cordia alliodora)         el guamal.
 *   · Plátano                  — intercalado, hojas enormes arqueadas (el tercer piso).
 *   · Cafeto (Coffea arabica)  — el cultivo: arbusto bajo de hoja oscura lustrosa,
 *                                el GRUESO de las matas, bajo la sombra.
 *
 * Reusa las mallas por especie del mundo cafetal (floraCafetal.geom): tronco +
 * follaje con color horneado por vértice, cada una con su porte. Aquí solo se
 * SIEMBRAN sobre la ladera del valle.
 *
 * Presupuesto (tier-safe): una geometría por especie → un InstancedMesh (4
 * draw-calls por más matas que haya). Siembra determinista. Sin animación (el
 * cafetal es paisaje quieto): trivial en tier bajo y con reducedMotion.
 *
 * Cableado (lo hace el host — este archivo NO toca la escena):
 *   <CafetalDensoValle alturaDe={alturaTerreno} tier={tier} />
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  geomGuamo,
  geomNogal,
  geomPlatano,
  geomCafeto,
} from '../../visual/mundo3d/cafetal/floraCafetal.geom.js';
import {
  rngDe,
  cajaDe,
  sembrarLote,
  tintarLote,
} from './siembraValle.js';
import { Banco } from './BancoValle.jsx';

/* ── La zona por defecto: la franja del clima medio (templado) en la ladera
      izquierda, lejos de la casa (-0.9, 2.6) y de la quebrada (x≈1.2). Dos
      parches solapados = mancha orgánica, no un rectángulo de plantación. ── */
const ZONA_CAFETAL = [
  { cx: -6.0, cz: 1.6, rx: 4.6, rz: 2.4 },
  { cx: -2.6, cz: 2.9, rx: 2.8, rz: 1.5 },
];

/* Se respeta un claro alrededor del patio de la casa. */
const CLAROS_CAFETAL = [{ x: -0.9, z: 2.6, r: 1.8 }];

/*
 * Presupuesto por tier (instancias, no draw-calls). El café es el grueso; el
 * sombrío (guamo/nogal) es POCO y alto (el techo); el plátano, intercalado.
 */
const CUPOS_TIER = {
  alto: { cafeto: 90, platano: 10, guamo: 6, nogal: 4, q: 1 },
  medio: { cafeto: 52, platano: 6, guamo: 4, nogal: 2, q: 0.62 },
  bajo: { cafeto: 24, platano: 3, guamo: 2, nogal: 1, q: 0.42 },
};

/*
 * Bandas de escala por estrato (la altura real la da H de cada geom):
 *  - sombrío alto: nogal (H4.1) ~2.0–2.5 m; guamo (H3.5) ~1.8–2.2 m (parasol ancho).
 *  - plátano (H1.9) ~0.8–1.15 m.
 *  - cafeto (H1.2) ~0.58–0.85 m (arbusto bajo, bajo la sombra).
 */
const ESTRATO = {
  nogal: { escMin: 0.5, escMax: 0.6, esp: 1.7, emergentes: 0 },
  guamo: { escMin: 0.5, escMax: 0.62, esp: 1.8, emergentes: 0 },
  platano: { escMin: 0.42, escMax: 0.6, esp: 0.7, emergentes: 0 },
  cafeto: { escMin: 0.48, escMax: 0.7, esp: 0.5, emergentes: 0, hundir: 0.02 },
};

/**
 * El cafetal denso del valle. Montar dentro del <Canvas> del valle.
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
export default function CafetalDensoValle({
  alturaDe = null,
  tier = 'medio',
  zona = ZONA_CAFETAL,
  claros = CLAROS_CAFETAL,
  nocturno = false,
  semilla = 5219,
}) {
  const cupo = CUPOS_TIER[tier] || CUPOS_TIER.medio;

  const geos = useMemo(() => {
    const q = cupo.q;
    return {
      guamo: geomGuamo({ q }, 511),
      nogal: geomNogal({ q }, 512),
      platano: geomPlatano({ q }, 513),
      cafeto: geomCafeto({ q }, 514),
    };
  }, [cupo.q]);

  /* Mismo material del resto del valle (Lambert + vertexColors + flatShading). */
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    [],
  );

  /* La siembra: un solo flujo de RNG entrevera sombrío + plátano + café → el
     café queda salpicado bajo la sombra, nunca en manchas puras. Poca
     perspectiva aérea (el templado es cálido, no bosque de niebla). */
  const siembra = useMemo(() => {
    const r = rngDe(semilla);
    const caja = cajaDe(zona);
    const bancos = {
      // El sombrío alto primero (define el techo); luego plátano y café debajo.
      nogal: sembrarLote(cupo.nogal, zona, claros, alturaDe, r, ESTRATO.nogal),
      guamo: sembrarLote(cupo.guamo, zona, claros, alturaDe, r, ESTRATO.guamo),
      platano: sembrarLote(cupo.platano, zona, claros, alturaDe, r, ESTRATO.platano),
      cafeto: sembrarLote(cupo.cafeto, zona, claros, alturaDe, r, ESTRATO.cafeto),
    };
    for (const items of Object.values(bancos)) {
      tintarLote(items, r, nocturno, caja, { frio: 0.12, brilloVar: 0.16 });
    }
    return bancos;
  }, [cupo, zona, claros, alturaDe, nocturno, semilla]);

  useLayoutEffect(() => () => {
    Object.values(geos).forEach((g) => g && g.dispose());
    mat.dispose();
  }, [geos, mat]);

  const sombra = tier === 'alto';

  return (
    <group name="audit-cafetal">
      {/* El sombrío: el techo de guamo (ancho) + nogal (alto y recto). */}
      <Banco geo={geos.guamo} mat={mat} items={siembra.guamo} castShadow={sombra} />
      <Banco geo={geos.nogal} mat={mat} items={siembra.nogal} castShadow={sombra} />
      {/* El plátano intercalado (hojas grandes que rompen la fila). */}
      <Banco geo={geos.platano} mat={mat} items={siembra.platano} castShadow={sombra} />
      {/* El café: el grueso, bajo la sombra. */}
      <Banco geo={geos.cafeto} mat={mat} items={siembra.cafeto} />
    </group>
  );
}
