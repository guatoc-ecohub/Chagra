/*
 * FloresMundo — LOS CARTELES, SEMBRADOS.
 *
 * Siembra todas las flores del sembrado y les da dos cosas que el dibujo solo no
 * puede dar:
 *
 * ── 1. LA HORA ──────────────────────────────────────────────────────────────
 * Las flores ABREN Y CIERRAN. Al caer la noche, la amarilla de la ahuyama y la
 * morada de la huerta se recogen —ya no hay a quién llamar—, y la blanca del
 * guamo, que estuvo dormida todo el día, se abre y suelta su olor. El cartel no
 * es solo color y forma: también es HORARIO. Esa es la parte del síndrome floral
 * que nunca se dibuja, porque para verla hay que dejar correr el tiempo.
 *
 * ── 2. LA VISIÓN DE ABEJA ───────────────────────────────────────────────────
 * El interruptor que explica el mundo entero de un golpe. Al pasar a "ojo de
 * abeja", la flor roja del colibrí SE APAGA a un pardo sucio —ella no ve el
 * rojo—, mientras el morado y el amarillo se encienden y aparecen las GUÍAS DE
 * NÉCTAR ultravioleta: pistas de aterrizaje que estuvieron ahí todo el tiempo y
 * que nosotros nunca vimos. No hay que explicar por qué esa flor no es para la
 * abeja: se ve que no es para ella.
 *
 * Cuesta cero: cada geometría ya trae los dos juegos de color horneados
 * (`floresSindrome.geom.js`) y aquí solo se cambia el atributo activo. Sin
 * shaders, sin rebuild, sin costo en gama baja.
 *
 * TIER-SAFE: una geometría fusionada por síndrome → UN InstancedMesh por
 * síndrome: una draw-call por más flores que haya en la finca.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { SINDROMES, calidadDe } from './polinizadoresIdentidad.js';
import { FLOR_GEOM, SINDROME_DE_GEOM, verComoAbeja } from './floresSindrome.geom.js';
import { agruparPorGeom } from './sembrado.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/* Cuánto tarda una flor en abrirse o cerrarse (s). Sin prisa: una flor no es un
   interruptor. La ahuyama se demora toda la mañana; aquí se comprime, pero el
   gesto es el mismo — se despereza. */
const APERTURA_S = 2.6;

/** ¿Esta flor está abierta a esta hora? */
const abre = (sindromeId, momento) => {
  const S = SINDROMES[sindromeId];
  if (!S) return true;
  return momento === 'noche' ? S.abre === 'noche' : S.abre !== 'noche';
};

/**
 * Las flores del mundo. Montar dentro del <Canvas>.
 * @param {Object} props
 * @param {Array} props.flores  el sembrado (`sembrarFlores`)
 * @param {'dia'|'noche'} [props.momento]
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.comoAbeja]  ver el mundo con el ojo de la abeja
 * @param {boolean} [props.reducedMotion]
 */
export default function FloresMundo({
  flores,
  momento = 'dia',
  tier = 'alto',
  comoAbeja = false,
  reducedMotion = false,
}) {
  const perfil = perfilDeTier(tier);
  const q = calidadDe(tier);
  const grupos = useMemo(() => agruparPorGeom(flores), [flores]);
  const claves = useMemo(() => Object.keys(grupos), [grupos]);

  /* Una geometría por clave de dibujo (la hembra de la ahuyama es su propia
     clave: lleva la bolita del fruto en formación). */
  const geos = useMemo(() => {
    const g = {};
    claves.forEach((k, i) => { g[k] = FLOR_GEOM[k](q, 100 + i); });
    return g;
  }, [claves, q]);

  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.82, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const refs = useRef({});
  /* Cuán abierta está cada flor (0..1). Vive por índice global de flor para que
     ninguna se abra de golpe al cambiar la hora. Se recalcula solo cuando
     cambia el set de flores (no en cada render) — el useFrame de abajo la
     muta en el sitio, cuadro a cuadro. */
  const aperturaInicial = useMemo(() => {
    const arr = new Float32Array(flores.length).fill(1);
    // Arranque digno: cada flor ya nace en el estado que le toca a esta hora.
    for (const f of flores) arr[f.i] = abre(f.sindrome, momento) ? 1 : 0;
    return arr;
  }, [flores]); // eslint-disable-line react-hooks/exhaustive-deps -- `momento` es a propósito solo del arranque inicial; el useFrame ya reacciona a momento cuadro a cuadro
  const apertura = useRef(aperturaInicial);
  useLayoutEffect(() => {
    // No durante el render (react-hooks/refs): el swap del buffer pasa aquí,
    // ANTES de pintar, así no hay flash del tamaño viejo.
    if (apertura.current !== aperturaInicial && apertura.current.length !== aperturaInicial.length) {
      apertura.current = aperturaInicial;
    }
  }, [aperturaInicial]);

  /* EL INTERRUPTOR: humano ↔ ojo de abeja. Solo intercambia el array del
     atributo `color`, que ya estaba horneado. Gratis. */
  useLayoutEffect(() => {
    for (const k of claves) verComoAbeja(geos[k], comoAbeja);
  }, [claves, geos, comoAbeja]);

  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g?.dispose());
      mat.dispose();
    },
    [geos, mat],
  );

  useFrame((state, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.05);
    const t = state.clock.elapsedTime;
    const ap = apertura.current;

    for (const k of claves) {
      const mesh = refs.current[k];
      if (!mesh) continue;
      const items = grupos[k];
      const sind = SINDROME_DE_GEOM(k);
      const abierta = abre(sind, momento);

      for (let i = 0; i < items.length; i++) {
        const f = items[i];
        // Se abre o se cierra con calma, cada una a su ritmo.
        const objetivo = abierta ? 1 : 0;
        const d = objetivo - ap[f.i];
        if (Math.abs(d) > 0.001) {
          ap[f.i] += Math.sign(d) * Math.min(Math.abs(d), dt / APERTURA_S);
        }
        const a = ap[f.i];

        /* La flor cerrada no desaparece: se RECOGE. Encoge y se enrolla un poco
           sobre sí misma — sigue ahí, dormida, esperando su turno. */
        const escala = f.escala * (0.38 + a * 0.62);

        // El aire: un mecidito lento, distinto en cada mata. Sin viento, esto
        // parece un catálogo de plástico; con viento, es una huerta.
        const mece = reducedMotion ? 0 : Math.sin(t * 0.9 + f.i * 1.7) * 0.045 * a;

        _e.set(mece * 0.6, f.rotY, mece);
        _q.setFromEuler(_e);
        _v.set(f.pos[0], f.pos[1], f.pos[2]);
        _s.setScalar(escala);
        _m.compose(_v, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {claves.map((k) => (
        <instancedMesh
          key={k}
          ref={(el) => { refs.current[k] = el; }}
          args={[geos[k], mat, grupos[k].length]}
          frustumCulled={false}
          castShadow={perfil.sombras}
          receiveShadow={perfil.sombras}
          name={`flor-${k}`}
        />
      ))}
    </group>
  );
}
