/*
 * SierraMonte3D — LA VISTA GLOBAL de la Sierra como MONTAÑA 3D DE VERDAD: un
 * macizo con volumen que se ORBITA, no una lámina vista de frente.
 *
 * ── POR QUÉ ESTO Y NO EL CORTE ──────────────────────────────────────────────
 * El corte vertical (`SierraCorteVertical`, que se GUARDA — es la vista-mapa,
 * estática a propósito) se lee como una página de libro: 3D técnicamente, pero
 * compuesto como diagrama. El operador pidió otra cosa: una montaña que se
 * SIENTA un lugar. Aquí el relieve es geometría real —cara, laderas, quebradas,
 * contrafuertes—, la cámara la recorre girando, y la luz direccional MODELA la
 * ladera (eso que un triángulo pintado no puede). Referente: Alto's Odyssey,
 * Journey, Sable. Anti-referente: la montaña-de-los-mundos (parallax 2D).
 *
 * ── LOS PISOS SIGUEN, PERO COMO TERRENO ─────────────────────────────────────
 * No hay franjas de color planas: la base cálida es ancha junto al mar, y
 * subiendo el terreno pasa por templado, frío, páramo y la corona de roca y
 * nieve. El color cae en su banda climática por ALTURA real (cima=5 775 m), y la
 * vegetación instanciada cambia con la altitud: palma abajo, café, bosque de
 * niebla, frailejón, y roca/nieve arriba. Tocar una zona de la montaña —o su
 * hotspot— entra a ese piso; los mundos cuelgan de su altura real en la ladera.
 *
 * ── EL PÁRAMO ES ESPECIAL ───────────────────────────────────────────────────
 * De su banda BAJA el agua (una quebrada que sigue el relieve hasta el mar) y lo
 * corona un velo de bruma. Su hotspot NO invita a "entrar a sembrar" como los de
 * abajo: dice "se cuida, no se siembra". (El grafo aún no tiene la norma legal;
 * la protección se sostiene por diseño.)
 *
 * ── RESPETO ─────────────────────────────────────────────────────────────────
 * La Sierra es territorio sagrado y habitado (Kogui, Arhuaco/Iku, Wiwa,
 * Kankuamo — el Corazón del Mundo, dentro de la Línea Negra). Se acredita
 * siempre; cero iconografía ceremonial.
 *
 * ── RENDIMIENTO ─────────────────────────────────────────────────────────────
 * Terreno = UNA malla (rejilla polar, densidad por tier). Vegetación = un
 * InstancedMesh por especie. Todo procedural, color horneado en vertexColors,
 * geometría fusionada con `fusionarSeguro`. En 'bajo' el macizo va simplificado
 * (baja resolución, poca vegetación, sin agua ni bruma, cámara quieta). Corre en
 * Android barato y Quadro M6000, gateado por `deviceTier`.
 *
 * Importa three/@react-three → montar SOLO perezosa (lazy) desde el shell.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import { ATMOSFERA } from '../atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../deviceTier.js';
import { PISOS_TERMICOS } from '../pisosTermicos.js';
import {
  R_MONTE, H_PICO, Y_MAR,
  geometriaMonte,
  curvaQuebrada, puntoEnLadera, metrosDeY, yDeMetros,
} from './sierraMonte.geom.js';
import {
  geomsEspeciesSierra, vegSierraDeTier, calidadSierra, distribuirEspeciesReales,
  geomVenadoCuerpo, geomVenadoPata, geomAguilaCuerpo, geomAguilaAla,
} from './sierraBiodiversa.geom.js';
import CondorBillboard from '../CondorBillboard.jsx';

/* Las cuatro bandas navegables, del grafo (pisosTermicos.js). `azimut` reparte
   sus hotspots alrededor del macizo para que orbitar los descubra. */
const IDS = ['calido', 'templado', 'frio', 'paramo'];
/* Repartidos ~90° alrededor del macizo: al orbitar siempre asoman un par. */
const AZIMUT = { calido: 0.5, templado: 2.05, frio: -2.6, paramo: -1.05 };
const MUNDO_ANCLA = {
  calido: 'La milpa, los frutales y el corral',
  templado: 'El café bajo sombra y el semillero',
  frio: 'La papa, la huerta y el bosque de niebla',
  paramo: 'La queñua y los frailejones',
};
const BANDAS = IDS.map((id) => {
  const p = PISOS_TERMICOS.find((x) => x.id === id);
  return {
    id, nombre: p.nombre, min: p.min, max: p.max, cultivable: p.cultivable,
    color: p.color, medio: (p.min + p.max) / 2, azimut: AZIMUT[id],
  };
});
/** Banda cuyo rango contiene esa altitud (o null si es corona/mar). */
function bandaDeMetros(m) {
  return BANDAS.find((b) => m >= b.min && m < b.max) || null;
}

/* ── Un banco de matas de UNA especie: una geometría fusionada, N instancias
      (patrón de FloraParamo). El color va horneado en la geo; `tint` lo varía
      apenas por instancia. ── */
function Especie({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(0, it.rotY, 0);
      q.setFromEuler(e);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!geo || !items.length) return null;
  return (
    <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} castShadow={castShadow} />
  );
}

/* ── El MACIZO: la malla del terreno con color horneado + la vegetación
      instanciada por banda. Clicable: el punto tocado decide su piso. ── */
function Macizo({ tier, onEntrar }) {
  const perfil = perfilDeTier(tier);
  const q = calidadSierra(tier);
  const conteos = vegSierraDeTier(tier);

  const geoTerreno = useMemo(() => {
    const g = geometriaMonte(perfil.segmentosTerreno);
    return perfil.flatShading ? g.toNonIndexed() : g;
  }, [perfil.segmentosTerreno, perfil.flatShading]);

  // Cinco especies REALES, una por piso (ceiba/guayacán/roble/queñua) + frailejón
  // coronando el páramo. Reusan la geometría de arbolMayor.geom / sierraMonte.geom.
  const geos = useMemo(() => geomsEspeciesSierra(q), [q]);

  const dist = useMemo(() => distribuirEspeciesReales(conteos, 909), [conteos]);

  const matTerreno = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.97, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const matVeg = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  useEffect(() => () => {
    geoTerreno.dispose();
    Object.values(geos).forEach((g) => g && g.dispose());
    matTerreno.dispose();
    matVeg.dispose();
  }, [geoTerreno, geos, matTerreno, matVeg]);

  const alSuelo = (e) => {
    e.stopPropagation();
    const m = metrosDeY(e.point.y);
    const b = bandaDeMetros(m);
    if (b) onEntrar?.(b.id);
  };

  const sombra = perfil.sombras;
  return (
    <group>
      <mesh
        geometry={geoTerreno}
        material={matTerreno}
        receiveShadow={sombra}
        onClick={alSuelo}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      />
      {/* ceiba (cálido), guayacán (templado), roble (frío) y queñua (filo del
          páramo): las cuatro especies mayores reales, cada una en su piso. */}
      <Especie geo={geos.ceiba} mat={matVeg} items={dist.ceiba} castShadow={sombra} />
      <Especie geo={geos.guayacan} mat={matVeg} items={dist.guayacan} castShadow={sombra} />
      <Especie geo={geos.roble} mat={matVeg} items={dist.roble} castShadow={sombra} />
      <Especie geo={geos.quenua} mat={matVeg} items={dist.quenua} castShadow={sombra} />
      {/* el frailejonar corona el páramo abierto, sobre la queñua */}
      <Especie geo={geos.frailejon} mat={matVeg} items={dist.frailejon} />
    </group>
  );
}

/* ── El mar Caribe al pie: la Sierra es la montaña litoral más alta del mundo, y
      ese contraste ES su silueta. Un disco de agua con degradado por vértice. ── */
function Mar() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(R_MONTE * 6, 64);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const hondo = new THREE.Color('#3f7a86');
    const orilla = new THREE.Color('#8fbcae');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      const t = 1 - Math.min(1, r / (R_MONTE * 1.25));
      c.lerpColors(hondo, orilla, t * t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} position={[0, Y_MAR + 0.02, 0]}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {/* línea de espuma en la orilla: separa la tierra del agua (si no, el
          faldón bajo y el mar se leen como una sola plataforma). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y_MAR + 0.06, 0]}>
        <ringGeometry args={[R_MONTE * 0.9, R_MONTE * 1.02, 72]} />
        <meshBasicMaterial color="#f2ecd8" transparent opacity={0.72} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── El AGUA que baja del páramo: una quebrada que sigue el relieve, con su
      nacedero. Alma de la pieza y firma del piso protegido. ── */
function Quebrada({ tier, reducedMotion }) {
  const curva = useMemo(() => curvaQuebrada(-0.7), []);
  const geoCauce = useMemo(() => new THREE.TubeGeometry(curva, 60, 0.05, 5, false), [curva]);
  useEffect(() => () => geoCauce.dispose(), [geoCauce]);
  const nacedero = curva.getPointAt(0);

  const nGotas = tier === 'alto' ? 6 : 3;
  const gotas = useRef(null);
  const fases = useMemo(() => Array.from({ length: nGotas }, (_, i) => i / nGotas), [nGotas]);
  useFrame((st) => {
    if (reducedMotion || !gotas.current) return;
    const t = st.clock.elapsedTime;
    gotas.current.children.forEach((ch, i) => {
      const u = (fases[i] + t * 0.12) % 1;
      const p = curva.getPointAt(u);
      ch.position.set(p.x, p.y + 0.04, p.z);
    });
  });
  return (
    <group>
      <mesh position={[nacedero.x, nacedero.y + 0.03, nacedero.z]}>
        <sphereGeometry args={[0.14, 12, 10]} />
        <meshBasicMaterial color="#cfeaf0" transparent opacity={0.9} />
      </mesh>
      <mesh geometry={geoCauce}>
        <meshBasicMaterial color="#7cc3d6" transparent opacity={0.9} />
      </mesh>
      <group ref={gotas}>
        {fases.map((_, i) => (
          <mesh key={i} position={[nacedero.x, nacedero.y, nacedero.z]}>
            <sphereGeometry args={[0.06, 7, 6]} />
            <meshBasicMaterial color="#eaffff" transparent opacity={0.95} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* Textura radial suave para la bruma, generada en runtime (sin assets). */
function texturaVaho() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(238,245,246,0.32)');
  g.addColorStop(1, 'rgba(238,245,246,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── El VELO del páramo: bancos de bruma BLANDA (textura radial, no cajas) que
      coronan la banda protegida. No es otra franja: es luz y silencio. Encaran a
      la cámara; derivan despacio. ── */
function VeloParamo({ tier, reducedMotion }) {
  const { camera } = useThree();
  const grupo = useRef(null);
  const n = tier === 'alto' ? 8 : 5;
  const tex = useMemo(() => texturaVaho(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.2, depthWrite: false, fog: false }),
    [tex],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(4.2, 2.1), []);
  const bancos = useMemo(() => {
    const yc = yDeMetros(3450);
    const arr = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 0.7;
      const rn = 0.28 + (i % 3) * 0.05;
      arr.push({
        base: [Math.cos(a) * rn * R_MONTE, yc + 0.35 + (i % 2) * 0.35, Math.sin(a) * rn * R_MONTE],
        fase: i * 1.7,
      });
    }
    return arr;
  }, [n]);
  useEffect(() => () => { tex.dispose(); mat.dispose(); geo.dispose(); }, [tex, mat, geo]);
  useFrame((st) => {
    const g = grupo.current;
    if (!g) return;
    const t = st.clock.elapsedTime;
    g.children.forEach((ch, i) => {
      const b = bancos[i];
      if (!reducedMotion) {
        ch.position.x = b.base[0] + Math.sin(t * 0.06 + b.fase) * 0.7;
        ch.material.opacity = 0.16 + Math.sin(t * 0.1 + b.fase) * 0.06;
      }
      ch.quaternion.copy(camera.quaternion);
    });
  });
  return (
    <group ref={grupo}>
      {bancos.map((b, i) => (
        <mesh key={i} geometry={geo} material={mat} position={/** @type {[number,number,number]} */ (b.base)} />
      ))}
    </group>
  );
}

/* ── FAUNA ALTOANDINA — la vida REAL de la Sierra, que faltaba ────────────────
   La Sierra Nevada es LA sede simbólica del cóndor en el imaginario colombiano y
   hábitat del venado coliblanco y el águila mora. El cóndor reusa el SVG
   rubber-hose de la casa como billboard (el estándar de calidad); el venado y
   el águila van en geometría procedural mínima (`sierraBiodiversa.geom`). Todo
   gateado por tier/reducedMotion: en calma queda quieto y digno. ── */

/* El VENADO COLIBLANCO ANDINO (Odocoileus goudotii, la subespecie de páramo):
   pace alerta en el frío/páramo. Cuerpo tostado fusionado + cuatro patas + la
   COLA BLANCA en alto (su firma). Idle sutil: mecido de peso y coleteo. */
function VenadoSierra({ pos, escala = 0.3, giro = 0, reducedMotion }) {
  const grupo = useRef(null);
  const cola = useRef(null);
  const geoCuerpo = useMemo(() => geomVenadoCuerpo(), []);
  const geoPata = useMemo(() => geomVenadoPata(), []);
  const matCafe = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const matPata = useMemo(() => new THREE.MeshLambertMaterial({ color: '#5d4530' }), []);
  const matBlanco = useMemo(() => new THREE.MeshLambertMaterial({ color: '#f3efe2' }), []);
  useEffect(
    () => () => {
      geoCuerpo.dispose();
      geoPata.dispose();
      matCafe.dispose();
      matPata.dispose();
      matBlanco.dispose();
    },
    [geoCuerpo, geoPata, matCafe, matPata, matBlanco],
  );
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.getElapsedTime();
    grupo.current.rotation.z = Math.sin(t * 0.5 + pos[0]) * 0.03; // mecido de peso
    if (cola.current) cola.current.rotation.x = Math.max(0, Math.sin(t * 1.3 + pos[2])) * 0.5; // coleteo
  });
  return (
    <group ref={grupo} position={/** @type {[number,number,number]} */ (pos)} rotation={[0, giro, 0]} scale={escala}>
      <mesh geometry={geoCuerpo} material={matCafe} />
      {[[0.42, 0.16], [0.42, -0.16], [-0.5, 0.16], [-0.5, -0.16]].map(([px, pz], i) => (
        <mesh key={i} geometry={geoPata} material={matPata} position={[px, 0.74, pz]} />
      ))}
      {/* la cola blanca en alto (Odocoileus la levanta como bandera) */}
      <group ref={cola} position={[-0.66, 1.04, 0]}>
        <mesh material={matBlanco} position={[-0.04, 0.06, 0]} scale={[0.9, 1.5, 0.7]}>
          <sphereGeometry args={[0.1, 6, 5]} />
        </mesh>
      </group>
    </group>
  );
}

/* El ÁGUILA MORA (Geranoaetus melanoleucus, águila real de páramo): planea en
   círculos los altos de la Sierra, bajo el cóndor. Cuerpo oscuro fuselado + dos
   alas anchas que baten a rachas + cola corta en cuña (su firma frente al
   cóndor). El cuerpo mira +z (rumbo); la órbita lo rota a la tangente. */
function AguilaSierra({ centro = [0, H_PICO * 0.62, 0], radio = R_MONTE * 0.46, fase = 0, reducedMotion }) {
  const ave = useRef(null);
  const alaIzq = useRef(null);
  const alaDer = useRef(null);
  const geoCuerpo = useMemo(() => geomAguilaCuerpo(), []);
  const geoAlaD = useMemo(() => geomAguilaAla(1), []);
  const geoAlaI = useMemo(() => geomAguilaAla(-1), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), []);
  useEffect(
    () => () => {
      geoCuerpo.dispose();
      geoAlaD.dispose();
      geoAlaI.dispose();
      mat.dispose();
    },
    [geoCuerpo, geoAlaD, geoAlaI, mat],
  );
  useFrame(({ clock }) => {
    const g = ave.current;
    if (!g) return;
    if (reducedMotion) {
      g.position.set(centro[0] + radio, centro[1], centro[2]);
      return;
    }
    const t = clock.getElapsedTime();
    const a = t * 0.16 + fase; // una vuelta cada ~40 s (más nerviosa que el cóndor)
    const r = radio + Math.sin(t * 0.07) * radio * 0.12;
    g.position.set(
      centro[0] + Math.cos(a) * r,
      centro[1] + Math.sin(t * 0.3 + fase) * 0.6,
      centro[2] + Math.sin(a) * r,
    );
    g.rotation.y = -a; // el cuerpo (+z) apunta a la tangente del giro
    g.rotation.z = 0.12 + Math.sin(t * 0.5) * 0.06; // banqueo hacia adentro
    // aletea a rachas: dos golpes cada tanto, el resto plancha
    const rafaga = Math.max(0, Math.sin(t * 0.4 + fase) - 0.78) * 6;
    const flap = Math.sin(t * 7) * 0.4 * rafaga;
    const base = 0.16; // diedro leve en reposo
    if (alaDer.current) alaDer.current.rotation.z = base + flap;
    if (alaIzq.current) alaIzq.current.rotation.z = -(base + flap);
  });
  return (
    <group ref={ave} position={/** @type {[number,number,number]} */ (centro)}>
      <mesh geometry={geoCuerpo} material={mat} />
      <mesh ref={alaDer} geometry={geoAlaD} material={mat} />
      <mesh ref={alaIzq} geometry={geoAlaI} material={mat} />
    </group>
  );
}

/* Toda la fauna altoandina de la Sierra, gateada por tier/reducedMotion. */
function FaunaSierra({ tier, reducedMotion }) {
  const animado = !reducedMotion && tier !== 'bajo';
  const nCondor = tier === 'alto' ? 2 : 1;
  const hayAguila = tier !== 'bajo';
  const nVenado = tier === 'alto' ? 2 : tier === 'medio' ? 1 : 0;

  const venados = useMemo(
    () =>
      [
        { pos: puntoEnLadera(2900, 1.35), giro: 2.1, escala: 0.3 },
        { pos: puntoEnLadera(3200, -0.5), giro: -1.2, escala: 0.27 },
      ].slice(0, nVenado),
    [nVenado],
  );

  return (
    <group>
      {/* El cóndor de los Andes (Vultur gryphus): planea alto sobre la nieve. */}
      {Array.from({ length: nCondor }).map((_, i) => (
        <CondorBillboard
          key={i}
          centro={[0, H_PICO * (0.92 + i * 0.06), 0]}
          radio={R_MONTE * (0.7 + i * 0.18)}
          velocidad={0.075}
          px={tier === 'alto' ? 60 : 48}
          factor={22}
          animated={animado}
          tier={tier}
        />
      ))}
      {/* El águila mora (Geranoaetus melanoleucus): círculos más bajos y nerviosos. */}
      {hayAguila && (
        <AguilaSierra centro={[0, H_PICO * 0.62, 0]} radio={R_MONTE * 0.46} reducedMotion={!animado} />
      )}
      {/* El venado coliblanco andino (Odocoileus goudotii) paciendo en el frío/páramo. */}
      {venados.map((v, i) => (
        <VenadoSierra key={i} pos={v.pos} giro={v.giro} escala={v.escala} reducedMotion={!animado} />
      ))}
    </group>
  );
}

/* ── Los HOTSPOTS de piso: un pin que cuelga de la altura REAL de su banda en la
      ladera. Toque = entra a ese mundo. El páramo va aparte (frío, "se cuida"). ── */
function HotspotsPisos({ onEntrar }) {
  return (
    <>
      {BANDAS.map((b) => {
        const pos = puntoEnLadera(b.medio, b.azimut);
        const protegido = !b.cultivable;
        return (
          <group key={b.id} position={[pos[0], pos[1] + 0.35, pos[2]]}>
            <mesh>
              <sphereGeometry args={[0.16, 12, 10]} />
              <meshBasicMaterial color={protegido ? '#bfe3ea' : '#ffd679'} transparent opacity={0.95} />
            </mesh>
            <Html center distanceFactor={30} zIndexRange={[20, 0]} occlude>

              <button
                type="button"
                className={`smonte-pin${protegido ? ' smonte-pin--paramo' : ''}`}
                onClick={(ev) => { ev.stopPropagation(); onEntrar?.(b.id); }}
              >
                <span className="smonte-pin__nom">{b.nombre}</span>
                <span className="smonte-pin__cota">{b.min}–{b.max} m</span>
                <span className="smonte-pin__cta">{protegido ? 'Se cuida' : 'Entrar'}</span>
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* Cielo cálido de fondo (degradado por vértice, cero textura). */
function CieloFondo() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(90, 20, 12);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const alto = new THREE.Color('#9cb7c8');
    const bajo = new THREE.Color('#f6ead2');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / 90 + 0.25));
      c.lerpColors(bajo, alto, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/* Luz de hora dorada que MODELA el relieve: un sol bajo direccional (la clave de
   que la ladera se lea 3D y no plana), relleno frío opuesto y hemisférico. */
function LucesMonte({ tier }) {
  const perfil = perfilDeTier(tier);
  return (
    <>
      <hemisphereLight intensity={0.88} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.4} color="#fff2d8" />
      <directionalLight
        position={[-R_MONTE * 0.9, H_PICO * 1.5, R_MONTE * 0.7]}
        intensity={1.25}
        color={ATMOSFERA.luz}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-R_MONTE}
        shadow-camera-right={R_MONTE}
        shadow-camera-top={R_MONTE}
        shadow-camera-bottom={-R_MONTE}
      />
      <directionalLight position={[R_MONTE, H_PICO, -R_MONTE]} intensity={0.4} color={ATMOSFERA.relleno} />
    </>
  );
}

/**
 * La escena del macizo (grupo r3f). Cielo, mar, montaña con vegetación por piso,
 * agua del páramo, velo de bruma, hotspots navegables y la cámara que orbita.
 * @param {{tier:'alto'|'medio'|'bajo', reducedMotion:boolean, onEntrarPiso?:(id:string)=>void}} props
 */
function EscenaMonte({ tier, reducedMotion, onEntrarPiso }) {
  const perfil = perfilDeTier(tier);
  const agua = tier !== 'bajo';
  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[ATMOSFERA.niebla, R_MONTE * 3.0, R_MONTE * 6.2]} />}
      <LucesMonte tier={tier} />
      <CieloFondo />
      <Mar />
      <Macizo tier={tier} onEntrar={onEntrarPiso} />
      {agua && <Quebrada tier={tier} reducedMotion={reducedMotion} />}
      {agua && <VeloParamo tier={tier} reducedMotion={reducedMotion} />}
      <FaunaSierra tier={tier} reducedMotion={reducedMotion} />
      <HotspotsPisos onEntrar={onEntrarPiso} />
      <OrbitControls
        makeDefault
        target={[0, H_PICO * 0.66, 0]}
        enablePan={false}
        enableZoom
        minDistance={R_MONTE * 1.25}
        maxDistance={R_MONTE * 2.4}
        minPolarAngle={0.62}
        maxPolarAngle={1.6}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.32}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

const CSS = `
.smonte-root { position: relative; width: 100%; height: 100dvh; min-height: 360px; overflow: hidden; background: ${ATMOSFERA.fondo}; }
.smonte-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.7s ease; }
.smonte-canvas--lista { opacity: 1; }
.smonte-vineta { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(130% 110% at 44% 40%, transparent 58%, rgba(40,30,16,0.28) 100%); }
.smonte-chrome { position: absolute; inset: 0; pointer-events: none; }
.smonte-titulo { position: absolute; top: 0; left: 0; margin: 0; padding: 0.9rem 1rem 0; color: #2c1f0e; text-shadow: 0 1px 5px rgba(255,246,224,0.8); font: 700 clamp(1.1rem, 3.3vw, 1.44rem)/1.2 system-ui, sans-serif; }
.smonte-titulo__cejilla { display: block; font: 600 0.64rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.16em; color: #8a5a1f; margin-bottom: 0.3rem; }
.smonte-titulo small { display: block; font: 500 0.8rem/1.35 system-ui, sans-serif; opacity: 0.82; margin-top: 0.18rem; max-width: 24rem; }

/* pin flotante de piso (Html sobre la ladera) */
.smonte-pin { display: flex; flex-direction: column; align-items: flex-start; gap: 0.05rem; border: none; cursor: pointer; padding: 0.32rem 0.5rem; border-radius: 0.55rem; background: rgba(255,248,233,0.94); box-shadow: 0 3px 12px rgba(50,34,18,0.34); border-left: 3px solid #b5763a; transform: translateY(-0.4rem); transition: transform 0.15s ease, box-shadow 0.15s ease; white-space: nowrap; }
.smonte-pin:hover { transform: translateY(-0.6rem) scale(1.04); box-shadow: 0 6px 18px rgba(50,34,18,0.44); }
.smonte-pin__nom { font: 700 0.8rem/1.05 system-ui, sans-serif; color: #33240f; }
.smonte-pin__cota { font: 600 0.6rem/1 system-ui, sans-serif; color: #8a6a3a; font-variant-numeric: tabular-nums; }
.smonte-pin__cta { margin-top: 0.15rem; font: 700 0.56rem/1 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.06em; color: #fff8e9; background: #b5763a; padding: 0.16rem 0.4rem; border-radius: 99px; }
.smonte-pin--paramo { border-left-color: #7fa6b2; background: linear-gradient(180deg, rgba(233,244,247,0.97), rgba(255,248,233,0.92)); }
.smonte-pin--paramo .smonte-pin__cta { background: #6f97a3; }

/* fila compacta de pisos abajo (a11y + gama baja): entran sin acertarle al pin */
.smonte-fila { position: absolute; left: 50%; bottom: 4.6rem; transform: translateX(-50%); display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; padding: 0 0.6rem; pointer-events: auto; }
.smonte-chip { display: flex; flex-direction: column; align-items: center; gap: 0.02rem; border: none; cursor: pointer; padding: 0.32rem 0.62rem; border-radius: 0.6rem; background: rgba(255,248,233,0.92); box-shadow: 0 2px 8px rgba(60,42,24,0.24); border-bottom: 3px solid var(--c, #b5763a); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.smonte-chip:hover, .smonte-chip:focus-visible { outline: none; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(60,42,24,0.32); }
.smonte-chip__nom { font: 700 0.78rem/1.05 system-ui, sans-serif; color: #33240f; }
.smonte-chip__cota { font: 600 0.58rem/1 system-ui, sans-serif; color: #8a6a3a; font-variant-numeric: tabular-nums; }
.smonte-chip--paramo { background: linear-gradient(180deg, rgba(233,244,247,0.96), rgba(255,248,233,0.92)); border-bottom-color: #7fa6b2; }

.smonte-pie { position: absolute; bottom: 0; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0 0.85rem 0.7rem; pointer-events: none; }
.smonte-corte { pointer-events: auto; border: none; cursor: pointer; font: 600 0.66rem/1 system-ui, sans-serif; color: #f4ecdd; background: rgba(24,16,7,0.55); padding: 0.4rem 0.75rem; border-radius: 99px; backdrop-filter: blur(3px); }
.smonte-pie p { margin: 0; max-width: 40rem; text-align: center; padding: 0.4rem 0.85rem; border-radius: 0.7rem; background: rgba(24,16,7,0.5); backdrop-filter: blur(3px); color: #f4ecdd; font: 500 0.7rem/1.4 system-ui, sans-serif; }
@media (max-width: 560px) {
  .smonte-fila { bottom: 4.4rem; gap: 0.3rem; }
  .smonte-chip { padding: 0.28rem 0.5rem; }
}
@media (prefers-reduced-motion: reduce) { .smonte-canvas { transition: none; } }
`;

/**
 * SierraMonte3D — la vista global montable con su propio <Canvas>: la Sierra
 * como macizo 3D que se orbita, con sus pisos como terreno y sus mundos colgando
 * de la altura real. Decide su `tier` sola (override por prop).
 *
 * @param {object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]        override; si no, `decidirTier`.
 * @param {boolean} [props.reducedMotion]             override de calma.
 * @param {(pisoId:string)=>void} [props.onEntrarPiso]
 * @param {string}  [props.className]
 * @param {(view:string, data?:any)=>void} [props.onNavigate] inyectada por el shell.
 */
export default function SierraMonte3D({
  tier: tierProp,
  reducedMotion: rmProp,
  onEntrarPiso,
  className = '',
  onNavigate = undefined,
}) {
  const decidido = useMemo(() => decidirTier(), []);
  const tier = tierProp || decidido.tier;
  const reducedMotion = rmProp != null ? rmProp : decidido.reducedMotion;
  const perfil = perfilDeTier(tier);

  const entrarPiso = onEntrarPiso
    ?? (onNavigate ? (pisoId) => onNavigate('montana_mundos', { piso: pisoId }) : undefined);
  const verCorte = onNavigate ? () => onNavigate('sierra_corte') : undefined;

  const [listo, setListo] = useState(false);

  return (
    <section
      className={`smonte-root${className ? ` ${className}` : ''}`}
      data-tier={tier}
      aria-label="La Sierra Nevada como montaña 3D: gírela y toque un piso para entrar a su mundo"
    >
      <style>{CSS}</style>
      <Canvas
        className={`smonte-canvas${listo ? ' smonte-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        shadows={perfil.sombras ? 'soft' : false}
        camera={{ position: [R_MONTE * 0.06, H_PICO * 0.42, R_MONTE * 1.6], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaMonte tier={tier} reducedMotion={reducedMotion} onEntrarPiso={entrarPiso} />
      </Canvas>
      <div className="smonte-vineta" aria-hidden="true" />

      <div className="smonte-chrome">
        <h2 className="smonte-titulo">
          <span className="smonte-titulo__cejilla">Sierra Nevada de Santa Marta</span>
          La Sierra, del mar a la nieve
          <small>Gire la montaña. Toque un piso para entrar a su mundo.</small>
        </h2>

        {/* Fila compacta de pisos abajo: acceso garantizado en móvil/gama baja
            sin tapar la montaña (los pines flotantes son la vía 3D-nativa; esto
            es la red de seguridad para dedos y lectores de pantalla). */}
        <div className="smonte-fila" role="group" aria-label="Pisos térmicos, del mar al páramo">
          {BANDAS.map((b) => {
            const protegido = !b.cultivable;
            return (
              <button
                key={b.id}
                type="button"
                className={`smonte-chip${protegido ? ' smonte-chip--paramo' : ''}`}
                style={{ '--c': b.color }}
                onClick={() => entrarPiso?.(b.id)}
                title={MUNDO_ANCLA[b.id]}
                aria-label={`Entrar al piso ${b.nombre}, ${b.min} a ${b.max} metros${protegido ? ', páramo protegido: se cuida, no se siembra' : ''}`}
              >
                <span className="smonte-chip__nom">{b.nombre}</span>
                <span className="smonte-chip__cota">{b.min}–{b.max} m</span>
              </button>
            );
          })}
        </div>

        <div className="smonte-pie">
          {verCorte && (
            <button type="button" className="smonte-corte" onClick={verCorte}>
              Ver el corte de geografía (la vista-mapa)
            </button>
          )}
          <p role="contentinfo">
            Territorio ancestral y sagrado de los pueblos Kogui, Arhuaco (Iku),
            Wiwa y Kankuamo — el Corazón del Mundo, dentro de la Línea Negra.
            Representado con respeto.
          </p>
        </div>
      </div>
    </section>
  );
}
