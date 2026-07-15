/*
 * CuadrupedoRealista — el animal que CAMINA.
 *
 * El encargo del operador: "no un modelo en T-pose girando: que caminen de
 * verdad. Peso, cadencia, cómo la danta apoya, cómo el jaguar acecha. La
 * locomoción es lo que los hace vivos". Este componente es esa frase.
 *
 * Un solo componente sirve para la danta, el jaguar, el puma, el oso, el
 * tigrillo y el borugo. No por ahorrar código: porque los seis SON el mismo
 * animal con parámetros distintos, y esa es justamente la tesis. Lo que los
 * separa no es el modelo — es el orden de apoyo, el duty factor, la postura del
 * pie y qué parte del cuerpo estabilizan. Cambiá cuatro números en la ficha y
 * el mismo esqueleto deja de ser un tapir y pasa a ser un oso. Se ve.
 *
 * REPARTO DE ESPACIOS (importa, y es lo que evita que el bicho patine):
 *   · `raiz`   — va por la senda. Posición y rumbo. NO se bambolea.
 *   · `cuerpo` — hijo de raíz: aquí vive TODO el bamboleo (alza, rodada,
 *     cabeceo). Torso, cuello y cabeza cuelgan de aquí.
 *   · las PATAS — hijas de RAÍZ, no del cuerpo. Esto es a propósito: el pie se
 *     planta contra el SUELO, no contra un cuerpo que sube y baja. La cadera se
 *     saca aplicando la matriz del cuerpo a mano. Si las patas colgaran del
 *     cuerpo, el bamboleo les entraría por debajo y el animal patinaría —
 *     exactamente el bug que la ley anti-patinaje de `marcha.js` existe para
 *     matar.
 *
 * Costo por animal y por frame: ~4 IK de dos huesos, ~20 transformaciones de
 * malla y una cadena de cola. Sin esqueletos, sin skinning, sin shaders. Un
 * teléfono de gama baja mueve varios sin despeinarse.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors } from '../paleta';
import { construirCuadrupedo, detalleDeFauna, ANCLA_PIE } from './anatomiaFauna.geom.js';
import {
  MARCHAS,
  pasoDePata,
  balanceoDelCuerpo,
  tobilloDeLaPostura,
  resolverDosHuesos,
  posarHueso,
  crearCola,
  moverCola,
  andarCamino,
} from './marcha.js';

/*
 * Las cuatro patas, con el nombre que usa `MARCHAS[].desfases`. El ORDEN de
 * este array no es el orden de apoyo: el orden de apoyo lo pone el desfase de
 * la marcha. Aquí solo viven la geometría y el lado.
 */
const PATAS = [
  { id: 'traseraIzq', trasera: true, lado: -1 },
  { id: 'delanteraIzq', trasera: false, lado: -1 },
  { id: 'traseraDer', trasera: true, lado: 1 },
  { id: 'delanteraDer', trasera: false, lado: 1 },
];

/* Vectores de trabajo: se reusan por frame — cero basura para el GC, que en
   gama baja es la diferencia entre fluido y a los tirones. */
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _cadera = new THREE.Vector3();
const _contacto = new THREE.Vector3();
const _tobillo = new THREE.Vector3();
const _tobilloOk = new THREE.Vector3();
const _rodilla = new THREE.Vector3();
const _polo = new THREE.Vector3();
const _anclaCola = new THREE.Vector3();
const _reposoCola = new THREE.Vector3();
const _cuelloA = new THREE.Vector3();
const _cuelloB = new THREE.Vector3();
const _ejeCuello = new THREE.Vector3();

/**
 * @param {object} props
 * @param {object} props.ficha    una de FAUNA_EMBLEMATICA (plan 'cuadrupedo')
 * @param {object} props.perfil   perfilDeTier(tier)
 * @param {THREE.Vector3[]} [props.camino]  la senda (polilínea cerrada). Sin
 *        camino, el animal camina en el sitio (útil para una ficha o un preview).
 * @param {number} [props.arranque]  metros de adelanto en la senda (para que
 *        dos animales de la misma senda no salgan pegados)
 * @param {boolean} [props.quieto]  reduced-motion: se planta y respira. NO se
 *        congela en T-pose: se queda de pie, que es como está un animal quieto.
 * @param {number} [props.escala]   multiplicador (1 = tamaño real, y el default
 *        es 1 a propósito: la escala real es parte de la verdad del animal)
 */
export default function CuadrupedoRealista({
  ficha,
  perfil,
  camino = null,
  arranque = 0,
  quieto = false,
  escala = 1,
}) {
  const tier = useMemo(() => detalleDeFauna(perfil), [perfil]);
  const piezas = useMemo(() => construirCuadrupedo(ficha, tier), [ficha, tier]);
  const marcha = MARCHAS[ficha.marcha] || MARCHAS.pasoLateral;
  const ancla = ANCLA_PIE[ficha.patas.postura] || ANCLA_PIE.digitigrado;

  /* UN material para todo el animal: las geometrías traen el color horneado en
     los vértices (receta `crearMaterialVertexColors` de la paleta madre).
     `flatShading` apagado: es la regla de la corteza orgánica — en un cuerpo
     vivo el relieve es geometría, no facetas. */
  const material = useMemo(
    () => crearMaterialVertexColors(perfil, { flatShading: false }),
    [perfil],
  );
  useEffect(() => () => material.dispose(), [material]);

  const raiz = useRef(null);
  const cuerpo = useRef(null);
  const cuelloM = useRef(null);
  const cabezaM = useRef(null);
  const colaM = useRef([]);
  /* 3 mallas por pata: [hueso alto, hueso bajo, pie] × 4 */
  const huesos = useRef([]);

  const reloj = useRef({ fase: 0, recorrido: arranque, pausa: 0, enPausa: false });
  const cola = useMemo(
    () => (ficha.cola && ficha.cola.nodos > 0 ? crearCola(ficha.cola.nodos, ficha.cola.largo) : null),
    [ficha],
  );

  /* La geometría del cuerpo, en números que el frame necesita a mano */
  const med = useMemo(() => {
    const t = ficha.torso;
    /* el eje del torso: la cruz menos el radio del pecho. De aquí cuelga TODO. */
    const torsoY = ficha.alzada - t.radio * t.pecho;
    return {
      torsoY,
      cuelloAncla: new THREE.Vector3(0, t.radio * 0.45, t.largo * 0.4),
      colaAncla: new THREE.Vector3(0, t.radio * 0.4, -t.largo * 0.46),
      /*
       * EL ANCHO DE LA HUELLA — el corpus (78) describiendo al puma: "suele
       * dejar huellas en línea casi recta, una detrás de otra". El felino pisa
       * casi sobre la línea del medio; el oso y la danta pisan ancho, cada pie
       * bajo su hombro; el anfibio pisa esparrancado, muy por fuera del cuerpo.
       * Este solo número es esa diferencia, y se ve al caminar.
       */
      via: ficha.registroDirecto || marcha.id === 'acecho' ? 0.22 : ficha.patas.postura === 'esparrancado' ? 2.4 : 0.9,
    };
  }, [ficha, marcha]);

  useFrame((estado, delta) => {
    const dt = Math.min(delta, 0.05); // un tirón de GC no teletransporta a nadie
    const r = reloj.current;
    const t = estado.clock.elapsedTime;

    /* ── LAS PAUSAS ────────────────────────────────────────────────────────
       El jaguar se detiene y mira. Ahí está el respeto: no en un gruñido, en
       el TIEMPO. Un animal que nunca para es un juguete de cuerda. */
    let vel = quieto ? 0 : ficha.velocidad;
    if (ficha.pausas && !quieto) {
      const ciclo = (t + arranque) % (ficha.pausas.cada + ficha.pausas.dura);
      const enPausa = ciclo > ficha.pausas.cada;
      /* frena y arranca suave: nadie pasa de 0.4 m/s a 0 en un cuadro */
      const meta = enPausa ? 0 : 1;
      r.pausa += (meta - r.pausa) * (1 - Math.exp(-3.5 * dt));
      vel *= r.pausa;
    } else {
      r.pausa = 1;
    }

    /* ── LA SENDA ─────────────────────────────────────────────────────────── */
    r.recorrido += vel * dt;
    if (camino && raiz.current) {
      andarCamino(camino, r.recorrido, _pos, _dir);
      raiz.current.position.copy(_pos);
      raiz.current.rotation.y = Math.atan2(_dir.x, _dir.z);
    }

    /*
     * ── LA CADENCIA ───────────────────────────────────────────────────────
     * NO se elige: sale de la velocidad y la zancada (ver `marcha.js`). Por eso
     * al frenar en una pausa, los pies frenan solos — y si el jaguar queda con
     * una pata en el aire, mejor: esa es la pose del acecho, la de verdad.
     */
    const frecuencia = ficha.zancada > 0 ? vel / ficha.zancada : 0;
    r.fase = (r.fase + dt * frecuencia) % 1;

    /* ── EL CUERPO ────────────────────────────────────────────────────────── */
    const bal = quieto
      ? { alza: Math.sin(t * 0.8) * ficha.alzada * 0.004, rodada: 0, cabeceo: 0, culebreo: 0 }
      : balanceoDelCuerpo(r.fase, marcha, ficha.alzada);
    if (!cuerpo.current) return;
    cuerpo.current.position.set(0, med.torsoY + bal.alza, 0);
    cuerpo.current.rotation.set(bal.cabeceo, bal.culebreo, bal.rodada);
    /* la matriz a mano: la necesitamos YA para sacar las caderas, y r3f la
       actualiza recién después de este callback */
    cuerpo.current.updateMatrix();

    /* ── EL CUELLO Y LA CABEZA ────────────────────────────────────────────── */
    if (cuelloM.current && cabezaM.current) {
      /*
       * QUÉ SE ESTABILIZA. El ungulado CABECEA al andar. El felino al acecho
       * NO: estabiliza la cabeza contra el bamboleo del propio cuerpo, porque
       * los ojos de un depredador no pueden bailar. Es la misma maniobra que
       * hace una gallina al caminar, y es lo que hace que el jaguar lea a
       * jaguar aunque nadie sepa señalar por qué.
       */
      const estabiliza = 1 - marcha.cabezaBalanceo;
      const nod = marcha.cabezaBalanceo * bal.cabeceo * 2.2;
      const pitch = ficha.cuello.angulo - (ficha.cabezaBaja || 0) + nod;
      _cuelloA.copy(med.cuelloAncla);
      _cuelloB
        .copy(_cuelloA)
        .add(_ejeCuello.set(0, Math.sin(pitch), Math.cos(pitch)).multiplyScalar(ficha.cuello.largo));
      posarHueso(cuelloM.current, _cuelloA, _cuelloB, piezas.largos.cuello);
      cabezaM.current.position.copy(_cuelloB);
      /* la cabeza contrarresta el cabeceo del cuerpo según cuánto estabilice */
      cabezaM.current.rotation.set(pitch * 0.55 - bal.cabeceo * estabiliza, 0, -bal.rodada * estabiliza * 0.6);
      cabezaM.current.position.y -= bal.alza * estabiliza * 0.5;
    }

    /* ── LAS PATAS ────────────────────────────────────────────────────────── */
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
        marcha.levante * ficha.alzada,
      );

      /* la cadera EN REPOSO, en el espacio del cuerpo */
      _cadera.set(pata.lado * ficha.patas.sep, 0, pata.trasera ? -ficha.patas.ejeZ : ficha.patas.ejeZ);
      /* el CONTACTO se calcula contra el SUELO (espacio de raíz), con la vía
         de la especie: el felino pisa sobre la línea del medio, el oso ancho */
      _contacto.set(
        pata.lado * ficha.patas.sep * med.via,
        paso.y,
        (pata.trasera ? -ficha.patas.ejeZ : ficha.patas.ejeZ) + paso.z,
      );
      /* y la cadera REAL: la de reposo, llevada por el cuerpo que se bambolea */
      _cadera.applyMatrix4(cuerpo.current.matrix);

      /* el tobillo, según la postura (plantígrado / digitígrado / ungulado) */
      const conPie = tier.pieAparte && m2;
      if (conPie) tobilloDeLaPostura(ancla, cfg.pie, _contacto, _tobillo);
      else _tobillo.copy(_contacto);

      /*
       * EL POLO — la anatomía que casi todos los rigs se comen: el CODO de la
       * pata delantera apunta hacia ATRÁS y la RODILLA de la trasera apunta
       * hacia ADELANTE. No es simetría: son huesos distintos. Un cuadrúpedo con
       * las cuatro patas doblando igual es una mesa que camina.
       */
      if (ficha.patas.postura === 'esparrancado') {
        /* el anfibio: codos y rodillas para AFUERA, no bajo el cuerpo */
        _polo.set(pata.lado, 0.15, pata.trasera ? 0.4 : -0.4).normalize();
      } else {
        _polo.set(pata.lado * 0.12, 0, pata.trasera ? 1 : -1).normalize();
      }

      resolverDosHuesos(_cadera, _tobillo, cfg.a, cfg.b, _polo, _rodilla, _tobilloOk);
      posarHueso(m0, _cadera, _rodilla, pata.trasera ? piezas.largos.muslo : piezas.largos.brazo);
      posarHueso(m1, _rodilla, _tobilloOk, pata.trasera ? piezas.largos.canilla : piezas.largos.antebrazo);

      if (conPie) {
        /*
         * EL RODAR DEL PIE. El plantígrado despega por el talón al final del
         * apoyo (se va quedando en los dedos) y aterriza con el talón primero:
         * ese balanceo es la mitad de por qué un oso se ve pesado. En el aire
         * el pie cuelga.
         */
        let rodar = 0;
        if (paso.apoyada) {
          if (ficha.patas.postura === 'plantigrado') {
            const despegue = Math.max(0, (paso.s - 0.62) / 0.38);
            rodar = -despegue * 0.7;
            const aterriza = Math.max(0, (0.18 - paso.s) / 0.18);
            rodar += aterriza * 0.35;
          }
        } else {
          rodar = Math.sin(Math.PI * paso.s) * 0.3 - 0.1;
        }
        m2.position.copy(_tobilloOk);
        m2.rotation.set(rodar, 0, 0);
      }
    }

    /* ── LA COLA ──────────────────────────────────────────────────────────── */
    if (cola && colaM.current.length) {
      _anclaCola.copy(med.colaAncla).applyMatrix4(cuerpo.current.matrix);
      /*
       * La cola de un felino no se anima con un seno: se ARRASTRA. La cadena
       * persigue al ancla y llega tarde (`moverCola`), y el peso y el latigazo
       * del final salen solos. Aquí solo se le dice hacia dónde cuelga en
       * reposo — y en el felino ese reposo ondea despacio, con peso.
       */
      const ondeo = ficha.cola.nodos >= 4 ? Math.sin(t * 0.9) * 0.5 : 0;
      _reposoCola.set(Math.sin(ondeo) * 0.5, -0.42 + Math.sin(t * 1.3) * 0.12, -1).normalize();
      const pts = moverCola(cola, _anclaCola, _reposoCola, dt, 0.45);
      for (let i = 0; i < colaM.current.length; i++) {
        posarHueso(colaM.current[i], pts[i], pts[i + 1], piezas.largos.cola);
      }
    }
  });

  const nPata = tier.pieAparte ? 3 : 2;

  return (
    <group ref={raiz} scale={escala}>
      {/* el cuerpo: aquí vive el bamboleo */}
      <group ref={cuerpo}>
        <mesh geometry={piezas.torso} material={material} castShadow={!!perfil?.sombras} />
        <mesh ref={cuelloM} geometry={piezas.cuello} material={material} />
        <mesh ref={cabezaM} geometry={piezas.cabeza} material={material} castShadow={!!perfil?.sombras} />
      </group>

      {/* las patas: hijas de la RAÍZ, no del cuerpo (ver cabecera) */}
      {PATAS.map((p, i) => (
        <group key={p.id}>
          <mesh
            ref={(m) => (huesos.current[i * 3] = m)}
            geometry={p.trasera ? piezas.muslo : piezas.brazo}
            material={material}
          />
          <mesh
            ref={(m) => (huesos.current[i * 3 + 1] = m)}
            geometry={p.trasera ? piezas.canilla : piezas.antebrazo}
            material={material}
          />
          {nPata === 3 && (
            <mesh
              ref={(m) => (huesos.current[i * 3 + 2] = m)}
              geometry={p.trasera ? piezas.pieTrasero : piezas.pieDelantero}
              material={material}
            />
          )}
        </group>
      ))}

      {/* la cola */}
      {cola &&
        piezas.cola &&
        Array.from({ length: ficha.cola.nodos }).map((_, i) => (
          <mesh
            key={i}
            ref={(m) => (colaM.current[i] = m)}
            geometry={piezas.cola}
            material={material}
          />
        ))}
    </group>
  );
}
