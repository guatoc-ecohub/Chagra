/*
 * RanaArlequin — Atelopus del páramo, a escala real: cuatro centímetros.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  CUÁL RANA ES (había tres peleando en el repo)
 * ─────────────────────────────────────────────────────────────────────────────
 * El repo afirmaba dos especies incompatibles a la vez: Phyllobates terribilis
 * (la "rana dorada", dendrobátida, endémica del CHOCÓ, tierra caliente húmeda) y
 * Atelopus (arlequín, bufónido, del PÁRAMO). Son familias distintas y pisos
 * térmicos opuestos: no pueden ser el mismo animal.
 *
 * Aquí se resuelve en ATELOPUS, por dos razones. La primera es que Chagra es
 * monte andino: el arlequín es el que de verdad está ahí (IAvH lista A. muisca
 * y A. lozanoi como fauna de páramo). La segunda es que el encargo pedía "rana
 * dorada / arlequines" como si fueran dos, y en Atelopus son uno: el arlequín
 * real ES dorado y negro. La contradicción se disuelve sola en cuanto se mira
 * el animal verdadero.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  LAS DOS COSAS QUE HACE, Y NINGUNA ES SALTAR
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. CAMINA. Es la rareza célebre del género: Atelopus no salta, camina —
 *    despacio, deliberado, las cuatro patas esparrancadas. Una rana que camina
 *    descoloca a cualquiera que espere el salto, y esa incomodidad es la verdad
 *    del bicho. Fue un regalo para una tarea sobre locomoción.
 *
 * 2. HACE SEÑAS. Vive junto a quebradas donde el agua ruge tanto que cantar no
 *    sirve, así que SALUDA: levanta una mano y la gira, despacio, como quien
 *    hace señas desde la otra orilla. Es de los poquísimos anfibios del mundo
 *    que se comunican por seña visual. Si este animal hace UNA sola cosa en la
 *    escena, que sea esta.
 *
 * ESCALA REAL, a propósito: 4 cm. La escena la trae cerca de la cámara en vez
 * de agrandarla. Un arlequín del tamaño de un gato sería una mentira cómoda
 * sobre lo que se está perdiendo — y lo que se está perdiendo es justamente algo
 * diminuto, que cabe en una uña y que casi nadie vio nunca.
 *
 * EL ORO Y EL NEGRO NO SON ADORNO: son aposematismo. El animal es tóxico y lo
 * ANUNCIA. Es el único de toda esta fauna con permiso de gritar, y grita por una
 * razón.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors } from '../paleta';
import { kitGeo, detalleDeFauna, ANCLA_PIE } from './anatomiaFauna.geom.js';
import {
  MARCHAS,
  pasoDePata,
  balanceoDelCuerpo,
  tobilloDeLaPostura,
  resolverDosHuesos,
  posarHueso,
  andarCamino,
} from './marcha.js';

const { pintar, poner, fusionar, bola, memo } = kitGeo;

const PATAS = [
  { id: 'traseraIzq', trasera: true, lado: -1 },
  { id: 'delanteraIzq', trasera: false, lado: -1 },
  { id: 'traseraDer', trasera: true, lado: 1 },
  { id: 'delanteraDer', trasera: false, lado: 1 },
];

const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _hombro = new THREE.Vector3();
const _contacto = new THREE.Vector3();
const _tobillo = new THREE.Vector3();
const _tobilloOk = new THREE.Vector3();
const _codo = new THREE.Vector3();
const _polo = new THREE.Vector3();

/* -------------------------------------------------------------------------- */

/*
 * El cuerpo: chato, esbelto, de hocico PUNTUDO (no el morro romo de una rana de
 * charco) y con las manchas negras del arlequín horneadas encima.
 */
function cuerpoRana(ficha, tier) {
  const c = ficha.pelaje;
  const partes = [];
  const cu = ficha.cuerpo;

  const tronco = bola(cu.radio, cu.radio * 0.78, cu.largo * 0.5, tier.detalle > 0 ? 1 : 0);
  partes.push(pintar(tronco, c.oro));

  /* el vientre */
  const vientre = bola(cu.radio * 0.85, cu.radio * 0.4, cu.largo * 0.44, 0);
  poner(vientre, [0, -cu.radio * 0.5, 0]);
  partes.push(pintar(vientre, c.vientre));

  /* la cabeza y el HOCICO PUNTUDO: la seña del género */
  const cab = bola(ficha.cabeza.radio, ficha.cabeza.radio * 0.8, ficha.cabeza.largo * 0.6, tier.detalle > 0 ? 1 : 0);
  poner(cab, [0, cu.radio * 0.05, cu.largo * 0.45]);
  partes.push(pintar(cab, c.oro));
  const punta = new THREE.ConeGeometry(ficha.cabeza.radio * 0.75, ficha.cabeza.largo * 0.8, 6);
  poner(punta, [0, cu.radio * 0.02, cu.largo * 0.45 + ficha.cabeza.largo * 0.55], [Math.PI / 2, 0, 0]);
  partes.push(pintar(punta, c.oro));

  /*
   * LAS MANCHAS DEL ARLEQUÍN. Alto contraste, bordes duros, repartidas por el
   * lomo y las ancas — no un jaspeado suave. Y el patrón es individual: dos
   * arlequines de la misma quebrada llevan dibujos distintos. Por eso salen de
   * una semilla y no de una tabla.
   */
  const s = ficha.semilla || 0;
  const n = tier.detalle > 0 ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    const r1 = a - Math.floor(a);
    const b = Math.sin(i * 39.346 + s * 11.135) * 24634.6345;
    const r2 = b - Math.floor(b);
    const z = (r1 - 0.5) * cu.largo * 0.95;
    const phi = (r2 - 0.5) * 2.1;
    const rr = cu.radio * (0.28 + r1 * 0.3);
    const m = bola(rr, rr * 0.45, rr * 0.85, 0);
    poner(m, [Math.sin(phi) * cu.radio * 0.82, Math.cos(phi) * cu.radio * 0.72, z]);
    partes.push(pintar(m, c.mancha));
  }

  /* los ojos: saltones, encima de la cabeza (mira hacia arriba: el cielo es de
     donde vienen los pájaros) */
  for (const lado of [1, -1]) {
    const o = bola(ficha.ojo.radio, ficha.ojo.radio, ficha.ojo.radio, 0);
    poner(o, [lado * ficha.cabeza.radio * 0.72, cu.radio * 0.5, cu.largo * 0.45 + ficha.cabeza.largo * 0.1]);
    partes.push(pintar(o, c.ojo));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */

/**
 * @param {object} props
 * @param {object} props.ficha   FICHA_RANA
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {THREE.Vector3[]} [props.camino]  su senda (chiquita: 4 cm/s no llega lejos)
 * @param {boolean} [props.quieto]
 */
export default function RanaArlequin({ ficha, perfil, camino = null, quieto = false, arranque = 0 }) {
  const tier = useMemo(() => detalleDeFauna(perfil), [perfil]);
  const marcha = MARCHAS[ficha.marcha] || MARCHAS.esparrancado;
  const ancla = ANCLA_PIE.esparrancado;

  const geos = useMemo(
    () =>
      memo(`rana|${tier.segs}|${tier.detalle}|${ficha.semilla || 0}`, () => {
        const c = ficha.pelaje;
        const tr = ficha.patas.trasera;
        const de = ficha.patas.delantera;
        const hueso = (largo, r, color) => {
          const g = new THREE.CylinderGeometry(r, r * 0.8, largo, 5);
          poner(g, [0, -largo / 2, 0]);
          const nudo = bola(r * 1.05, r * 1.05, r * 1.05, 0);
          return pintar(fusionar([g, nudo]), color);
        };
        /* la mano: los DISCOS de los dedos, con los que se agarra de la piedra
           mojada del borde de la quebrada */
        const mano = (p) => {
          const partes = [];
          for (let i = -1; i <= 1; i++) {
            const d = bola(ficha.patas.discos, ficha.patas.discos * 0.5, ficha.patas.discos * 1.3, 0);
            poner(d, [i * p.radio * 1.1, -p.pie * 0.9, p.pie * 0.35]);
            partes.push(pintar(d, c.disco));
            const dedo = new THREE.CylinderGeometry(p.radio * 0.28, p.radio * 0.22, p.pie * 0.8, 3);
            poner(dedo, [i * p.radio * 0.8, -p.pie * 0.5, p.pie * 0.18], [0.4, 0, i * 0.25]);
            partes.push(pintar(dedo, c.oro));
          }
          return fusionar(partes);
        };
        return {
          cuerpo: cuerpoRana(ficha, tier),
          muslo: hueso(tr.a, tr.radio, c.oro),
          canilla: hueso(tr.b, tr.radio * 0.8, c.oro),
          pieTrasero: mano(tr),
          brazo: hueso(de.a, de.radio, c.oro),
          antebrazo: hueso(de.b, de.radio * 0.8, c.oro),
          pieDelantero: mano(de),
        };
      }),
    [ficha, tier],
  );

  /*
   * LA PIEL HÚMEDA — la única de toda esta fauna que se ve MOJADA. El brillo no
   * es un lujo: es la firma del anfibio, el que respira por la piel y por eso
   * tiene que mantenerla húmeda. Y es exactamente por eso que la sequía es su
   * tragedia y no una molestia. En tier alto el material rico lo da con
   * roughness; en gama baja, Lambert, y se pierde — que se pierda el brillo
   * antes que la marcha.
   */
  const material = useMemo(() => {
    const m = crearMaterialVertexColors(perfil, { flatShading: false, roughness: 0.25 });
    return m;
  }, [perfil]);
  useEffect(() => () => material.dispose(), [material]);

  const raiz = useRef(null);
  const cuerpoG = useRef(null);
  const huesos = useRef([]);
  const reloj = useRef({ fase: 0, recorrido: arranque });

  const med = useMemo(
    () => ({
      /* el cuerpo casi a ras del suelo: el esparrancado no levanta el vientre,
         lo arrastra apenas — no tiene las patas debajo para levantarlo */
      cuerpoY: ficha.patas.trasera.a * 0.55,
    }),
    [ficha],
  );

  useFrame((estado, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = reloj.current;
    const t = estado.clock.elapsedTime + arranque * 10;
    if (!cuerpoG.current) return;

    /* ── EL SEMÁFORO ──────────────────────────────────────────────────────
       Cada tanto se para y SALUDA: levanta una mano y la gira. Mientras
       saluda, no camina — las tres patas restantes la sostienen. */
    const sem = ficha.semaforo;
    const periodo = sem.cada + sem.dura;
    const enCiclo = (t + arranque * 3) % periodo;
    const saludando = !quieto && enCiclo > sem.cada;
    const uSaludo = saludando ? (enCiclo - sem.cada) / sem.dura : 0;
    /* alterna la mano: no siempre saluda con la misma */
    const manoQueSaluda = Math.floor((t + arranque * 3) / periodo) % 2 === 0 ? 3 : 1;

    const vel = quieto || saludando ? 0 : ficha.velocidad;
    r.recorrido += vel * dt;
    if (camino && raiz.current) {
      andarCamino(camino, r.recorrido, _pos, _dir);
      raiz.current.position.copy(_pos);
      raiz.current.rotation.y = Math.atan2(_dir.x, _dir.z);
    }

    /* la cadencia sale de la velocidad (ver marcha.js) */
    const frec = ficha.zancada > 0 ? vel / ficha.zancada : 0;
    r.fase = (r.fase + dt * frec) % 1;

    const bal = balanceoDelCuerpo(r.fase, marcha, ficha.cuerpo.largo);
    cuerpoG.current.position.set(0, med.cuerpoY + bal.alza, 0);
    /* el CULEBREO: el eje del cuerpo ondula de lado a lado. El tetrápodo
       esparrancado no camina con las patas nada más — camina con el espinazo,
       igual que un lagarto. Eso es lo que lo separa del cuadrúpedo erguido. */
    cuerpoG.current.rotation.set(bal.cabeceo * 0.5, bal.culebreo, bal.rodada * 0.5);
    cuerpoG.current.updateMatrix();

    for (let i = 0; i < PATAS.length; i++) {
      const pata = PATAS[i];
      const cfg = pata.trasera ? ficha.patas.trasera : ficha.patas.delantera;
      const m0 = huesos.current[i * 3];
      const m1 = huesos.current[i * 3 + 1];
      const m2 = huesos.current[i * 3 + 2];
      if (!m0 || !m1) continue;

      const paso = pasoDePata(
        r.fase,
        marcha.desfases[pata.id],
        marcha,
        ficha.zancada,
        marcha.levante * ficha.cuerpo.largo,
      );

      _hombro.set(pata.lado * ficha.patas.sep, 0, pata.trasera ? -ficha.patas.ejeZ : ficha.patas.ejeZ);
      _hombro.applyMatrix4(cuerpoG.current.matrix);

      /* ESPARRANCADO: el pie apoya muy por FUERA del cuerpo (2.4 de vía), no
         debajo. Esa es la diferencia de postura que hace que se lea anfibio y
         no mamífero chiquito. */
      _contacto.set(
        pata.lado * ficha.patas.sep * 2.4,
        paso.y,
        (pata.trasera ? -ficha.patas.ejeZ : ficha.patas.ejeZ) + paso.z,
      );

      /* la mano que saluda: se levanta y GIRA, despacio, como una seña */
      if (saludando && i === manoQueSaluda) {
        const arco = Math.sin(Math.PI * uSaludo);
        _contacto.set(
          pata.lado * ficha.patas.sep * 3.1,
          ficha.patas.delantera.a * 1.5 * arco,
          ficha.patas.ejeZ + ficha.patas.delantera.a * 0.5 * arco,
        );
        if (m2) m2.rotation.z = Math.sin(t * 7) * 0.5 * arco; // el giro de la mano
      } else if (m2) {
        m2.rotation.z = 0;
      }

      tobilloDeLaPostura(ancla, cfg.pie, _contacto, _tobillo);
      /* el polo hacia AFUERA y arriba: el codo del anfibio vive de costado, a
         la altura del hombro. Ahí está toda la silueta esparrancada. */
      _polo.set(pata.lado * 2, 1, pata.trasera ? 0.5 : -0.5).normalize();
      resolverDosHuesos(_hombro, _tobillo, cfg.a, cfg.b, _polo, _codo, _tobilloOk);
      posarHueso(m0, _hombro, _codo, pata.trasera ? ficha.patas.trasera.a : ficha.patas.delantera.a);
      posarHueso(m1, _codo, _tobilloOk, pata.trasera ? ficha.patas.trasera.b : ficha.patas.delantera.b);
      if (m2) m2.position.copy(_tobilloOk);
    }
  });

  return (
    <group ref={raiz}>
      <group ref={cuerpoG}>
        <mesh geometry={geos.cuerpo} material={material} />
      </group>
      {PATAS.map((p, i) => (
        <group key={p.id}>
          <mesh ref={(m) => (huesos.current[i * 3] = m)} geometry={p.trasera ? geos.muslo : geos.brazo} material={material} />
          <mesh ref={(m) => (huesos.current[i * 3 + 1] = m)} geometry={p.trasera ? geos.canilla : geos.antebrazo} material={material} />
          <mesh ref={(m) => (huesos.current[i * 3 + 2] = m)} geometry={p.trasera ? geos.pieTrasero : geos.pieDelantero} material={material} />
        </group>
      ))}
    </group>
  );
}
