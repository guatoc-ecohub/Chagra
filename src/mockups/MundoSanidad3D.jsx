/*
 * MundoSanidad3D — SANIDAD DEL CULTIVO: la CLÍNICA DE CAMPO donde se aprende a
 * DIAGNOSTICAR por observación (ruta #/mockups/mundo-sanidad-3d).
 *
 * No es una armería contra los bichos: es una mesa de diagnóstico. El campesino
 * llega con una hoja en la mano y aprende a MIRAR — síntoma → causa → manejo,
 * siempre agroecológico, nunca a punta de veneno. El diorama arma la consulta:
 *
 *   - LA MESA DE DIAGNÓSTICO bajo la enramada, con la LUPA grande sobre una
 *     muestra: el gesto central de toda la escena es AGACHARSE Y MIRAR DE CERCA.
 *   - HOJA SANA vs HOJA ENFERMA lado a lado en dos atriles: el ojo aprende el
 *     contraste (verde parejo vs amarilleo, manchas, borde quemado).
 *   - EL MURAL DE PLAGAS reconocibles, cada una por su seña: la broca perfora el
 *     grano, el minador deja galerías en serpentina, la cochinilla y los áfidos
 *     hacen colonias, la gota (tizón) mancha y pudre la hoja de papa.
 *   - PLAGA vs ENFERMEDAD: el bicho que se ve y CAMINA, contra la mancha que
 *     CRECE sola y no se mueve — la distinción que cambia el manejo.
 *   - EL MANEJO SIN VENENO: la mariquita y la avispa parasitoide (control
 *     biológico), la trampa amarilla, la poda sanitaria con su canasta, y la
 *     olla del caldo casero. Cuidar el cultivo cuidando la vida que lo defiende.
 *
 * DIRECCIÓN DE ARTE (mockup STANDALONE, todo dentro del kit del valle):
 *   - Atmósfera del MEDIODÍA claro (`CIELOS_HORA.mediodia`): la buena luz es la
 *     primera herramienta de diagnóstico; a contraluz no se ven las manchas.
 *   - Materiales `PALETA`/`mezclar` (atmosferaMadre): Lambert flatShading, cero
 *     texturas, cero CDN — la ley de coherencia del valle.
 *   - Fauna rubber-hose de la casa (`Bicho`): mariposa y escarabajo de ambiente;
 *     la mariquita y la avispa del control biológico son malla low-poly propia.
 *
 * RENDIMIENTO: paneles y atriles low-poly, Lambert sin shadow-map, presupuestos
 * por `perfilDeTier`; `reducedMotion` congela la lupa, la mariquita y la avispa
 * y pasa el frameloop a demanda. La gama baja se cubre con la vitrina 2D del kit.
 *
 * Español de Colombia, en «usted». Anti-gamificación: no se premia matar bichos,
 * se enseña a OBSERVAR. Autocontenida y offline.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';
import { Bicho } from '../visual/mundo3d/escenas/FaunaEscena.jsx';

/* El mediodía claro del kit: única fuente de la atmósfera de esta escena. */
const DIA = CIELOS_HORA.mediodia;
const TINTE = DIA.niebla;

/* La paleta del framework entintada hacia la luz del mediodía. */
const P = {
  pasto: mezclar('#7ca24f', TINTE, 0.22), // la falda verde alrededor
  pastoSeco: mezclar('#a8a45c', TINTE, 0.24), // motas al sol
  patio: mezclar('#b7a074', TINTE, 0.24), // tierra apisonada del patio de la consulta
  tierraEra: mezclar('#5a4630', TINTE, 0.18), // la era sembrada del costado
  maderaVieja: mezclar('#7a5a38', TINTE, 0.2), // postes y atriles
  maderaClara: mezclar('#a5804e', TINTE, 0.22), // tablas y marcos
  paja: mezclar('#c9a860', TINTE, 0.22), // el techo de la enramada
  tabla: mezclar('#d8c9a6', TINTE, 0.16), // la cara clara de los paneles
  piedra: mezclar(PALETA.piedra, TINTE, 0.3),
  // las hojas de la consulta
  hojaSana: mezclar('#4f9b3f', TINTE, 0.14), // verde vivo, parejo
  hojaVena: mezclar('#3c7a30', TINTE, 0.16),
  hojaEnferma: mezclar('#b6b04a', TINTE, 0.14), // amarilleo de la hoja enferma
  necrosis: mezclar('#6e4322', TINTE, 0.1), // la mancha necrótica, café oscuro
  necrosisHalo: mezclar('#caa24e', TINTE, 0.14), // el halo clorótico alrededor
  galeria: mezclar('#efe7cf', TINTE, 0.06), // la galería blanca del minador
  cochinilla: mezclar('#f2ede0', TINTE, 0.05), // el algodón de la cochinilla
  afido: mezclar('#8fbf5a', TINTE, 0.14), // la colonia verde de áfidos
  cereza: mezclar('#c33a2e', TINTE, 0.08), // el grano maduro del café
  cerezaVerde: mezclar('#7fa24a', TINTE, 0.14), // el grano todavía verde
  hongo: mezclar('#7a5038', TINTE, 0.12), // el anillo del hongo que se expande
  // el control biológico
  mariquita: mezclar('#cf3a2c', TINTE, 0.06), // el rojo de la mariquita
  avispa: mezclar('#2b2b26', TINTE, 0.1), // el cuerpo oscuro de la avispa
  avispaBanda: mezclar('#e0b23a', TINTE, 0.08), // sus bandas
  ala: '#eef3f0', // ala membranosa
  trampa: mezclar('#f2c22e', TINTE, 0.06), // la trampa amarilla pegajosa
  canasta: mezclar('#9a7440', TINTE, 0.18), // la canasta de la poda
  olla: mezclar('#6a4a34', TINTE, 0.16), // la olla del caldo
  caldo: mezclar('#7f8a3c', TINTE, 0.12), // el caldo de ortiga verdoso
  // la lupa: el gesto central
  laton: mezclar('#c08a3a', TINTE, 0.1), // el aro de latón
  mango: mezclar('#5c3f26', TINTE, 0.14), // el mango de madera
  vidrio: '#dcefff', // el cristal
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}
/* Ruido determinista (hash de senos): misma finca siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía: una explanada amable de consulta, aplanada en el centro para el
   patio de la clínica, con lomas suaves al fondo que cierran la escena. */
const ANCHO = 36;
const FONDO = 30;
function explanada(wx, wz) {
  return Math.max(
    gauss(wx, wz, 0, 1.5, 8.0, 5.2), // el patio ancho de la consulta
    gauss(wx, wz, -5, 4.5, 4.0, 3.0), // el rincón de los atriles
  );
}
function alturaFinca(wx, wz) {
  let h = 0.55 + ruido(wx * 0.5, wz * 0.5) * 0.2;
  h += gauss(wx, wz, -13, -11, 6.0, 4.2) * 2.0; // loma occidental
  h += gauss(wx, wz, 13, -12, 7.0, 4.6) * 2.4; // loma oriental
  h += gauss(wx, wz, 0, -14, 9.0, 3.6) * 1.7; // el fondo
  const f = clamp(explanada(wx, wz) * 1.25, 0, 1);
  return h * (1 - f) + 0.55 * f;
}
const Y_PATIO = 0.55;

/* Malla del terreno con colores por vértice: pasto con motas, patio apisonado
   claro en el centro, tierra oscura en la era sembrada del costado. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cPasto = new THREE.Color(P.pasto);
  const cSeco = new THREE.Color(P.pastoSeco);
  const cPatio = new THREE.Color(P.patio);
  const cEra = new THREE.Color(P.tierraEra);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaFinca(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      c.lerpColors(cPasto, cSeco, smoothstep(-0.35, 1.0, ruido(wx + 3, wz - 2)));
      c.lerp(cPatio, clamp(gauss(wx, wz, 0, 2.0, 6.4, 4.2) * 1.0, 0, 0.85));
      c.lerp(cEra, clamp(gauss(wx, wz, -9, 3.5, 2.8, 2.6) * 0.9, 0, 0.75));
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* Las luces del mediodía claro del kit. */
function LucesDia() {
  return (
    <>
      <hemisphereLight intensity={DIA.hemisferio} color={DIA.cielo} groundColor={DIA.suelo} />
      <ambientLight intensity={DIA.ambiente} color={DIA.luz} />
      <directionalLight position={DIA.solPos} intensity={DIA.sol} color={DIA.luz} />
      <directionalLight position={[-6, 5, -7]} intensity={DIA.rellenoInt} color={DIA.relleno} />
    </>
  );
}

/* Nubes del mediodía: esferas planas blancas, quietas, muy lejos. */
function NubesDia() {
  const nubes = [
    [-11, 9.5, -13, 3.2],
    [4, 10.5, -14, 2.4],
    [12, 8.8, -12, 2.9],
  ];
  return (
    <group>
      {nubes.map((n, i) => (
        <mesh key={i} position={[n[0], n[1], n[2]]} scale={[n[3], n[3] * 0.34, n[3] * 0.7]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#fdfaf0" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Etiqueta didáctica sobre la escena (solo en modo «señalar»). */
function Etiqueta({ pos, texto, paso }) {
  return (
    <group position={pos}>
      <Html center distanceFactor={9} zIndexRange={[30, 0]}>
        <div className="sanic-chip" aria-hidden="true">
          {paso != null && <b>{paso}</b>}
          {texto}
        </div>
      </Html>
    </group>
  );
}

/* ═══════════════════ LA HOJA: el sujeto de todo diagnóstico ═══════════════════
   Una hoja plana orientada a la cámara (+z), con su nervadura y, según el caso,
   las señas de lo que le pasa: manchas necróticas, galerías del minador,
   perforaciones, colonias de cochinilla/áfidos, el anillo del hongo. */
function Hoja({
  color = P.hojaSana, w = 1, h = 1.35, manchas = [], galeria = false,
  perforaciones = [], colonias = false, borde = null, anillo = false, seed = 1,
}) {
  const galSitios = useMemo(() => {
    if (!galeria) return [];
    const rng = crearRng(500 + seed);
    // una galería en serpentina: cadena de puntos siguiendo una sinusoide
    return Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      const x = -0.42 + t * 0.9;
      const y = -0.3 + t * 0.7 + Math.sin(t * 9 + rng()) * 0.16;
      return [x * w, y * h, 0.045];
    });
  }, [galeria, seed, w, h]);

  return (
    <group>
      {/* el limbo de la hoja (disco ovalado a doble cara) */}
      <mesh scale={[w, h, 1]}>
        <circleGeometry args={[0.62, 16]} />
        <meshLambertMaterial color={color} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* borde quemado / clorótico si la hoja está enferma */}
      {borde && (
        <mesh scale={[w * 1.02, h * 1.02, 1]} position={[0, 0, -0.01]}>
          <ringGeometry args={[0.55, 0.63, 20]} />
          <meshBasicMaterial color={borde} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* la nervadura central + un par de nervios laterales */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.02 * w, 1.15 * h, 0.01]} />
        <meshLambertMaterial color={P.hojaVena} flatShading />
      </mesh>
      {[-0.28, 0.05, 0.32].map((yy, i) => (
        <group key={i} position={[0, yy * h, 0.02]}>
          <mesh position={[0.16 * w, 0, 0]} rotation={[0, 0, -0.7]}>
            <boxGeometry args={[0.012, 0.34 * w, 0.01]} />
            <meshLambertMaterial color={P.hojaVena} flatShading />
          </mesh>
          <mesh position={[-0.16 * w, 0, 0]} rotation={[0, 0, 0.7]}>
            <boxGeometry args={[0.012, 0.34 * w, 0.01]} />
            <meshLambertMaterial color={P.hojaVena} flatShading />
          </mesh>
        </group>
      ))}
      {/* las manchas necróticas: disco café con halo clorótico */}
      {manchas.map((m, i) => (
        <group key={`n${i}`} position={[m[0] * w, m[1] * h, 0.03]}>
          <mesh position={[0, 0, -0.005]}>
            <circleGeometry args={[(m[2] || 0.12) * 1.5, 10]} />
            <meshBasicMaterial color={P.necrosisHalo} />
          </mesh>
          <mesh>
            <circleGeometry args={[m[2] || 0.12, 10]} />
            <meshLambertMaterial color={P.necrosis} flatShading />
          </mesh>
        </group>
      ))}
      {/* el anillo concéntrico del hongo que se EXPANDE (enfermedad) */}
      {anillo && (
        <group position={[0.05 * w, -0.02 * h, 0.035]}>
          {[0.34, 0.24, 0.14].map((r, i) => (
            <mesh key={i} position={[0, 0, i * 0.002]}>
              <ringGeometry args={[r - 0.045, r, 18]} />
              <meshBasicMaterial color={mezclar(P.hongo, P.necrosisHalo, i * 0.28)} side={THREE.DoubleSide} />
            </mesh>
          ))}
          <mesh>
            <circleGeometry args={[0.09, 10]} />
            <meshLambertMaterial color={P.necrosis} flatShading />
          </mesh>
        </group>
      )}
      {/* la galería en serpentina del minador */}
      {galSitios.map((g, i) => (
        <mesh key={`g${i}`} position={g}>
          <sphereGeometry args={[0.035, 5, 4]} />
          <meshBasicMaterial color={P.galeria} />
        </mesh>
      ))}
      {/* las perforaciones: agujeros oscuros que se comió el bicho */}
      {perforaciones.map((p2, i) => (
        <mesh key={`p${i}`} position={[p2[0] * w, p2[1] * h, 0.03]}>
          <circleGeometry args={[p2[2] || 0.07, 8]} />
          <meshBasicMaterial color="#241a10" />
        </mesh>
      ))}
      {/* las colonias: algodón de la cochinilla + puntitos verdes de áfidos */}
      {colonias && (
        <group position={[0, 0, 0.05]}>
          {[[-0.18, 0.12], [-0.05, -0.05], [0.14, 0.18], [0.2, -0.14], [0.0, 0.28]].map((c, i) => (
            <mesh key={`c${i}`} position={[c[0] * w, c[1] * h, 0]}>
              <sphereGeometry args={[0.055, 6, 5]} />
              <meshLambertMaterial color={P.cochinilla} flatShading />
            </mesh>
          ))}
          {[[0.1, 0.02], [0.16, 0.06], [0.06, 0.08], [0.2, -0.02], [0.12, -0.05], [-0.1, 0.2]].map((a, i) => (
            <mesh key={`a${i}`} position={[a[0] * w, a[1] * h, 0.02]}>
              <sphereGeometry args={[0.026, 5, 4]} />
              <meshLambertMaterial color={P.afido} flatShading />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/* ═══════════════════ EL ATRIL: la hoja puesta a examen ═══════════════════
   Un caballete de madera con la muestra montada, inclinada hacia la cámara. */
function Atril({ pos, rot = 0, children }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* las tres patas del caballete */}
      {[[-0.5, 0.1, 0.3], [0.5, 0.1, 0.3], [0, 0.1, -0.35]].map((l, i) => (
        <mesh key={i} position={[l[0], 0.62, l[2]]} rotation={[l[2] > 0 ? 0.18 : -0.28, 0, l[0] * 0.24]}>
          <cylinderGeometry args={[0.04, 0.05, 1.28, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* la bandeja/soporte */}
      <mesh position={[0, 1.22, 0.14]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[1.15, 0.06, 0.14]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* la tabla de fondo, inclinada, con la hoja al frente */}
      <group position={[0, 1.55, 0.02]} rotation={[-0.22, 0, 0]}>
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[1.2, 1.55, 0.05]} />
          <meshLambertMaterial color={P.tabla} flatShading />
        </mesh>
        <group position={[0, 0.05, 0.05]} scale={0.92}>{children}</group>
      </group>
    </group>
  );
}

/* ═══════════════════ EL PANEL EXPOSITOR del mural de plagas ═══════════════════
   Tabla vertical sobre dos postes, con la muestra montada al frente (+z). */
function Panel({ pos, rot = 0, w = 1.7, h = 1.9, children }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[-w / 2 + 0.12, w / 2 - 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.95, -0.06]}>
          <cylinderGeometry args={[0.06, 0.07, 1.9, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* la tabla */}
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[w, h, 0.08]} />
        <meshLambertMaterial color={P.tabla} flatShading />
      </mesh>
      {/* el marco */}
      <mesh position={[0, 1.85, 0.045]}>
        <boxGeometry args={[w, h, 0.02]} />
        <meshLambertMaterial color={mezclar(P.maderaClara, TINTE, 0.1)} flatShading wireframe />
      </mesh>
      <group position={[0, 1.85, 0.09]}>{children}</group>
    </group>
  );
}

/* La rama de café con la broca: granos maduros, uno perforado con su agujero y
   el diminuto escarabajo asomando. La seña: el hueco en el grano. */
function RamaBroca() {
  return (
    <group>
      {/* el gajo */}
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.03, 0.045, 1.3, 5]} />
        <meshLambertMaterial color={mezclar(P.maderaVieja, '#4a3420', 0.4)} flatShading />
      </mesh>
      {/* hojas de café detrás */}
      {[[-0.34, 0.2, 0.7], [0.34, -0.05, -0.6]].map((hh, i) => (
        <mesh key={i} position={[hh[0], hh[1], -0.03]} rotation={[0, 0, hh[2]]} scale={[0.5, 0.9, 1]}>
          <circleGeometry args={[0.3, 12]} />
          <meshLambertMaterial color={P.hojaSana} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* los granos (cerezas) */}
      {[[-0.16, 0.34], [0.14, 0.28], [-0.02, 0.06], [0.2, -0.08], [-0.18, -0.14]].map((c, i) => (
        <mesh key={i} position={[c[0], c[1], 0.06]}>
          <sphereGeometry args={[0.13, 8, 7]} />
          <meshLambertMaterial color={i === 2 ? P.cerezaVerde : P.cereza} flatShading />
        </mesh>
      ))}
      {/* EL grano perforado: agujero oscuro + broca asomando */}
      <group position={[0.14, 0.28, 0.19]}>
        <mesh>
          <circleGeometry args={[0.038, 8] } />
          <meshBasicMaterial color="#1c130a" />
        </mesh>
        <mesh position={[0, 0, 0.01]} scale={[1, 1.5, 1]}>
          <sphereGeometry args={[0.028, 6, 5]} />
          <meshLambertMaterial color="#2a2018" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ═══════════════════ EL CONTROL BIOLÓGICO: aliados, no venenos ═══════════════════ */

/* La mariquita (catarina): domo rojo con puntos negros, cabeza y patitas.
   Anda despacio sobre la hoja comiéndose los áfidos. reduced-motion: quieta. */
function Mariquita({ pos = [0, 0, 0], esc = 1, reducedMotion = false, semilla = 1 }) {
  const ref = useRef(null);
  const base = useRef(pos);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime * 0.5 + semilla;
    ref.current.position.x = base.current[0] + Math.cos(t) * 0.16;
    ref.current.position.z = base.current[2] + Math.sin(t * 1.3) * 0.1;
    ref.current.rotation.y = -t;
  });
  return (
    <group ref={ref} position={pos} scale={esc}>
      {/* los élitros rojos (medio domo) */}
      <mesh position={[0, 0.06, 0]} scale={[1, 0.6, 1.25]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshLambertMaterial color={P.mariquita} flatShading />
      </mesh>
      {/* la línea de partición y los puntos */}
      <mesh position={[0, 0.12, 0]} scale={[0.02, 0.2, 1.5]}>
        <boxGeometry args={[1, 0.4, 0.12]} />
        <meshLambertMaterial color="#1a1410" flatShading />
      </mesh>
      {[[-0.06, 0.05], [0.06, 0.05], [-0.05, -0.08], [0.05, -0.08]].map((d, i) => (
        <mesh key={i} position={[d[0], 0.13, d[1]]}>
          <sphereGeometry args={[0.02, 5, 4]} />
          <meshLambertMaterial color="#1a1410" flatShading />
        </mesh>
      ))}
      {/* la cabecita */}
      <mesh position={[0, 0.07, 0.15]} scale={[1, 0.7, 0.8]}>
        <sphereGeometry args={[0.06, 7, 6]} />
        <meshLambertMaterial color="#1a1410" flatShading />
      </mesh>
    </group>
  );
}

/* La avispa parasitoide (Trichogramma/Cotesia estilizada): cuerpo oscuro con
   bandas, alas membranosas, cintura fina. Ronda la hoja buscando huevos de
   plaga. La aliada invisible del control biológico. */
function AvispaParasitoide({ pos = [0, 0, 0], esc = 1, reducedMotion = false, semilla = 2 }) {
  const ref = useRef(null);
  const alas = useRef(null);
  const base = useRef(pos);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime * 0.8 + semilla;
    if (ref.current) {
      ref.current.position.x = base.current[0] + Math.sin(t) * 0.28;
      ref.current.position.y = base.current[1] + Math.sin(t * 2.1) * 0.12;
      ref.current.position.z = base.current[2] + Math.cos(t * 0.7) * 0.18;
      ref.current.rotation.y = Math.sin(t) * 0.6;
    }
    if (alas.current) alas.current.rotation.z = Math.sin(clock.elapsedTime * 40) * 0.4;
  });
  return (
    <group ref={ref} position={pos} scale={esc}>
      {/* tórax */}
      <mesh position={[0, 0, 0.06]} scale={[1, 1, 1.2]}>
        <sphereGeometry args={[0.05, 7, 6]} />
        <meshLambertMaterial color={P.avispa} flatShading />
      </mesh>
      {/* cintura fina */}
      <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.05, 5]} />
        <meshLambertMaterial color={P.avispa} flatShading />
      </mesh>
      {/* abdomen con bandas */}
      <group position={[0, 0, -0.1]}>
        <mesh scale={[1, 1, 1.6]}>
          <sphereGeometry args={[0.05, 7, 6]} />
          <meshLambertMaterial color={P.avispa} flatShading />
        </mesh>
        <mesh position={[0, 0, -0.02]} scale={[1.02, 1.02, 0.25]}>
          <sphereGeometry args={[0.05, 7, 6]} />
          <meshLambertMaterial color={P.avispaBanda} flatShading />
        </mesh>
      </group>
      {/* cabeza */}
      <mesh position={[0, 0.01, 0.14]}>
        <sphereGeometry args={[0.033, 6, 5]} />
        <meshLambertMaterial color={P.avispa} flatShading />
      </mesh>
      {/* las alas membranosas */}
      <group ref={alas} position={[0, 0.04, 0.03]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0, -0.02]} rotation={[0, 0, s * 0.2]} scale={[1, 0.4, 2.2]}>
            <circleGeometry args={[0.07, 8]} />
            <meshBasicMaterial color={P.ala} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* La trampa amarilla pegajosa: la tabla que atrae y atrapa insectos voladores,
   sostenida por una estaca. Manejo físico, sin veneno. */
function TrampaAmarilla({ pos, rot = 0 }) {
  const bichos = [[-0.1, 0.1], [0.12, -0.05], [0.02, 0.2], [-0.14, -0.12], [0.16, 0.14]];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 1.0, 5]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.5, 0.62, 0.03]} />
        <meshLambertMaterial color={P.trampa} flatShading />
      </mesh>
      {bichos.map((b, i) => (
        <mesh key={i} position={[b[0], 1.15 + b[1], 0.025]}>
          <sphereGeometry args={[0.018, 5, 4]} />
          <meshLambertMaterial color="#2a2018" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La poda sanitaria: una matica con una rama enferma cortada, las tijeras de
   podar apoyadas y la canasta donde va lo retirado (no al suelo del cultivo). */
function PodaSanitaria({ pos, rot = 0 }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* la matica */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.7, 6]} />
        <meshLambertMaterial color={mezclar(P.maderaVieja, '#4a3420', 0.3)} flatShading />
      </mesh>
      {[[-0.28, 0.62, 0.5, P.hojaSana], [0.3, 0.7, -0.5, P.hojaSana], [0, 0.9, 0, P.hojaSana]].map((f, i) => (
        <mesh key={i} position={[f[0], f[1], 0]} rotation={[0, 0, f[2]]}>
          <sphereGeometry args={[0.22, 7, 6]} />
          <meshLambertMaterial color={f[3]} flatShading />
        </mesh>
      ))}
      {/* la rama enferma ya cortada, en el suelo junto a la canasta */}
      <mesh position={[0.55, 0.08, 0.35]} rotation={[0, 0.4, 1.4]}>
        <cylinderGeometry args={[0.025, 0.035, 0.55, 5]} />
        <meshLambertMaterial color={mezclar(P.necrosis, P.maderaVieja, 0.4)} flatShading />
      </mesh>
      {/* la canasta de la poda */}
      <group position={[0.85, 0, 0.35]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.4, 10, 1, true]} />
          <meshLambertMaterial color={P.canasta} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.22, 10]} />
          <meshLambertMaterial color={mezclar(P.canasta, '#4a3420', 0.4)} flatShading />
        </mesh>
        {/* hojas enfermas retiradas dentro */}
        {[[-0.08, 0.4], [0.06, 0.42], [0.0, 0.44]].map((h, i) => (
          <mesh key={i} position={[h[0], h[1], 0]} rotation={[1.2, i, 0]} scale={[0.5, 0.7, 1]}>
            <circleGeometry args={[0.14, 10]} />
            <meshLambertMaterial color={P.hojaEnferma} flatShading side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* las tijeras de podar apoyadas en el tronco */}
      <group position={[-0.18, 0.55, 0.18]} rotation={[0, 0, -0.5]}>
        <mesh rotation={[0, 0, 0.12]}>
          <boxGeometry args={[0.06, 0.34, 0.02]} />
          <meshLambertMaterial color="#b9c0c4" flatShading />
        </mesh>
        <mesh rotation={[0, 0, -0.12]}>
          <boxGeometry args={[0.06, 0.34, 0.02]} />
          <meshLambertMaterial color="#9aa1a5" flatShading />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.05, 0.16, 0.05]} />
          <meshLambertMaterial color="#a5622d" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* La olla del caldo casero (ortiga, ceniza, ají-ajo): remedio de la finca, sin
   química de fábrica. La pala de remover apoyada dentro. reduced-motion: quieta. */
function OllaCaldo({ pos, reducedMotion }) {
  const vaho = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !vaho.current) return;
    const t = clock.elapsedTime;
    vaho.current.children.forEach((v, i) => {
      const f = ((t * 0.3 + i * 0.5) % 1.5) / 1.5;
      v.position.y = 0.85 + f * 1.0;
      v.scale.setScalar(0.2 + f * 0.5);
      v.material.opacity = 0.24 * (1 - f);
    });
  });
  return (
    <group position={pos}>
      {/* tres piedras del fogón */}
      {[0, 2.1, 4.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.42, 0.12, Math.sin(a) * 0.42]} rotation={[0.2, a, 0.1]}>
          <dodecahedronGeometry args={[0.16]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}
      {/* la olla de barro */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.42, 0.3, 0.6, 12]} />
        <meshLambertMaterial color={P.olla} flatShading />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.05, 6, 14]} />
        <meshLambertMaterial color={mezclar(P.olla, '#3a2818', 0.4)} flatShading />
      </mesh>
      {/* el caldo verdoso adentro */}
      <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 12]} />
        <meshLambertMaterial color={P.caldo} />
      </mesh>
      {/* la pala de remover */}
      <mesh position={[0.22, 0.95, 0.1]} rotation={[0.2, 0, -0.6]}>
        <cylinderGeometry args={[0.018, 0.022, 0.9, 5]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* el vaho suave del caldo tibio */}
      <group ref={vaho} position={[0, 0, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[(i - 1) * 0.1, 0.9 + i * 0.3, 0]}>
            <sphereGeometry args={[0.3, 6, 5]} />
            <meshBasicMaterial color="#e8ede0" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ═══════════════════ LA LUPA: el gesto central de OBSERVAR ═══════════════════
   La lupa grande sobre un brazo articulado, colgada sobre la muestra de la mesa
   de diagnóstico. Se mece apenas, como si una mano la acercara a la hoja. */
function Lupa({ pos, reducedMotion }) {
  const brazo = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !brazo.current) return;
    const t = clock.elapsedTime;
    brazo.current.rotation.z = -0.35 + Math.sin(t * 0.6) * 0.06;
    brazo.current.position.y = Math.sin(t * 0.9) * 0.03;
  });
  return (
    <group position={pos}>
      {/* el poste y el brazo articulado */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.4, 6]} />
        <meshLambertMaterial color={P.maderaVieja} flatShading />
      </mesh>
      <group ref={brazo} position={[0, 1.4, 0]} rotation={[0, 0, -0.35]}>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 5]} />
          <meshLambertMaterial color={P.mango} flatShading />
        </mesh>
        {/* la lupa al extremo del brazo, mirando hacia abajo a la muestra */}
        <group position={[1.0, -0.08, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
          {/* el aro de latón */}
          <mesh>
            <torusGeometry args={[0.44, 0.05, 8, 22]} />
            <meshLambertMaterial color={P.laton} flatShading />
          </mesh>
          {/* el cristal */}
          <mesh>
            <circleGeometry args={[0.43, 22]} />
            <meshBasicMaterial color={P.vidrio} transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* brillo del cristal */}
          <mesh position={[-0.13, 0.13, 0.01]} rotation={[0, 0, 0.6]} scale={[0.55, 0.18, 1]}>
            <circleGeometry args={[0.24, 12]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.42} depthWrite={false} />
          </mesh>
          {/* el mango */}
          <mesh position={[0, -0.66, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.46, 6]} />
            <meshLambertMaterial color={P.mango} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* La mesa de diagnóstico bajo la enramada: la muestra bajo la lupa, el cuaderno
   de campo y un par de hojas más para comparar. El corazón de la consulta. */
const MESA_POS = [0, Y_PATIO, 0.6];
function MesaDiagnostico({ reducedMotion }) {
  return (
    <group position={MESA_POS}>
      {/* la enramada: cuatro horcones y una PÉRGOLA de listones abierta, para que
          la mesa y la lupa se lean desde arriba (nada de techo que las tape) */}
      {[[-2.0, -1.7], [2.0, -1.7], [-2.0, 1.7], [2.0, 1.7]].map((h, i) => (
        <mesh key={i} position={[h[0], 1.5, h[1]]}>
          <cylinderGeometry args={[0.08, 0.1, 3.0, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* las dos vigas maestras (a lo largo de z) sobre los horcones */}
      {[-2.0, 2.0].map((x, i) => (
        <mesh key={i} position={[x, 3.02, 0]}>
          <boxGeometry args={[0.16, 0.16, 3.9]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}
      {/* los listones cruzados con hueco entre ellos (dejan pasar luz y mirada) */}
      {[-1.75, -1.05, -0.35, 0.35, 1.05, 1.75].map((z, i) => (
        <mesh key={i} position={[0, 3.12, z]}>
          <boxGeometry args={[4.5, 0.08, 0.16]} />
          <meshLambertMaterial color={mezclar(P.paja, '#a8873e', 0.35)} flatShading />
        </mesh>
      ))}

      {/* la mesa */}
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[2.6, 0.1, 1.5]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {[[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].map((p2, i) => (
        <mesh key={i} position={[p2[0], 0.4, p2[1]]}>
          <cylinderGeometry args={[0.06, 0.07, 0.76, 5]} />
          <meshLambertMaterial color={P.maderaVieja} flatShading />
        </mesh>
      ))}

      {/* la MUESTRA bajo la lupa: una hoja enferma tendida al frente de la mesa */}
      <group position={[0.15, 0.84, 0.52]} rotation={[-Math.PI / 2, 0, 0.3]} scale={0.66}>
        <Hoja
          color={P.hojaEnferma}
          manchas={[[-0.15, 0.1, 0.12], [0.18, -0.12, 0.1], [0.02, 0.28, 0.08]]}
          borde={P.necrosisHalo}
          seed={11}
        />
      </group>

      {/* el cuaderno de campo abierto */}
      <group position={[-0.85, 0.84, 0.25]} rotation={[0, 0.4, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.5, 0.36, 0.04]} />
          <meshLambertMaterial color="#f2ead2" flatShading />
        </mesh>
        {[-0.1, 0, 0.1].map((y, i) => (
          <mesh key={i} position={[y, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.02, 0.28, 0.045]} />
            <meshBasicMaterial color="#9a8a66" />
          </mesh>
        ))}
        {/* el lápiz */}
        <mesh position={[0.28, 0.03, 0.05]} rotation={[0, 0.3, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.34, 5]} />
          <meshLambertMaterial color="#c99a3a" flatShading />
        </mesh>
      </group>

      {/* una hoja sana más, apoyada al fondo para comparar */}
      <group position={[1.05, 1.2, -0.35]} rotation={[0, -0.4, 0]} scale={0.5}>
        <Hoja color={P.hojaSana} seed={2} />
      </group>

      {/* LA LUPA, colgada sobre la muestra al frente de la mesa */}
      <Lupa pos={[0.15, 0, 0.52]} reducedMotion={reducedMotion} />
    </group>
  );
}

/* ═══════════════════ LA ESCENA COMPLETA ═══════════════════ */

function EscenaSanidad({ tier, reducedMotion, etiquetas }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <>
      <color attach="background" args={[DIA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DIA.niebla, DIA.nieblaCerca + 4, DIA.nieblaLejos]} />}
      <LucesDia />
      <NubesDia />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* ── EL CORAZÓN: la mesa de diagnóstico con la lupa ── */}
      <MesaDiagnostico reducedMotion={reducedMotion} />

      {/* ── ESTACIÓN 1 · HOJA SANA vs HOJA ENFERMA, lado a lado ── */}
      <Atril pos={[-6.2, Y_PATIO, 4.6]} rot={0.16}>
        <Hoja color={P.hojaSana} seed={3} />
      </Atril>
      <Atril pos={[-4.5, Y_PATIO, 5.0]} rot={0.04}>
        <Hoja
          color={P.hojaEnferma}
          manchas={[[-0.18, 0.12, 0.13], [0.2, -0.1, 0.1], [0.05, 0.3, 0.08], [-0.05, -0.2, 0.09]]}
          borde={P.necrosisHalo}
          seed={7}
        />
      </Atril>

      {/* ── ESTACIÓN 2 · EL MURAL DE PLAGAS reconocibles ── */}
      {/* broca del café: el grano perforado */}
      <Panel pos={[-6.6, Y_PATIO, -3.4]} rot={0.12}>
        <RamaBroca />
      </Panel>
      {/* minador: las galerías en serpentina */}
      <Panel pos={[-3.4, Y_PATIO, -3.9]} rot={0.04}>
        <group scale={1.15}>
          <Hoja color={P.hojaSana} galeria seed={21} />
        </group>
      </Panel>
      {/* cochinilla y áfidos: las colonias */}
      <Panel pos={[-0.1, Y_PATIO, -4.0]} rot={-0.02}>
        <group scale={1.15}>
          <Hoja color={mezclar(P.hojaSana, P.hojaEnferma, 0.25)} colonias seed={31} />
        </group>
      </Panel>
      {/* gota / tizón de la papa: las manchas necróticas que pudren */}
      <Panel pos={[3.2, Y_PATIO, -3.7]} rot={-0.12}>
        <group scale={1.15}>
          <Hoja
            color={mezclar(P.hojaSana, P.hojaEnferma, 0.4)}
            manchas={[[-0.2, 0.14, 0.14], [0.16, 0.1, 0.12], [0.0, -0.15, 0.16], [0.24, -0.18, 0.1]]}
            borde={P.necrosis}
            seed={41}
          />
        </group>
      </Panel>

      {/* ── ESTACIÓN 3 · PLAGA vs ENFERMEDAD ── */}
      {/* PLAGA: el bicho que se ve y camina — hoja comida + insecto encima */}
      <Panel pos={[6.0, Y_PATIO, 2.2]} rot={-0.5} w={1.6} h={1.8}>
        <group scale={1.05}>
          <Hoja
            color={P.hojaSana}
            perforaciones={[[-0.18, 0.16, 0.08], [0.14, 0.02, 0.09], [0.02, -0.2, 0.07], [0.22, 0.2, 0.06]]}
            seed={51}
          />
          {/* un escarabajito posado, la seña de que hay bicho */}
          <mesh position={[0.14, 0.02, 0.12]} scale={[1, 0.7, 1.4]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshLambertMaterial color="#3a2f22" flatShading />
          </mesh>
        </group>
      </Panel>
      {/* ENFERMEDAD: la mancha que crece sola — anillos concéntricos del hongo */}
      <Panel pos={[7.3, Y_PATIO, 3.6]} rot={-0.9} w={1.6} h={1.8}>
        <group scale={1.05}>
          <Hoja color={mezclar(P.hojaSana, P.hojaEnferma, 0.35)} anillo borde={P.necrosisHalo} seed={61} />
        </group>
      </Panel>

      {/* ── ESTACIÓN 4 · EL MANEJO SIN VENENO ── */}
      {/* control biológico: la mariquita y la avispa sobre una hoja con áfidos */}
      <Atril pos={[4.8, Y_PATIO, 5.4]} rot={-0.5}>
        <Hoja color={P.hojaSana} colonias seed={71} />
      </Atril>
      <group position={[4.35, Y_PATIO + 2.05, 5.7]}>
        <Mariquita pos={[0, 0, 0]} esc={1.3} reducedMotion={reducedMotion} semilla={1} />
        <AvispaParasitoide pos={[0.5, 0.25, 0.2]} esc={1.3} reducedMotion={reducedMotion} semilla={3} />
      </group>
      {/* trampas amarillas */}
      <TrampaAmarilla pos={[7.2, Y_PATIO, 6.2]} rot={-0.4} />
      <TrampaAmarilla pos={[8.0, Y_PATIO, 5.2]} rot={-0.7} />
      {/* poda sanitaria con su canasta */}
      <PodaSanitaria pos={[8.6, Y_PATIO, 7.4]} rot={-1.4} />
      {/* la olla del caldo casero */}
      <OllaCaldo pos={[2.4, Y_PATIO, 6.6]} reducedMotion={reducedMotion} />

      {/* ── LAS ETIQUETAS de las estaciones (modo «señalar») ── */}
      {etiquetas && (
        <>
          <Etiqueta pos={[0.15, Y_PATIO + 2.1, 0.7]} texto="La lupa: mirar de cerca" />
          <Etiqueta pos={[-6.2, Y_PATIO + 2.5, 4.6]} paso="1" texto="Hoja sana" />
          <Etiqueta pos={[-4.5, Y_PATIO + 2.5, 5.0]} paso="1" texto="Hoja enferma" />
          <Etiqueta pos={[-6.6, Y_PATIO + 3.1, -3.4]} paso="2" texto="Broca del café" />
          <Etiqueta pos={[-3.4, Y_PATIO + 3.1, -3.9]} paso="2" texto="Minador (galerías)" />
          <Etiqueta pos={[-0.1, Y_PATIO + 3.1, -4.0]} paso="2" texto="Cochinilla y áfidos" />
          <Etiqueta pos={[3.2, Y_PATIO + 3.1, -3.7]} paso="2" texto="Gota (tizón)" />
          <Etiqueta pos={[6.0, Y_PATIO + 2.9, 2.2]} paso="3" texto="Plaga: el bicho camina" />
          <Etiqueta pos={[7.3, Y_PATIO + 2.9, 3.6]} paso="3" texto="Enfermedad: la mancha crece" />
          <Etiqueta pos={[4.6, Y_PATIO + 2.7, 5.4]} paso="4" texto="Control biológico" />
          <Etiqueta pos={[7.6, Y_PATIO + 1.9, 5.7]} paso="4" texto="Trampa amarilla" />
          <Etiqueta pos={[8.6, Y_PATIO + 1.5, 7.4]} paso="4" texto="Poda sanitaria" />
          <Etiqueta pos={[2.4, Y_PATIO + 1.6, 6.6]} paso="4" texto="Caldo casero" />
        </>
      )}

      {/* unas piedras que amueblan el borde del patio */}
      {[[-9.5, 0.5, 0.34], [10.0, 1.5, 0.4], [-1.5, 8.5, 0.3]].map((r, i) => (
        <mesh
          key={i}
          position={[r[0], alturaFinca(r[0], r[1]) + r[2] * 0.3, r[1]]}
          rotation={[0.2, i * 1.7, 0.1]}
        >
          <dodecahedronGeometry args={[r[2]]} />
          <meshLambertMaterial color={P.piedra} flatShading />
        </mesh>
      ))}

      {/* la fauna rubber-hose de la casa, de ambiente */}
      <Bicho
        tipo="mariposa"
        base={[-2.4, Y_PATIO + 1.5, 3.4]}
        size={26}
        rol="polinizador"
        fase={1.4}
        reducedMotion={reducedMotion}
        title="Mariposa sobre el patio de la consulta"
      />
      <Bicho
        tipo="escarabajo"
        base={[1.6, Y_PATIO + 0.12, 4.2]}
        size={22}
        rol="descomponedor"
        fase={0.7}
        reducedMotion={reducedMotion}
        title="Escarabajo en la tierra del patio"
      />

      {/* un polvillo tenue en la luz del mediodía sobre la consulta */}
      <ParticulasAmbientales
        tipo="polen"
        densidad={0.5}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0, 1.6, 2]}
        semilla={29}
      />
    </>
  );
}

/* ═══════════════════ EL CHROME (DOM) ═══════════════════ */

const CSS_SANIC = `
.sanic-root { margin: 0 auto; max-width: 72rem; padding: 0 0 2.5rem; background: #eef3ea; color: #2f3a2a; font-family: system-ui, sans-serif; }
.sanic-head { padding: 1.1rem 1rem 0.4rem; }
.sanic-kicker { margin: 0; font: 600 0.72rem/1.2 system-ui, sans-serif; letter-spacing: 0.09em; text-transform: uppercase; color: #4f7a3a; }
.sanic-head h1 { margin: 0.2rem 0 0.4rem; font-size: clamp(1.35rem, 4vw, 1.9rem); line-height: 1.15; color: #2e4322; }
.sanic-lema { margin: 0; max-width: 46rem; font-size: 0.92rem; line-height: 1.55; color: #43552f; }
.sanic-escena { position: relative; margin: 0.9rem 0 0; height: min(78dvh, 40rem); min-height: 22rem; overflow: hidden; background: ${DIA.fondo}; border-radius: 0; }
.sanic-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.sanic-canvas--lista { opacity: 1; }
.sanic-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; }
.sanic-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.sanic-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(46,67,34,0.66); backdrop-filter: blur(3px); color: #f3f8ec; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.sanic-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(46,67,34,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(244,250,235,0.85); color: #2e4322; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.sanic-boton:hover, .sanic-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(46,67,34,0.6); outline: none; }
.sanic-boton[aria-pressed='true'] { background: #d6ecb8; border-color: rgba(46,67,34,0.75); color: #2e4322; }
.sanic-chip { pointer-events: none; display: inline-flex; align-items: center; gap: 0.3em; padding: 2px 8px; border-radius: 999px; background: rgba(40,52,28,0.82); color: #f3f8ec; font: 600 10px/1.5 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 2px 6px rgba(24,34,14,0.3); }
.sanic-chip b { display: inline-flex; align-items: center; justify-content: center; width: 1.35em; height: 1.35em; border-radius: 50%; background: #7aa83e; color: #1c2a10; font-size: 9px; }
.mundo-fauna { pointer-events: none; filter: drop-shadow(0 2px 5px rgba(30, 40, 20, 0.24)); }
.sanic-leyenda { padding: 1.4rem 1rem 0; }
.sanic-leyenda h2 { margin: 0 0 0.3rem; font-size: 1.12rem; color: #2e4322; }
.sanic-leyenda ol, .sanic-leyenda ul { margin: 0.6rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.7rem; }
.sanic-leyenda li { display: flex; gap: 0.65rem; align-items: flex-start; background: #f6faef; border: 1px solid #d9e6c6; border-radius: 0.7rem; padding: 0.65rem 0.8rem; }
.sanic-emoji { font-size: 1.25rem; line-height: 1.3; }
.sanic-leyenda b { display: block; font-size: 0.88rem; color: #2e4322; }
.sanic-leyenda p { margin: 0.15rem 0 0; font-size: 0.83rem; line-height: 1.5; color: #43552f; }
.sanic-nota { margin: 0.8rem 0 0; font-size: 0.76rem; line-height: 1.5; color: #5f7048; font-style: italic; }
.sanic-cierre { margin: 0.9rem 0 0; max-width: 46rem; font-size: 0.86rem; line-height: 1.55; color: #43552f; }
@media (min-width: 40rem) { .sanic-leyenda ol, .sanic-leyenda ul { grid-template-columns: 1fr 1fr; } }
@media (prefers-reduced-motion: reduce) { .sanic-canvas { transition: none; } }
`;

/* Las señas de campo: qué mirar en cada plaga o enfermedad, sin recetas de
   veneno. El foco es RECONOCER, no dosificar. */
const SENALES = [
  {
    emoji: '🔎',
    titulo: 'Hoja sana vs hoja enferma',
    texto: 'Empiece por comparar. La hoja sana es verde parejo, firme, sin manchas. La enferma amarillea, se mancha o se le quema el borde. El ojo que conoce la sana reconoce rápido la que no lo está.',
  },
  {
    emoji: '☕',
    titulo: 'Broca del café',
    texto: 'Un cucarroncito minúsculo que perfora el grano. La seña es el huequito en la cereza, cerca de la coronita. Se maneja recogiendo los granos caídos (repase), con trampas de alcohol y guardando el cultivo limpio.',
  },
  {
    emoji: '🍃',
    titulo: 'Minador de la hoja',
    texto: 'La larva come por dentro de la hoja y deja galerías blancas en serpentina, como caminitos. No se mata la hoja entera: se retiran las más atacadas y se cuida a sus enemigos naturales (avispas parasitoides).',
  },
  {
    emoji: '🐜',
    titulo: 'Cochinilla y áfidos',
    texto: 'Hacen colonias: la cochinilla como motas de algodón, los áfidos como puntitos verdes apretados en los cogollos. Chupan la savia. Sus enemigos —la mariquita, el crisopa— se los comen si usted no fumiga y los deja vivir.',
  },
  {
    emoji: '🥔',
    titulo: 'Gota (tizón) de la papa',
    texto: 'No es bicho: es un hongo. Aparecen manchas oscuras, aguadas, con halo pálido, que crecen y pudren la hoja en tiempo frío y húmedo. Se maneja con aireación, semilla sana, no mojar el follaje y retirar lo enfermo.',
  },
];

/* La distinción que cambia todo: ¿bicho o mancha? */
const PLAGA_VS_ENF = [
  {
    emoji: '🐛',
    titulo: 'Es PLAGA cuando…',
    texto: 'Hay un animal: se ve, se mueve, camina o vuela, y deja mordeduras, huecos, galerías o mieles pegajosas. Busque el bicho —o su rastro— en el envés de la hoja y en los cogollos, a primera hora de la mañana.',
  },
  {
    emoji: '🍂',
    titulo: 'Es ENFERMEDAD cuando…',
    texto: 'No hay animal: hay una mancha que CRECE sola, se expande en anillos o pudre el tejido, muchas veces con el clima húmedo. El hongo o la bacteria no caminan: se riegan con el agua, el viento y las manos.',
  },
];

/* El manejo sin veneno: cuidar el cultivo cuidando su defensa viva. */
const MANEJO = [
  {
    emoji: '🐞',
    titulo: 'Control biológico',
    texto: 'La finca tiene su propia policía: la mariquita y su larva devoran áfidos, la avispa parasitoide pone sus huevos en los del bicho, el crisopa limpia los cogollos. Fumigar los mata a ellos primero. Déjelos vivir y trabajan gratis.',
  },
  {
    emoji: '🟡',
    titulo: 'Trampas',
    texto: 'La trampa amarilla pegajosa atrae y atrapa los voladores; la de alcohol, la broca. Sirven para VIGILAR (saber qué hay y cuánto) y para bajar la población sin tocar el resto de la vida del cultivo.',
  },
  {
    emoji: '✂️',
    titulo: 'Poda sanitaria',
    texto: 'Lo enfermo se corta y se saca del cultivo —a la canasta, no al suelo— para que no siga contagiando. Herramienta limpia entre planta y planta. Menos hoja enferma, menos de dónde se riegue el mal.',
  },
  {
    emoji: '🌿',
    titulo: 'Caldos y cuidado',
    texto: 'Caldos caseros (ortiga, ceniza, ají-ajo), suelo vivo, asocio de plantas y buena aireación hacen al cultivo más resistente. Un cultivo bien nutrido y acompañado se enferma menos: la mejor defensa es la finca sana.',
  },
];

const COPY_CALMA =
  'La clínica del cultivo: la mesa de diagnóstico con la lupa al centro, la hoja sana y la enferma a un lado, el mural de plagas y el rincón del manejo sin veneno. Toque el botón para ver los nombres.';
const COPY_SENAL =
  'Cada estación tiene su seña. 1: comparar sana y enferma. 2: reconocer la plaga por su marca. 3: distinguir bicho de mancha. 4: manejar cuidando la vida. La lupa manda: primero mirar de cerca.';

/**
 * MundoSanidad3D — la clínica de sanidad del cultivo, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina
 * (#/mockups/mundo-sanidad-3d). El tier y reduced-motion se detectan aquí
 * (mockup standalone), igual que sus pares.
 */
export default function MundoSanidad3D() {
  const [listo, setListo] = useState(false);
  const [etiquetas, setEtiquetas] = useState(false);
  const tier = useMemo(() => decidirTier(), []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);

  return (
    <main className="sanic-root">
      <style>{CSS_SANIC}</style>

      <header className="sanic-head">
        <p className="sanic-kicker">Los mundos de su finca · vitrina</p>
        <h1>La clínica del cultivo</h1>
        <p className="sanic-lema">
          No es una guerra contra los bichos: es aprender a MIRAR. La mesa de
          diagnóstico con su lupa, la hoja sana junto a la enferma, el mural de
          las plagas que se reconocen por su seña y el rincón del manejo sin
          veneno — la mariquita, la trampa amarilla, la poda sanitaria y el
          caldo de la casa. Primero se observa; después se cuida.
        </p>
      </header>

      <section
        className="sanic-escena"
        data-tier={tier}
        aria-label="La clínica de sanidad del cultivo en 3D"
      >
        <Canvas
          className={`sanic-canvas${listo ? ' sanic-canvas--lista' : ''}`}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
          camera={{ position: [1.0, 6.5, 15.0], fov: 45 }}
          frameloop={reducedMotion ? 'demand' : 'always'}
          onCreated={() => setListo(true)}
        >
          <EscenaSanidad tier={tier} reducedMotion={reducedMotion} etiquetas={etiquetas} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={23}
            target={[0.4, 1.1, 1.6]}
            minPolarAngle={0.5}
            maxPolarAngle={1.4}
            minAzimuthAngle={-1.05}
            maxAzimuthAngle={1.05}
            enableDamping
            dampingFactor={0.08}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.08}
          />
          <AdaptiveDpr pixelated />
        </Canvas>

        <div className="sanic-chrome">
          <div className="sanic-pie">
            <button
              type="button"
              className="sanic-boton"
              aria-pressed={etiquetas}
              onClick={() => setEtiquetas((v) => !v)}
            >
              {etiquetas ? 'Quitar las etiquetas' : 'Ver los nombres de las estaciones'}
            </button>
            <p className="sanic-carta" role="status">
              {etiquetas ? COPY_SENAL : COPY_CALMA}
            </p>
          </div>
        </div>
      </section>

      <section className="sanic-leyenda" aria-label="Las señas de campo, plaga por plaga">
        <h2>Aprender a mirar: las señas del cultivo</h2>
        <ul>
          {SENALES.map((s) => (
            <li key={s.titulo}>
              <span className="sanic-emoji" aria-hidden="true">{s.emoji}</span>
              <div>
                <b>{s.titulo}</b>
                <p>{s.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="sanic-nota">
          Reconocer no es fumigar. Estas señas son para OBSERVAR y decidir con
          cabeza fría — nunca dosis de veneno. Ante la duda seria, el técnico
          agrónomo de su región o la UMATA acompañan el diagnóstico.
        </p>
      </section>

      <section className="sanic-leyenda" aria-label="Plaga o enfermedad: cómo distinguir">
        <h2>¿Bicho o mancha? Plaga vs. enfermedad</h2>
        <ul>
          {PLAGA_VS_ENF.map((p) => (
            <li key={p.titulo}>
              <span className="sanic-emoji" aria-hidden="true">{p.emoji}</span>
              <div>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sanic-leyenda" aria-label="El manejo agroecológico, sin veneno">
        <h2>Cuidar sin veneno</h2>
        <ol>
          {MANEJO.map((m) => (
            <li key={m.titulo}>
              <span className="sanic-emoji" aria-hidden="true">{m.emoji}</span>
              <div>
                <b>{m.titulo}</b>
                <p>{m.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="sanic-cierre">
          La sanidad del cultivo no sale de un frasco: sale de un ojo entrenado,
          de un suelo vivo y de una finca donde la mariquita, la avispa y el
          pájaro tienen dónde vivir. El veneno mata al enemigo y también al
          amigo — y deja al cultivo más solo. Observe primero; el manejo justo
          casi siempre es el más suave.
        </p>
      </section>
    </main>
  );
}
