/*
 * ArbolMayor — el ÁRBOL MAYOR de un piso térmico, en 3D low-poly de verdad
 * (mallas three, no billboards). Lee la receta de silueta del catálogo
 * `arbolesMayores.js` y la arma con primitivas baratas:
 *
 *   · tronco  — cilindros ahusados (raigón grueso → punta fina). Multitronco en
 *               la queñua (3 tallos abiertos y ladeados); columna en roble y
 *               guayacán; emergente con RAÍCES TABLARES en la ceiba.
 *   · copa    — un puñado de "nubes" de follaje (icosaedros facetados) en
 *               elipsoide: ancha y plana en la ceiba, alta y densa en el roble,
 *               compacta en la queñua. En el guayacán la copa es FLOR dorada
 *               maciza (sin verde): su firma es florecer pelado.
 *
 * Vida: el árbol se mece lento desde la base (pivote al pie), con fase propia
 * por `semilla`. `reducedMotion` lo deja QUIETO. Tier-safe: en 'alto' facetado y
 * copa plena; en 'medio'/'bajo' menos blobs y material Lambert liso (lo decide
 * quien lo monta via `blobs`/`flat`). Cero texturas: color por material.
 *
 * Componente r3f: montar SOLO dentro de un <Canvas>.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ARBOLES_MAYORES,
  copaBlobs,
  tallosArbol,
  raicesTablares,
} from './arbolesMayores.js';

/* Un tallo ahusado con leve curva: TubeGeometry sobre una curva de 3 puntos.
   Barato (pocos segmentos radiales) y da el nudo orgánico de la queñua. */
function geometriaTallo(tallo, curvaLateral, radioBase) {
  const [bx, bz] = tallo.base;
  const h = tallo.alto;
  const puntas = [
    new THREE.Vector3(bx, 0, bz),
    new THREE.Vector3(bx + curvaLateral * 0.4, h * 0.55, bz + curvaLateral * 0.25),
    new THREE.Vector3(bx + curvaLateral, h, bz + curvaLateral * 0.6),
  ];
  const curva = new THREE.CatmullRomCurve3(puntas);
  const geo = new THREE.TubeGeometry(curva, 6, radioBase, 6, false);
  // ahusar: estrechar el radio hacia la punta moviendo los anillos superiores
  return geo;
}

export default function ArbolMayor({
  tipo = 'roble',
  escala = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  reducedMotion = false,
  semilla = 1,
  blobs,
  flat = true,
}) {
  const def = ARBOLES_MAYORES[tipo] || ARBOLES_MAYORES.roble;
  const forma = def.forma;
  const alto = def.alto;
  const pivote = useRef(null);

  /* Receta memoizada: tallos, raíces tablares y nubes de copa. `blobs` permite
     al host bajar la densidad por tier sin tocar el catálogo. */
  const armado = useMemo(() => {
    const formaTier = blobs != null ? { ...forma, blobs } : forma;
    return {
      tallos: tallosArbol(forma, alto, semilla),
      raices: raicesTablares(forma, alto, semilla),
      copa: copaBlobs(formaTier, alto, semilla),
    };
  }, [forma, alto, semilla, blobs]);

  const geomTallos = useMemo(
    () =>
      armado.tallos.map((t) => {
        const curva = t.curva + (forma.inclina || 0) * alto * 0.6;
        return geometriaTallo(t, curva, alto * 0.045 * t.grosor);
      }),
    [armado.tallos, forma.inclina, alto],
  );

  // Geometría de copa compartida entre blobs (barata: un icosaedro facetado).
  const geoBlob = useMemo(() => new THREE.IcosahedronGeometry(0.5, flat ? 0 : 1), [flat]);
  const geoRaiz = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const cCortezaBase = useMemo(() => new THREE.Color(def.corteza.base), [def]);
  const cCortezaClara = useMemo(() => new THREE.Color(def.corteza.clara), [def]);
  const cCopaBase = useMemo(() => new THREE.Color(def.copa.base), [def]);
  const cCopaClara = useMemo(() => new THREE.Color(def.copa.clara), [def]);

  // libera cada geometría propia cuando se recrea o al desmontar (un effect por
  // recurso: así nunca se dispone una geometría que otro dep aún usa)
  useEffect(() => () => geomTallos.forEach((g) => g.dispose()), [geomTallos]);
  useEffect(() => () => geoBlob.dispose(), [geoBlob]);
  useEffect(() => () => geoRaiz.dispose(), [geoRaiz]);

  const fase = useMemo(() => semilla * 1.7, [semilla]);

  useFrame((st) => {
    if (reducedMotion || !pivote.current) return;
    const t = st.clock.elapsedTime;
    // mecido lento desde el pie: árboles grandes pesan más (menos amplitud)
    const amp = 0.02 + 0.02 / Math.max(1, alto);
    pivote.current.rotation.z = (rotation[2] || 0) + Math.sin(t * 0.5 + fase) * amp;
    pivote.current.rotation.x = (rotation[0] || 0) + Math.cos(t * 0.37 + fase) * amp * 0.5;
  });

  const alturaCopa = alto * (forma.tipo === 'emergente' ? 0.98 : 0.82);

  return (
    <group position={position} scale={escala}>
      {/* pivote al pie: el mecido gira el árbol entero desde la base */}
      <group ref={pivote} rotation={rotation}>
        {/* RAÍCES TABLARES (ceiba): aletas verticales que agarran la tierra */}
        {armado.raices.map((r, i) => (
          <mesh
            key={`raiz${i}`}
            geometry={geoRaiz}
            position={[Math.cos(r.ang) * r.largo * 0.5, r.alto * 0.5, Math.sin(r.ang) * r.largo * 0.5]}
            rotation={[0, -r.ang, 0]}
            scale={[r.largo, r.alto, alto * 0.03]}
          >
            <meshLambertMaterial color={cCortezaBase} flatShading={flat} />
          </mesh>
        ))}

        {/* TRONCO(S) ahusado(s) */}
        {geomTallos.map((geo, i) => (
          <mesh key={`tallo${i}`} geometry={geo}>
            <meshLambertMaterial
              color={i === 0 ? cCortezaClara : cCortezaBase}
              flatShading={flat}
            />
          </mesh>
        ))}

        {/* COPA: nubes de follaje (o de FLOR en el guayacán) sobre el tope */}
        <group position={[forma.inclina ? forma.inclina * alto * 0.6 : 0, alturaCopa, 0]}>
          {armado.copa.map((b, i) => {
            const c = cCopaBase.clone().lerp(cCopaClara, b.tono);
            return (
              <mesh
                key={`copa${i}`}
                geometry={geoBlob}
                position={b.pos}
                scale={b.escala}
              >
                <meshLambertMaterial
                  color={c}
                  flatShading={flat}
                  emissive={forma.floracion ? c.clone().multiplyScalar(0.18) : '#000000'}
                />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
