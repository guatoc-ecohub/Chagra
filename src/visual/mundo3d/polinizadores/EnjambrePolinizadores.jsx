/*
 * EnjambrePolinizadores — QUIENES HACEN EL TRABAJO, TRABAJANDO.
 *
 * El enjambre no es decorado que revolotea: es el motor del mundo. Cada bicho
 * busca SU flor, cobra su néctar, carga su polen y —cuando ese polen llega a otra
 * flor de la misma planta— TEJE un hilo de la red. La cosecha que se ve en
 * `ParcelaCultivos` sale de aquí, de estos viajes, uno por uno.
 *
 * ── LO QUE EL VUELO ENSEÑA (sin una sola etiqueta) ──────────────────────────
 * · AFINIDAD: cada quien va solo a las flores de su síndrome. El colibrí jamás
 *   se para en la amarilla de la ahuyama; la angelita jamás entra a la roja
 *   tubular. Míre un rato y la pareja flor↔visitante se cae de madura. Eso es el
 *   síndrome floral enseñado por observación, que es como se aprende en el campo.
 * · TAMAÑO: la angelita es DIMINUTA al lado del abejorro, y por eso no puede con
 *   la flor del maracuyá. La mascota de Chagra no lo puede todo — la red necesita
 *   VARIEDAD, no una especie estrella. Se ve en el tamaño, no se explica.
 * · CARÁCTER: el colibrí se cierne y DARDEA; el sírfido se queda clavado en el
 *   aire como un helicóptero y se va de lado; el abejorro llega pesado y ZUMBA la
 *   flor para sacarle el polen (eso nadie más lo hace); la mariposa no sabe volar
 *   derecho; el escarabajo es un torpe con alas. Se reconocen por cómo se mueven,
 *   antes que por cómo se ven.
 * · EL TRUEQUE: la pelotica de polen en la pata SE HINCHA mientras trabaja, y el
 *   cuerpo se le va poniendo más cálido con el néctar adentro. La flor paga, el
 *   bicho carga. Cuando la angelita se llena, se va a la piquera a descargar y
 *   vuelve — por eso la caja tiene tráfico y se ve VIVA.
 * · LA HORA: de noche solo queda el murciélago, y solo en las flores pálidas.
 *   Todo lo demás se recoge. El turno de noche existe y casi nadie lo sabe.
 *
 * ── TIER-SAFE ───────────────────────────────────────────────────────────────
 * Una geometría fusionada por especie → UN InstancedMesh por especie: una
 * draw-call por bicho por más que vuelen. Las alas van adentro del cuerpo, en
 * BORRÓN, salvo mariposa y murciélago (los únicos cuyo aleteo el ojo alcanza a
 * ver), que llevan un InstancedMesh de alas aparte. Toda la carga de polen del
 * mundo es UN solo InstancedMesh más. Cero asignaciones por frame: los vectores
 * de trabajo son de módulo y el pool es fijo.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  POLINIZADORES, PAL, tierDe, calidadDe, rng,
} from './polinizadoresIdentidad.js';
import { BICHO_GEOM, ALA_GEOM, BICHO_BASE, geomCargaPolen } from './polinizadores.geom.js';
import { floresParaBicho, sitioMeliponario } from './sembrado.js';
import { esPuente, polenSirve } from './telar.js';

/* Vectores de trabajo (módulo): el GC no se entera de que esto corre. */
const _m = new THREE.Matrix4();
const _mAla = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qFlap = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _ejeX = new THREE.Vector3(1, 0, 0); // el eje de adelante: la bisagra del ala
const _s = new THREE.Vector3();
const _col = new THREE.Color();
const _blanco = new THREE.Color('#ffffff');
const _miel = new THREE.Color(PAL.polenVivo);

/* Cuánto se demora libando (s): el colibrí es un ansioso, el escarabajo se
   queda a vivir ahí. El tiempo de visita también es carácter. */
const TIEMPO_LIBA = {
  angelita: 1.5, apis: 1.3, abejorro: 1.9, colibri: 0.5,
  sirfido: 1.1, mariposa: 1.7, escarabajo: 3.4, murcielago: 0.8,
};

/**
 * El enjambre. Montar dentro del <Canvas>.
 * @param {Object} props
 * @param {Array} props.flores  el sembrado (`sembrarFlores`)
 * @param {Object} props.telar  el telar del mundo (`crearTelar`)
 * @param {'dia'|'noche'} [props.momento]
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {number} [props.diezmado]  0..1 — cuánto del enjambre se llevó el
 *   veneno. 0 = finca sana; 1 = no queda quien trabaje. Los que faltan no se
 *   desvanecen elegantemente: simplemente YA NO ESTÁN.
 */
export default function EnjambrePolinizadores({
  flores,
  telar,
  momento = 'dia',
  tier = 'alto',
  reducedMotion = false,
  diezmado = 0,
}) {
  const conf = tierDe(tier);
  const q = calidadDe(tier);
  const meliponario = useMemo(() => sitioMeliponario(tier), [tier]);

  /* Las especies que este tier puede mantener (las que tienen al menos uno). */
  const especies = useMemo(
    () => Object.keys(POLINIZADORES).filter((id) => (conf[id] || 0) > 0),
    [conf],
  );

  /* --- Geometrías: una por especie (fusionada), una vez por tier. --------- */
  const geos = useMemo(() => {
    const g = {};
    for (const id of especies) g[id] = BICHO_GEOM[id]({ q });
    return g;
  }, [especies, q]);

  const geosAla = useMemo(() => {
    const g = {};
    for (const id of especies) if (ALA_GEOM[id]) g[id] = ALA_GEOM[id]({ q });
    return g;
  }, [especies, q]);

  const geoCarga = useMemo(() => geomCargaPolen({ q }), [q]);

  /* --- Material único: color horneado en vértices, tintado por instancia. -
     El `instanceColor` multiplica el color de vértice: así una misma geometría
     se pone más cálida cuando el bicho va cargado de néctar, sin duplicar nada.
     Lambert (nunca PBR): esta fauna es de gama baja por contrato. */
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const matCarga = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  /* --- El pool de bichos. Fijo, determinista. ---------------------------- */
  const bichos = useMemo(() => {
    const r = rng(1301);
    const out = [];
    for (const esp of especies) {
      const n = conf[esp] || 0;
      const P = POLINIZADORES[esp];
      for (let k = 0; k < n; k++) {
        // De dónde sale cada quien: las sociales, de su caja; las silvestres,
        // del monte. Eso no es un detalle de arte — es dónde ANIDAN.
        const deCaja = P.anida === 'meliponario' || P.anida === 'colmena';
        const casa = deCaja
          ? new THREE.Vector3(meliponario.cajas[0].pos[0] + 0.25, 0.62, meliponario.cajas[0].pos[2])
          : new THREE.Vector3(-1.6 + (r() - 0.5) * 5, 1.2 + r() * 1.4, -4.6 + (r() - 0.5) * 1.6);
        out.push({
          esp,
          P,
          pos: casa.clone().add(new THREE.Vector3((r() - 0.5) * 2, r() * 0.8, (r() - 0.5) * 2)),
          vel: new THREE.Vector3((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5),
          yaw: r() * Math.PI * 2,
          casa,
          estado: 'busca',
          objetivo: null,
          polenDe: null, // de qué flor trae polen (la memoria del viaje)
          carga: 0,
          t: 0,
          fase: r() * 100, // desfase de cadencia: nadie late igual que el vecino
          vivo: true,
        });
      }
    }
    return out;
  }, [especies, conf, meliponario]);
  // Ref-escape-hatch: el pool se muta en el sitio cada frame (posición, estado,
  // objetivo…) — el useFrame de abajo lee la copia local vía ref, no el binding
  // devuelto directo por useMemo (regla react-hooks/immutability).
  const bichosRef = useRef(bichos);
  useEffect(() => { bichosRef.current = bichos; }, [bichos]);

  /* Capacidad del banco de peloticas de polen: TODO el que liba carga polen
     encima — también la mariposa (poquito) y el colibrí (en la cara). Se reserva
     para todos y en cada frame se dibujan solo las que existen. */
  const capCargas = Math.max(1, bichos.length);

  /* Quién se salvó del veneno. Determinista: el mismo bicho muere en cada
     carga, así el mundo no parpadea al re-renderizar. */
  const suerte = useMemo(() => {
    const r = rng(77);
    return bichos.map(() => r());
  }, [bichos]);

  /* --- Flores candidatas por especie (afinidad × hora). ------------------- */
  const menu = useMemo(() => {
    const m = {};
    for (const esp of especies) m[esp] = floresParaBicho(flores, esp, momento, POLINIZADORES);
    return m;
  }, [especies, flores, momento]);

  /* --- Refs a los InstancedMesh ------------------------------------------ */
  const refs = useRef({});
  const refsAla = useRef({});
  const refCarga = useRef(null);
  const idxPorEsp = useMemo(() => {
    // Índice local de cada bicho dentro del InstancedMesh de su especie.
    const cont = {};
    return bichos.map((b) => {
      cont[b.esp] = (cont[b.esp] || 0);
      return cont[b.esp]++;
    });
  }, [bichos]);

  useLayoutEffect(
    () => () => {
      Object.values(geos).forEach((g) => g?.dispose());
      Object.values(geosAla).forEach((g) => g?.dispose());
      geoCarga?.dispose();
      mat.dispose();
      matCarga.dispose();
    },
    [geos, geosAla, geoCarga, mat, matCarga],
  );

  /* ── EL VUELO ──────────────────────────────────────────────────────────── */
  useFrame((state, dtCrudo) => {
    const dt = Math.min(dtCrudo, 0.05);
    const t = state.clock.elapsedTime;
    let nCarga = 0;
    const bichos = bichosRef.current;

    for (let i = 0; i < bichos.length; i++) {
      const b = bichos[i];
      const P = b.P;
      const C = P.caracter;
      const esNoche = momento === 'noche';
      // ¿Este bicho trabaja a esta hora? El murciélago duerme de día; todos los
      // demás duermen de noche. Nadie trabaja los dos turnos.
      const enTurno = C.nocturno === esNoche;
      // ¿El veneno se lo llevó? Los que faltan no se desvanecen: no están.
      const vivo = suerte[i] >= diezmado;

      const idx = idxPorEsp[i];
      const mesh = refs.current[b.esp];
      if (!mesh) continue;

      if (!enTurno || !vivo) {
        // Fuera de escena: escala 0. Ni un vértice de quien no está.
        _m.makeScale(0, 0, 0);
        mesh.setMatrixAt(idx, _m);
        const ala = refsAla.current[b.esp];
        if (ala) {
          ala.setMatrixAt(idx * 2, _m);
          ala.setMatrixAt(idx * 2 + 1, _m);
        }
        continue;
      }

      const candidatas = menu[b.esp];

      /* --- Máquina de estados del oficio --------------------------------- */
      if (b.estado === 'busca' && (!b.objetivo || !candidatas.length)) {
        if (candidatas.length) {
          // Elige entre unas pocas al azar y se queda con la más cerca: un bicho
          // no optimiza su ruta globalmente, pero tampoco es bobo.
          let mejor = null;
          let mejorD = Infinity;
          for (let k = 0; k < 3; k++) {
            const f = candidatas[Math.floor(Math.random() * candidatas.length)];
            if (!f || f === b.polenDe) continue;
            const d = _v.set(f.pos[0], f.pos[1], f.pos[2]).distanceToSquared(b.pos);
            if (d < mejorD) { mejorD = d; mejor = f; }
          }
          b.objetivo = mejor || candidatas[0];
        } else {
          b.objetivo = null; // no hay flor de lo suyo: a rondar la casa
        }
      }

      // Las sociales llenas se van a descargar a la caja: de ahí el tráfico de
      // la piquera. Las silvestres no tienen a dónde llevar nada.
      if (b.estado === 'busca' && b.carga >= 1 && P.social) {
        b.estado = 'vuelve';
      }

      /* --- A dónde quiere ir ahora --------------------------------------- */
      if (b.estado === 'vuelve') {
        _v.copy(b.casa);
      } else if (b.objetivo) {
        _v.set(b.objetivo.pos[0], b.objetivo.pos[1], b.objetivo.pos[2]);
        // Se acerca por encima: nadie entra a una flor desde abajo.
        _v.y += 0.06 * P.escala;
      } else {
        // Sin flor que valga la pena: ronda su casa en círculo lento.
        _v.copy(b.casa);
        _v.x += Math.cos(t * 0.4 + b.fase) * 0.8;
        _v.z += Math.sin(t * 0.4 + b.fase) * 0.8;
        _v.y += 0.3;
      }

      _dir.copy(_v).sub(b.pos);
      const dist = _dir.length();

      /* --- ¿Llegó? -------------------------------------------------------- */
      const umbral = 0.1 + P.escala * 0.05;
      if (b.estado === 'busca' && b.objetivo && dist < umbral) {
        b.estado = 'liba';
        b.t = TIEMPO_LIBA[b.esp] * (0.7 + Math.random() * 0.6);

        /* ── EL ACTO: aquí se decide si esto fue polinización o fue un paseo ──
           Si trae polen de OTRA flor de la MISMA planta, el polen viajó: eso es
           un hilo. Si trae polen de otra especie, no pasa nada — se pierde, como
           en la vida. Y si el viaje fue macho→hembra en la ahuyama, o entre dos
           flores de la mata que cobra, eso es un PUENTE: eso es fruta. */
        if (b.polenDe && polenSirve(b.polenDe, b.objetivo) && telar) {
          const puente = esPuente(b.polenDe, b.objetivo);
          telar.tejer(b.polenDe.pos, b.objetivo.pos, {
            cultivo: puente ? b.objetivo.cultivo : null,
            puente,
            bicho: b.esp,
          });
        }
        // Se lleva el polen de esta flor y se toma su néctar. El trueque.
        b.polenDe = b.objetivo;
        b.carga = Math.min(1, b.carga + 0.16 * C.carga * (C.vibra ? 1.7 : 1));
      } else if (b.estado === 'vuelve' && dist < 0.22) {
        // Descarga en la caja y sale otra vez. La colonia guarda para cuando no
        // haya flor: por eso importa que la finca tenga floración todo el año.
        b.carga = 0;
        b.polenDe = null;
        b.estado = 'busca';
        b.objetivo = null;
      }

      /* --- Libando: aquí está el carácter --------------------------------- */
      let vibra = 0;
      if (b.estado === 'liba') {
        b.t -= dt;
        /* EL ZUMBIDO DEL ABEJORRO (polinización por vibración): agarra la flor y
           la hace sonar para que suelte el polen que tiene guardado adentro.
           Ningún otro bicho de la finca hace esto — por eso el tomate y el
           maracuyá lo necesitan a él y no a cualquiera. Se ve como lo que es:
           un temblor corto y fuerte. */
        if (C.vibra && !reducedMotion) vibra = Math.sin(t * 62 + b.fase) * 0.022;
        b.vel.multiplyScalar(0.82); // se queda quieto en la flor
        if (b.t <= 0) {
          b.estado = 'busca';
          b.objetivo = null;
        }
      } else {
        /* --- Navegación: dirección deseada + el carácter de cada quien ---- */
        if (dist > 0.001) _dir.multiplyScalar(1 / dist);
        let velCrucero = C.vel;

        // EL CERNIDO: antes de entrar, se clava en el aire. El colibrí y el
        // sírfido lo hacen; es su firma y es lo que los delata a distancia.
        if (C.cierne > 0 && dist < 0.7) velCrucero *= 1 - C.cierne * 0.75;

        // EL DARDO del colibrí: no acelera, APARECE. Cambia de sitio de golpe.
        if (C.dardea > 0 && dist > 1.2) {
          const pulso = Math.sin(t * 1.6 + b.fase);
          if (pulso > 0.85) velCrucero *= 2.6; // el arranque súbito
        }

        _dir.multiplyScalar(velCrucero);

        // EL ERRÁTICO: la mariposa no va a ninguna parte en línea recta, y esa
        // torpeza es su encanto. No es ruido: es su forma de existir.
        if (C.erratico > 0 && !reducedMotion) {
          _dir.x += Math.sin(t * 2.3 + b.fase * 1.7) * C.erratico * 1.4;
          _dir.z += Math.cos(t * 1.9 + b.fase * 2.1) * C.erratico * 1.4;
          _dir.y += Math.sin(t * 3.1 + b.fase) * C.erratico * 0.5;
        }

        // Steering: entre más ágil, más rápido corrige. El abejorro es un camión.
        const k = Math.min(1, C.agilidad * dt);
        b.vel.lerp(_dir, k);
      }

      b.pos.addScaledVector(b.vel, dt);
      // Nadie se entierra ni se va al espacio.
      if (b.pos.y < 0.08) b.pos.y = 0.08;
      if (b.pos.y > 4.2) b.pos.y = 4.2;

      /* --- El cabeceo: el cuerpo sube y baja con el aleteo --------------- */
      const bob = reducedMotion ? 0 : Math.sin(t * C.bobHz * 6 + b.fase) * C.bob;

      /* --- Orientación: mira a donde va (con inercia, no como una veleta) - */
      if (b.vel.lengthSq() > 0.0004) {
        const yawObj = Math.atan2(b.vel.z, b.vel.x);
        let d = yawObj - b.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        b.yaw += d * Math.min(1, dt * 7);
      }

      /* --- Matriz de instancia ------------------------------------------- */
      const esc = BICHO_BASE * P.escala;
      _e.set(0, -b.yaw, vibra * 6);
      _q.setFromEuler(_e);
      _v.set(b.pos.x + vibra, b.pos.y + bob, b.pos.z);
      _s.setScalar(esc);
      _m.compose(_v, _q, _s);
      mesh.setMatrixAt(idx, _m);

      /* --- El néctar por dentro: el cuerpo se pone más cálido ------------ */
      _col.copy(_blanco).lerp(_miel, b.carga * 0.45);
      mesh.setColorAt(idx, _col);

      /* --- LAS ALAS de quien las bate a la vista ------------------------- */
      const ala = refsAla.current[b.esp];
      if (ala) {
        // La mariposa bate lento y amplio (casi se toca las alas arriba); el
        // murciélago rema el aire con brazadas largas.
        const hz = b.esp === 'mariposa' ? 3.4 : 5.2;
        const amp = b.esp === 'mariposa' ? 1.15 : 0.85;
        const flap = reducedMotion ? 0.5 : Math.sin(t * hz + b.fase) * amp;
        for (let s = 0; s < 2; s++) {
          const lado = s === 0 ? 1 : -1;
          // Primero el rumbo del cuerpo, después el batido en SU eje de adelante:
          // el ala es una bisagra del hombro, no un objeto que gira solo.
          _e.set(0, -b.yaw, 0);
          _q.setFromEuler(_e);
          _qFlap.setFromAxisAngle(_ejeX, flap * lado);
          _q.multiply(_qFlap);
          _s.set(esc, esc, esc * lado); // el lado izquierdo es el espejo
          _v.set(b.pos.x, b.pos.y + bob, b.pos.z);
          _mAla.compose(_v, _q, _s);
          ala.setMatrixAt(idx * 2 + s, _mAla);
        }
      }

      /* --- LA PELOTITA DE POLEN: el trueque, hecho bulto ------------------ */
      const carga = refCarga.current;
      // OJO: el tope es la capacidad RESERVADA (`capCargas`), nunca `carga.count`
      // — ese lo reescribimos al final de cada frame, y usarlo como límite lo
      // haría encogerse solo hasta apagar todas las cargas del mundo.
      if (carga && b.carga > 0.08 && nCarga < capCargas) {
        // Va en la pata de atrás, colgando bajo el cuerpo. Crece con el trabajo:
        // una abeja que vuelve cargada se ve cargada.
        const rad = esc * (0.28 + b.carga * 0.5);
        _q.setFromEuler(new THREE.Euler(0, -b.yaw, 0));
        _v.set(
          b.pos.x - Math.cos(b.yaw) * esc * 0.15,
          b.pos.y + bob - esc * 0.32,
          b.pos.z - Math.sin(b.yaw) * esc * 0.15,
        );
        _s.setScalar(rad);
        _m.compose(_v, _q, _s);
        carga.setMatrixAt(nCarga, _m);
        nCarga++;
      }
    }

    /* Se dibujan solo las cargas que existen: `count` es dinámico. */
    const carga = refCarga.current;
    if (carga) {
      carga.count = nCarga;
      carga.instanceMatrix.needsUpdate = true;
    }
    for (const esp of especies) {
      const m = refs.current[esp];
      if (m) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      const a = refsAla.current[esp];
      if (a) a.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {especies.map((esp) => (
        <instancedMesh
          key={esp}
          ref={(el) => { refs.current[esp] = el; }}
          args={[geos[esp], mat, conf[esp]]}
          frustumCulled={false}
          name={`bicho-${esp}`}
        />
      ))}
      {especies
        .filter((esp) => geosAla[esp])
        .map((esp) => (
          <instancedMesh
            key={`ala-${esp}`}
            ref={(el) => { refsAla.current[esp] = el; }}
            args={[geosAla[esp], mat, conf[esp] * 2]}
            frustumCulled={false}
            name={`ala-${esp}`}
          />
        ))}
      {/* Toda la carga de polen del mundo, en una sola draw-call. */}
      <instancedMesh
        ref={refCarga}
        args={[geoCarga, matCarga, capCargas]}
        frustumCulled={false}
        name="carga-polen"
      />
    </group>
  );
}
