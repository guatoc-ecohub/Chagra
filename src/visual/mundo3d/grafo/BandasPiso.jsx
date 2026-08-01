/**
 * BandasPiso.jsx — la cordillera. Lo que convierte una nube de puntos en un mapa.
 *
 * Sin esto, el navegador sería otra constelación abstracta más: bonita, y muda.
 * Estos seis aros son los que le dicen a alguien que sembró toda la vida entre
 * los 2.000 y los 3.000 m «usted está parado ahí, en el aro ancho del medio».
 *
 * TRES COSAS QUE ESTOS AROS DICEN SIN ESCRIBIRLAS
 * ──────────────────────────────────────────────
 * 1. EL ANCHO ES LA VIDA. El radio sale de √población (lo calcula
 *    `grafoLayout`). El frío tiene 39 matas y es el aro más gordo; el nival
 *    tiene cero y es un punto. La silueta que resulta —panzona en la mitad,
 *    puntuda arriba— es un cerro, y nadie la dibujó: la dibujó el dato.
 *
 * 2. EL VACÍO TAMBIÉN ES DATO. Superpáramo y nival se dibujan aunque no tengan
 *    una sola mata, y llevan su sello de «aquí no se siembra». Esconderlos
 *    porque «están vacíos» sería borrar media lección del piso térmico: la
 *    montaña tiene un techo agrícola, y verlo vacío ENSEÑA. Un aro sin nada
 *    adentro es una frase completa.
 *
 * 3. LA NIEBLA ES HONESTIDAD. El aro de abajo, separado por un vacío, es
 *    «sin altura declarada»: las 55 matas que el grafo describe pero de las que
 *    todavía no dice a qué piso pertenecen. Va aparte, en niebla y con línea
 *    rota, porque NO es un piso — es un hueco del conocimiento. Y el mapa
 *    muestra sus huecos en vez de inventarles una altura verosímil.
 *
 * El eje vertical que atraviesa todos los aros es la plomada del cerro: amarra
 * la lectura de un vistazo y cuesta una línea.
 */

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BANDA_PISO, TINTE_PISO, AIRE } from './grafoPaleta.js';

/** Cuántos lados tiene un aro. Pocos = facetado a la vista = tallado a mano. */
const LADOS = { alto: 64, medio: 40, bajo: 26 };

export default function BandasPiso({ bandas, tier, enfocado, onTocarBanda }) {
  const rico = tier === 'alto';
  const lados = LADOS[tier] ?? LADOS.medio;

  /* El eje del cerro: una plomada de la niebla a la cima. */
  const eje = useMemo(() => {
    if (!bandas.length) return null;
    const ys = bandas.map((b) => b.y);
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, Math.min(...ys) - 0.6, 0),
      new THREE.Vector3(0, Math.max(...ys) + 1.1, 0),
    ]);
    return geo;
  }, [bandas]);

  return (
    <group>
      {eje && (
        <line>
          <primitive object={eje} attach="geometry" />
          <lineBasicMaterial color={AIRE.niebla} transparent opacity={0.5} />
        </line>
      )}

      {bandas.map((b) => {
        const tinte = BANDA_PISO[b.id] || BANDA_PISO.sin_piso;
        const vacia = b.poblacion === 0;

        return (
          <group key={b.id} position={[0, b.y, 0]}>
            {/* EL ARO: la orilla del piso. Un toro finito, acostado. */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[b.radio, b.niebla ? 0.012 : 0.022, 4, lados]} />
              <meshBasicMaterial
                color={tinte}
                transparent
                /* La niebla y los aros vacíos se dicen a media voz: están, pero
                   no compiten con donde sí hay vida. */
                opacity={b.niebla ? 0.4 : vacia ? 0.45 : 0.8}
              />
            </mesh>

            {/* EL ESTRATO: solo en gama alta. Un velo tenue que asienta las matas
                sobre algo, como la capa de tierra que son. Sin escribir
                profundidad — es aire teñido, no un piso que tape lo de abajo. */}
            {rico && !b.niebla && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <circleGeometry args={[b.radio, lados]} />
                <meshBasicMaterial
                  color={TINTE_PISO[b.id] || TINTE_PISO.sin_piso}
                  transparent
                  opacity={vacia ? 0.05 : 0.1}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* EL RÓTULO: en la orilla del aro, no encima del mapa. Es DOM real
                (botón), no textura: se lee nítido en cualquier pantalla, lo
                agranda el sistema si usted tiene la letra grande, y el lector de
                pantalla lo anuncia. */}
            <Html
              position={[b.radio + 0.35, 0.1, 0]}
              center={false}
              distanceFactor={12}
              zIndexRange={[24, 0]}
              /* Sin `occlude`: en un grafo con 900 cuerdas, el test de oclusión
                 hace parpadear los rótulos sin parar. Que se lean siempre. */
            >
              <button
                type="button"
                className={`grafo-banda${b.niebla ? ' grafo-banda--niebla' : ''}${enfocado ? ' grafo-banda--tenue' : ''}`}
                style={{ '--banda-tinte': TINTE_PISO[b.id] || TINTE_PISO.sin_piso }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onTocarBanda?.(b)}
              >
                <span className="grafo-banda__nombre">{b.nombre}</span>
                {b.altitud && (
                  <span className="grafo-banda__alt">
                    {b.altitud.min.toLocaleString('es-CO')}–{b.altitud.max.toLocaleString('es-CO')} m
                  </span>
                )}
                <span className="grafo-banda__cuenta">
                  {b.poblacion === 0
                    ? (b.cultivable ? 'sin matas en el grafo' : 'aquí no se siembra')
                    : `${b.poblacion} ${b.poblacion === 1 ? 'mata' : 'matas'}`}
                </span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
