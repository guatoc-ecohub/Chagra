/*
 * HatoMovil — EL HATO EN MOVIMIENTO (vida meso del valle, aire Age of Empires).
 *
 * El potrero deja de ser un bodegón: las vacas CAMINAN entre apartos y se
 * paran a pastar, las ovejas van en rebaño (un ancla que deriva y cada oveja
 * la sigue con su puesto), las gallinas picotean y se DISPERSAN cuando pasa
 * los perros, y DOS perros arrean orbitando el rebaño: el DÁLMATA grande
 * (alto y casi cuadrado, blanco de manchas negras redondas, manda el arreo)
 * y el BEAGLE chico (bajito y alargado, orejón, tricolor con cola en bandera,
 * va detrás, más nervioso) — cada uno con malla de SU raza (fincaRealista):
 * se distinguen por SILUETA desde lejos, no solo por color. Rumbo
 * suavizado, vaivén de paso (bob + balanceo), pausas de pastoreo.
 *
 * Reusa el banco de fauna REALISTA del valle (veredicto del operador: el
 * ganado va realista; los rubber-hose son la fauna con alma): las mallas de
 * src/visual/mundo3d/finca/fincaRealista.geom.js y el MATERIAL_HATO de
 * animales.jsx. Presupuesto: vacas y perro articulados (2 draw-calls c/u,
 * cabeza con gesto), ovejas TODAS en una InstancedMesh y gallinas TODAS en
 * otra (1 draw-call por especie, variedad por instanceColor sobre el color
 * horneado). Un solo useFrame mueve todo; cero GLTF, cero texturas.
 *
 * Autocontenido: NO toca Valle3D/composicionValle3D. El host lo monta como
 * a OsoNegroDelMonte: <HatoMovil alturaDe={alturaTerreno} /> en coords MUNDO
 * del valle. Por defecto vive en el potrero de valleData ([-5.0, 5.4]).
 */
import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MATERIAL_HATO } from './animales.jsx';
import {
  geomVaca,
  geomOveja,
  geomGallina,
  geomPerro,
} from '../../visual/mundo3d/finca/fincaRealista.geom.js';

/* ── PRNG determinista (mulberry32): la escena es la misma en cada carga ── */
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Ángulo más corto entre rumbos (para girar sin dar la vuelta larga). */
function giroCorto(desde, hacia) {
  let d = (hacia - desde) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* Las mallas miran a +X; rumbo (dx,dz) → rotation.y. */
const rumboY = (dx, dz) => Math.atan2(-dz, dx);

/*
 * Cuerpo + cabeza fusionados en UNA geometría para instanciar (la cabeza
 * pierde el pivote — a escala de oveja/gallina el gesto va en el cuerpo
 * entero). CLONA antes de trasladar: las fábricas cachean y la misma
 * BufferGeometry vive también en animales.jsx. Guard anti-null de
 * mergeGeometries (indexada+no-indexada → null SILENCIOSO y el animal
 * desaparece sin error): desindexar y TRONAR si igual falla.
 */
function geomEntera({ cuerpo, cabeza, pivote }, etiqueta) {
  const desindexa = (g) => (g.index ? g.toNonIndexed() : g);
  const cab = cabeza.clone().translate(pivote[0], pivote[1], pivote[2]);
  const g = mergeGeometries([desindexa(cuerpo.clone()), desindexa(cab)], false);
  if (!g) {
    throw new Error(
      `[HatoMovil] "${etiqueta}": mergeGeometries devolvió NULL (atributos dispares). ` +
        'El animal quedaría invisible sin error — revisá la fábrica.',
    );
  }
  return g;
}

/* ── Composición del hato por tier (6 / 12 / 20 animales) ─────────────── */
const TIERS = {
  6: { vacas: 1, ovejas: 2, gallinas: 2 },
  12: { vacas: 2, ovejas: 4, gallinas: 5 },
  20: { vacas: 3, ovejas: 8, gallinas: 8 },
};

/*
 * Los DOS perros del arreo (pedido del operador): el dálmata GRANDE manda la
 * órbita ancha y el beagle CHICO trota detrás, más rápido de patas y más
 * nervioso. Cada uno tiene MALLA de su raza (fincaRealista.geom): la
 * diferencia de lejos no es solo escala — el dálmata es alto y casi cuadrado
 * (cruz ~0.5 de malla) y el beagle bajito y alargado (cruz ~0.38), así que
 * 0.9 vs 0.62 deja al beagle a ~media altura del dálmata sin volverlo pulga.
 */
const PERROS = [
  { nombre: 'Oliver', raza: 'dalmata', escala: 0.9, rOrb: 1.0, velAng: 0.42, tranco: 7.5, fase: 0.8 },
  { nombre: 'Dante', raza: 'beagle', escala: 0.62, rOrb: 0.72, velAng: 0.58, tranco: 11.5, fase: 3.4 },
];

/* Tintes de instancia (multiplican el color horneado por vértice). */
const TINTES_OVEJA = ['#ffffff', '#f2e9da', '#d9d2c6', '#fff6e8', '#c9c2b4'];
const TINTES_GALLINA = ['#ffffff', '#f5e8d0', '#5a4a3a', '#d98a4a', '#e8e8e8'];

/*
 * <HatoMovil> — grupo r3f autocontenido en coords MUNDO del valle.
 *
 * Props:
 *   alturaDe(x, z)  → y del terreno (Valle3D pasa alturaTerreno). Default 0.
 *   centro=[x, z]   → centro del potrero. Default [-5.0, 5.4] (mundo
 *                     'animales' de valleData.js).
 *   radio           → radio del aparto que recorren. Default 2.1.
 *   tier            → 6 | 12 | 20 animales. Default 12.
 *   reducedMotion   → quietos a media pose (un fotograma digno, cero anim).
 *   q               → calidad geométrica 0..1 (igual que AnimalesDeFinca).
 */
export default function HatoMovil({
  alturaDe = () => 0,
  centro = [-5.0, 5.4],
  radio = 2.1,
  tier = 12,
  reducedMotion = false,
  q = 1,
}) {
  const conteo = TIERS[tier] || TIERS[12];
  const [cx, cz] = centro;

  /* Geometrías: articuladas para vacas/perros, fusionadas para instancias.
     Los perros vienen de la fábrica con malla Y capa de SU raza (silueta
     dálmata alta/cuadrada vs beagle bajito/orejón — un recoloreo del criollo
     no alcanzaba para leerlas de lejos). */
  const g = useMemo(
    () => ({
      vacas: [
        geomVaca({ raza: 'holstein', q }),
        geomVaca({ raza: 'criolla', ubre: false, cuerno: 0, q }, 23),
        geomVaca({ raza: 'holstein', q }, 77),
      ],
      perros: {
        dalmata: geomPerro({ raza: 'dalmata', q }),
        beagle: geomPerro({ raza: 'beagle', q }),
      },
      oveja: geomEntera(geomOveja({ q }), 'oveja-instanciada'),
      gallina: geomEntera(geomGallina({ tipo: 'campesina', q }), 'gallina-instanciada'),
    }),
    [q],
  );

  /*
   * El estado vivo del hato (mutable, FUERA de React: vive en un ref y se
   * construye perezoso en el primer frame — la regla de inmutabilidad de
   * hooks prohíbe mutar un useMemo). Determinista por PRNG: misma
   * coreografía en cada carga.
   */
  const refHato = useRef(null);
  const claveHato = `${tier}|${cx}|${cz}|${radio}`;
  const crearHato = () => {
    const r = prng(4217 + tier);

    // Vacas: cada una con su anillo de waypoints jitterados por el aparto.
    const vacas = Array.from({ length: conteo.vacas }, (_, i) => {
      const n = 5;
      const base = r() * Math.PI * 2;
      const pts = Array.from({ length: n }, (_, k) => {
        const ang = base + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.8;
        const rad = radio * (0.35 + r() * 0.4);
        return [cx + Math.cos(ang) * rad, cz + Math.sin(ang) * rad];
      });
      return {
        pts,
        i: Math.floor(r() * n),
        pos: [pts[0][0], pts[0][1]],
        rumbo: r() * Math.PI * 2,
        modo: i === 0 ? 'camina' : 'pasta', // arrancan desfasadas
        tModo: 2 + r() * 4,
        vel: 0.22 + r() * 0.08,
        fase: r() * Math.PI * 2,
        escala: i === 1 ? 0.4 : 0.6 + r() * 0.06, // la criolla es la ternera
      };
    });

    // Rebaño: un ancla que deriva por su propio anillo; cada oveja un puesto.
    const anillo = Array.from({ length: 4 }, (_, k) => {
      const ang = 1.2 + (k / 4) * Math.PI * 2;
      const rad = radio * 0.55;
      return [cx + Math.cos(ang) * rad + (r() - 0.5) * 0.6, cz + Math.sin(ang) * rad + (r() - 0.5) * 0.6];
    });
    const rebano = {
      anillo,
      i: 0,
      pos: [anillo[0][0], anillo[0][1]],
      vel: 0.14,
      ovejas: Array.from({ length: conteo.ovejas }, () => {
        const ang = r() * Math.PI * 2;
        const rad = 0.18 + r() * 0.4;
        return {
          off: [Math.cos(ang) * rad, Math.sin(ang) * rad],
          pos: [anillo[0][0] + Math.cos(ang) * rad, anillo[0][1] + Math.sin(ang) * rad],
          rumbo: r() * Math.PI * 2,
          fase: r() * Math.PI * 2,
          vel: 0.3 + r() * 0.15,
          escala: 0.46 + r() * 0.08,
        };
      }),
    };

    // Gallinas: cluster propio (lado opuesto al rebaño), carreritas cortas.
    const casaG = [cx + Math.cos(1.2 + Math.PI) * radio * 0.45, cz + Math.sin(1.2 + Math.PI) * radio * 0.45];
    const gallinas = Array.from({ length: conteo.gallinas }, () => {
      const px = casaG[0] + (r() - 0.5) * 0.9;
      const pz = casaG[1] + (r() - 0.5) * 0.9;
      return {
        casa: casaG,
        pos: [px, pz],
        objetivo: [px, pz],
        rumbo: r() * Math.PI * 2,
        modo: 'picotea',
        tModo: 1 + r() * 3,
        fase: r() * Math.PI * 2,
        escala: 0.7 + r() * 0.16,
      };
    });

    // La pareja de arreo orbita el rebaño con arranques de carrera: Oliver
    // (dálmata) por fuera marcando el paso, Dante (beagle) por dentro,
    // desfasado media órbita para cerrar la pinza.
    const perros = PERROS.map((cfg, i) => ({
      cfg,
      ang: r() * Math.PI * 2 + i * Math.PI,
      pos: [rebano.pos[0] + cfg.rOrb, rebano.pos[1]],
      rumbo: 0,
    }));

    return { clave: claveHato, vacas, rebano, gallinas, perros };
  };

  /* Refs de escena: vacas/perro articulados + las dos InstancedMesh. */
  const refVacas = useRef([]);
  const refCabezasVaca = useRef([]);
  const refPerros = useRef([]);
  const refCabezasPerro = useRef([]);
  const refOvejas = useRef(null);
  const refGallinas = useRef(null);
  const colocado = useRef(false);
  const util = useMemo(() => ({ o: new THREE.Object3D() }), []);

  /* Tintes de instancia: una vez, determinista. */
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const pinta = (mesh, tintes, n, salto) => {
      if (!mesh) return;
      for (let i = 0; i < n; i++) {
        mesh.setColorAt(i, c.set(tintes[(i * salto + i) % tintes.length]));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    pinta(refOvejas.current, TINTES_OVEJA, conteo.ovejas, 2);
    pinta(refGallinas.current, TINTES_GALLINA, conteo.gallinas, 3);
    colocado.current = false; // re-colocar si cambió el tier
  }, [conteo]);

  useFrame((state, delta) => {
    // reducedMotion: UN fotograma digno (media pose) y listo.
    if (reducedMotion && colocado.current) return;
    // Estado perezoso: se construye en el primer frame (o si cambió la clave).
    if (!refHato.current || refHato.current.clave !== claveHato) {
      refHato.current = crearHato();
      colocado.current = false;
    }
    const hato = refHato.current;
    const dt = reducedMotion ? 0 : Math.min(delta, 0.1);
    const t = reducedMotion ? 1.3 : state.clock.elapsedTime;
    const { o } = util;

    /* ── VACAS: waypoint → caminar con vaivén → pastar → siguiente ── */
    hato.vacas.forEach((v, i) => {
      const grupo = refVacas.current[i];
      if (!grupo) return;
      const meta = v.pts[v.i];
      const dx = meta[0] - v.pos[0];
      const dz = meta[1] - v.pos[1];
      const dist = Math.hypot(dx, dz);
      if (v.modo === 'camina') {
        if (dist < 0.12) {
          v.modo = 'pasta';
          v.tModo = 3 + ((v.fase * 7) % 4); // pausa determinista 3..7s
        } else {
          v.rumbo += giroCorto(v.rumbo, rumboY(dx, dz)) * Math.min(1, dt * 2.2);
          const paso = v.vel * dt;
          v.pos[0] += (dx / dist) * paso;
          v.pos[1] += (dz / dist) * paso;
        }
      } else {
        v.tModo -= dt;
        if (v.tModo <= 0) {
          v.i = (v.i + 1) % v.pts.length;
          v.modo = 'camina';
        }
      }
      const camina = v.modo === 'camina';
      const tranco = t * 5.2 + v.fase;
      grupo.position.set(
        v.pos[0],
        alturaDe(v.pos[0], v.pos[1]) + (camina ? Math.abs(Math.sin(tranco)) * 0.022 : 0),
        v.pos[1],
      );
      grupo.rotation.set(0, v.rumbo, camina ? Math.sin(tranco) * 0.028 : 0);
      grupo.scale.setScalar(v.escala);
      const cabeza = refCabezasVaca.current[i];
      if (cabeza) {
        // Caminando: hocico al frente con leve cabeceo. Pastando: al pasto.
        cabeza.rotation.z = camina
          ? -0.08 + Math.sin(tranco * 0.5) * 0.06
          : -0.15 - (Math.sin(t * 0.55 + v.fase) * 0.5 + 0.5) * 0.55;
      }
    });

    /* ── REBAÑO: el ancla deriva; cada oveja busca su puesto ── */
    const rb = hato.rebano;
    {
      const meta = rb.anillo[rb.i];
      const dx = meta[0] - rb.pos[0];
      const dz = meta[1] - rb.pos[1];
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15) rb.i = (rb.i + 1) % rb.anillo.length;
      else {
        const paso = rb.vel * dt;
        rb.pos[0] += (dx / dist) * paso;
        rb.pos[1] += (dz / dist) * paso;
      }
    }

    /* ── PERROS: Oliver y Dante orbitan el rebaño arreando en pinza ── */
    hato.perros.forEach((pr, i) => {
      const { escala, rOrb, velAng, tranco: frecTranco, fase } = pr.cfg;
      const brio = 0.6 + Math.max(0, Math.sin(t * 0.31 + fase)) * 1.6; // trote↔carrera
      pr.ang += dt * velAng * brio;
      const rr = rOrb + Math.sin(t * 0.23 + fase) * 0.14;
      const px = rb.pos[0] + Math.cos(pr.ang) * rr;
      const pz = rb.pos[1] + Math.sin(pr.ang) * rr;
      const dx = px - pr.pos[0];
      const dz = pz - pr.pos[1];
      if (Math.hypot(dx, dz) > 1e-4) pr.rumbo += giroCorto(pr.rumbo, rumboY(dx, dz)) * Math.min(1, dt * 5);
      pr.pos[0] = px;
      pr.pos[1] = pz;
      const grupo = refPerros.current[i];
      if (grupo) {
        const tranco = t * frecTranco + fase;
        grupo.position.set(px, alturaDe(px, pz) + Math.abs(Math.sin(tranco)) * 0.03 * brio, pz);
        grupo.rotation.set(0, pr.rumbo, Math.sin(tranco) * 0.04);
        grupo.scale.setScalar(escala);
      }
      const cabeza = refCabezasPerro.current[i];
      if (cabeza) {
        // Mira al rebaño mientras orbita (el arreo se LEE en la cabeza).
        cabeza.rotation.y = Math.sin(t * 0.9 + fase) * 0.5;
        cabeza.rotation.x = Math.sin(t * 0.4 + fase) * 0.08;
      }
    });

    /* El perro que asusta: el más cercano a cada animal chico. */
    const perroCerca = (x, z) => {
      let mejor = null;
      let dMin = Infinity;
      for (const pr of hato.perros) {
        const d = Math.hypot(x - pr.pos[0], z - pr.pos[1]);
        if (d < dMin) {
          dMin = d;
          mejor = pr;
        }
      }
      return { pr: mejor, d: dMin };
    };

    /* ── OVEJAS instanciadas: seguir el puesto + huir del perro (arreo) ── */
    if (refOvejas.current) {
      rb.ovejas.forEach((ov, i) => {
        let mx = rb.pos[0] + ov.off[0] - ov.pos[0];
        let mz = rb.pos[1] + ov.off[1] - ov.pos[1];
        // Un perro cerca EMPUJA hacia el centro del rebaño: arreo visible.
        // Oliver (grande) asusta desde más lejos que Dante.
        const { pr: perro, d: dPerro } = perroCerca(ov.pos[0], ov.pos[1]);
        const alcance = 0.55 + perro.cfg.escala * 0.35;
        if (dPerro < alcance && dPerro > 1e-4) {
          const susto = (alcance - dPerro) * 2.2;
          mx += ((ov.pos[0] - perro.pos[0]) / dPerro) * susto;
          mz += ((ov.pos[1] - perro.pos[1]) / dPerro) * susto;
        }
        const dist = Math.hypot(mx, mz);
        const mueve = dist > 0.06;
        if (mueve) {
          const paso = Math.min(dist, ov.vel * dt);
          ov.pos[0] += (mx / dist) * paso;
          ov.pos[1] += (mz / dist) * paso;
          ov.rumbo += giroCorto(ov.rumbo, rumboY(mx, mz)) * Math.min(1, dt * 3);
        }
        const tranco = t * 6.5 + ov.fase;
        o.position.set(
          ov.pos[0],
          alturaDe(ov.pos[0], ov.pos[1]) + (mueve ? Math.abs(Math.sin(tranco)) * 0.02 : 0),
          ov.pos[1],
        );
        // Quieta: tantea el pasto (pitch del cuerpo entero, escala chica).
        o.rotation.set(0, ov.rumbo, mueve ? Math.sin(tranco) * 0.03 : -0.09 - Math.sin(t * 0.7 + ov.fase) * 0.05);
        o.scale.setScalar(ov.escala);
        o.updateMatrix();
        refOvejas.current.setMatrixAt(i, o.matrix);
      });
      refOvejas.current.instanceMatrix.needsUpdate = true;
    }

    /* ── GALLINAS instanciadas: picotean, carreritas, dispersión ── */
    if (refGallinas.current) {
      hato.gallinas.forEach((ga, i) => {
        const { pr: perro, d: dPerro } = perroCerca(ga.pos[0], ga.pos[1]);
        if (dPerro < 0.45 + perro.cfg.escala * 0.3 && dPerro > 1e-4 && ga.modo !== 'corre') {
          // ¡Perro! Dispersarse: carrera corta en dirección contraria.
          ga.modo = 'corre';
          ga.objetivo = [
            ga.pos[0] + ((ga.pos[0] - perro.pos[0]) / dPerro) * 0.7,
            ga.pos[1] + ((ga.pos[1] - perro.pos[1]) / dPerro) * 0.7,
          ];
        }
        if (ga.modo === 'corre') {
          const dx = ga.objetivo[0] - ga.pos[0];
          const dz = ga.objetivo[1] - ga.pos[1];
          const dist = Math.hypot(dx, dz);
          if (dist < 0.06) {
            ga.modo = 'picotea';
            ga.tModo = 1.5 + ((ga.fase * 5) % 3);
          } else {
            const paso = 0.85 * dt;
            ga.pos[0] += (dx / dist) * paso;
            ga.pos[1] += (dz / dist) * paso;
            ga.rumbo += giroCorto(ga.rumbo, rumboY(dx, dz)) * Math.min(1, dt * 8);
          }
        } else {
          ga.tModo -= dt;
          if (ga.tModo <= 0) {
            // Carrerita corta cerca de casa (dispersas, nunca amontonadas).
            const ang = ga.fase * 3.7 + t * 0.13;
            ga.objetivo = [ga.casa[0] + Math.cos(ang) * 0.55, ga.casa[1] + Math.sin(ang) * 0.55];
            ga.modo = 'corre';
          }
        }
        const corre = ga.modo === 'corre';
        const tranco = t * 13 + ga.fase;
        o.position.set(
          ga.pos[0],
          alturaDe(ga.pos[0], ga.pos[1]) + (corre ? Math.abs(Math.sin(tranco)) * 0.03 : 0),
          ga.pos[1],
        );
        // Picoteo: golpes secos del cuerpo entero (a esta escala se lee).
        const pico = corre ? 0 : -Math.pow(Math.max(0, Math.sin(t * 2.4 + ga.fase)), 4) * 0.45;
        o.rotation.set(0, ga.rumbo, pico + (corre ? Math.sin(tranco) * 0.06 : 0));
        o.scale.setScalar(ga.escala);
        o.updateMatrix();
        refGallinas.current.setMatrixAt(i, o.matrix);
      });
      refGallinas.current.instanceMatrix.needsUpdate = true;
    }

    colocado.current = true;
  });

  return (
    <group>
      {/* vacas articuladas: cuerpo + cabeza pivotante (pasta/camina) */}
      {Array.from({ length: conteo.vacas }, (_, i) => {
        const geom = g.vacas[Math.min(i, g.vacas.length - 1)];
        return (
          <group key={i} ref={(el) => (refVacas.current[i] = el)}>
            <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow />
            <group ref={(el) => (refCabezasVaca.current[i] = el)} position={geom.pivote}>
              <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow />
            </group>
          </group>
        );
      })}
      {/* la pareja de arreo: Oliver el dálmata (grande) y Dante el beagle */}
      {PERROS.map((cfg, i) => {
        const geom = g.perros[cfg.raza];
        return (
          <group key={cfg.nombre} ref={(el) => (refPerros.current[i] = el)}>
            <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow />
            <group ref={(el) => (refCabezasPerro.current[i] = el)} position={geom.pivote}>
              <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow />
            </group>
          </group>
        );
      })}
      {/* rebaño y gallinero: UNA InstancedMesh por especie (frustumCulled off:
          las matrices andan por todo el potrero y el bounding no las sigue) */}
      <instancedMesh
        key={`ov-${conteo.ovejas}`}
        ref={refOvejas}
        args={[g.oveja, MATERIAL_HATO, conteo.ovejas]}
        frustumCulled={false}
        castShadow
      />
      <instancedMesh
        key={`ga-${conteo.gallinas}`}
        ref={refGallinas}
        args={[g.gallina, MATERIAL_HATO, conteo.gallinas]}
        frustumCulled={false}
        castShadow
      />
    </group>
  );
}
