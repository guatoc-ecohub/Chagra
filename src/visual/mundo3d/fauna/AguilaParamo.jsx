/*
 * AguilaParamo — Geranoaetus melanoleucus, el águila que hace los círculos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  CUÁL ÁGUILA (el encargo pedía una que no existe)
 * ─────────────────────────────────────────────────────────────────────────────
 * El encargo decía "águila real de montaña". El águila real (Aquila chrysaetos)
 * es paleártica: no hay ninguna en Colombia. La rapaz grande que el páramo
 * colombiano SÍ tiene, y que el grounding del proyecto lista con fuente IAvH, es
 * el águila de páramo o águila mora: Geranoaetus melanoleucus. Es la que va acá.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  EL PLANEO ES LA ÚNICA LOCOMOCIÓN DOCUMENTADA DE ESTA ESPECIE
 * ─────────────────────────────────────────────────────────────────────────────
 * Y viene del corpus (81), describiendo lo que el campesino ve: "volando en
 * círculos sobre potrero abierto… buscando roedores, culebras pequeñas o
 * insectos grandes en el pasto corto". No hay una sola línea de anatomía en el
 * corpus — pero hay ESA, que es la que importa, porque es cómo se la ve.
 *
 * UN ÁGUILA QUE PLANEA NO ALETEA. Es lo primero que se hace mal. La térmica la
 * sube; ella solo se inclina y espera. Acá aletea cada 14 segundos, y solo para
 * recuperar la térmica que perdió — el resto del tiempo, nada. Esa quietud es
 * el animal.
 *
 * Y VA LEJOS Y ALTO, a propósito: 26 m de radio, 16 de altura. Un águila
 * pegada a la cámara sería un títere. Así se la ve de verdad — una silueta
 * lejos, dando vueltas, que uno mira un rato desde abajo con la mano de visera.
 * La distancia no es una limitación acá: es el encuadre correcto.
 *
 * EL ALABEO SALE DE LA FÍSICA, no del gusto: un ave que gira se INCLINA hacia
 * adentro, y cuánto depende de su velocidad y del radio (tan θ = v²/r·g). Se
 * calcula del círculo que le toca. Si alguien cambia el radio, el alabeo se
 * corrige solo — que es como tienen que funcionar estas cosas.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors } from '../paleta';
import { kitGeo, detalleDeFauna } from './anatomiaFauna.geom.js';

const { pintar, poner, fusionar, bola, memo } = kitGeo;

const G = 9.81;

/*
 * El cuerpo: capucha y pecho PIZARRA, vientre BLANCO, cola corta en CUÑA. La
 * silueta de esta especie es inconfundible por la cola: ancha adelante y
 * cortísima atrás, casi un triángulo. Mira a +Z.
 */
function cuerpoAguila(ficha, tier) {
  const c = ficha.pelaje;
  const partes = [];
  const cu = ficha.cuerpo;

  const tronco = bola(cu.radio, cu.radio * 1.05, cu.largo * 0.5, tier.detalle > 0 ? 1 : 0);
  partes.push(pintar(tronco, c.pizarra));

  /* EL VIENTRE BLANCO: lo único que se le ve desde abajo, que es desde donde
     se la ve siempre. El contraste pecho-negro/panza-blanca ES la especie. */
  const vientre = bola(cu.radio * 0.9, cu.radio * 0.55, cu.largo * 0.44, 0);
  poner(vientre, [0, -cu.radio * 0.62, -cu.largo * 0.06]);
  partes.push(pintar(vientre, c.vientre));

  /* la capucha */
  const cab = bola(ficha.cabeza.radio, ficha.cabeza.radio * 0.9, ficha.cabeza.radio * 1.1, tier.detalle > 0 ? 1 : 0);
  poner(cab, [0, cu.radio * 0.35, cu.largo * 0.48]);
  partes.push(pintar(cab, c.pizarra));

  /* el pico ganchudo y la cera amarilla */
  const pico = new THREE.ConeGeometry(ficha.pico.radio, ficha.pico.largo, 6);
  poner(pico, [0, cu.radio * 0.28, cu.largo * 0.48 + ficha.cabeza.radio * 0.9], [Math.PI / 2 + 0.35, 0, 0]);
  partes.push(pintar(pico, c.pico));
  const cera = bola(ficha.pico.radio * 1.1, ficha.pico.radio * 0.8, ficha.pico.radio * 0.6, 0);
  poner(cera, [0, cu.radio * 0.4, cu.largo * 0.48 + ficha.cabeza.radio * 0.55]);
  partes.push(pintar(cera, c.cera));

  for (const lado of [1, -1]) {
    const o = bola(ficha.cabeza.radio * 0.17, ficha.cabeza.radio * 0.17, ficha.cabeza.radio * 0.12, 0);
    poner(o, [lado * ficha.cabeza.radio * 0.6, cu.radio * 0.5, cu.largo * 0.48 + ficha.cabeza.radio * 0.5]);
    partes.push(pintar(o, c.iris));
  }

  /* LA COLA EN CUÑA: corta. Es la mitad de la silueta.
     Se APLANA antes de acostarla: escalar después de trasladar deformaría la
     posición junto con la forma (el clásico que deja la cola flotando al lado
     del pájaro en vez de pegada a la rabadilla). */
  const cola = new THREE.CylinderGeometry(ficha.cola.ancho * 0.5, ficha.cola.ancho * 0.14, ficha.cola.largo, 3);
  cola.scale(1, 1, 0.12); // la lámina, todavía en su eje Y
  poner(cola, [0, 0, -cu.largo * 0.5 - ficha.cola.largo * 0.45], [Math.PI / 2, 0, 0]);
  partes.push(pintar(cola, c.plumaLarga));

  /* las patas amarillas, recogidas contra el cuerpo en vuelo */
  if (tier.detalle > 0) {
    for (const lado of [1, -1]) {
      const p = bola(cu.radio * 0.16, cu.radio * 0.12, cu.radio * 0.3, 0);
      poner(p, [lado * cu.radio * 0.4, -cu.radio * 0.75, cu.largo * 0.1]);
      partes.push(pintar(p, c.cera));
    }
  }
  return fusionar(partes);
}

/*
 * EL ALA. Se construye saliendo del hombro hacia +X, plana, y termina en los
 * DEDOS: las primarias separadas de la punta, que en las rapaces grandes se
 * abren como una mano. Esos dedos no son un detalle bonito — son control de
 * vórtice de punta de ala, y son lo primero que uno reconoce de una rapaz
 * planeando contra el cielo.
 */
function alaAguila(ficha, tier) {
  const c = ficha.pelaje;
  const partes = [];
  const L = ficha.ala.largo;
  const A = ficha.ala.ancho;

  /* el brazo del ala: ancho en la base, se afina hacia la muñeca */
  const n = tier.detalle > 0 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const t2 = (i + 1) / n;
    const seg = new THREE.BoxGeometry((L * 0.72) / n, A * 0.035, A * (1 - t * 0.35));
    poner(seg, [L * 0.72 * (t + t2) * 0.5, 0, -A * 0.1 * t]);
    partes.push(pintar(seg, i < n * 0.6 ? c.ala : c.plumaLarga));
  }

  /* LOS DEDOS: las primarias abiertas de la punta */
  const nd = ficha.ala.plumas;
  for (let i = 0; i < nd; i++) {
    const t = i / (nd - 1);
    const largo = L * 0.3 * (1 - t * 0.35);
    const pluma = new THREE.BoxGeometry(largo, A * 0.028, A * 0.1);
    poner(
      pluma,
      [L * 0.72 + largo * 0.45, 0, -A * 0.12 + (t - 0.5) * A * 0.5],
      [0, (t - 0.5) * 0.55, 0],
    );
    partes.push(pintar(pluma, c.plumaLarga));
  }
  return fusionar(partes);
}

const _eje = new THREE.Vector3();

/**
 * @param {object} props
 * @param {object} props.ficha    FICHA_AGUILA
 * @param {object} props.perfil   perfilDeTier(tier)
 * @param {[number,number,number]} [props.centro]  el eje del círculo
 * @param {boolean} [props.quieto]
 */
export default function AguilaParamo({ ficha, perfil, centro = [0, 0, 0], quieto = false }) {
  const tier = useMemo(() => detalleDeFauna(perfil), [perfil]);
  const geos = useMemo(
    () =>
      memo(`aguila|${tier.segs}|${tier.detalle}`, () => ({
        cuerpo: cuerpoAguila(ficha, tier),
        ala: alaAguila(ficha, tier),
      })),
    [ficha, tier],
  );
  const material = useMemo(() => crearMaterialVertexColors(perfil, { flatShading: false }), [perfil]);
  useEffect(() => () => material.dispose(), [material]);

  /*
   * EL ALABEO, de la física y no del ojo. Un ave en giro coordinado se inclina
   * hacia adentro con tan θ = v² / (r·g). Con el círculo de la ficha (26 m de
   * radio, 20 s) le salen ~8 m/s y ~15° — que es exactamente lo que uno ve
   * cuando levanta la vista. Nadie eligió el 15: salió del giro.
   */
  const vuelo = useMemo(() => {
    const c = ficha.circulo;
    const v = (2 * Math.PI * c.radio) / c.periodo;
    return { v, alabeo: Math.atan((v * v) / (c.radio * G)) };
  }, [ficha]);

  const raiz = useRef(null);
  const cuerpoG = useRef(null);
  const alaIzq = useRef(null);
  const alaDer = useRef(null);

  useFrame((estado) => {
    const t = estado.clock.elapsedTime;
    const c = ficha.circulo;
    if (!raiz.current || !cuerpoG.current) return;

    /* ── EL CÍRCULO ───────────────────────────────────────────────────────
       Sobre potrero abierto, buscando roedor en el pasto corto (corpus:81). */
    const a = quieto ? 0.6 : (t / c.periodo) * Math.PI * 2;
    /* y SUBE: la térmica la levanta mientras gira. Por eso el círculo real no
       es un círculo — es una espiral, y por eso se pierde de vista para arriba. */
    const subida = quieto ? 0 : (Math.sin(t / (c.periodo * 2.7)) * 0.5 + 0.5) * c.subida;
    raiz.current.position.set(
      centro[0] + Math.cos(a) * c.radio,
      centro[1] + c.alturaBase + subida,
      centro[2] + Math.sin(a) * c.radio,
    );
    /* mira por donde va: la tangente del círculo */
    _eje.set(-Math.sin(a), 0, Math.cos(a));
    raiz.current.rotation.y = Math.atan2(_eje.x, _eje.z);

    /* el alabeo hacia adentro + un cabeceo casi imperceptible: el aire nunca
       está quieto, y un planeo perfectamente liso se lee a CGI */
    cuerpoG.current.rotation.z = quieto ? 0 : -vuelo.alabeo + Math.sin(t * 0.7) * 0.035;
    cuerpoG.current.rotation.x = Math.sin(t * 0.53) * 0.03;

    /* ── LAS ALAS ─────────────────────────────────────────────────────────
       EL DIEDRO: la V muy abierta que la autoestabiliza. Es lo que le permite
       no gastar ni un aleteo. */
    const ciclo = ficha.aleteo;
    const enCiclo = t % (ciclo.cada + ciclo.dura);
    const aleteando = !quieto && enCiclo > ciclo.cada;
    let bate = 0;
    if (aleteando) {
      const u = (enCiclo - ciclo.cada) / ciclo.dura;
      /* dos o tres batidas hondas y vuelve a planear. Nada de aletear
         continuo: eso es una paloma, no un águila. */
      bate = Math.sin(u * Math.PI * 6) * ciclo.amplitud * Math.sin(Math.PI * u);
    }
    if (alaIzq.current && alaDer.current) {
      alaIzq.current.rotation.z = ficha.diedro + bate;
      alaDer.current.rotation.z = -(ficha.diedro + bate);
      /* al batir, el ala también gira un poco en la muñeca (el ángulo de
         ataque): sin eso, batir no empuja aire */
      alaIzq.current.rotation.x = bate * 0.25;
      alaDer.current.rotation.x = bate * 0.25;
    }
  });

  return (
    <group ref={raiz}>
      <group ref={cuerpoG}>
        <mesh geometry={geos.cuerpo} material={material} />
        <group ref={alaDer} position={[ficha.cuerpo.radio * 0.8, ficha.cuerpo.radio * 0.3, 0]}>
          <mesh geometry={geos.ala} material={material} />
        </group>
        <group ref={alaIzq} position={[-ficha.cuerpo.radio * 0.8, ficha.cuerpo.radio * 0.3, 0]} scale={[-1, 1, 1]}>
          <mesh geometry={geos.ala} material={material} />
        </group>
      </group>
    </group>
  );
}
