/*
 * AguaQueVuelve — el nacimiento que revive.
 *
 * De todo lo que pasa en esta ladera, esto es lo último y lo más difícil de creer:
 * que si uno deja el monte cincuenta años, el agua VUELVE. No es un adorno — es la
 * razón por la que se restaura un páramo.
 *
 * Está montado sobre una idea sola: EL HUECO SIEMPRE ESTUVO AHÍ. El corro de
 * piedras y la poza del terreno no cambian nunca; en el año 0 tienen adentro lodo
 * seco y rajado, y en el año 50 tienen el ojo de agua. La misma geometría, cosida
 * al terreno, con una textura u otra cruzándose despacio. La tierra se acuerda de
 * dónde brotaba: nosotros solo esperamos.
 *
 * La quebrada corre por el canal que ya tiene la ladera (`alturaLadera`), no por
 * un plano inventado encima. Y fluye de verdad: las UV van a lo largo del cauce,
 * así que basta con correr la textura para que el agua baje.
 *
 * Barato a propósito: dos texturas de canvas hechas en runtime (cero assets),
 * MeshBasic (el agua no necesita luz), sin escribir profundidad.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import {
  geomQuebrada,
  geomOjoAgua,
  geomNacimiento,
  PAL_SUC,
} from './sucesion.geom.js';
import { agua } from './tiempoSucesion.js';

/* -------------------------------------------------------------------------- */
/*  Texturas procedurales (cero assets, se hacen al montar)                    */
/* -------------------------------------------------------------------------- */

/* El agua: vetas claras atravesadas que, al correr, se leen como correntía. */
function texturaAgua() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#5f8792';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 14; i++) {
    const y = (i / 14) * s;
    const alto = 1 + (i % 3);
    ctx.fillStyle = `rgba(226,242,244,${0.08 + (i % 4) * 0.05})`;
    // Las vetas no van derechas: el agua tropieza con las piedras.
    ctx.fillRect(0, y + Math.sin(i * 1.7) * 1.5, s, alto);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* El lodo seco: la costra rajada del nacimiento muerto. */
function texturaLodo() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = PAL_SUC.lodoSeco;
  ctx.fillRect(0, 0, s, s);
  // Las rajaduras: la firma del suelo que se secó y se encogió.
  ctx.strokeStyle = 'rgba(52,38,24,0.65)';
  ctx.lineWidth = 1.4;
  let sem = 7;
  const rnd = () => {
    sem = (sem * 1664525 + 1013904223) >>> 0;
    return sem / 4294967296;
  };
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    let x = rnd() * s;
    let y = rnd() * s;
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (rnd() - 0.5) * 26;
      y += (rnd() - 0.5) * 26;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * El nacimiento y la quebrada, mandados por el año.
 * @param {{ anioRef: { current: number }, tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean }} props
 */
export default function AguaQueVuelve({ anioRef, tier = 'alto', reducedMotion = false }) {
  const perfil = perfilDeTier(tier);
  const q = tier === 'alto' ? 1 : tier === 'medio' ? 0.62 : 0.42;

  /* --- Geometrías: todas cosidas al terreno, en coordenadas de mundo. --- */
  const geoQuebrada = useMemo(() => geomQuebrada({ pasos: tier === 'bajo' ? 18 : 40 }), [tier]);
  const geoOjo = useMemo(() => geomOjoAgua({ pasos: tier === 'bajo' ? 10 : 18 }), [tier]);
  const geoPiedras = useMemo(() => geomNacimiento({ q }, 30), [q]);

  /* --- Texturas: en gama baja el agua va lisa (fill-rate al mínimo). --- */
  const texAgua = useMemo(() => (tier === 'bajo' ? null : texturaAgua()), [tier]);
  const texLodo = useMemo(() => (tier === 'bajo' ? null : texturaLodo()), [tier]);

  const matPiedras = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const matAgua = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texAgua,
        color: texAgua ? '#ffffff' : PAL_SUC.aguaClara,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    [texAgua],
  );
  const matLodo = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texLodo,
        color: texLodo ? '#ffffff' : PAL_SUC.lodoSeco,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    [texLodo],
  );
  /* El ojo y la quebrada comparten la textura pero NO el material: cada uno lleva
     su propia opacidad (primero brota el ojo, después arranca a correr). */
  const matQuebrada = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texAgua,
        color: texAgua ? '#ffffff' : PAL_SUC.aguaClara,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true,
      }),
    [texAgua],
  );

  const quebrada = useRef(null);
  const ojo = useRef(null);
  const lodo = useRef(null);

  useLayoutEffect(
    () => () => {
      geoQuebrada.dispose();
      geoOjo.dispose();
      geoPiedras.dispose();
      texAgua?.dispose();
      texLodo?.dispose();
      matPiedras.dispose();
      matAgua.dispose();
      matLodo.dispose();
      matQuebrada.dispose();
    },
    [geoQuebrada, geoOjo, geoPiedras, texAgua, texLodo, matPiedras, matAgua, matLodo, matQuebrada],
  );

  useFrame((_, dt) => {
    const a = agua(anioRef.current);

    // El cruce: se va el lodo, llega el agua. Nunca los dos a full.
    if (lodo.current) {
      lodo.current.material.opacity = 1 - a;
      lodo.current.visible = a < 0.99;
    }
    if (ojo.current) {
      ojo.current.material.opacity = a * 0.9;
      ojo.current.visible = a > 0.01;
    }
    if (quebrada.current) {
      // La quebrada tarda un poco más que el ojo: primero brota, después corre.
      const caudal = Math.max(0, (a - 0.15) / 0.85);
      quebrada.current.material.opacity = caudal * 0.85;
      quebrada.current.visible = caudal > 0.01;
    }

    // Y el agua BAJA (las vetas corren hacia la parte de abajo del cauce).
    // .set() (método), no `.offset.y -=` (reasignación): regla react-hooks/immutability
    // sobre el valor devuelto por el useMemo de arriba.
    if (!reducedMotion && texAgua && a > 0.01) {
      texAgua.offset.set(texAgua.offset.x, texAgua.offset.y - dt * 0.28);
    }
  });

  return (
    <group>
      {/* El corro de piedras: lo único que no cambia en cincuenta años. */}
      <mesh geometry={geoPiedras} material={matPiedras} receiveShadow={perfil.sombras} />

      {/* Lo que hay adentro del hueco: lodo rajado ↔ ojo de agua. */}
      <mesh ref={lodo} geometry={geoOjo} material={matLodo} />
      <mesh ref={ojo} geometry={geoOjo} material={matAgua} />

      {/* La quebrada: por el canal que la ladera ya tenía. */}
      <mesh ref={quebrada} geometry={geoQuebrada} material={matQuebrada} />
    </group>
  );
}
