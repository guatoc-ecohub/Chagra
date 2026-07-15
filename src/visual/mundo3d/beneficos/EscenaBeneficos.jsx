/*
 * EscenaBeneficos — EL ESPEJO: el mismo cultivo con y sin su ejército.
 *
 * Dos parcelas gemelas de fríjol, lado a lado. El MISMO clima, la MISMA plaga,
 * la MISMA semilla de siembra (los surcos son idénticos a propósito: si algo más
 * cambiara, el campesino podría echarle la culpa a otra cosa). Cambia UNA
 * decisión:
 *
 *   IZQUIERDA — tiene flores, refugio y algo de plaga siempre. No se fumiga.
 *               El ejército llega solo y aplana la plaga ANTES del umbral.
 *   DERECHA   — lote limpio, sin flores ni refugio. Al ver el primer bicho, se
 *               fumiga de amplio espectro. Todo cae a cero… y después el pulgón,
 *               que se reproduce rapidísimo, EXPLOTA sin nadie que lo pare.
 *
 * Nadie narra eso: lo dice la curva. Las poblaciones que se ven acá NO están
 * animadas a mano — salen de `dinamicaPlaga.js`, que es un Lotka-Volterra con
 * techo logístico. Si el modelo dijera otra cosa, la escena mostraría otra cosa.
 * A un campesino que se juega la comida no se le hace propaganda.
 *
 * En primer plano, sobre una hoja, EL ARCO DE LA MARIQUITA: huevo → larva →
 * pupa → adulto. Es la lección más rentable del mundo entero — el cocodrilito
 * oscuro con manchas naranjas que todos matan ES la mariquita que todos quieren.
 *
 * REGISTRO: REALISTA (ver GUIA-RUBBERHOSE.md §1). Fauna secundaria, sin ojos de
 * goma ni tinta ni line-boil. Los rubber-hose viven en `creatures/`.
 *
 * Tier-safe: 'alto' pleno (elenco completo, turno de noche, hongos, sombras de
 * contacto); 'medio' frugal; 'bajo' la lección mínima y digna (larva + adulto +
 * avispa + pulgón, sin noche ni hongos). Con `reducedMotion` el mundo monta
 * QUIETO en su fotograma más elocuente: la semana 8, cuando la diferencia entre
 * las dos parcelas ya es un abismo y no hace falta ver nada moverse.
 *
 * Un draw-call por especie (InstancedMesh + un material de vertex colors).
 * Componente r3f: importa three → siempre perezoso, montado por un host que dé
 * altura.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { LuzMadre, CIELOS, ATMOSFERA, mezclarCielo, crearMaterialVertexColors } from '../paleta/index.js';
import { perfilDeTier } from '../deviceTier.js';
/* La noche NO se improvisa atenuando el sol: la casa ya tiene su preset (luna
   plata, relleno de fogata lejana, niebla que cierra el valle). Calcarlo a mano
   sería justo la deriva que `paleta/` existe para eliminar. */
import { CIELOS_HORA } from '../cielosHoraData.js';
import {
  PAL,
  PARCELAS,
  UMBRAL,
  CICLO,
  CUPO_POR_TIER,
  ARCO_MARIQUITA,
  elencoDeTier,
  invisiblesDeTier,
} from './beneficosIdentidad.js';
import { espejo, muestra } from './dinamicaPlaga.js';
import * as G from './beneficos.geom.js';

const CSS = `
.bnf-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.bnf-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .bnf-canvas { transition: none; } }
`;

/* El fotograma congelado de reducedMotion: semana 8 de 12. Elegido porque es
   donde la viva ya se dobló (plaga 0.28, ejército 0.53) y la limpia ya reventó
   (plaga 0.90, ejército 0). Una sola imagen quieta y el pleito está contado. */
const T_QUIETO = 8 / 12;

/* -------------------------------------------------------------------------- */
/*  Instanciado: un draw-call por especie                                      */
/* -------------------------------------------------------------------------- */

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _e = new THREE.Euler();

/**
 * Nube de bichos instanciada. `cuantos` viene de la dinámica: EL NÚMERO ES LA
 * CURVA. No se escala un bicho gigante para "sentir" más plaga — se ponen más
 * bichos, que es lo que pasa en la mata de verdad.
 */
function Nube({ geo, mat, sitios, cuantos, anim, reducedMotion, t }) {
  const ref = useRef(null);
  const n = Math.min(sitios.length, Math.max(0, Math.round(cuantos)));

  const pintar = (tiempo) => {
    const im = ref.current;
    if (!im) return;
    for (let i = 0; i < sitios.length; i++) {
      const s = sitios[i];
      if (i < n) {
        const a = anim ? anim(s, i, tiempo) : null;
        _v.set(s.pos[0] + (a ? a.dx : 0), s.pos[1] + (a ? a.dy : 0), s.pos[2] + (a ? a.dz : 0));
        _e.set(0, (s.rot || 0) + (a ? a.giro : 0), 0);
        _q.setFromEuler(_e);
        const e = s.esc * (a ? a.esc : 1);
        _m4.compose(_v, _q, { x: e, y: e, z: e });
      } else {
        /* Los que "no están" se mandan a escala cero: la población baja se ve
           como AUSENCIA, no como bichos encogidos. */
        _m4.makeScale(0, 0, 0);
      }
      im.setMatrixAt(i, _m4);
    }
    im.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    pintar(reducedMotion ? T_QUIETO * CICLO.duracionSeg : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, sitios, reducedMotion]);

  useFrame(({ clock }) => {
    if (reducedMotion || !anim) return;
    pintar(clock.elapsedTime);
  });

  if (!geo || !sitios.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, sitios.length]} frustumCulled={false} />;
}

/* -------------------------------------------------------------------------- */
/*  La columna del umbral: el gráfico hecho escultura (sin ejes ni números)     */
/* -------------------------------------------------------------------------- */

/*
 * Una columna translúcida por parcela que SUBE con su plaga, y la banda del
 * umbral cruzando las dos a la misma altura. Es lo más cerca de un "chart" que
 * este mundo se permite, y se permite solo porque no tiene texto, ni ejes, ni
 * números: es un nivel de agua. La viva trepa hacia la línea y se dobla antes;
 * la limpia la atraviesa y se pone del rojo de la cereza.
 *
 * Ese cruce es el momento en que el campesino entiende, sin que nadie le diga,
 * que el que fumigó terminó peor que el que no hizo nada.
 */
function ColumnaPlaga({ x, plaga, alto = 2.9 }) {
  const nivel = Math.max(0.02, plaga) * alto;
  const rota = plaga > UMBRAL.nivel;
  return (
    <group position={[x, 0.02, -2.6]}>
      {/* El box unitario va de -0.5 a +0.5 en Y: se escala Y ANCLANDO la base al
          suelo (position.y = nivel/2). Si no, la columna crecería para los dos
          lados desde el aire y el "nivel de agua" no se leería. */}
      <mesh position={[0, nivel / 2, 0]} scale={[1, nivel, 1]}>
        <boxGeometry args={[0.34, 1, 0.34]} />
        <meshBasicMaterial
          color={rota ? PAL.umbralRoto : PAL.pulgonDenso}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  El veneno: lo ajeno al valle                                               */
/* -------------------------------------------------------------------------- */

/*
 * La bomba de amplio espectro. Violeta-ceniza — un color que NO existe en la
 * paleta andina, y esa es exactamente la idea. No se dibuja como un ataque
 * espectacular: se dibuja como una veladura sucia que baja y lo apaga todo.
 * Lo importante no es la nube, es lo que queda después: nada de los dos lados.
 */
function NieblaVeneno({ x, fuerza, reducedMotion }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    ref.current.position.y = 2.2 - Math.min(1, fuerza) * 1.4;
    ref.current.rotation.y = clock.elapsedTime * 0.15;
  });
  if (fuerza <= 0.01) return null;
  return (
    <mesh ref={ref} position={[x, 1.6, 0]}>
      <sphereGeometry args={[2.4, 8, 6]} />
      <meshBasicMaterial
        color={PAL.veneno}
        transparent
        opacity={Math.min(0.5, fuerza * 0.5)}
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  EL ARCO DE LA MARIQUITA — la lección, en primer plano                      */
/* -------------------------------------------------------------------------- */

/*
 * Las cuatro etapas EN FILA sobre una hoja, a la misma escala y en orden. El ojo
 * las recorre y aterriza en el bicho rojo que SÍ conoce — y en ese instante el
 * cocodrilito de al lado deja de ser un gusano raro para siempre.
 *
 * Está al frente y en el centro, entre las dos parcelas, porque no le pertenece
 * a ninguna: es lo que hay que saber ANTES de decidir. Y la larva va un poco más
 * grande y más adelante que las otras tres: si el usuario mira una sola cosa de
 * todo el mundo, que sea ella.
 */
function ArcoMariquita({ tier, mat, reducedMotion }) {
  const ref = useRef(null);
  const geos = useMemo(
    () => ({
      huevo: G.huevosMariquitaGeom(tier),
      larva: G.larvaMariquitaGeom(tier),
      pupa: G.pupaMariquitaGeom(tier),
      adulto: G.mariquitaGeom(tier),
    }),
    [tier],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g && g.dispose()), [geos]);

  /* La larva respira apenas y avanza un pelo: está comiendo, no posando. */
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const t = clock.elapsedTime;
    ref.current.position.z = 0.06 * Math.sin(t * 1.1);
    ref.current.rotation.y = 0.08 * Math.sin(t * 0.7);
  });

  const paso = 0.62;
  return (
    <group position={[0, 0.12, 2.5]} rotation={[0, Math.PI, 0]}>
      {/* LA HOJA: la tarima del arco. Un plano y nada más — todo el detalle que
          este primer plano tiene para gastar se lo lleva la larva, no el
          escenario. Que las cuatro etapas estén sobre la MISMA hoja es el punto:
          es un solo bicho, no cuatro bichos distintos. */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.1, 1.15]} />
        <meshLambertMaterial color={PAL.hoja} side={THREE.DoubleSide} />
      </mesh>
      {ARCO_MARIQUITA.map((e, i) => {
        const x = (i - 1.5) * paso;
        const esProta = e.protagonista;
        const geo = geos[e.etapa === 'huevo' ? 'huevo' : e.etapa === 'adulto' ? 'adulto' : e.etapa];
        if (!geo) return null;
        return (
          <group key={e.etapa} position={[x, 0, esProta ? -0.14 : 0]}>
            <mesh
              ref={esProta ? ref : undefined}
              geometry={geo}
              material={mat}
              scale={esProta ? 0.42 : 0.34}
              rotation={[0, esProta ? 0.3 : 0, 0]}
            />
          </group>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Una parcela                                                                */
/* -------------------------------------------------------------------------- */

/*
 * EL TALLER — las geometrías se tallan UNA vez para todo el mundo.
 *
 * Las dos parcelas dibujan los mismos bichos: si cada una tallara los suyos,
 * habría dos larvas de mariquita, dos pulgones, dos de cada cosa en memoria —
 * el doble de geometría para dibujar exactamente lo mismo. En el teléfono para
 * el que esto está hecho, eso no es un detalle. Se talla acá, se comparte allá,
 * y cada parcela solo pone SUS matrices (que es lo único que de verdad difiere).
 *
 * Lo único que NO entra al taller es la mata: su forma depende de la SALUD, que
 * es justamente lo que cambia entre parcelas. Esa sí es propia de cada una.
 */
function useTaller(tier) {
  const taller = useMemo(() => {
    const fAliado = {
      'larva-mariquita': G.larvaMariquitaGeom,
      mariquita: G.mariquitaGeom,
      'crisopa-larva': G.larvaCrisopaGeom,
      crisopa: G.crisopaGeom,
      'avispa-parasitoide': G.avispaGeom,
      'sirfido-larva': G.larvaSirfidoGeom,
      arana: G.aranaGeom,
      tijereta: G.tijeretaGeom,
      carabido: G.carabidoGeom,
      ave: G.aveGeom,
      murcielago: G.murcielagoGeom,
    };
    const aliados = {};
    elencoDeTier(tier).forEach((a) => {
      if (fAliado[a.slug]) aliados[a.slug] = fAliado[a.slug](tier);
    });
    return {
      aliados,
      /* las dos caras del pulgón: colonia rala y colonia apretada */
      pulgon: G.pulgonGeom(tier, false),
      pulgonDenso: G.pulgonGeom(tier, true),
      momia: G.momiaGeom(tier),
      pedicelo: tier !== 'bajo' ? G.crisopaHuevosGeom(tier) : null,
      flores: G.floresGeom(tier, 7, 14),
      rastrojo: G.rastrojoGeom(tier, 21),
      alambre: G.alambreGeom(tier),
    };
  }, [tier]);

  useEffect(
    () => () => {
      Object.values(taller.aliados).forEach((g) => g && g.dispose());
      [taller.pulgon, taller.pulgonDenso, taller.momia, taller.pedicelo, taller.flores, taller.rastrojo, taller.alambre].forEach(
        (g) => g && g.dispose(),
      );
    },
    [taller],
  );

  return taller;
}

function Parcela({ parcela, estado, tier, mat, perfil, reducedMotion, esNoche, taller }) {
  const cupo = CUPO_POR_TIER[tier] || CUPO_POR_TIER.medio;
  const lado = parcela.lado;
  const conHabitat = parcela.habitat.length > 0;

  /* Las matas: gemelas en las dos parcelas (misma semilla). Lo único que cambia
     es su SALUD, que baja con la plaga — el daño se ve en la hoja, no en un
     número. */
  const salud = Math.max(0.35, 1 - estado.plaga * 0.75);
  const sitiosMata = useMemo(() => G.sembrarMatas(lado), [lado]);
  const geoMata = useMemo(
    () => G.mataGeom(tier, 42, Math.round(salud * 4) / 4),
    /* la salud se cuantiza en pasos de 1/4: la mata no se re-genera cada frame */
    [tier, Math.round(salud * 4)],
  );

  /* El borde: flores + rastrojo (viva) o alambre pelado (limpia). LA TRIADA
     dibujada — y su ausencia también dibujada. Del taller, no talladas acá. */
  const geoBorde = conHabitat ? taller.flores : null;
  const geoFondo = conHabitat ? taller.rastrojo : taller.alambre;

  /* EL PULGÓN: su número ES la curva de la dinámica. La colonia se ve APRETADA
     (más oscura) cuando pasa de media: el color también es dato. */
  const geoPulgon = estado.plaga > 0.5 ? taller.pulgonDenso : taller.pulgon;
  const sitiosPulgon = useMemo(() => {
    const out = [];
    sitiosMata.forEach((m, k) => {
      G.sembrarPulgon(Math.ceil(cupo.pulgonMax / sitiosMata.length), 5 + k).forEach((s) => {
        out.push({ ...s, pos: [m.pos[0] + s.pos[0], s.pos[1], m.pos[2] + s.pos[2]] });
      });
    });
    return out;
  }, [sitiosMata, cupo.pulgonMax]);

  /* EL EJÉRCITO: idem — el número de aliados es la otra curva. */
  const elenco = useMemo(() => elencoDeTier(tier), [tier]);
  const enTurno = useMemo(
    () => elenco.filter((a) => a.turno === 'siempre' || (esNoche ? a.turno === 'noche' : a.turno === 'dia')),
    [elenco, esNoche],
  );

  const geosAliado = taller.aliados;

  /* Dónde trabaja cada aliado. Determinista y con sentido: los de suelo abajo,
     los voladores arriba, los de hoja en la mata. Nadie flota porque sí. */
  const sitiosAliado = useMemo(() => {
    const out = {};
    const r = G.rng(909 + lado * 17);
    enTurno.forEach((a) => {
      const cuantos = Math.ceil(cupo.aliadosMax / Math.max(1, enTurno.length));
      const arr = [];
      for (let i = 0; i < cuantos; i++) {
        const m = sitiosMata[Math.floor(r() * sitiosMata.length)];
        const suelo = a.slug === 'carabido' || a.slug === 'tijereta';
        const vuela = a.slug === 'ave' || a.slug === 'murcielago';
        arr.push({
          pos: vuela
            ? [m.pos[0] + (r() - 0.5) * 2, 2.6 + r() * 0.8, m.pos[2] + (r() - 0.5) * 2]
            : suelo
              ? [m.pos[0] + (r() - 0.5) * 0.8, 0.08, m.pos[2] + (r() - 0.5) * 0.8]
              : [m.pos[0] + (r() - 0.5) * 0.5, 0.9 + r() * 0.6, m.pos[2] + (r() - 0.5) * 0.5],
          rot: r() * Math.PI * 2,
          esc: (a.largo / 1.5) * (vuela ? 0.5 : 0.42),
          fase: r() * Math.PI * 2,
        });
      }
      out[a.slug] = arr;
    });
    return out;
  }, [enTurno, sitiosMata, cupo.aliadosMax, lado]);

  /* LA MOMIA y los huevos con pedicelo: solo donde hay ejército. Son la PRUEBA
     física de que alguien trabajó — por eso no aparecen jamás en la parcela
     fumigada, aunque quedarían lindos. */
  const geoMomia = conHabitat ? taller.momia : null;
  const geoPedicelo = conHabitat ? taller.pedicelo : null;

  /* Solo se libera lo PROPIO de esta parcela (la mata, que depende de su salud).
     Lo del taller lo libera el taller: liberar acá una geometría COMPARTIDA
     dejaría a la otra parcela dibujando un buffer muerto. */
  useEffect(() => () => geoMata && geoMata.dispose(), [geoMata]);

  /* El vaivén de los bichos: cada uno con su fase (nada de metrónomo). */
  const animPulgon = (s, i, t) => ({
    dx: 0,
    dy: Math.sin(t * 0.8 + i) * 0.004,
    dz: 0,
    giro: 0,
    esc: 1,
  });
  const animAliado = (s, i, t) => {
    const f = s.fase || 0;
    return {
      dx: Math.sin(t * 0.55 + f) * 0.14,
      dy: Math.sin(t * 0.9 + f * 1.7) * 0.05,
      dz: Math.cos(t * 0.5 + f) * 0.14,
      giro: Math.sin(t * 0.3 + f) * 0.6,
      esc: 1,
    };
  };

  const nPulgon = estado.plaga * cupo.pulgonMax;
  const centro = lado * 3.1;

  return (
    <group>
      {/* el suelo de la parcela: vivo y oscuro (con materia orgánica) o pelado */}
      <mesh position={[centro, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={perfil.sombras}>
        <planeGeometry args={[4.4, 5.4]} />
        <meshLambertMaterial color={conHabitat ? PAL.sueloVivo : PAL.sueloPelado} />
      </mesh>

      {/* las matas gemelas */}
      {geoMata &&
        sitiosMata.map((m, i) => (
          <mesh
            key={i}
            geometry={geoMata}
            material={mat}
            position={m.pos}
            rotation={[0, (i * 1.7) % (Math.PI * 2), 0]}
            castShadow={perfil.sombras}
          />
        ))}

      {/* EL BORDE FLORIDO (o su ausencia) */}
      {geoBorde && <mesh geometry={geoBorde} material={mat} position={[centro, 0, 2.3]} />}
      {geoFondo && <mesh geometry={geoFondo} material={mat} position={[centro, 0, -2.4]} />}

      {/* LA PLAGA — el número es la curva */}
      <Nube
        geo={geoPulgon}
        mat={mat}
        sitios={sitiosPulgon}
        cuantos={nPulgon}
        anim={animPulgon}
        reducedMotion={reducedMotion}
      />

      {/* EL EJÉRCITO — la otra curva */}
      {enTurno.map((a) => (
        <Nube
          key={a.slug}
          geo={geosAliado[a.slug]}
          mat={mat}
          sitios={sitiosAliado[a.slug] || []}
          cuantos={estado.ejercito * (sitiosAliado[a.slug] || []).length}
          anim={animAliado}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* LA PRUEBA: la momia y los alfileres de la crisopa */}
      {geoMomia && estado.ejercito > 0.2 && (
        <mesh geometry={geoMomia} material={mat} position={[centro - 0.4, 1.25, 0.5]} scale={0.42} />
      )}
      {geoPedicelo && estado.ejercito > 0.3 && (
        <mesh geometry={geoPedicelo} material={mat} position={[centro + 0.5, 1.15, -0.4]} scale={0.8} />
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Los invisibles: el hongo que se come al bicho                              */
/* -------------------------------------------------------------------------- */

/*
 * Van SIEMPRE del lado vivo, y no por simetría: un hongo entomopatógeno vive en
 * un suelo con materia orgánica y muere en un lote esterilizado a punta de
 * químico. Que solo estén de un lado ES el dato.
 */
function Invisibles({ tier, mat, lado }) {
  const lista = useMemo(() => invisiblesDeTier(tier), [tier]);
  const geos = useMemo(() => {
    const f = {
      beauveria: G.beauveriaGeom,
      metarhizium: G.metarhiziumGeom,
      trichoderma: G.trichodermaGeom,
    };
    const out = {};
    lista.forEach((h) => {
      if (f[h.slug]) out[h.slug] = f[h.slug](tier);
    });
    return out;
  }, [lista, tier]);
  useEffect(() => () => Object.values(geos).forEach((g) => g && g.dispose()), [geos]);

  const sitios = {
    /* la broca cubierta de blanco: en la mata, donde el cafetero la ve */
    beauveria: { pos: [lado * 4.4, 1.0, 1.5], esc: 0.55 },
    /* Metarhizium: BAJO el suelo, que es donde pelea (la chiza come raíz) */
    metarhizium: { pos: [lado * 2.2, 0.12, 2.0], esc: 0.5 },
    /* Trichoderma: en la raíz de la plántula del semillero */
    trichoderma: { pos: [lado * 4.6, 0.75, 2.5], esc: 0.7 },
  };

  return (
    <group>
      {lista.map((h) => {
        const g = geos[h.slug];
        const s = sitios[h.slug];
        if (!g || !s) return null;
        return <mesh key={h.slug} geometry={g} material={mat} position={s.pos} scale={s.esc} />;
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  El mundo                                                                   */
/* -------------------------------------------------------------------------- */

function Mundo({ tier, reducedMotion }) {
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  /* UN material para TODO el mundo: vertex colors + merge/instancing = el
     mundo entero cabe en un puñado de draw-calls. */
  const mat = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);
  useEffect(() => () => mat.dispose(), [mat]);

  /* las geometrías, talladas una sola vez y compartidas por las dos parcelas */
  const taller = useTaller(tier);

  /* LAS DOS SERIES: el modelo corre una vez, no por frame. */
  const series = useMemo(() => espejo({ semanas: CICLO.semanas, fumigaSemana: 3 }), []);

  /*
   * EL RELOJ, CUANTIZADO — y esto NO es una optimización cosmética.
   *
   * `t` gobierna cuántos bichos hay, o sea el árbol entero. Si se hiciera
   * `setT` en cada frame, React re-renderizaría todo el mundo 60 veces por
   * segundo en un teléfono de gama baja: inaceptable en el aparato para el que
   * esto está hecho. Se avanza en PASOS (≈3 re-renders/seg) y la vida continua
   * —el vaivén de cada bicho— la ponen los `useFrame` de las Nubes, que mueven
   * matrices sin tocar React. El ojo ve movimiento fluido; React ve casi nada.
   */
  const PASOS = 90;
  const [paso, setPaso] = useState(reducedMotion ? Math.round(T_QUIETO * PASOS) : 0);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const p = Math.floor(((clock.elapsedTime % CICLO.duracionSeg) / CICLO.duracionSeg) * PASOS);
    setPaso((prev) => (prev === p ? prev : p));
  });
  const t = paso / PASOS;

  const viva = muestra(series.viva, t);
  const limpia = muestra(series.limpia, t);

  /* El día y la noche corren más rápido que las semanas: así el turno de noche
     alcanza a mostrarse sin volver el mundo un estroboscopio. */
  const faseDia = (t * CICLO.diasPorCiclo) % 1;
  const esNoche = faseDia > 0.62;

  /* La bomba: un fogonazo corto y una veladura que decae. */
  const semanaFumiga = 3;
  const tFumiga = semanaFumiga / CICLO.semanas;
  const desde = t - tFumiga;
  const fuerzaVeneno = desde > 0 && desde < 0.22 ? 1 - desde / 0.22 : 0;

  /* El cielo de la hora: de día la madre (hora dorada), de noche el preset
     canónico. `mezclarCielo` aplica la ley 60%-hacia-la-madre, igual que
     EscenaBase3D — así este mundo es hijo del mismo valle que los demás. */
  const madre = esNoche ? CIELOS_HORA.noche : ATMOSFERA;
  const cielo = useMemo(() => mezclarCielo(CIELOS.ladera, madre), [madre]);
  const geoBanda = useMemo(() => G.bandaUmbralGeom(9.2), []);
  const geoTicks = useMemo(() => (tier === 'alto' ? G.ticksUmbralGeom(9.2) : null), [tier]);
  useEffect(
    () => () => {
      geoBanda && geoBanda.dispose();
      geoTicks && geoTicks.dispose();
    },
    [geoBanda, geoTicks],
  );

  const alturaCol = 2.9;

  return (
    <>
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && (
        <fog
          attach="fog"
          args={[cielo.niebla, madre.nieblaCerca ?? 10, madre.nieblaLejos ?? 34]}
        />
      )}
      <LuzMadre madre={madre} cielo={CIELOS.ladera} perfil={perfil} />

      {/* el camino que separa: el mismo mundo, dos decisiones */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.3, 5.4]} />
        <meshLambertMaterial color={PAL.suelo} />
      </mesh>

      {PARCELAS.map((p) => (
        <Parcela
          key={p.id}
          parcela={p}
          estado={p.id === 'viva' ? viva : limpia}
          tier={tier}
          mat={mat}
          perfil={perfil}
          reducedMotion={reducedMotion}
          esNoche={esNoche}
          taller={taller}
        />
      ))}

      {/* los hongos: solo donde el suelo está vivo */}
      <Invisibles tier={tier} mat={mat} lado={-1} />

      {/* EL UMBRAL: la MISMA línea para las dos. Ahí está todo el rigor. */}
      <mesh geometry={geoBanda} material={mat} position={[0, UMBRAL.nivel * alturaCol, -2.6]} />
      {geoTicks && (
        <mesh geometry={geoTicks} material={mat} position={[0, UMBRAL.nivel * alturaCol, -2.6]} />
      )}
      <ColumnaPlaga x={-3.1} plaga={viva.plaga} alto={alturaCol} />
      <ColumnaPlaga x={3.1} plaga={limpia.plaga} alto={alturaCol} />

      {/* la bomba, sobre la parcela limpia y solo sobre ella */}
      <NieblaVeneno x={3.1} fuerza={fuerzaVeneno} reducedMotion={reducedMotion} />

      {/* LA LECCIÓN, al frente y en el medio: no le pertenece a ninguna parcela */}
      <ArcoMariquita tier={tier} mat={mat} reducedMotion={reducedMotion} />
    </>
  );
}

/**
 * El mundo de los benéficos. Montar dentro de un host que provea altura.
 *
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function EscenaBeneficos({ tier = 'medio', reducedMotion = false }) {
  const [lista, setLista] = useState(false);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setLista(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`bnf-canvas${lista ? ' bnf-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'low-power' }}
        shadows={perfil.sombras}
        camera={{ position: [0, 3.4, 8.6], fov: 42 }}
        /* Con reducedMotion el mundo monta QUIETO: se dibuja una vez y se calla. */
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <Mundo tier={tier} reducedMotion={reducedMotion} />
        <AdaptiveDpr pixelated />
        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping={!reducedMotion}
        />
      </Canvas>
    </>
  );
}
