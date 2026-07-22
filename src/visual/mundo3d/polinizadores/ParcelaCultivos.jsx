/*
 * ParcelaCultivos — DONDE SE COBRA (o no se cobra) EL SERVICIO.
 *
 * Las matas de la finca y su fruta. Y la fruta no está dibujada: está GANADA. El
 * tamaño de cada maracuyá, de cada ahuyama y de cada grano de café sale del
 * servicio que la red le tejió a esa mata (`telar.servicioDe` → `cuajeDe`). Si el
 * enjambre trabaja, la fruta se hincha delante de sus ojos. Si el veneno pasó, se
 * queda en botón seco y se cae. Nadie tiene que poner un cartel de advertencia:
 * la finca lo dice sola, en el único idioma que en el campo no se discute — el de
 * lo que se cosecha.
 *
 * ── EL CONTRASTE (por qué este componente existe) ────────────────────────────
 * Acá conviven a propósito los cuatro casos, y hay que poder verlos de un vistazo:
 *
 *   MARACUYÁ  → sin red, casi nada. Con red, se llena. El que más sufre.
 *   AHUYAMA   → depende del cruce macho→hembra. La bolita se hincha o se pudre.
 *   CAFÉ      → con red o sin red, DA CAFÉ. Con red da más. Esa media tinta es
 *               importante: si todo fuera catástrofe, nadie creería el resto.
 *   MAÍZ      → EL CONTRAPESO. Ni un hilo lo toca jamás, y aun así da mazorca
 *               llena, porque su polen viaja en el VIENTO. Está acá para que el
 *               mundo no diga una mentira bonita: sin abejas no se acaba la
 *               comida — se acaba la VARIEDAD. El que exagera, pierde al que
 *               sabe; y el campesino sabe que su maíz nunca necesitó una abeja.
 *
 * Sobre el maizal se ve el único "servicio" que no hace ningún bicho: las motas
 * de polen cayendo de la espiga y derivando con el viento hasta los pelos de la
 * mazorca. Es polinización, y es gratis, y no hay nadie a quien cuidar. Ese
 * silencio, al lado de la maraña de hilos del maracuyá, es el argumento entero.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { calidadDe, cuajeDe, tierDe, rng } from './polinizadoresIdentidad.js';
import { CULTIVO_GEOM, FRUTO_GEOM, FRUTO_TAM, geomMotaPolen } from './cultivos.geom.js';
import { sembrarMatas, sitiosDeFruto } from './sembrado.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/* El cuaje no salta: se acerca. Una fruta no se hincha de un frame al otro. */
const SUAVIZADO = 0.6;

/**
 * Las matas de la finca y su cosecha.
 * @param {Object} props
 * @param {Object} props.telar  el telar del mundo (de ahí sale el cuaje)
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {'dia'|'noche'} [props.momento]
 */
export default function ParcelaCultivos({ telar, tier = 'alto', reducedMotion = false, momento = 'dia' }) {
  const perfil = perfilDeTier(tier);
  const q = calidadDe(tier);
  const conf = tierDe(tier);
  const matas = useMemo(() => sembrarMatas(tier), [tier]);
  const sitios = useMemo(() => sitiosDeFruto(tier), [tier]);

  /* --- Geometrías: una por cultivo + una por fruto ------------------------ */
  const geos = useMemo(() => {
    const g = {};
    Object.keys(CULTIVO_GEOM).forEach((k, i) => { g[k] = CULTIVO_GEOM[k]({ q }, 400 + i); });
    return g;
  }, [q]);

  const geosFruto = useMemo(() => {
    const g = {};
    Object.keys(FRUTO_GEOM).forEach((k) => { g[k] = FRUTO_GEOM[k]({ q }); });
    return g;
  }, [q]);

  const geoMota = useMemo(() => geomMotaPolen({ q }), [q]);

  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.9, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const matMota = useMemo(
    () => new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }),
    [],
  );

  /* --- Las motas de polen del maíz (solo si el tier las permite) --------- */
  const motas = useMemo(() => {
    const n = conf.polenMotas;
    if (!n) return [];
    const r = rng(880);
    return Array.from({ length: n }, () => ({
      // Nacen en las espigas del maizal y bajan derivando.
      x0: 3.1 + r() * 2.5,
      z0: -3.7 + r() * 1.7,
      y0: 1.5 + r() * 0.5,
      fase: r() * 100,
      vel: 0.25 + r() * 0.35,
      deriva: 0.25 + r() * 0.5,
    }));
  }, [conf.polenMotas]);

  const refsMata = useRef({});
  const refsFruto = useRef({});
  const refMotas = useRef(null);
  /* El cuaje suavizado que se está mostrando ahora mismo. */
  const cuajeVisto = useRef({ maracuya: 0, ahuyama: 0, cafe: 0 });

  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g?.dispose());
      Object.values(geosFruto).forEach((g) => g?.dispose());
      geoMota?.dispose();
      mat.dispose();
      matMota.dispose();
    },
    [geos, geosFruto, geoMota, mat, matMota],
  );

  /* --- Las matas están quietas: se siembran una vez y ya ------------------ */
  useLayoutEffect(() => {
    for (const k of Object.keys(matas)) {
      const mesh = refsMata.current[k];
      if (!mesh) continue;
      const items = matas[k];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        _e.set(0, it.rotY, 0);
        _q.setFromEuler(_e);
        _v.set(it.pos[0], it.pos[1], it.pos[2]);
        _s.setScalar(it.escala);
        _m.compose(_v, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [matas]);

  useFrame((state, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.05);
    const t = state.clock.elapsedTime;

    /* ── LA COSECHA: el servicio se vuelve fruta ────────────────────────── */
    for (const k of Object.keys(FRUTO_GEOM)) {
      const mesh = refsFruto.current[k];
      if (!mesh) continue;
      const servicio = telar ? telar.servicioDe(k) : 0;
      const objetivo = cuajeDe(k, servicio);
      // Se acerca despacio: la fruta crece, no aparece.
      cuajeVisto.current[k] += (objetivo - cuajeVisto.current[k]) * Math.min(1, dt / SUAVIZADO);
      const cuaje = cuajeVisto.current[k];

      const items = sitios[k] || [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        /* Cada sitio de fruto tiene su propio umbral: no cuajan todos a la vez.
           Con servicio bajo solo se llenan unos poquitos y el resto se queda en
           nada — que es exactamente como se ve un maracuyá mal polinizado: la
           mata llena de hojas y con tres frutas colgando. */
        const umbral = (i + 0.5) / items.length;
        const llena = Math.max(0, Math.min(1, (cuaje - umbral * 0.85) * 2.2));
        const tam = FRUTO_TAM[k] * (0.12 + llena * 0.88);

        // Lo que no cuajó no se queda flotando: se cae y desaparece.
        const escala = llena < 0.06 ? 0 : tam;
        const caida = llena < 0.2 ? (0.2 - llena) * 0.6 : 0;
        const mece = reducedMotion ? 0 : Math.sin(t * 0.7 + i * 2.1) * 0.03 * llena;

        _e.set(0, i * 1.7, mece);
        _q.setFromEuler(_e);
        _v.set(it.pos[0], it.pos[1] - caida, it.pos[2]);
        _s.setScalar(escala);
        _m.compose(_v, _q, _s);
        mesh.setMatrixAt(i, _m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    /* ── EL POLEN DEL MAÍZ: el servicio que no le debe nada a nadie ──────
       Cae de la espiga y el viento lo lleva a los pelos de la mazorca vecina.
       Ni un bicho. Ni un hilo. Y hay mazorca. */
    const mm = refMotas.current;
    if (mm && motas.length) {
      // De noche también cae: el viento no tiene horario (a diferencia de las
      // abejas, que sí lo tienen). Detalle chiquito, verdad grande.
      for (let i = 0; i < motas.length; i++) {
        const p = motas[i];
        const ciclo = reducedMotion ? 0.5 : ((t * p.vel + p.fase) % 1);
        const y = p.y0 - ciclo * 1.15;
        const x = p.x0 + Math.sin(t * 0.5 + p.fase) * 0.1 + ciclo * p.deriva;
        const z = p.z0 + Math.cos(t * 0.4 + p.fase) * 0.08;
        // Se desvanece al llegar abajo (encontró su pelo, o no).
        const esc = 0.012 * (1 - ciclo * 0.5);
        _q.identity();
        _v.set(x, y, z);
        _s.setScalar(esc);
        _m.compose(_v, _q, _s);
        mm.setMatrixAt(i, _m);
      }
      mm.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {Object.keys(matas).map((k) => (
        <instancedMesh
          key={k}
          ref={(el) => { refsMata.current[k] = el; }}
          args={[geos[k], mat, matas[k].length]}
          frustumCulled={false}
          castShadow={perfil.sombras}
          receiveShadow={perfil.sombras}
          name={`mata-${k}`}
        />
      ))}
      {Object.keys(FRUTO_GEOM).map((k) => (
        <instancedMesh
          key={`fruto-${k}`}
          ref={(el) => { refsFruto.current[k] = el; }}
          args={[geosFruto[k], mat, (sitios[k] || []).length]}
          frustumCulled={false}
          castShadow={perfil.sombras}
          name={`fruto-${k}`}
        />
      ))}
      {motas.length > 0 && (
        <instancedMesh
          ref={refMotas}
          args={[geoMota, matMota, motas.length]}
          frustumCulled={false}
          name="polen-viento-maiz"
        />
      )}
    </group>
  );
}
