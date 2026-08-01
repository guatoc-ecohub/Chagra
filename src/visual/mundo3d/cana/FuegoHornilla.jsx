/*
 * FuegoHornilla — el FUEGO, el VAPOR y el HUMO del trapiche.
 *
 * Este es el único mundo de Chagra con candela de verdad, y esa es su suerte:
 * en una molienda la LUZ ESTÁ MOTIVADA. No hay que inventar un foco bonito —
 * la fuente es la boca de la hornilla, quemando el bagazo de la misma caña que
 * se molió hace un rato. De noche esa boca es lo único que alumbra la enramada,
 * y el mundo entero se ordena alrededor de ella.
 *
 * Tres piezas, las tres deliberadamente baratas (cero shaders, cero texturas,
 * cero CDN — todo corre en un teléfono de gama media):
 *
 *   · Candela — los conos aditivos de la llama sobre la boca del horno, más la
 *     `pointLight` que de verdad ilumina los postes, las pailas y el techo. La
 *     intensidad la manda la HORA: de día es un acento tibio, de noche manda.
 *   · Vaho    — el vapor que sube de las pailas hirviendo. Discos que miran a la
 *     cámara, suben, se ensanchan y se deshacen. Blanco tibio, no humo.
 *   · Humo    — la columna gris de la chimenea. Más lento, más grande, más
 *     opaco abajo, y se ladea con la brisa (la misma que mece el cañaveral).
 *
 * REDUCED-MOTION: nada de congelar la escena en negro. Las tres piezas quedan
 * QUIETAS pero PRESENTES, cada partícula parada en su punto del recorrido — se
 * sigue leyendo "aquí hay fuego y aquí sube vapor", sin un solo parpadeo.
 *
 * Componentes r3f: montar dentro del <Canvas> de EscenaCanaTrapiche.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '../bosque/sombreadoVegetal.js';

/* La paleta de la candela: del naranja hondo de la brasa al amarillo del
   cogollo de la llama. (No se usan los ACENTOS de la paleta madre: esto es luz
   emitida, no pigmento — vive en otra escala.) */
const LLAMA = {
  brasa: '#c2380f',
  cuerpo: '#f2751c',
  lengua: '#ffab35',
  cogollo: '#ffe08a',
};

/**
 * LA CANDELA de la boca del horno: lenguas de fuego + la luz que sale de ellas.
 *
 * @param {object} p
 * @param {[number,number,number]} p.pos  la boca del horno, en coords del mundo.
 * @param {number} [p.fuerza]  cuánto manda el fuego en la escena (lo pone la
 *   hora: de día ~0,7; al atardecer ~1,2; de noche ~1,8).
 * @param {number} [p.escala]  tamaño de la llama.
 * @param {boolean} [p.luz]    montar la pointLight (solo gama que la aguanta).
 * @param {boolean} [p.reducedMotion]
 */
export function Candela({ pos, fuerza = 1, escala = 1, luz = true, reducedMotion = false }) {
  const grupo = useRef(null);
  const foco = useRef(null);
  const brillo = useRef(null);

  /* Las lenguas: unas pocas, de tamaños y ritmos distintos. Una llama pareja no
     existe; lo que la hace leer como fuego es que cada lengua vaya a su aire. */
  const lenguas = useMemo(() => {
    const r = rng(313);
    const cols = [LLAMA.brasa, LLAMA.cuerpo, LLAMA.cuerpo, LLAMA.lengua, LLAMA.lengua, LLAMA.cogollo];
    return cols.map((color, i) => ({
      color,
      // las de adentro son chicas y altas; las de afuera, anchas y bajas
      radio: (0.36 - i * 0.045) * escala,
      alto: (0.52 + i * 0.14) * escala,
      x: (r() - 0.5) * 0.34 * escala,
      z: (r() - 0.5) * 0.26 * escala,
      fase: r() * Math.PI * 2,
      vel: 2.6 + r() * 2.8,
      op: 0.30 + i * 0.09,
    }));
  }, [escala]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    // Con reducedMotion se planta un instante fijo del fuego: presencia sin baile.
    const t = reducedMotion ? 1.7 : clock.elapsedTime;
    let suma = 0;
    for (let i = 0; i < g.children.length; i++) {
      const m = /** @type {any} */ (g.children[i]);
      const d = lenguas[i];
      if (!d) continue;
      // La lengua sube, se estira y se encoge; nunca las dos igual.
      const pulso = 0.72 + 0.28 * Math.sin(t * d.vel + d.fase);
      const lateral = 0.14 * Math.sin(t * d.vel * 0.6 + d.fase * 1.7);
      m.scale.set(pulso, 0.78 + 0.42 * Math.sin(t * d.vel * 0.8 + d.fase), pulso);
      m.position.set(d.x + lateral * escala, d.alto * 0.5 * m.scale.y, d.z);
      m.rotation.z = lateral * 0.8;
      m.material.opacity = d.op * (0.72 + 0.28 * Math.sin(t * d.vel * 1.3 + d.fase));
      suma += pulso;
    }
    // LA LUZ sale de la llama, no al revés: sigue su pulso.
    const vivo = suma / Math.max(1, lenguas.length);
    if (foco.current) foco.current.intensity = 2.5 * fuerza * vivo;
    if (brillo.current) brillo.current.material.opacity = 0.28 * fuerza * vivo;
  });

  return (
    <group position={pos}>
      <group ref={grupo}>
        {lenguas.map((d, i) => (
          <mesh key={i}>
            <coneGeometry args={[d.radio, d.alto, 7, 1, true]} />
            <meshBasicMaterial
              color={d.color}
              transparent
              opacity={d.op}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* El resplandor sobre el piso de la era: la mancha de luz de la boca. */}
      <mesh ref={brillo} position={[0, -0.28, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.7 * escala, 18]} />
        <meshBasicMaterial
          color={LLAMA.lengua}
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* LA LUZ MOTIVADA de este mundo. Sin sombras a propósito: el shadow-map
          se lo lleva el sol de la atmósfera, y una segunda cámara de sombra por
          una llama no vale lo que cuesta en un teléfono. */}
      {luz && <pointLight ref={foco} color={LLAMA.lengua} intensity={2.5 * fuerza} distance={17} decay={2} position={[0, 0.5, 0.3]} />}
    </group>
  );
}

/**
 * Una COLUMNA de partículas que miran a la cámara: sirve igual para el vapor de
 * una paila que para el humo de la chimenea. Cada disco sube desde la base,
 * crece y se desvanece; al llegar arriba vuelve a nacer abajo.
 *
 * Los discos se orientan UNO POR UNO con la cámara (no el grupo entero): así el
 * penacho sigue subiendo en vertical de verdad aunque uno gire alrededor.
 *
 * @param {object} p
 * @param {[number,number,number]} p.pos   la base de la columna.
 * @param {number} p.n        cuántos discos.
 * @param {number} p.alto     hasta dónde sube antes de deshacerse.
 * @param {number} p.radio    radio inicial del disco.
 * @param {number} [p.crece]  cuánto se ensancha al subir.
 * @param {string} p.color
 * @param {number} [p.opacidad]
 * @param {number} [p.vel]    vueltas por segundo del ciclo de una partícula.
 * @param {[number,number]} [p.deriva]  hacia dónde lo ladea la brisa (x, z).
 * @param {boolean} [p.reducedMotion]
 */
export function Columna({
  pos, n, alto, radio, crece = 2.4, color, opacidad = 0.3, vel = 0.22,
  deriva = [0.5, 0], reducedMotion = false,
}) {
  const grupo = useRef(null);

  const datos = useMemo(() => {
    const r = rng(Math.round((pos[0] + pos[2]) * 97) + n * 13 + 5);
    return Array.from({ length: n }, () => ({
      fase: r(),
      jx: (r() - 0.5) * radio * 1.5,
      jz: (r() - 0.5) * radio * 1.5,
      vueltas: 0.75 + r() * 0.55, // cada bocanada va a su ritmo
      bamboleo: (r() - 0.5) * 1.6,
      esc: 0.7 + r() * 0.6,
    }));
  }, [n, radio, pos]);

  useFrame(({ clock, camera }) => {
    const g = grupo.current;
    if (!g) return;
    const t = reducedMotion ? 3.3 : clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = /** @type {any} */ (g.children[i]);
      const d = datos[i];
      if (!d) continue;
      // u ∈ [0,1): dónde va esta bocanada en su recorrido.
      const u = (t * vel * d.vueltas + d.fase) % 1;
      const y = u * alto;
      // Sube ladeándose con la brisa y bamboleando un poco.
      const abre = 1 + u * crece;
      m.position.set(
        d.jx + deriva[0] * y * 0.42 + Math.sin(u * 3.4 + d.bamboleo * 4) * radio * 0.5,
        y,
        d.jz + deriva[1] * y * 0.42,
      );
      m.scale.setScalar(radio * abre * d.esc);
      // Nace de golpe, se apaga despacio: así se lee "sale de ahí".
      const nace = Math.min(1, u * 7);
      const muere = 1 - u;
      m.material.opacity = opacidad * nace * muere * muere;
      // El disco mira a la cámara, uno por uno.
      m.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={grupo} position={pos}>
      {datos.map((d, i) => (
        <mesh key={i}>
          <circleGeometry args={[1, 12]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * EL VAPOR de una paila hirviendo: blanco tibio, sube rápido y se deshace cerca.
 * @param {{pos: [number,number,number], n?: number, fuerza?: number,
 *          color?: string, reducedMotion?: boolean}} p
 */
export function VaporPaila({ pos, n = 6, fuerza = 1, color = '#fdf6e6', reducedMotion = false }) {
  return (
    <Columna
      pos={pos}
      n={n}
      alto={2.1}
      radio={0.22}
      crece={3.1}
      color={color}
      opacidad={0.30 * fuerza}
      vel={0.30}
      deriva={[0.34, -0.1]}
      reducedMotion={reducedMotion}
    />
  );
}

/**
 * EL HUMO de la chimenea: gris, lento, grande. La caña quemando su propio
 * bagazo — el penacho que se ve desde el otro lado del valle y anuncia que hoy
 * hay molienda.
 * @param {{pos: [number,number,number], n?: number, color?: string,
 *          reducedMotion?: boolean}} p
 */
export function HumoChimenea({ pos, n = 10, color = '#9a938a', reducedMotion = false }) {
  return (
    <Columna
      pos={pos}
      n={n}
      alto={5.6}
      radio={0.44}
      crece={2.9}
      color={color}
      opacidad={0.26}
      vel={0.15}
      deriva={[0.72, -0.22]}
      reducedMotion={reducedMotion}
    />
  );
}
