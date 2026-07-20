/*
 * EscenaInvernaderoVivo — el MICRO-MUNDO del INVERNADERO campesino: un lugar
 * donde SE ENTRA, no una postal.
 *
 * Un túnel de guadua y plástico plantado en un claro de la finca, con la
 * puerta mirando al espectador. La cámara LLEGA por el caminito (CamaraDirector,
 * dolly de establishing) y el usuario ENTRA de verdad: el orbit tiene su target
 * ADENTRO del túnel y deja acercarse hasta quedar entre las camas — recorrer el
 * pasillo es hacer zoom por el vano de la puerta.
 *
 * Adentro el aire se siente: el plástico vela la luz (material translúcido,
 * DoubleSide), el VAHO flota en capas bajas que derivan despacio, y la
 * CONDENSACIÓN GOTEA del techo — gotas que caen del arco al sustrato, el ciclo
 * del agua en chiquito que todo invernadero fabrica. Los brotes de la mesa de
 * almácigo RESPIRAN (FloraInvernadero). La atmósfera es la del kit compartido
 * (familia `corral`): el invernadero amanece, dora y anochece CON el valle.
 *
 * PASADA NOLAN — el tema del invernadero es LA LUZ FILTRADA:
 *   · El plástico calibre 6 NO es vidrio: es un DIFUSOR. Adentro no hay
 *     sombras duras — en gama alta la cubierta PROYECTA su sombra y mata el
 *     sol directo, y el interior vive de una luz LECHOSA de bóveda (el cielo
 *     entero vuelto lámpara). La física de verdad ES el efecto especial.
 *   · El sol se ve COMO MANCHA: un resplandor difuso que camina por la bóveda
 *     con la hora continua (rasante y untado al filo del día, cenital y
 *     compacto al mediodía), y abajo su ALFOMBRA de luz sin borde deriva
 *     despacio por las camas. El invernadero también es un reloj — pero un
 *     reloj borroso, porque el plástico difumina.
 *   · La CONDENSACIÓN PERLADA: cientos de gotas quietas en la cara interna
 *     del plástico que a CONTRALUZ prenden como perlas — el rasgo que dice
 *     "invernadero" antes que cualquier letrero. Y el BRILLO DEL PLIEGUE:
 *     la línea de lustre donde el plástico se tensa sobre cada arco.
 *   · El CALOR SE VE: la bruma baja de la mañana (el vaho de la tierra
 *     regada) obedece la hora — espesa al amanecer, rala al mediodía.
 *
 * Todo procedural (cero CDN/GLTF/imágenes). Tier-safe vía `perfilDeTier`:
 * 'alto' con sombras + vaho + goteo; 'medio' frugal (goteo corto, sin vaho);
 * 'bajo' mínimo y QUIETO. Con `reducedMotion` monta quieto (frameloop demand):
 * fotograma digno, cero vibración.
 *
 * `foco` (opcional): un punto [x,y,z] que el paso didáctico del host señala
 * con un anillo que respira. Importa three/@react-three → montar SOLO perezosa.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Stars } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import useCicloDia from '../useCicloDia.js';
import FloraInvernadero from './FloraInvernadero.jsx';
import {
  ANCHO,
  FONDO,
  INV,
  alturaInvernadero,
  invernaderoDeTier,
  puntosCondensacion,
  geomEstructura,
  geomPlastico,
  geomCamas,
  geomRiego,
} from './invernadero.geom.js';
import {
  DomoCielo,
  useAtmosferaMundo,
  useGradienteBandas,
  construirTerreno,
  ruidoTerreno,
  smoothstep,
  CamaraDirector,
} from '../kit/index.js';
import { mezclar, VERDES, TIERRAS, NIEBLAS, LUCES } from '../paleta/index.js';

/* La identidad del lugar dentro de la familia del valle: `corral` (patio de
   trabajo de la finca). El 60% restante lo pone la HORA. */
const FAMILIA_INVERNADERO = 'corral';

/* Escala de la escena para el kit (cámara↔centro ~10). */
const RADIO_INVERNADERO = 10;

/* El frustum de sombra a medida del claro. */
const SOMBRA_INVERNADERO = { left: -10, right: 10, top: 12, bottom: -6, far: 36 };

/* El claro de la finca: pasto afuera, y ADENTRO el piso de tierra húmeda del
   túnel con su pasillo pisado — el suelo cuenta dónde empieza el microclima. */
function construirClaro(seg, plano) {
  const cPasto = new THREE.Color(VERDES.brote);
  const cPasto2 = new THREE.Color(VERDES.calido);
  const cHumedo = new THREE.Color(mezclar(TIERRAS.turba, TIERRAS.mantilloSombra, 0.5));
  const cPasillo = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.turba, 0.45));
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.35));
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaInvernadero,
    pintar: (wx, wz, alt, c) => {
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.8, wz * 0.7));
      // ADENTRO del túnel: tierra oscura y húmeda (el microclima en el suelo)
      const dentro =
        smoothstep(INV.radio + 0.5, INV.radio - 0.3, Math.abs(wx)) *
        smoothstep(INV.largo / 2 + 0.7, INV.largo / 2 - 0.4, Math.abs(wz));
      c.lerp(cHumedo, dentro * 0.92);
      // el pasillo central pisado, de la puerta al fondo
      c.lerp(cPasillo, dentro * smoothstep(0.75, 0.3, Math.abs(wx)) * 0.85);
      // el caminito que llega a la puerta desde el frente
      const enCamino =
        smoothstep(0.95, 0.25, Math.abs(wx - Math.sin(wz * 0.35) * 0.7)) *
        smoothstep(INV.largo / 2 - 0.5, INV.largo / 2 + 2, wz);
      c.lerp(cCamino, enCamino * 0.8);
    },
  });
}

/* ── EL SOL DEL INVERNADERO (pasada Nolan: la luz filtrada) ────────────────
   Del reloj continuo del valle (hora decimal) se deriva el arco REAL del sol
   y lo que ese arco hace sobre un techo que DIFUMINA en vez de proyectar:
     · `pos`      — de dónde viene la direccional (oriente → poniente).
     · `mancha`   — el resplandor difuso del sol EN la bóveda: el punto del
       plástico que mira al sol, untado a lo largo del túnel. Rasante y ancho
       al filo del día (la luz baja se unta más), compacto y cenital al
       mediodía. Es la única "sombra nítida" que el invernadero permite: la
       del propio sol vuelto lámpara borrosa.
     · `alfombra` — el charco de luz SIN BORDE que esa mancha deja en las
       camas: deriva de poniente (mañana) a oriente (tarde), más ancho y
       tenue cuanto más difusa la hora.
   Pura y barata: se memoíza por hora cuantizada (~3 min). */
function solDeInvernadero(hora) {
  const dia = (hora - 6) / 12; // 0 = sale (~6:00) · 1 = se esconde (~18:00)
  if (dia <= 0.015 || dia >= 0.985) return { deDia: false, fade: 0 };
  const arco = Math.PI * dia;
  const pos = /** @type {[number,number,number]} */ ([10 * Math.cos(arco), 2.5 + 12 * Math.sin(arco), 4]);
  const alt = Math.atan2(pos[1], Math.hypot(pos[0], pos[2]));
  // tras el filo de la cordillera el sol existe pero todavía no unta
  const fade = Math.min(1, Math.max(0, (alt - 0.1) / 0.16));
  if (fade <= 0) return { deDia: true, pos, fade: 0, rasante: 1 };
  const rasante = Math.cos(arco) * Math.cos(arco); // la luz baja es la que dramatiza
  // el punto de la bóveda que mira al sol (ángulo sobre el arco del túnel)
  const phi = Math.min(Math.PI - 0.2, Math.max(0.2, Math.atan2(Math.sin(arco) * 0.9 + 0.1, Math.cos(arco))));
  const mancha = {
    phi,
    ancho: 0.3 + 0.5 * rasante, // semiancho angular: el sol bajo se unta más
    op: (0.15 + 0.19 * rasante) * fade,
    estira: 4.5 + 3.5 * rasante, // el smear a lo largo del túnel
  };
  const alfombra = {
    x: Math.max(-2.1, Math.min(2.1, -2.3 * Math.cos(arco))),
    rx: 2.4 + 1.2 * rasante,
    rz: 5.4,
    op: (0.055 + 0.055 * rasante) * fade,
  };
  return { deDia: true, pos, fade, rasante, mancha, alfombra };
}

/* La BRUMA por hora: espesa con el fresco de la mañana (la tierra regada
   devuelve el riego como vaho), rala al mediodía, un respiro al caer la
   tarde. Multiplica el vaho de siempre — el calor SE VE. */
function brumaDeHora(hora) {
  const manana = Math.exp(-(((hora - 7.2) / 2.0) ** 2));
  const tarde = Math.exp(-(((hora - 17.4) / 2.2) ** 2)) * 0.5;
  return 0.35 + 0.95 * manana + tarde;
}

/* ── LA MANCHA DE SOL EN LA BÓVEDA: el sol visto a través del plástico ─────
   No un disco nítido: un resplandor untado sobre el arco (toro parcial
   estirado a lo largo del túnel, aditivo) + su halo lechoso. El grupo repite
   la transformación de la bóveda (escala `aplaste` + arranque) para que la
   mancha VIVA pegada al plástico. */
function ManchaDeSol({ mancha, color }) {
  if (!mancha) return null;
  const { phi, ancho, op, estira } = mancha;
  return (
    <group position={[0, INV.arranque, 0]} scale={[1, INV.aplaste, 1]}>
      <mesh rotation={[0, 0, phi - ancho]} scale={[1, 1, estira]} renderOrder={6}>
        <torusGeometry args={[INV.radio + 0.02, 0.3, 6, 12, ancho * 2]} />
        <meshBasicMaterial color={color} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, 0, phi - ancho * 1.9]} scale={[1, 1, estira * 1.6]} renderOrder={6}>
        <torusGeometry args={[INV.radio + 0.01, 0.34, 6, 12, ancho * 3.8]} />
        <meshBasicMaterial color={color} transparent opacity={op * 0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ── EL BRILLO DEL PLIEGUE: donde el plástico se tensa sobre el arco ───────
   Una línea de lustre por arco (toro fino apenas AFUERA de la cubierta),
   más viva cuanto más rasante la luz — el plástico tensado se lee tenso. */
const Z_PLIEGUES = [-4.33, -2.17, 0, 2.17, 4.33];
function BrilloPliegues({ fade, rasante, color }) {
  if (fade <= 0.02) return null;
  const op = fade * (0.045 + 0.1 * rasante);
  return (
    <group position={[0, INV.arranque, 0]} scale={[1, INV.aplaste, 1]}>
      {Z_PLIEGUES.map((z) => (
        <mesh key={z} position={[0, 0, z]} renderOrder={6}>
          <torusGeometry args={[INV.radio + 0.05, 0.014, 4, 20, Math.PI]} />
          <meshBasicMaterial color={color} transparent opacity={op} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ── LAS PERLAS DE CONDENSACIÓN: el rasgo que dice "invernadero" ───────────
   Gotas quietas en la cara interna del plástico (InstancedMesh estático, una
   draw-call). El CONTRALUZ las vuelve perlas: cada gota conoce su normal y
   las del lado del sol prenden — se recalcula solo al cuantizar la hora. */
function PerlasCondensacion({ n, sol }) {
  const ref = useRef(null);
  const puntos = useMemo(() => puntosCondensacion(n), [n]);

  // las matrices UNA vez, ANTES del primer paint (useLayoutEffect: sin flash
  // de esferas identidad): las gotas cuelgan quietas
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    puntos.forEach((d, i) => {
      p.set(d.pos[0], d.pos[1], d.pos[2]);
      const r = 0.008 + 0.016 * d.s;
      s.set(r, r * 1.35, r);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [puntos]);

  // el contraluz de la hora: brillo por gota según su cara al sol
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    const base = new THREE.Color(NIEBLAS.lechosa);
    let sx = 0;
    let sy = 1;
    if (sol.deDia && sol.pos) {
      const l = Math.hypot(sol.pos[0], sol.pos[1]) || 1;
      sx = sol.pos[0] / l;
      sy = sol.pos[1] / l;
    }
    puntos.forEach((d, i) => {
      const cara = Math.max(0, d.nx * sx + d.ny * sy);
      const brillo = sol.deDia ? 0.2 + (0.25 + 0.95 * cara * cara) * sol.fade : 0.13;
      c.copy(base).multiplyScalar(brillo);
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [puntos, sol]);

  if (!n) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false} renderOrder={5}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

/* EL VAHO: capas bajas de niebla tibia que derivan despacio entre las camas.
   Discos aditivos casi transparentes — humedad, no humo. `fuerza` viene del
   reloj (brumaDeHora): la mañana espesa el vaho, el mediodía lo rala.
   Con reducedMotion quedan quietos (presencia sin vaivén). */
function VahoHumedad({ n, fuerza = 1, reducedMotion }) {
  const grupo = useRef(null);
  const capas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: -1.6 + (i % 3) * 1.6,
        y: 0.55 + (i % 2) * 0.5 + i * 0.08,
        z: -4.6 + i * 2.1,
        r: 1.5 + (i % 3) * 0.6,
        fase: i * 1.7,
        op: 0.05 + (i % 2) * 0.025,
      });
    }
    return out;
  }, [n]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (reducedMotion || !g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = capas[i];
      m.position.x = d.x + 0.35 * Math.sin(t * 0.11 + d.fase);
      m.position.z = d.z + 0.28 * Math.cos(t * 0.09 + d.fase * 1.3);
      // el aire tiembla apenas: el calor subiendo de la tierra regada
      m.position.y = d.y + 0.06 * Math.sin(t * 0.5 + d.fase * 2.1);
      m.material.opacity = d.op * fuerza * (0.6 + 0.4 * Math.sin(t * 0.23 + d.fase));
    }
  });

  if (!n) return null;
  return (
    <group ref={grupo}>
      {capas.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[d.r, 12]} />
          <meshBasicMaterial
            color={NIEBLAS.lechosa}
            transparent
            opacity={d.op * fuerza}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* LA CONDENSACIÓN QUE GOTEA: gotas que caen del arco del techo al sustrato,
   en bucle determinista. Un InstancedMesh chiquito (≤10 esferas estiradas);
   con reducedMotion no se monta (el vaho quieto ya cuenta la humedad). */
function GoteoCondensacion({ n, reducedMotion }) {
  const ref = useRef(null);
  const gotas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = -2.4 + (i * 4.8) / Math.max(1, n - 1) + ((i * 7) % 3) * 0.22 - 0.22;
      const z = -5.6 + ((i * 3.7) % 11);
      const dxr = Math.min(Math.abs(x), INV.radio - 0.05);
      const yTecho = INV.arranque + INV.aplaste * Math.sqrt(INV.radio * INV.radio - dxr * dxr) - 0.08;
      out.push({ x, z, yTecho, caida: yTecho - 0.45, vel: 0.9 + (i % 3) * 0.28, fase: i * 0.61 });
    }
    return out;
  }, [n]);
  const util = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const { m, p, s } = util;
    for (let i = 0; i < gotas.length; i++) {
      const d = gotas[i];
      const frac = (t * d.vel + d.fase) % 1.6; // cuelga un momento y cae
      const cayendo = Math.max(0, frac - 0.6);
      const y = d.yTecho - d.caida * cayendo;
      p.set(d.x, y, d.z);
      s.set(0.6, cayendo > 0 ? 1.6 : 0.7, 0.6); // la gota se estira al caer
      m.compose(p, IDENTIDAD_Q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!n || reducedMotion) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[0.022, 5, 4]} />
      <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}
const IDENTIDAD_Q = new THREE.Quaternion();

/* El anillo del paso didáctico: respira sobre el punto que la lección señala.
   Con reducedMotion queda quieto (presencia sin parpadeo). */
function FocoPaso({ foco, reducedMotion }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.42;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.3 + 0.2 * Math.sin(t * 1.8);
    m.scale.setScalar(1 + 0.06 * Math.sin(t * 1.8));
  });
  if (!foco) return null;
  return (
    <mesh ref={anillo} position={[foco[0], foco[1] + 0.1, foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.78, 28]} />
      <meshBasicMaterial
        color={LUCES.candela}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La vida que ronda el invernadero: la mariposa que entra por la puerta hacia
   las matas, otra entre las camas y el colibrí que ronda la era de afuera.
   Pocas y por criterio (vida, no enjambre). */
const FAUNA_INVERNADERO = [
  { tipo: 'mariposa', base: [0.5, 1.4, 5.2], patron: 'revoloteo', size: 24, fase: 0.6, df: 9 },
  { tipo: 'mariposa', base: [-1.2, 1.1, -1.8], patron: 'revoloteo', size: 20, fase: 2.1, df: 9 },
  { tipo: 'colibri', base: [4.1, 1.4, 5.2], patron: 'revoloteo', size: 28, fase: 1.2, df: 10 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const conteos = useMemo(() => invernaderoDeTier(tier), [tier]);

  /* La atmósfera VIVA del kit (cambia por franja horaria del valle). */
  const atm = useAtmosferaMundo({ familia: FAMILIA_INVERNADERO, reducedMotion });

  /* El RELOJ CONTINUO (no la franja): de aquí salen el arco real del sol, la
     mancha en la bóveda, la alfombra difusa y la bruma de la mañana.
     Cuantizado a ~3 min para memoizar. */
  const { hora } = useCicloDia({ reducedMotion });
  const horaQ = Math.round(hora * 20) / 20;
  const sol = useMemo(() => solDeInvernadero(horaQ), [horaQ]);
  const bruma = useMemo(() => brumaDeHora(horaQ), [horaQ]);

  /* El gradiente de bandas (toma B): terreno y montes comparten escalones. */
  const bandas = useGradienteBandas();

  const geoClaro = useMemo(
    () => construirClaro(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Las piezas fusionadas del lugar (una draw-call cada una). */
  const geoEstructura = useMemo(() => geomEstructura(), []);
  const geoPlastico = useMemo(() => geomPlastico(), []);
  const geoCamas = useMemo(() => geomCamas(), []);
  const geoRiego = useMemo(() => geomRiego(), []);

  /* El material del PLÁSTICO: lechoso, translúcido, con un lustre apenas —
     la luz del valle entra VELADA y el túnel se ve de afuera y de adentro. */
  const matPlastico = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: NIEBLAS.lechosa,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        shininess: 70,
        specular: new THREE.Color('#fff6e2'),
      }),
    [],
  );

  /* Los montes del fondo, comidos por la niebla de la hora. */
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.22),
      lejos: mezclar(VERDES.monte, atm.niebla, 0.36),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_INVERNADERO : FAUNA_INVERNADERO.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);

  return (
    <>
      {/* LA ATMÓSFERA de la hora — la receta del kit, pero con el SOL CONTINUO
          (la luz tiene fuente y la hora se siente). El fondo y la niebla son
          los del valle; las luces cuentan LA FÍSICA DEL PLÁSTICO: */}
      <color attach="background" args={[atm.fondo]} />
      {tier !== 'bajo' && (
        <fog attach="fog" args={[atm.niebla, RADIO_INVERNADERO * 1.4, RADIO_INVERNADERO * 4.6]} />
      )}
      {/* LA LUZ LECHOSA: adentro el plástico difunde — el cielo entero es la
          lámpara. La bóveda hemisférica sube tintada de lechoso durante el día
          (la claridad sin dirección que el difusor fabrica). */}
      <hemisphereLight
        intensity={(sol.deDia ? 0.6 + 0.24 * sol.fade : 0.5) * atm.intensidad}
        color={mezclar(atm.cielo, NIEBLAS.lechosa, sol.deDia ? 0.45 : 0.15)}
        groundColor={atm.suelo}
      />
      <ambientLight
        intensity={(sol.deDia ? 0.3 + 0.1 * sol.fade : 0.26) * atm.intensidad}
        color={mezclar(atm.luz, NIEBLAS.lechosa, 0.4)}
      />
      {/* EL SOL DE VERDAD viaja su arco continuo — afuera modela y da sombra;
          ADENTRO la cubierta (castShadow) se la come: la sombra del plástico
          ES la difusión. De noche, la luna del kit. */}
      <directionalLight
        position={sol.deDia ? sol.pos : atm.solPos}
        intensity={(sol.deDia ? 0.35 + 0.6 * sol.fade : 0.8) * atm.intensidad}
        color={atm.luz}
        castShadow={perfil.sombras}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={SOMBRA_INVERNADERO.far}
        shadow-camera-left={SOMBRA_INVERNADERO.left}
        shadow-camera-right={SOMBRA_INVERNADERO.right}
        shadow-camera-top={SOMBRA_INVERNADERO.top}
        shadow-camera-bottom={SOMBRA_INVERNADERO.bottom}
      />
      {/* relleno frío opuesto: despega los volúmenes (contrato del kit) */}
      <directionalLight position={[-5, 4, -6]} intensity={0.22} color={atm.relleno} />
      {tier !== 'bajo' && atm.estrellas > 0 && (
        <Stars
          radius={RADIO_INVERNADERO * 8}
          depth={30}
          count={Math.round(perfil.estrellas * atm.estrellas)}
          factor={3}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.5}
        />
      )}

      {/* El domo de la toma B: gradiente cenit→horizonte + glow del sol. */}
      <DomoCielo atm={atm} radio={56} />

      {/* EL CLARO por bandas: pasto afuera, tierra húmeda adentro. */}
      <mesh geometry={geoClaro} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* los montes del fondo */}
      <mesh position={[-11, 1.6, -19]} scale={[8, 3.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[8, 2.0, -21]} scale={[10, 4.6, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* LA ESTRUCTURA: guadua, arcos, puerta verde, mesa, tutores. */}
      <mesh geometry={geoEstructura} castShadow={perfil.sombras}>
        {perfil.materialRico ? (
          <meshStandardMaterial vertexColors flatShading={perfil.flatShading} roughness={0.85} metalness={0} />
        ) : (
          <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
        )}
      </mesh>

      {/* Las CAMAS con su tierra viva + la era de afuera. */}
      <mesh geometry={geoCamas} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* El RIEGO: la caneca azul, la manguera madre y las líneas de goteo. */}
      <mesh geometry={geoRiego}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* LA VIDA sembrada: bandejas, brotes que respiran, bolsas, tomate,
          frutos madurando y la hortaliza. */}
      <FloraInvernadero tier={tier} reducedMotion={reducedMotion} />

      {/* LA ALFOMBRA DE LUZ DIFUSA: el charco sin borde que la mancha deja en
          las camas — deriva de poniente a oriente con el día. Dos elipses
          anidadas (el difusor no dibuja rectángulos). */}
      {sol.alfombra && (
        <group>
          <mesh
            position={[sol.alfombra.x, 0.05, -0.3]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[sol.alfombra.rx, sol.alfombra.rz, 1]}
            renderOrder={3}
          >
            <circleGeometry args={[1, 20]} />
            <meshBasicMaterial
              color={mezclar(atm.luz, NIEBLAS.lechosa, 0.5)}
              transparent
              opacity={sol.alfombra.op}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh
            position={[sol.alfombra.x, 0.06, -0.3]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[sol.alfombra.rx * 0.55, sol.alfombra.rz * 0.7, 1]}
            renderOrder={3}
          >
            <circleGeometry args={[1, 20]} />
            <meshBasicMaterial
              color={mezclar(atm.luz, NIEBLAS.lechosa, 0.35)}
              transparent
              opacity={sol.alfombra.op * 0.7}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {/* EL AIRE DEL TÚNEL: vaho que obedece la hora + condensación que gotea. */}
      <VahoHumedad n={conteos.vaho} fuerza={bruma} reducedMotion={reducedMotion} />
      <GoteoCondensacion n={conteos.gotas} reducedMotion={reducedMotion} />

      {/* LAS PERLAS: la condensación quieta de la cara interna, a contraluz. */}
      <PerlasCondensacion n={conteos.perlas} sol={sol} />

      {/* EL PLÁSTICO al final (translúcido, no escribe depth): vela lo de
          adentro visto de afuera, y de adentro vela el cielo. En gama alta
          PROYECTA sombra: adentro no entra sol duro — esa sombra es la
          difusión del calibre 6, la física que este mundo enseña. */}
      <mesh geometry={geoPlastico} material={matPlastico} renderOrder={4} castShadow={perfil.sombras} />

      {/* la mancha del sol en la bóveda + el brillo de los pliegues */}
      <ManchaDeSol mancha={sol.deDia ? sol.mancha : null} color={atm.luz} />
      <BrilloPliegues fade={sol.deDia ? sol.fade : 0} rasante={sol.rasante ?? 0} color={mezclar(atm.luz, NIEBLAS.lechosa, 0.4)} />

      {/* la vida que ronda: mariposas y el colibrí de la era */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      {/* ENTRAR DE VERDAD: el target del orbit vive ADENTRO del túnel y el
          zoom llega hasta el pasillo (minDistance corto) — acercarse por la
          puerta ES recorrer el invernadero. */}
      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1.2, 0.4]}
        enablePan={false}
        enableZoom
        minDistance={1.7}
        maxDistance={17}
        minPolarAngle={0.35}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
      />
      {/* La LLEGADA: dolly de establishing por el caminito hacia la puerta —
          entrar se siente como llegar caminando, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[0.4, 1.9, 9.6]}
        mirada={[0, 1.35, 0.4]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoInvernadero"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El micro-mundo del invernadero campesino. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaInvernaderoVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`invernadero-canvas${listo ? ' invernadero-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [0.4, 1.9, 9.6], fov: 50 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
