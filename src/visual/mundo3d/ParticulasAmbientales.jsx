/*
 * ParticulasAmbientales — el AIRE de los dioramas: polen dorado que flota,
 * luciérnagas que pulsan al atardecer, motas de polvo en un rayo de luz y
 * mariposas que cruzan la escena. Grupo R3F autocontenido, montable como child
 * de cualquier escena-mundo.
 *
 * CABLEO (para el host, sin tocar este archivo):
 *
 *   import { ParticulasAmbientales } from '../ParticulasAmbientales.jsx';
 *   // dentro del <Canvas> de la escena, junto a la fauna:
 *   <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} />
 *   <ParticulasAmbientales tipo="polvo" position={[2.5, 0.4, -1]} tier={tier} reducedMotion={reducedMotion} />
 *   <ParticulasAmbientales tipo="luciernagas" densidad={0.7} tier={tier} reducedMotion={reducedMotion} />
 *
 *   - `tier` y `reducedMotion` vienen de `decidirTier()` (deviceTier.js), igual
 *     que en el resto del framework. `bajo` monta una fracción; mariposas en
 *     `bajo` no montan.
 *   - `area` y `position` sitúan la nube; los defaults por tipo (particulasData)
 *     asumen escenas de ~10 unidades de lado. Pase `area` ESTABLE (constante de
 *     módulo o useMemo del host): la nube se re-siembra si cambia.
 *   - El polvo trae inclinación de haz por defecto; `rotation` la sobreescribe.
 *   - Asume el frameloop continuo de las escenas vivas (igual que FaunaEscena);
 *     con `frameloop="demand"` la nube queda congelada en su siembra, que es
 *     exactamente el modo reduced-motion.
 *   - Debe importarse desde una escena (chunk perezoso vendor-three): este
 *     archivo importa `three` y `@react-three/fiber`.
 *
 * FRUGALIDAD: cada nube es UN `THREE.Points` (1 draw call); los buffers se mutan
 * en sitio en `useFrame` (cero asignaciones por frame). Las mariposas son 3
 * `InstancedMesh` (alas izq/der + cuerpo) con ≤4 instancias y matrices
 * recompuestas sobre temporales de módulo. Presupuestos por tier en
 * `particulasData.js`; en gama baja el total del kit queda en decenas de
 * vértices — no compite con los 30 fps de nadie.
 *
 * REDUCED-MOTION (contrato del framework): polen y polvo quedan QUIETOS en su
 * siembra (presencia sin movimiento); las luciérnagas quedan quietas a brillo
 * medio fijo (sin parpadeo); las mariposas NO montan — congeladas en el aire
 * leen como glitch, no como calma.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PARTICULAS, conteoParticulas, crearRng } from './particulasData.js';

/* ------------------------------------------------------------------------- *
 * Sprite suave compartido: un radial-gradient de 64px generado UNA vez. Sin él
 * los Points son cuadrados duros; con él, cada partícula es un halo. Cacheado a
 * nivel de módulo (todas las nubes comparten la textura) y con guarda SSR.
 * ------------------------------------------------------------------------- */
let spriteCache = null;
function spriteSuave() {
  if (spriteCache) return spriteCache;
  if (typeof document === 'undefined') return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  spriteCache = new THREE.CanvasTexture(lienzo);
  return spriteCache;
}

/* ------------------------------------------------------------------------- *
 * NubePuntos — polen / polvo / luciérnagas sobre un único THREE.Points.
 * La siembra (posiciones, colores, fases) es determinista por `semilla`.
 * ------------------------------------------------------------------------- */
function NubePuntos({ cfg, n, zona, reducedMotion, semilla }) {
  const puntos = useRef(null);

  const datos = useMemo(() => {
    const rng = crearRng(semilla);
    const pos = new Float32Array(n * 3);
    const base = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const colBase = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    const vel = new Float32Array(n);
    const color = new THREE.Color();
    const [ax, ay, az] = zona;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      base[j] = (rng() - 0.5) * ax;
      base[j + 1] = rng() * ay;
      base[j + 2] = (rng() - 0.5) * az;
      pos[j] = base[j];
      pos[j + 1] = base[j + 1];
      pos[j + 2] = base[j + 2];
      fase[i] = rng() * Math.PI * 2;
      vel[i] = 0.6 + rng() * 0.8;
      color.set(cfg.colores[Math.floor(rng() * cfg.colores.length)]);
      /* Luciérnaga quieta (reduced-motion): brillo medio horneado, sin pulso. */
      const brillo = cfg.parpadeo && reducedMotion ? cfg.parpadeo.quieto : 1;
      colBase[j] = color.r;
      colBase[j + 1] = color.g;
      colBase[j + 2] = color.b;
      col[j] = color.r * brillo;
      col[j + 1] = color.g * brillo;
      col[j + 2] = color.b * brillo;
    }
    return { pos, base, col, colBase, fase, vel };
  }, [cfg, n, zona, reducedMotion, semilla]);

  useFrame(({ clock }) => {
    if (reducedMotion || !puntos.current) return;
    const t = clock.elapsedTime;
    const geo = puntos.current.geometry;
    const p = geo.attributes.position.array;
    const { base, fase, vel } = datos;
    const [, ay] = zona;
    const amp = cfg.deriva?.vaiven ?? 0.3;

    if (cfg.gesto === 'flotar') {
      /* Polen: asciende despacio y ondula; sale por arriba, reaparece abajo. */
      const sube = cfg.deriva.ascenso;
      for (let i = 0; i < datos.fase.length; i++) {
        const j = i * 3;
        p[j] = base[j] + Math.sin(t * 0.5 * vel[i] + fase[i]) * amp;
        p[j + 1] = (base[j + 1] + t * sube * vel[i]) % ay;
        p[j + 2] = base[j + 2] + Math.cos(t * 0.4 * vel[i] + fase[i]) * amp;
      }
    } else if (cfg.gesto === 'errar') {
      /* Luciérnagas: erran despacio y DESTELLAN como bicho real — flash CORTO
         (onda^6: encendida ~1/3 del ciclo, el resto brasa mínima) y ciclos que
         no se repiten (una modulación lenta, desfasada por bicho, apaga
         destellos enteros a ratos). El prado chispea salteado — ni a coro ni
         a media luz. Cero asignaciones por frame, igual que antes. */
      const c = geo.attributes.color.array;
      const { colBase } = datos;
      const { frecuencia, minimo } = cfg.parpadeo;
      for (let i = 0; i < datos.fase.length; i++) {
        const j = i * 3;
        p[j] = base[j] + Math.sin(t * 0.3 * vel[i] + fase[i]) * amp;
        p[j + 1] = base[j + 1] + Math.sin(t * 0.23 * vel[i] + fase[i] * 2.1) * amp * 0.5;
        p[j + 2] = base[j + 2] + Math.cos(t * 0.27 * vel[i] + fase[i]) * amp;
        const respiro = 0.72 + 0.28 * Math.sin(t * 0.11 * vel[i] + fase[i] * 5.3);
        const onda = Math.max(0, Math.sin(t * frecuencia * vel[i] + fase[i] * 3)) * respiro;
        const o2 = onda * onda;
        const pulso = minimo + (1 - minimo) * o2 * o2 * o2;
        c[j] = colBase[j] * pulso;
        c[j + 1] = colBase[j + 1] * pulso;
        c[j + 2] = colBase[j + 2] * pulso;
      }
      geo.attributes.color.needsUpdate = true;
    } else {
      /* Polvo: suspensión browniana mínima dentro del haz. */
      for (let i = 0; i < datos.fase.length; i++) {
        const j = i * 3;
        p[j] = base[j] + Math.sin(t * 0.15 * vel[i] + fase[i]) * amp;
        p[j + 1] = base[j + 1] + Math.sin(t * 0.1 * vel[i] + fase[i] * 1.7) * amp * 1.4;
        p[j + 2] = base[j + 2] + Math.cos(t * 0.12 * vel[i] + fase[i]) * amp;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  /* La nube se mueve dentro de su caja: culling por esfera inicial recortaría
     partículas vivas al borde del encuadre. */
  return (
    <points ref={puntos} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[datos.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={spriteSuave()}
        size={cfg.tam}
        vertexColors
        transparent
        opacity={cfg.opacidad}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------------- *
 * Mariposas — 3 InstancedMesh (ala izq, ala der, cuerpo). Cada mariposa cruza
 * la zona con rumbo propio y reentra por el lado opuesto; el aleteo rota cada
 * ala sobre su bisagra (la geometría va trasladada para que el eje quede en el
 * cuerpo). Temporales de módulo: cero asignaciones por frame.
 * ------------------------------------------------------------------------- */
const M_BASE = new THREE.Matrix4();
const M_ALA = new THREE.Matrix4();
const M_FIN = new THREE.Matrix4();
const DUMMY = new THREE.Object3D();

function Mariposas({ cfg, n, zona, semilla }) {
  const izq = useRef(null);
  const der = useRef(null);
  const cuerpo = useRef(null);

  const geos = useMemo(() => {
    const [aw, ah] = cfg.ala;
    const gIzq = new THREE.PlaneGeometry(aw, ah);
    gIzq.rotateX(-Math.PI / 2);
    gIzq.translate(aw / 2 + 0.015, 0, 0);
    const gDer = new THREE.PlaneGeometry(aw, ah);
    gDer.rotateX(-Math.PI / 2);
    gDer.translate(-aw / 2 - 0.015, 0, 0);
    return { gIzq, gDer };
  }, [cfg]);
  useEffect(() => {
    const { gIzq, gDer } = geos;
    return () => {
      gIzq.dispose();
      gDer.dispose();
    };
  }, [geos]);

  const datos = useMemo(() => {
    const rng = crearRng(semilla + 101);
    const [ax, , az] = zona;
    const { velocidad, aleteo, altura } = cfg.vuelo;
    const lista = [];
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2;
      lista.push({
        dir: [Math.sin(ang), Math.cos(ang)],
        centro: [(rng() - 0.5) * ax * 0.4, (rng() - 0.5) * az * 0.4],
        alturaBase: altura * (0.6 + rng() * 0.4),
        vel: velocidad[0] + rng() * (velocidad[1] - velocidad[0]),
        aleteo: aleteo[0] + rng() * (aleteo[1] - aleteo[0]),
        fase: rng() * Math.PI * 2,
        recorrido: Math.max(ax, az) + 3,
        color: cfg.colores[Math.floor(rng() * cfg.colores.length)],
      });
    }
    return lista;
  }, [cfg, n, zona, semilla]);

  /* Colores por instancia: una vez por siembra. */
  useEffect(() => {
    const tinta = new THREE.Color();
    const marron = new THREE.Color(cfg.colorCuerpo);
    datos.forEach((d, i) => {
      tinta.set(d.color);
      izq.current?.setColorAt(i, tinta);
      der.current?.setColorAt(i, tinta);
      cuerpo.current?.setColorAt(i, marron);
    });
    for (const ref of [izq, der, cuerpo]) {
      if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
    }
  }, [cfg, datos]);

  useFrame(({ clock }) => {
    if (!izq.current || !der.current || !cuerpo.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      /* Avance sobre el rumbo, con reentrada por el lado opuesto. */
      const s = ((t * d.vel + d.fase * 2) % d.recorrido) - d.recorrido / 2;
      const x = d.centro[0] + d.dir[0] * s;
      const z = d.centro[1] + d.dir[1] * s;
      const y = d.alturaBase + Math.sin(t * 1.3 + d.fase) * cfg.vuelo.bamboleo;
      DUMMY.position.set(x, y, z);
      DUMMY.rotation.set(0, Math.atan2(d.dir[0], d.dir[1]), 0);
      DUMMY.updateMatrix();
      M_BASE.copy(DUMMY.matrix);
      const flap = Math.sin(t * d.aleteo + d.fase) * 0.95;
      M_ALA.makeRotationZ(flap);
      M_FIN.multiplyMatrices(M_BASE, M_ALA);
      izq.current.setMatrixAt(i, M_FIN);
      M_ALA.makeRotationZ(-flap);
      M_FIN.multiplyMatrices(M_BASE, M_ALA);
      der.current.setMatrixAt(i, M_FIN);
      cuerpo.current.setMatrixAt(i, M_BASE);
    }
    izq.current.instanceMatrix.needsUpdate = true;
    der.current.instanceMatrix.needsUpdate = true;
    cuerpo.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={izq} args={[undefined, undefined, n]} geometry={geos.gIzq} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={der} args={[undefined, undefined, n]} geometry={geos.gDer} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={cuerpo} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={cfg.cuerpo} />
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}

/**
 * Kit de partículas ambientales de la hora dorada. Monte una instancia por
 * efecto (varias conviven sin pisarse: cada una es 1-3 draw calls).
 *
 * @param {object} p
 * @param {'polen'|'luciernagas'|'polvo'|'mariposas'} [p.tipo='polen']
 * @param {number}  [p.densidad=1]      multiplicador del conteo, acotado [0, 2].
 * @param {'alto'|'medio'|'bajo'} [p.tier='medio']  de `decidirTier()`.
 * @param {boolean} [p.reducedMotion=false]  quieto (polen/polvo/luciérnagas) o
 *                                           apagado (mariposas).
 * @param {number}  [p.maxParticulas=Infinity] tope adicional del presupuesto
 *                                           vivo, útil para `useTierPerformance`.
 * @param {[number,number,number]} [p.area]  caja [ancho, alto, fondo]; default
 *                                           por tipo. Pase referencia ESTABLE.
 * @param {[number,number,number]} [p.position=[0,0,0]]  ancla en la escena
 *                                           (base de la caja, y=0 es el piso).
 * @param {[number,number,number]} [p.rotation]  inclinación del grupo; el polvo
 *                                           trae su sesgo de haz por defecto.
 * @param {number}  [p.semilla=7]        siembra determinista (variar por escena).
 */
export function ParticulasAmbientales({
  tipo = 'polen',
  densidad = 1,
  tier = 'medio',
  reducedMotion = false,
  maxParticulas = Infinity,
  area = null,
  position = [0, 0, 0],
  rotation = null,
  semilla = 7,
}) {
  const cfg = PARTICULAS[tipo];
  if (!cfg) return null;
  const nBase = conteoParticulas(cfg, tier, densidad);
  const limite = Number.isFinite(maxParticulas) ? Math.max(0, Math.floor(maxParticulas)) : Infinity;
  const n = Math.min(nBase, limite);
  if (n <= 0) return null;
  if (cfg.mariposa && reducedMotion) return null;
  const zona = area || cfg.area;
  const giro = rotation || cfg.rotacion || [0, 0, 0];
  /* La key re-siembra la nube entera si cambia el presupuesto o la caja: los
     buffers de un <bufferAttribute> solo se leen al montar. */
  const clave = `${tipo}:${n}:${semilla}:${reducedMotion ? 1 : 0}:${zona.join(',')}`;
  return (
    <group position={position} rotation={giro}>
      {cfg.mariposa ? (
        <Mariposas key={clave} cfg={cfg} n={n} zona={zona} semilla={semilla} />
      ) : (
        <NubePuntos
          key={clave}
          cfg={cfg}
          n={n}
          zona={zona}
          reducedMotion={reducedMotion}
          semilla={semilla}
        />
      )}
    </group>
  );
}
