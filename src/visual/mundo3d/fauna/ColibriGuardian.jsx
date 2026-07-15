/*
 * ColibriGuardian — el barbudito de páramo (Oxypogon guerinii), a nivel guardián.
 *
 * El encargo pidió tres cosas y son exactamente las tres que tiene este bicho:
 * el vuelo estacionario, la iridiscencia real (estructura, no pintura) y la
 * lengua.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  QUÉ COLIBRÍ ES ESTE (y por qué no es el que uno se imagina)
 * ─────────────────────────────────────────────────────────────────────────────
 * El guardián de Chagra es el Oxypogon guerinii: endémico de Colombia, de los
 * páramos de Cundinamarca y Boyacá. Y NO se parece al colibrí del imaginario:
 * es PARDO, de PICO CORTO Y RECTO, con una cresta blanca eréctil y una barba
 * larga iridiscente. El pico corto es su adaptación al páramo — aquí arriba come
 * tanto insecto como néctar, y un pico de espada no le sirve.
 *
 * El código viejo del repo lo pintaba turquesa con un pico más largo que el
 * cuerpo entero: ese es Colibri coruscans, otra especie. Y la auditoría por
 * visión sobre el material del propio operador ya lo había marcado ("colibrí
 * andino pardo, pico recto corto"). Aquí va el pardo. Ver README §correcciones.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  POR QUÉ NO SE ANIMA EL ALETEO
 * ─────────────────────────────────────────────────────────────────────────────
 * Bate a ~28 Hz. A 60 fps eso es MEDIA batida por cuadro: no hay forma de
 * mostrarlas. Si se intenta, el muestreo devuelve un aleteo lento y falso —
 * el error clásico, y encima cuesta más.
 *
 * Pero el ojo tiene exactamente el mismo problema y resuelve igual: nadie ha
 * visto nunca el ala de un colibrí. Se ve un BORRÓN. Así que lo honesto no es
 * el ala: es el arco que barre. Se dibuja el volumen que ocupa el ala en su
 * ciclo, translúcido, y listo — más barato Y más verdadero. Cuando el límite
 * técnico y la verdad del bicho coinciden, no hay nada que negociar.
 *
 * El titileo del borrón NO es el aleteo ralentizado (eso sería la mentira otra
 * vez): es la densidad del barrido, que cambia porque el ala no va a velocidad
 * constante — frena y arranca en cada extremo.
 */
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearMaterialVertexColors, crearMaterialMadre } from '../paleta';
import { kitGeo, detalleDeFauna } from './anatomiaFauna.geom.js';
import { crearRampa, colorEnRampa, anguloIridiscente, fuerzaDelDestello } from './iridiscencia.js';

const { pintar, poner, fusionar, bola, memo } = kitGeo;

/* -------------------------------------------------------------------------- */
/*  El cuerpo                                                                 */
/* -------------------------------------------------------------------------- */

/*
 * El pájaro se construye MIRANDO A +Z, con el cuerpo horizontal. La postura de
 * cernido (~40° de nariz arriba) la pone el componente inclinando el grupo: así
 * el mismo cuerpo sirve para cernir, para posarse y para el salto entre flores.
 */
function cuerpoColibri(ficha, tier) {
  const c = ficha.pelaje;
  const partes = [];

  /* el tronco */
  const tronco = bola(ficha.cuerpo.radio, ficha.cuerpo.radio * 0.92, ficha.cuerpo.largo * 0.5, tier.detalle > 0 ? 1 : 0);
  partes.push(pintar(tronco, c.dorso));

  /* el vientre claro */
  const vientre = bola(ficha.cuerpo.radio * 0.82, ficha.cuerpo.radio * 0.5, ficha.cuerpo.largo * 0.4, 0);
  poner(vientre, [0, -ficha.cuerpo.radio * 0.55, -ficha.cuerpo.largo * 0.04]);
  partes.push(pintar(vientre, c.vientre));

  /* la cabeza */
  const cab = bola(ficha.cabeza.radio, ficha.cabeza.radio, ficha.cabeza.radio, tier.detalle > 0 ? 1 : 0);
  poner(cab, [0, ficha.cuerpo.radio * 0.35, ficha.cuerpo.largo * 0.45]);
  partes.push(pintar(cab, c.dorso));

  /* EL PICO: corto y RECTO. Es la seña de la especie y el punto donde el
     imaginario del colibrí se rompe. */
  const pico = new THREE.CylinderGeometry(ficha.pico.radio * 0.5, ficha.pico.radio, ficha.pico.largo, 5);
  poner(
    pico,
    [0, ficha.cuerpo.radio * 0.35, ficha.cuerpo.largo * 0.45 + ficha.cabeza.radio + ficha.pico.largo * 0.42],
    [Math.PI / 2, 0, 0],
  );
  partes.push(pintar(pico, c.pico));

  /* los ojos */
  for (const lado of [1, -1]) {
    const o = bola(ficha.cabeza.radio * 0.2, ficha.cabeza.radio * 0.2, ficha.cabeza.radio * 0.16, 0);
    poner(o, [lado * ficha.cabeza.radio * 0.62, ficha.cuerpo.radio * 0.45, ficha.cuerpo.largo * 0.45 + ficha.cabeza.radio * 0.5]);
    partes.push(pintar(o, c.ojo));
  }

  /* la cola: un abanico corto */
  const cola = bola(ficha.cola.ancho * 0.5, ficha.cola.ancho * 0.08, ficha.cola.largo * 0.5, 0);
  poner(cola, [0, 0, -ficha.cuerpo.largo * 0.5 - ficha.cola.largo * 0.42], [-0.18, 0, 0]);
  partes.push(pintar(cola, c.dorso));

  /* las paticas: diminutas y casi inútiles en tierra — un colibrí no camina,
     y esas patas son la prueba */
  if (tier.detalle > 0) {
    for (const lado of [1, -1]) {
      const p = new THREE.CylinderGeometry(0.0006, 0.0005, ficha.cuerpo.radio * 0.5, 3);
      poner(p, [lado * ficha.cuerpo.radio * 0.35, -ficha.cuerpo.radio * 0.85, 0]);
      partes.push(pintar(p, c.pata));
    }
  }

  return fusionar(partes);
}

/* LA CRESTA eréctil: blanca con la raya negra. Va aparte porque se LEVANTA. */
function crestaColibri(ficha, tier) {
  const c = ficha.pelaje;
  const partes = [];
  const n = tier.detalle > 0 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const pluma = bola(ficha.cresta.ancho * 0.2, ficha.cresta.largo * 0.5, ficha.cresta.ancho * 0.32, 0);
    poner(pluma, [t * ficha.cresta.ancho * 1.4, ficha.cresta.largo * 0.45, -Math.abs(t) * ficha.cresta.ancho * 0.5], [0, 0, t * 0.5]);
    partes.push(pintar(pluma, Math.abs(t) > 0.3 ? c.crestaRaya : c.cresta));
  }
  return fusionar(partes);
}

/*
 * EL BORRÓN DEL ALA — el arco que barre, no el ala.
 *
 * Un sector de anillo en el plano del batido. El colibrí es el único pájaro que
 * gira el ala en la muñeca y saca sustentación en LOS DOS sentidos del barrido:
 * por eso puede quedarse quieto en el aire, y por eso el barrido es un arco
 * horizontal casi plano en vez del remo hacia abajo de cualquier otro pájaro.
 * Esa diferencia anatómica es literalmente la forma de esta geometría.
 */
function borronDelAla(ficha) {
  const g = new THREE.RingGeometry(ficha.cuerpo.radio * 0.6, ficha.ala.largo, 12, 1, -0.35, 2.5);
  g.rotateX(-Math.PI / 2); // del plano XY al plano del batido (casi horizontal)
  return g;
}

/* -------------------------------------------------------------------------- */

const _color = new THREE.Color();

/**
 * @param {object} props
 * @param {object} props.ficha   FICHA_COLIBRI
 * @param {object} props.perfil  perfilDeTier(tier)
 * @param {[number,number,number]} [props.posicion]  dónde se sostiene
 * @param {boolean} [props.quieto]  reduced-motion: se posa en vez de cernir
 * @param {number} [props.semilla]  desfase, para que dos no vayan en espejo
 */
export default function ColibriGuardian({
  ficha,
  perfil,
  posicion = [0, 0, 0],
  quieto = false,
  semilla = 0,
}) {
  const tier = useMemo(() => detalleDeFauna(perfil), [perfil]);
  const geos = useMemo(
    () =>
      memo(`colibri|${tier.segs}|${tier.detalle}`, () => ({
        cuerpo: cuerpoColibri(ficha, tier),
        cresta: crestaColibri(ficha, tier),
        ala: borronDelAla(ficha),
        barba: new THREE.PlaneGeometry(ficha.barba.ancho, ficha.barba.largo),
        lengua: new THREE.CylinderGeometry(0.0004, 0.0002, ficha.lengua.largo, 3),
      })),
    [ficha, tier],
  );

  const matCuerpo = useMemo(() => crearMaterialVertexColors(perfil, { flatShading: false }), [perfil]);
  /*
   * LA BARBA tiene material PROPIO porque su color cambia por frame — es lo
   * único de toda la fauna que no puede hornearse en los vértices: el color de
   * la estructura no es un dato del objeto, es una relación entre el objeto y
   * quien lo mira.
   */
  const matBarba = useMemo(
    () => crearMaterialMadre('follaje', perfil, { side: THREE.DoubleSide }),
    [perfil],
  );
  const matAla = useMemo(
    () =>
      crearMaterialMadre('follaje', perfil, {
        color: ficha.pelaje.dorso,
        transparent: true,
        opacity: 0.26,
        depthWrite: false, // el borrón no tapa: es aire con ala adentro
        side: THREE.DoubleSide,
      }),
    [perfil, ficha],
  );
  const matLengua = useMemo(() => crearMaterialMadre('follaje', perfil, { color: ficha.pelaje.lengua }), [perfil, ficha]);
  useEffect(
    () => () => {
      matCuerpo.dispose();
      matBarba.dispose();
      matAla.dispose();
      matLengua.dispose();
    },
    [matCuerpo, matBarba, matAla, matLengua],
  );

  const rampa = useMemo(() => crearRampa(ficha.pelaje.barbaRampa), [ficha]);
  const lumbre = useMemo(() => new THREE.Color(ficha.pelaje.barbaLumbre), [ficha]);

  const raiz = useRef(null);
  const cuerpoG = useRef(null);
  const barba = useRef(null);
  const cresta = useRef(null);
  const alaIzq = useRef(null);
  const alaDer = useRef(null);
  const lengua = useRef(null);
  // Ref-escape-hatch: matAla se muta cada frame (opacity) — regla
  // react-hooks/immutability sobre el valor devuelto por useMemo.
  const matAlaRef = useRef(matAla);
  useEffect(() => { matAlaRef.current = matAla; }, [matAla]);

  useFrame((estado) => {
    const t = estado.clock.elapsedTime + semilla * 3.7;
    if (!raiz.current || !cuerpoG.current) return;

    /*
     * ── EL CERNIDO ────────────────────────────────────────────────────────
     * Sostenerse en el aire NO es estar quieto: es corregir todo el tiempo. Un
     * colibrí clavado en una coordenada se ve muerto. Estas tres frecuencias
     * primas entre sí nunca repiten el mismo punto — que es justo lo que hace
     * el bicho de verdad.
     */
    const d = quieto ? 0 : ficha.deriva.amplitud;
    const w = ficha.deriva.hz;
    raiz.current.position.set(
      posicion[0] + Math.sin(t * w * 1.31) * d,
      posicion[1] + Math.sin(t * w * 2.13) * d * 0.8,
      posicion[2] + Math.sin(t * w * 0.77) * d * 0.7,
    );

    /* la visita a la flor: se acerca, liba, y salta a la siguiente */
    const ciclo = ficha.saltoDeFlor;
    const fase = (t % (ciclo.cada + ciclo.dura)) / (ciclo.cada + ciclo.dura);
    const libando = !quieto && t % (ciclo.cada + ciclo.dura) < ciclo.cada * 0.55;

    /* el cuerpo cuelga a ~40°: la postura del cernido. Al libar se endereza un
       poco para meter el pico en la corola. */
    const inclina = quieto ? 0.15 : ficha.cuerpoInclinado * (libando ? 0.78 : 1);
    cuerpoG.current.rotation.x = inclina;
    /* y gira despacio: el cernido es un vuelo, y un vuelo tiene rumbo */
    raiz.current.rotation.y = Math.sin(t * 0.35 + semilla) * 0.7 + fase * 0.4;

    /* ── LA CRESTA ERÉCTIL ─────────────────────────────────────────────────
       Se levanta cuando está alerta. Es lo único de este pájaro que se puede
       leer como un gesto — y por eso vale la pena que exista. */
    if (cresta.current) {
      const alza = libando ? 0.15 : 0.55 + Math.sin(t * 2.1) * 0.12;
      cresta.current.rotation.x = -alza;
      cresta.current.scale.setScalar(0.85 + alza * 0.3);
    }

    /* ── EL BORRÓN DEL ALA ─────────────────────────────────────────────────
       No se anima el aleteo (ver cabecera). Lo que titila es la DENSIDAD del
       barrido: el ala frena y arranca en cada extremo, así que el borrón no es
       parejo. El titileo va a 7 Hz, que no es el aleteo ni pretende serlo. */
    const densidad = quieto ? 0 : 0.2 + Math.abs(Math.sin(t * 7)) * 0.14;
    matAlaRef.current.opacity = densidad;
    if (alaIzq.current) {
      alaIzq.current.visible = !quieto;
      alaDer.current.visible = !quieto;
      /* el plano del batido se inclina un poco: adelante para frenar, atrás
         para avanzar — así el bicho se mueve sin dejar de cernir */
      const plano = Math.sin(t * 0.35 + semilla) * 0.18;
      alaIzq.current.rotation.set(plano, 0, 0.12);
      alaDer.current.rotation.set(plano, 0, -0.12);
    }

    /* ── LA IRIDISCENCIA ───────────────────────────────────────────────────
       El color de la barba sale del ÁNGULO a la cámara, no de la luz. Este es
       el corazón del bicho: ver `iridiscencia.js`. */
    if (barba.current) {
      const ang = anguloIridiscente(barba.current, estado.camera);
      colorEnRampa(rampa, ang, _color);
      // crearMaterialMadre() puede devolver Lambert (gama media/baja) o
      // Standard (alta) — ambas tienen `color`, solo Standard trae `emissive`
      // (chequeado en runtime abajo). Cast para que TS conozca ambas props.
      const matBarbaTintable = /** @type {import('three').MeshStandardMaterial} */ (matBarba);
      matBarbaTintable.color.copy(_color);
      /* y el DESTELLO: cuando la barba te encara, chispea. Dura un cuarto de
         segundo y es lo que uno recuerda del bicho. */
      if (matBarbaTintable.emissive) {
        matBarbaTintable.emissive.copy(lumbre).multiplyScalar(fuerzaDelDestello(ang) * 0.5);
      }
      /* la barba se abre cuando corteja o se planta: no siempre cuelga igual */
      barba.current.rotation.x = 0.35 + Math.sin(t * 1.7) * 0.12 - (libando ? 0.3 : 0);
    }

    /* ── LA LENGUA ─────────────────────────────────────────────────────────
       Bífida, acanalada, y SALE MÁS ALLÁ del pico: lame 15-20 veces por
       segundo. Solo asoma cuando liba — una lengua afuera todo el tiempo sería
       un chiste, no un pájaro. */
    if (lengua.current) {
      lengua.current.visible = libando;
      if (libando) {
        const lame = (Math.sin(t * ficha.lengua.lamidasPorSegundo * Math.PI * 2) + 1) * 0.5;
        lengua.current.scale.set(1, 0.35 + lame * 0.65, 1);
      }
    }
  });

  const zPico = ficha.cuerpo.largo * 0.45 + ficha.cabeza.radio + ficha.pico.largo;

  return (
    <group ref={raiz}>
      <group ref={cuerpoG}>
        <mesh geometry={geos.cuerpo} material={matCuerpo} />

        {/* la cresta, en la coronilla */}
        <group ref={cresta} position={[0, ficha.cuerpo.radio * 0.35 + ficha.cabeza.radio * 0.85, ficha.cuerpo.largo * 0.45]}>
          <mesh geometry={geos.cresta} material={matCuerpo} />
        </group>

        {/*
          LA BARBA — colgando de la garganta, con su +Z mirando adelante y abajo:
          esa normal ES lo que `iridiscencia` mide contra la cámara. La geometría
          no es decorativa aquí: es el instrumento.
        */}
        <mesh
          ref={barba}
          geometry={geos.barba}
          material={matBarba}
          position={[0, ficha.cuerpo.radio * 0.1, ficha.cuerpo.largo * 0.45 + ficha.cabeza.radio * 0.4]}
        />

        {/* la lengua, más allá del pico */}
        <mesh
          ref={lengua}
          geometry={geos.lengua}
          material={matLengua}
          position={[0, ficha.cuerpo.radio * 0.35, zPico + ficha.lengua.largo * 0.4]}
          rotation={[Math.PI / 2, 0, 0]}
        />

        {/* los borrones: uno por lado, en el plano del batido */}
        <mesh ref={alaIzq} geometry={geos.ala} material={matAla} position={[-ficha.cuerpo.radio * 0.7, ficha.cuerpo.radio * 0.5, 0]} />
        <mesh ref={alaDer} geometry={geos.ala} material={matAla} position={[ficha.cuerpo.radio * 0.7, ficha.cuerpo.radio * 0.5, 0]} scale={[-1, 1, 1]} />
      </group>
    </group>
  );
}
