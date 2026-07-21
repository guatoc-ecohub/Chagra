/*
 * HatoMovil — EL HATO EN MOVIMIENTO (vida meso del valle, aire Age of Empires).
 *
 * El potrero deja de ser un bodegón: las vacas CAMINAN entre apartos y se
 * paran a pastar, las ovejas van en rebaño (un ancla que deriva y cada oveja
 * la sigue con su puesto), las gallinas picotean y se DISPERSAN cuando pasa
 * un perro, y DOS perros VIVEN la finca entera: OLIVER el dálmata (alto y
 * casi cuadrado, blanco de manchas redondas, parche sobre el ojo) y DANTE el
 * beagle viejo (bajito y alargado, orejón, tricolor de hocico escarchado).
 * Ya NO orbitan un punto: cada uno RONDA la finca por los senderos reales
 * con su ruta larga propia (rondaDePerros) y querencia por los animales —
 * el arreo orbital del hato sobrevive como la mejor etapa del plan. Cada uno
 * con malla de SU raza (fincaRealista): se distinguen por SILUETA desde
 * lejos, no solo por color. Rumbo suavizado, paradas de verdad (las patas
 * ATERRIZAN a la zancada plantada), vaivén de paso.
 *
 * Reusa el banco de fauna REALISTA del valle (veredicto del operador: el
 * ganado va realista; los rubber-hose son la fauna con alma): las mallas de
 * src/visual/mundo3d/finca/fincaRealista.geom.js y el MATERIAL_HATO de
 * animales.jsx. Presupuesto: vacas articuladas (2 draw-calls c/u, cabeza con
 * gesto), ovejas TODAS en una InstancedMesh y gallinas TODAS en otra (1
 * draw-call por especie, variedad por instanceColor sobre el color horneado).
 * Los DOS perros son los protagonistas y pagan más: cuerpo + cabeza + 4
 * patas + cola (+ lengua y baba de Dante) + sombra de contacto ≈ 8-10 draws
 * c/u — a cambio CAMINAN de verdad (trote en diagonal atado a la distancia
 * recorrida: cero patinaje). Un solo useFrame mueve todo; cero GLTF; la
 * única "textura" es una DataTexture 64px procedural para el degradado de
 * las dos sombras de contacto.
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
  geomPerroAndante,
} from '../../visual/mundo3d/finca/fincaRealista.geom.js';
import { usePerrosGuardianes } from '../../visual/creatures/senalPerrosGuardianes.js';
import {
  CASA_VALLE,
  COMPOSICION_LUGARES,
} from '../../visual/mundo3d/direccion/composicionValle.js';

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

/* Polilínea por longitud de arco (mismo patrón que ArrieriaValle; copiado
   chico para mantener el módulo autocontenido). */
function prepararRuta(puntos) {
  const largos = [0];
  for (let i = 1; i < puntos.length; i++) {
    const dx = puntos[i][0] - puntos[i - 1][0];
    const dz = puntos[i][1] - puntos[i - 1][1];
    largos.push(largos[i - 1] + Math.hypot(dx, dz));
  }
  return { puntos, largos, total: largos[largos.length - 1] || 1 };
}

function puntoEnRuta(ruta, s) {
  const d = s * ruta.total;
  let i = 1;
  while (i < ruta.largos.length - 1 && ruta.largos[i] < d) i++;
  const d0 = ruta.largos[i - 1];
  const seg = ruta.largos[i] - d0 || 1;
  const t = (d - d0) / seg;
  const [x0, z0] = ruta.puntos[i - 1];
  const [x1, z1] = ruta.puntos[i];
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, dx: x1 - x0, dz: z1 - z0 };
}

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
 * Los DOS perros de la finca (pedido del operador): recorren TODA la finca
 * JUNTOS ~90% del tiempo, cada uno a su manera. Cada uno tiene MALLA de su
 * raza (fincaRealista.geom): la diferencia de lejos no es solo escala — el
 * dálmata es alto y casi cuadrado (cruz ~0.5 de malla) y el beagle bajito y
 * alargado (cruz ~0.38), así que 0.9 vs 0.62 deja al beagle a ~media altura
 * del dálmata sin volverlo pulga.
 *
 * PERSONALIDAD en números: `vel` (Oliver atlético casi dobla a Dante viejo),
 * `banquina` (offset perpendicular al sendero: cada uno pisa SU huella, por
 * fuera del eje que es de la mula de ArrieriaValle), `husmea` (Dante
 * zigzaguea con la nariz al suelo y se para a olfatear a mitad de tramo),
 * `rOrb`/`velArreo` (en el hato Oliver orbita ancho y Dante cierra por
 * dentro). Oliver FRENA y mira atrás si Dante se rezaga (>2.2 u) y ESPERA
 * en cada cita de fin de etapa: juntos, sin pisarse.
 *
 * Van ARTICULADOS (geomPerroAndante): 4 patas + cola + (Dante) lengua, con
 * un ciclo de TROTE en diagonal cuya fase avanza con la DISTANCIA recorrida
 * — la cadencia sale sola de la zancada de cada raza (patas cortas de beagle
 * = pasitos rápidos), y no hay frecuencia que ajustar a mano.
 */
const PERROS = [
  { nombre: 'Oliver', raza: 'dalmata', escala: 0.9, vel: 0.78, banquina: -0.14, husmea: false, rOrb: 1.0, velArreo: 0.42, fase: 0.8 },
  { nombre: 'Dante', raza: 'beagle', escala: 0.62, vel: 0.52, banquina: 0.16, husmea: true, rOrb: 0.72, velArreo: 0.58, fase: 3.4 },
];

/*
 * LA RONDA DE LA FINCA — el plan compartido de los dos perros (feedback del
 * operador: "recorrido diferente pero juntos el 90% del tiempo"). UNA sola
 * secuencia de etapas por los senderos reales (composicionValle): ambos
 * caminan la misma etapa a la vez — Oliver derecho por su banquina, Dante
 * zigzagueando por la suya — y al rematar cada etapa hay CITA: nadie arranca
 * la siguiente hasta que el otro llegue. La única separación real es la
 * BIFURCACIÓN (etapa con `ptsB`): Dante se desvía a la pila de compost (el
 * cielo de un beagle) mientras Oliver va derecho a la tranquera y lo espera
 * — ~10% del ciclo. La querencia por los animales es estructural: la ronda
 * ARRANCA arreando el hato (la etapa orbital aprobada de siempre) y pasa por
 * el gallinero; entre ambos es el tramo más largo de pausa del plan.
 *
 * Cada etapa: { pts, ptsB?, dur, paraA?, paraB?, paradas? } — pts en coords
 * MUNDO ([x, z]); `paradas` = fracciones de arco donde Dante clava la nariz.
 * `paraA`/`paraB` = gesto del alto de fin de etapa (default: Oliver 'vigila'
 * con la cabeza en barrido alto, Dante 'olfatea' con el hocico clavado).
 */
function rondaDePerros(cx, cz, radio) {
  const L = COMPOSICION_LUGARES;
  const casaG = [cx + Math.cos(1.2 + Math.PI) * radio * 0.45, cz + Math.sin(1.2 + Math.PI) * radio * 0.45];
  const tranquera = [cx + 1.4, cz + 1.0];
  const patio = [CASA_VALLE.pos[0] - 0.4, CASA_VALLE.pos[1] + 0.9];
  return [
    // 1 · EL HATO: los dos arrean orbitando el rebaño (la etapa reina).
    { arrea: true, dur: 9 },
    // 2 · Al GALLINERO: pasan juntos y las gallinas se dispersan.
    { pts: [[casaG[0] + 0.55, casaG[1] - 0.35]], dur: 4 },
    // 3 · BIFURCACIÓN (el ~10% separados): Oliver derecho a la tranquera;
    //     Dante se desvía por la PILA de compost y olfatea el camino.
    {
      pts: [[cx - 0.4, cz + 0.6], tranquera],
      ptsB: [[cx + 0.2, cz + 1.4], [-3.5, 7.3], [L.abono[0] + 0.2, L.abono[1] - 0.3], [-3.6, 6.9], tranquera],
      dur: 2.5,
      paradas: [0.45],
    },
    // 4 · Tranquera → eras → el PATIO de la casa (el circuito de la mañana).
    { pts: [[-2.9, 5.8], [-2.0, 5.2], [L.suelo[0] + 0.3, L.suelo[1] - 0.6], patio], dur: 3, paradas: [0.55] },
    // 5 · A la QUEBRADA por el camino del balde: los dos BEBEN (cabeza baja).
    { pts: [[-0.5, 2.2], [0.5, 1.0], [1.35, 0.3]], dur: 3, paraA: 'olfatea' },
    // 6 · Quebrada → HUERTA → MERCADO por la plaza: la ronda del frente.
    { pts: [[1.8, 1.5], [2.6, 3.1], [L.sanidad[0] - 0.2, L.sanidad[1] - 0.4], [4.2, 5.4], [L.mercado[0] - 0.3, L.mercado[1] - 0.3]], dur: 2.5, paradas: [0.6] },
    // 7 · El REGRESO largo: plaza → casa → tranquera → potrero (sin alto:
    //     desemboca en el arreo y la ronda vuelve a empezar).
    { pts: [[3.2, 4.9], [1.4, 4.2], [-0.4, 3.1], [-2.0, 5.1], [-3.0, 5.9], [cx + 0.9, cz + 0.4]], dur: 0, paradas: [0.35, 0.7] },
  ];
}

/* Ciclo de marcha: amplitud del péndulo de pata (rad) y desfase por pata en
   TROTE (diagonales alternas: del-izq+tras-der vs del-der+tras-izq). */
const AMP_TRANCO = 0.55;
const FASE_DIAGONAL = [0, Math.PI, Math.PI, 0];

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

  /* EL MOMENTO (escena de los guardianes): la señal DOM→canvas que gobierna
     el cruce 3D↔2D de los perros. 'alerta' los planta ladrando hacia el
     monte; 'oculto' apaga el mesh SECO (su héroe 2D está en pantalla) y lo
     CONGELA donde está — al volver a 'normal' renace en el mismo punto. */
  const guardia = usePerrosGuardianes();

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
        dalmata: geomPerroAndante({ raza: 'dalmata', q }),
        beagle: geomPerroAndante({ raza: 'beagle', q }),
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

    // Los perros arrancan JUNTOS en la tranquera del potrero, cada uno en su
    // gesto (Oliver plantado alto vigilando el hato, Dante nariz al suelo),
    // y de ahí salen a la RONDA compartida (rondaDePerros). `faseTranco`
    // arranca en 0 = zancada PLANTADA (las 4 patas en tierra, diagonales
    // extendidas): en reducedMotion se quedan así — un fotograma digno.
    const ronda = rondaDePerros(cx, cz, radio);
    const perros = PERROS.map((cfg, i) => {
      const pos = i === 0 ? [cx + 1.35, cz + 0.9] : [cx + 0.85, cz + 1.3];
      return {
        cfg,
        plan: ronda,
        etapa: ronda.length - 1, // la cita inicial arranca la etapa 0 (arrea)
        modo: 'para',
        para: i === 0 ? 'vigila' : 'olfatea',
        tModo: reducedMotion ? Infinity : 1.6 + i * 0.7,
        sigueTramo: false,
        parada: 0,
        s: 0,
        ruta: null,
        angArreo: 0,
        rArreo: cfg.rOrb,
        pos,
        rumbo: rumboY(cx - pos[0], cz - pos[1]),
        faseTranco: 0,
      };
    });

    return { clave: claveHato, vacas, rebano, gallinas, perros };
  };

  /* Refs de escena: vacas/perros articulados + las dos InstancedMesh. */
  const refVacas = useRef([]);
  const refCabezasVaca = useRef([]);
  const refPerros = useRef([]);
  const refCabezasPerro = useRef([]);
  const refPatasPerro = useRef([[], []]);
  const refColasPerro = useRef([]);
  const refLengua = useRef(null);
  const refBaba = useRef(null);
  const refSombras = useRef([]);
  const refOvejas = useRef(null);
  const refGallinas = useRef(null);
  const colocado = useRef(false);
  const util = useMemo(() => ({ o: new THREE.Object3D() }), []);

  /* La GOTA de baba de Dante: hilo + gota colgando del origen hacia abajo
     (así scale.y la ESTIRA como baba de verdad). Material propio: húmedo,
     translúcido y con brillo — la única pieza no-Lambert del hato. */
  const babaAssets = useMemo(() => {
    const hilo = new THREE.CylinderGeometry(0.004, 0.0025, 0.05, 5, 1).translate(0, -0.025, 0);
    const gota = new THREE.SphereGeometry(0.011, 6, 5);
    gota.scale(1, 1.35, 1);
    gota.translate(0, -0.055, 0);
    const geom = mergeGeometries([hilo, gota], false); // ambas indexadas → ok
    const mat = new THREE.MeshPhongMaterial({
      color: '#cdeaf2',
      transparent: true,
      opacity: 0.62,
      shininess: 90,
      specular: '#ffffff',
      depthWrite: false,
    });
    return { geom, mat };
  }, []);

  /* Sombra de contacto de los perros: disco con degradado radial horneado en
     una DataTexture 64px procedural (sin assets). Acompaña el paso: el cuerpo
     bota, la sombra queda pegada al suelo y respira con la altura. */
  const sombraAssets = useMemo(() => {
    const n = 64;
    const data = new Uint8Array(n * n * 4);
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const dx = (ix + 0.5) / n - 0.5;
        const dy = (iy + 0.5) / n - 0.5;
        const d = Math.min(1, Math.hypot(dx, dy) * 2);
        const a = (1 - d) * (1 - d);
        const o = (iy * n + ix) * 4;
        data[o] = 16;
        data[o + 1] = 20;
        data[o + 2] = 14;
        data[o + 3] = Math.round(215 * a);
      }
    }
    const tex = new THREE.DataTexture(data, n, n);
    tex.needsUpdate = true;
    const geom = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);
    const mats = PERROS.map(
      () => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    return { geom, mats };
  }, []);

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

    /* ── PERROS: Dante y Oliver RONDAN la finca — juntos, con marcha real ──
       PRELUDIO de guardianes (EL MOMENTO, cruce 3D↔2D) al tope del forEach:
       'oculto' y 'alerta' cortan el frame con return temprano y la ronda
       queda PAUSADA donde iba (al volver a 'normal' se retoma sin teleport).
       Motor de etapas compartido (rondaDePerros): 'arrea' orbita el rebaño,
       'camino' avanza por la ruta de la etapa (preparada al entrar con la
       posición actual prependida: cero teleports entre etapas), 'para' es el
       alto con gesto (olfatea/vigila/bebe) y 'cita' el reencuentro — nadie
       arranca la etapa siguiente sin el otro (juntos ~90% del ciclo).
       El ciclo de trote sigue ATADO al desplazamiento: la fase avanza con la
       distancia recorrida dividida por la zancada de la raza (la pata en
       apoyo barre hacia atrás mientras el cuerpo pasa encima; la pata en
       vuelo vuelve PLEGADA) — cero patinaje a cualquier velocidad, y parado
       la fase ATERRIZA en la zancada plantada más cercana (kπ). */
    const entrarEtapa = (pr, idx) => {
      pr.etapa = idx;
      pr.parada = 0;
      pr.sigueTramo = false;
      const et = pr.plan[idx];
      if (et.arrea) {
        pr.modo = 'arrea';
        pr.tModo = et.dur;
        pr.angArreo = Math.atan2(pr.pos[1] - rb.pos[1], pr.pos[0] - rb.pos[0]);
        pr.rArreo = Math.max(0.35, Math.hypot(pr.pos[0] - rb.pos[0], pr.pos[1] - rb.pos[1]));
      } else {
        pr.modo = 'camino';
        pr.s = 0;
        const pts = pr.cfg.husmea && et.ptsB ? et.ptsB : et.pts;
        pr.ruta = prepararRuta([[pr.pos[0], pr.pos[1]], ...pts]);
      }
    };
    // La CITA: solo cuando LOS DOS remataron su etapa arrancan la siguiente.
    if (hato.perros.every((pr) => pr.modo === 'cita')) {
      const sig = (hato.perros[0].etapa + 1) % hato.perros[0].plan.length;
      hato.perros.forEach((pr) => entrarEtapa(pr, sig));
    }
    hato.perros.forEach((pr, i) => {
      const { escala, fase } = pr.cfg;
      const info = g.perros[pr.cfg.raza];

      // ── LA SEÑAL DE LOS GUARDIANES (EL MOMENTO, cruce 3D↔2D) ───────────
      // Preludio: manda sobre la ronda. La etapa/modo/pos quedan congelados
      // mientras dure la guardia y se retoman al volver a 'normal'.
      const modoGuardian = guardia[pr.cfg.raza];
      if (modoGuardian === 'oculto') {
        // héroe 2D activo: mesh dormido y CONGELADO (el JSX lo esconde)
        pr.enGuardia = true;
        return;
      }
      if (modoGuardian === 'alerta') {
        // AVISA: se planta mirando al monte y LADRA — pulsos que empinan el
        // cuerpo y rematan en el hocico; patas plantadas en diagonales, cola
        // alta y tensa. Es anticipación de guardián, nunca agresión.
        pr.enGuardia = true;
        const grp = refPerros.current[i];
        if (!grp) return;
        const hacia = guardia.hacia;
        if (hacia) {
          const rx = hacia[0] - pr.pos[0];
          const rz = hacia[1] - pr.pos[1];
          if (Math.hypot(rx, rz) > 1e-4) {
            pr.rumbo += giroCorto(pr.rumbo, rumboY(rx, rz)) * Math.min(1, dt * 6);
          }
        }
        const yB = alturaDe(pr.pos[0], pr.pos[1]);
        const ladra = Math.pow(Math.max(0, Math.sin(t * 8.5 + i * 1.9)), 2); // pulso ¡guau!
        grp.visible = true;
        grp.position.set(pr.pos[0], yB + info.largoPata * escala * 0.012 + ladra * 0.014, pr.pos[1]);
        grp.rotation.set(0, pr.rumbo, ladra * 0.07); // se empina al ladrar
        grp.scale.setScalar(escala);
        const patasAl = refPatasPerro.current[i];
        for (let k = 0; k < 4; k++) {
          const gp = patasAl && patasAl[k];
          if (!gp) continue;
          gp.rotation.z = AMP_TRANCO * 0.5 * Math.cos(FASE_DIAGONAL[k]); // plantado
          gp.scale.y = 1;
        }
        const cabAl = refCabezasPerro.current[i];
        if (cabAl) {
          cabAl.rotation.y = 0;
          cabAl.rotation.x = 0;
          cabAl.rotation.z = 0.05 + ladra * 0.28; // el hocico remata cada ladrido
        }
        const colaAl = refColasPerro.current[i];
        if (colaAl) {
          colaAl.rotation.x = Math.sin(t * 10 + i) * 0.16; // alta y tensa
          colaAl.rotation.y = 0;
        }
        const somAl = refSombras.current[i];
        if (somAl) {
          somAl.position.set(pr.pos[0], yB + 0.02, pr.pos[1]);
          somAl.scale.setScalar(escala);
          sombraAssets.mats[i].opacity = 0.44;
        }
        return;
      }
      // Al VOLVER de la guardia: si estaba arreando, re-anclar la órbita a
      // su posición real (el ancla del rebaño siguió derivando mientras el
      // perro estaba plantado/oculto) — retoma la etapa donde quedó, sin
      // teleport. En 'camino'/'para'/'cita' la posición sale de pr.pos y de
      // pr.s (que no avanzaron), así que ya retoman solas.
      if (pr.enGuardia) {
        pr.enGuardia = false;
        if (pr.modo === 'arrea') {
          pr.angArreo = Math.atan2(pr.pos[1] - rb.pos[1], pr.pos[0] - rb.pos[0]);
          pr.rArreo = Math.max(0.35, Math.hypot(pr.pos[0] - rb.pos[0], pr.pos[1] - rb.pos[1]));
        }
      }

      const otro = hato.perros[1 - i];
      const dOtro0 = Math.hypot(pr.pos[0] - otro.pos[0], pr.pos[1] - otro.pos[1]);
      let px = pr.pos[0];
      let pz = pr.pos[1];
      let quieto = false;

      if (pr.modo === 'arrea') {
        // La etapa del hato (la de siempre): Oliver orbita ancho marcando el
        // paso y Dante cierra la pinza por dentro, con arranques de carrera.
        const brio = 0.6 + Math.max(0, Math.sin(t * 0.31 + fase)) * 1.4;
        pr.tModo -= dt;
        pr.angArreo += dt * pr.cfg.velArreo * brio;
        pr.rArreo += (pr.cfg.rOrb - pr.rArreo) * Math.min(1, dt * 0.9);
        const rr = pr.rArreo + Math.sin(t * 0.23 + fase) * 0.12;
        px = rb.pos[0] + Math.cos(pr.angArreo) * rr;
        pz = rb.pos[1] + Math.sin(pr.angArreo) * rr;
        if (pr.tModo <= 0) pr.modo = 'cita';
      } else if (pr.modo === 'para') {
        // Alto de verdad: el cuerpo se planta y la cabeza hace el gesto.
        pr.tModo -= dt;
        quieto = true;
        if (pr.tModo <= 0) {
          if (pr.sigueTramo) {
            pr.modo = 'camino';
            pr.sigueTramo = false;
          } else pr.modo = 'cita';
        }
      } else if (pr.modo === 'cita') {
        // Esperando al compañero (Oliver casi siempre): parado, buscándolo.
        quieto = true;
      } else {
        // En CAMINO por la etapa. Oliver va derecho y ligero — y si Dante se
        // rezaga (>2.2 u), FRENA a paso corto hasta tenerlo cerca (salvo en
        // la bifurcación, donde la separación es a propósito).
        const et = pr.plan[pr.etapa];
        const brio = 0.8 + Math.max(0, Math.sin(t * 0.27 + fase)) * 0.45;
        const freno = !pr.cfg.husmea && dOtro0 > 2.2 && !et.ptsB ? 0.3 : 1;
        pr.s = Math.min(1, pr.s + (dt * pr.cfg.vel * brio * freno) / pr.ruta.total);
        // Dante: paradas de olfateo a mitad de tramo (el sabueso se distrae).
        if (pr.cfg.husmea && et.paradas && pr.parada < et.paradas.length && pr.s >= et.paradas[pr.parada]) {
          pr.parada += 1;
          pr.modo = 'para';
          pr.para = 'olfatea';
          pr.tModo = 1.1 + ((fase * 3) % 1.2);
          pr.sigueTramo = true;
        }
        const punto = puntoEnRuta(pr.ruta, pr.s);
        const a = Math.atan2(punto.dz, punto.dx);
        // Cada perro pisa SU banquina (el eje del sendero es de la mula de
        // ArrieriaValle) y Dante además zigzaguea: la nariz manda.
        const off = pr.cfg.banquina +
          (pr.cfg.husmea && pr.ruta.total > 0.6 ? Math.sin(pr.s * pr.ruta.total * 2.4 + fase) * 0.15 : 0);
        px = punto.x - Math.sin(a) * off;
        pz = punto.z + Math.cos(a) * off;
        if (pr.s >= 1) {
          if (et.dur > 0) {
            pr.modo = 'para';
            pr.para = (i === 0 ? et.paraA : et.paraB) ?? (i === 0 ? 'vigila' : 'olfatea');
            pr.tModo = et.dur;
          } else pr.modo = 'cita';
        }
      }

      // No pisarse: empujón suave si el compañero queda encima…
      const dOtro = Math.hypot(px - otro.pos[0], pz - otro.pos[1]);
      if (dOtro > 1e-4 && dOtro < 0.45) {
        const e = (0.45 - dOtro) * 0.55;
        px += ((px - otro.pos[0]) / dOtro) * e;
        pz += ((pz - otro.pos[1]) / dOtro) * e;
      }
      // …y esquivar a las vacas al cruzar el potrero.
      if (Math.hypot(px - cx, pz - cz) < radio + 0.8) {
        for (const v of hato.vacas) {
          const dv = Math.hypot(px - v.pos[0], pz - v.pos[1]);
          if (dv > 1e-4 && dv < 0.55) {
            const e = (0.55 - dv) * 0.5;
            px += ((px - v.pos[0]) / dv) * e;
            pz += ((pz - v.pos[1]) / dv) * e;
          }
        }
      }

      const dx = px - pr.pos[0];
      const dz = pz - pr.pos[1];
      const dFrame = Math.hypot(dx, dz);
      if (dFrame > 1e-4) pr.rumbo += giroCorto(pr.rumbo, rumboY(dx, dz)) * Math.min(1, dt * 4.5);
      pr.pos[0] = px;
      pr.pos[1] = pz;

      // Anti-patinaje: zancada = arco de la media vuelta de apoyo (4·AMP·L).
      const lPata = info.largoPata * escala;
      const zancada = 4 * AMP_TRANCO * lPata;
      if (dt > 0) {
        if (quieto || dFrame < 1e-5) {
          // Aterrizar: la fase se asienta en la zancada plantada (kπ: las
          // cuatro patas en tierra, diagonales extendidas — nada congelado
          // en el aire).
          const meta = Math.round(pr.faseTranco / Math.PI) * Math.PI;
          pr.faseTranco += (meta - pr.faseTranco) * Math.min(1, dt * 7);
        } else {
          pr.faseTranco += (Math.min(dFrame, zancada) / zancada) * Math.PI * 2;
        }
      }
      const fT = pr.faseTranco;
      const cT = Math.cos(fT);
      // Bóveda del paso: patas extendidas (|cos|→1) = cuerpo abajo; pata de
      // apoyo vertical (|cos|→0) = cuerpo arriba. 0.7 = pliegue que absorbe.
      const dip = lPata * (1 - Math.cos(AMP_TRANCO * Math.abs(cT))) * 0.7;
      const yBase = alturaDe(px, pz);
      const velInst = dt > 0 ? dFrame / dt : 0;

      const grupo = refPerros.current[i];
      if (grupo) {
        grupo.position.set(px, yBase - dip + lPata * 0.012, pz);
        grupo.rotation.set(
          Math.sin(fT) * 0.05, // balanceo de cadera: una vez por ciclo
          pr.rumbo,
          Math.cos(fT * 2) * 0.03 * Math.min(1, velInst / 0.45), // cabeceo al andar
        );
        grupo.scale.setScalar(escala);
      }

      // Las 4 patas: péndulo desde el hombro/cadera, diagonales alternas.
      const patas = refPatasPerro.current[i];
      for (let k = 0; k < 4; k++) {
        const gp = patas && patas[k];
        if (!gp) continue;
        const ph = fT + FASE_DIAGONAL[k];
        gp.rotation.z = AMP_TRANCO * Math.cos(ph); // +z = pata al frente (+X)
        const vuelo = Math.max(0, -Math.sin(ph)); // >0 solo al volver en el aire
        gp.scale.y = 1 - 0.24 * vuelo; // la pata se pliega al volar
      }

      // Cercanía = reencuentro: cuando se juntan, Oliver se alegra.
      const saludo = Math.max(0, 1 - dOtro / 0.9);

      // Colas con alma: Oliver helicóptero al reencontrarse; Dante bandera
      // corta que se ACELERA cuando el olfato encuentra algo bueno.
      const cola = refColasPerro.current[i];
      if (cola) {
        if (i === 0) {
          const w = t * (7 + 9 * saludo) + fase;
          const amp = 0.35 + saludo * 0.55;
          cola.rotation.x = Math.sin(w) * amp;
          cola.rotation.y = Math.cos(w) * amp * saludo; // el círculo, solo de alegría
        } else {
          const emocion = quieto && pr.para === 'olfatea' && pr.modo === 'para' ? 1 : 0;
          cola.rotation.x = Math.sin(t * (9 + emocion * 4) + fase) * (0.28 + emocion * 0.22) + Math.sin(fT) * 0.08;
        }
      }

      const cabeza = refCabezasPerro.current[i];
      if (cabeza) {
        if (i === 0) {
          // OLIVER: cabeza alta de atleta. En la cita se GIRA a buscar a
          // Dante; vigilando barre despacio el horizonte; bebiendo en la
          // quebrada baja el hocico al agua.
          const yawDante = Math.max(-1.1, Math.min(1.1, giroCorto(pr.rumbo, rumboY(otro.pos[0] - px, otro.pos[1] - pz))));
          const busca = pr.modo === 'cita' || saludo > 0.25;
          const bebe = pr.modo === 'para' && pr.para === 'olfatea';
          cabeza.rotation.y = busca
            ? yawDante
            : quieto
              ? Math.sin(t * 0.55 + fase) * 0.85
              : Math.sin(t * 0.9 + fase) * 0.35;
          cabeza.rotation.x = Math.sin(t * 0.4 + fase) * 0.06 + saludo * Math.sin(t * 3.4) * 0.18;
          cabeza.rotation.z = bebe ? -0.42 + Math.sin(t * 5.5) * 0.04 : quieto ? 0.1 : Math.cos(fT * 2) * 0.02;
        } else {
          // DANTE: la nariz MANDA. Caminando barre el rastro con el hocico
          // bajo; en el alto lo CLAVA (resoplidos cortos); en la cita y el
          // arreo sube la cabeza con su jadeo de siempre.
          const olfatea = pr.modo === 'para';
          const rastrea = pr.modo === 'camino';
          cabeza.rotation.y = rastrea ? Math.sin(t * 1.6 + fase) * 0.55 : Math.sin(t * 0.9 + fase) * 0.4;
          cabeza.rotation.x = 0;
          cabeza.rotation.z = olfatea
            ? -0.52 + Math.sin(t * 8.2) * 0.05
            : rastrea
              ? -0.3 + Math.sin(t * 7.1) * 0.045
              : 0.06 + Math.sin(t * 6.2) * 0.045 + Math.cos(fT * 2) * 0.02;
        }
      }

      // La LENGUA babosa de Dante: cuelga, se mece con el trote (péndulo con
      // retraso) y tiembla con el jadeo. La GOTA cuelga de la punta, oscila
      // a contratiempo y se ESTIRA despacio hasta "gotear" (el ciclo lento
      // del seno la hace crecer y recogerse — baba eterna de beagle viejo).
      if (i === 1) {
        const lengua = refLengua.current;
        if (lengua) {
          lengua.rotation.x = Math.sin(fT - 0.9) * 0.22 + Math.sin(t * 6.2) * 0.05;
          lengua.rotation.z = -0.12 + Math.cos(t * 6.2) * 0.07;
        }
        const baba = refBaba.current;
        if (baba) {
          baba.rotation.x = -Math.sin(fT - 1.6) * 0.5;
          baba.rotation.z = 0.14 - Math.cos(t * 6.2) * 0.07;
          const estira = 0.55 + Math.pow(0.5 + 0.5 * Math.sin(t * 0.9 + 1.1), 2) * 1.15;
          baba.scale.set(1, estira, 1);
        }
      }

      // Sombra de contacto: pegada al suelo, respira con la altura del paso.
      const sombra = refSombras.current[i];
      if (sombra) {
        sombra.position.set(px, yBase + 0.02, pz);
        const alto = 1 - Math.min(1, dip / (lPata * 0.104 + 1e-6)); // 1 = cuerpo arriba
        sombra.scale.setScalar(escala * (1.04 - 0.1 * alto));
        sombraAssets.mats[i].opacity = 0.5 - 0.14 * alto;
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
      {/* la pareja de arreo ARTICULADA: Oliver el dálmata (grande, risueño)
          y Dante el beagle (chico, baboso). Cuerpo + cabeza + 4 patas con
          pivote en hombro/cadera + cola con pivote en la raíz + (Dante) la
          lengua con su gota de baba. 7-9 draws por perro: protagonistas. */}
      {PERROS.map((cfg, i) => {
        const geom = g.perros[cfg.raza];
        return (
          <group
            key={cfg.nombre}
            ref={(el) => (refPerros.current[i] = el)}
            /* héroe 2D activo → el mesh se apaga SECO (señal 'oculto');
               declarativo para que funcione también bajo reducedMotion */
            visible={guardia[cfg.raza] !== 'oculto'}
          >
            <mesh geometry={geom.cuerpo} material={MATERIAL_HATO} castShadow />
            <group ref={(el) => (refCabezasPerro.current[i] = el)} position={geom.pivote}>
              <mesh geometry={geom.cabeza} material={MATERIAL_HATO} castShadow />
              {geom.lengua && (
                <group ref={refLengua} position={geom.lengua.pivote}>
                  <mesh geometry={geom.lengua.geom} material={MATERIAL_HATO} />
                  <group ref={refBaba} position={geom.lengua.punta}>
                    <mesh geometry={babaAssets.geom} material={babaAssets.mat} />
                  </group>
                </group>
              )}
            </group>
            {geom.patas.map((pata, k) => (
              <group
                key={k}
                ref={(el) => {
                  refPatasPerro.current[i][k] = el;
                }}
                position={pata.pivote}
              >
                <mesh geometry={pata.geom} material={MATERIAL_HATO} castShadow />
              </group>
            ))}
            <group ref={(el) => (refColasPerro.current[i] = el)} position={geom.cola.pivote}>
              <mesh geometry={geom.cola.geom} material={MATERIAL_HATO} castShadow />
            </group>
          </group>
        );
      })}
      {/* sombras de contacto de los perros — fuera del grupo: el cuerpo bota
          con el tranco, la sombra vive pegada al terreno */}
      {PERROS.map((cfg, i) => (
        <mesh
          key={`sombra-${cfg.nombre}`}
          ref={(el) => (refSombras.current[i] = el)}
          geometry={sombraAssets.geom}
          material={sombraAssets.mats[i]}
          renderOrder={2}
          visible={guardia[cfg.raza] !== 'oculto'}
        />
      ))}
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
