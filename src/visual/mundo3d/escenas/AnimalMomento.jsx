/*
 * AnimalMomento — el cambio de estado de un animal como un MOMENTO memorable
 * (auditoría FASE 2 §5a.4), no como un salto brusco. Un solo animal, dibujado
 * con la MISMA morfología del hato (ESPECIES de CorralVivo, primitivas orgánicas
 * — nunca una caja), pero fuera del InstancedMesh para poder darle su propio
 * instante: escala, opacidad y gesto que la instancia compartida no permite.
 *
 * Tres momentos, la visión del operador ("mis animales son seres, no filas"):
 *
 *   · `nace`   — una CRÍA aparece: crece desde casi nada con un brillo cálido y
 *                unas motas que suben; al asentar da sus PRIMEROS PASOS con un
 *                temblorcito que se calma. Alegre, sin estridencia.
 *   · `muerte` — el animal se RETIRA con respeto: se apaga despacio y se inclina,
 *                sube una mota tibia (el adiós) y queda una piedrita con una flor.
 *                Cálido, jamás dramático (no se derrumba, se despide).
 *   · `llega`  — el VENDIDO viaja al MERCADO: camina desde la parcela (al fondo)
 *                hasta los puestos con CICLO DE MARCHA de verdad — las patas
 *                (`pata` en la tabla de partes) van en pares diagonales girando
 *                en su cadera, el cuerpo bota y cabecea con el paso, y todo se
 *                asienta al llegar. El MISMO dato en dos mundos: en el corral
 *                queda su huella-fantasma, aquí llega en cuerpo.
 *
 * La pasada de mundo abierto del corral vive también aquí: el material lleva
 * parchePelaje (smooth + countershading + rim de hora dorada + grano), la tabla de
 * partes respeta `soloRaza` (la giba del cebú viaja con él al mercado) y
 * `rotRecta` (la oreja parada del San Pedreño), y una sombra de contacto
 * propia lo POSA en el piso (crece al nacer, se desvanece en el adiós):
 * peso real, no figura que flota.
 *
 * GATE doble (idéntico al resto del corral): sin reduced-motion y con tier
 * suficiente se anima; si no, se pinta el ESTADO FINAL quieto (cría entera,
 * memoria con su flor, vendido ya posado) — la información se ve igual, sin
 * movimiento. Bajo `frameloop='demand'` de reduced-motion useFrame no corre: por
 * eso el reposo se aplica una vez en el layout.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { ESPECIES, GeometriaParte, parchePelaje } from './CorralVivo.jsx';
import { SombraContacto } from './SombraContacto.jsx';
import { PALETA } from '../atmosferaMadre.js';

/* Duración de cada instante (s): el adiós es el más pausado. */
const DUR = { nace: 2.2, muerte: 3.2, llega: 3.0 };

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const easeInCubic = (p) => p * p * p;
const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
/* rebote suave al final (la cría "asienta" con un respiro, no un pop seco) */
const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
};
/* ventana suave [a,b] → 0..1 (para encender el temblor sin golpe) */
const suaveEntre = (x, a, b) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function AnimalMomento({
  animal,
  modo = 'nace',
  destino,
  origen,
  reducedMotion = false,
  tier = 'alto',
  onPick,
}) {
  const raiz = useRef(null);   // world: se mueve solo en `llega`
  const cuerpo = useRef(null); // local: escala/gesto/inclinación del animal
  const halo = useRef(null);   // brillo de nacimiento
  const motas = useRef(null);  // motas que suben (nace o adiós)
  const memoria = useRef(null);// la piedrita con flor (muerte)
  const sombra = useRef(null); // la sombra de contacto que lo posa
  const patas = useRef([]);    // meshes de pata para el ciclo de marcha
  const inicio = useRef(null);

  const animar = !reducedMotion && tier !== 'bajo';
  const esp = ESPECIES[animal.especie] || ESPECIES.animal;
  const s0 = animal.escala || 0.8;
  const dur = DUR[modo] || 2.4;

  const dest = destino || [0, 0, 0];
  // el vendido entra por la parcela del fondo (−z) y baja al puesto; los demás
  // no viajan (nacen/mueren donde están).
  const orig = origen || (modo === 'llega' ? [dest[0], dest[1], dest[2] - 2.4] : dest);

  // partes con LOD (en gama baja se cae lo `fina`: crestas, orejas, colas) y
  // con `soloRaza` (la giba solo si ESTE animal es de esa raza).
  const raza = (animal.raza || '').toLowerCase().trim();
  const partes = useMemo(
    () =>
      esp.partes.filter(
        (p) => (!p.fina || tier !== 'bajo') && (!p.soloRaza || p.soloRaza.includes(raza)),
      ),
    [esp, tier, raza],
  );
  const alto = esp.alto * s0;

  // El paso a paso del momento: reescribe transform/opacidad de los refs según
  // el progreso p∈[0,1]. Se llama por frame (animando) o una vez en reposo (p=1).
  const aplicar = (p) => {
    const r = raiz.current;
    const c = cuerpo.current;
    if (!r || !c) return;

    if (modo === 'llega') {
      const e = easeOutCubic(p);
      r.position.set(
        orig[0] + (dest[0] - orig[0]) * e,
        orig[1] + (dest[1] - orig[1]) * e,
        orig[2] + (dest[2] - orig[2]) * e,
      );
      // CICLO DE MARCHA con peso: el paso vive en las patas (pares diagonales
      // girando en la cadera), el cuerpo bota en contratiempo y cabecea apenas;
      // todo decae al asentarse en el puesto.
      const marcha = 1 - e;
      const paso = p * Math.PI * 14;
      c.rotation.set(0, -Math.PI / 2, Math.sin(paso * 0.5) * 0.035 * marcha); // mira a +z y cabecea
      c.position.y = Math.abs(Math.sin(paso)) * 0.045 * marcha;
      c.scale.setScalar(s0);
      opacidadCuerpo(c, 1);
      moverPatas(paso, marcha);
      if (sombra.current) {
        sombra.current.scale.setScalar(1);
        sombra.current.material.opacity = 0.3;
      }
    } else if (modo === 'nace') {
      r.position.set(...dest);
      const crece = 0.12 + 0.88 * easeOutBack(p);
      c.scale.setScalar(s0 * crece);
      // los PRIMEROS PASOS: un temblorcito de patas nuevas que se va calmando
      const tiembla = suaveEntre(p, 0.25, 0.45) * (1 - p);
      c.rotation.set(0, 0, Math.sin(p * 26) * 0.09 * tiembla);
      c.position.y = 0;
      opacidadCuerpo(c, clamp01(p * 2)); // se define en el primer tramo
      if (halo.current) {
        halo.current.scale.setScalar(s0 * (0.5 + 1.9 * easeOutCubic(p)));
        halo.current.material.opacity = 0.5 * (1 - p);
      }
      if (sombra.current) {
        sombra.current.scale.setScalar(0.2 + 0.8 * easeOutCubic(p));
        sombra.current.material.opacity = 0.3 * clamp01(p * 2);
      }
      subirMotas(p, alto, '#ffe6b0');
    } else if (modo === 'muerte') {
      r.position.set(...dest);
      const e = easeInOutSine(p);
      c.scale.setScalar(s0);
      c.rotation.set(0, 0, -0.16 * easeOutCubic(p)); // se inclina despacio
      c.position.y = -0.03 * easeInCubic(p);          // se recoge, no se derrumba
      opacidadCuerpo(c, 1 - 0.68 * e);                 // se apaga, no desaparece
      if (sombra.current) {
        sombra.current.scale.setScalar(1);
        sombra.current.material.opacity = 0.3 * (1 - 0.8 * e); // el peso se despide
      }
      if (memoria.current) {
        const m = clamp01((p - 0.3) / 0.7);
        memoria.current.scale.setScalar(0.5 + 0.5 * easeOutCubic(m));
        memoria.current.traverse((o) => {
          if (o.material) o.material.opacity = m;
        });
      }
      subirMotas(p, alto, '#ffdca0'); // el adiós tibio que sube
    }
  };

  // opacidad de todas las mallas del cuerpo (few meshes → traverse trivial).
  const opacidadCuerpo = (c, o) => {
    for (const hijo of c.children) {
      if (hijo.material) hijo.material.opacity = o;
    }
  };

  // el paso de cada pata: pares diagonales (0 y 3 contra 1 y 2), girando en su
  // CADERA (el tope del cilindro) — la pata pendula, no patina.
  const moverPatas = (paso, marcha) => {
    for (const it of patas.current) {
      if (!it) continue;
      const { mesh, parte } = it;
      const [x0, y0, z0] = parte.pos;
      const L = parte.geo[1][2]; // alto del cilindro de la pata
      const lado = parte.pata === 0 || parte.pata === 3 ? 0 : Math.PI;
      const ang = Math.sin(paso + lado) * 0.5 * marcha;
      mesh.rotation.z = ang;
      mesh.position.set(x0 + Math.sin(ang) * (L / 2), y0 + (L / 2) * (1 - Math.cos(ang)), z0);
    }
  };

  // motas tenues que suben y se desvanecen (nacimiento o adiós).
  const subirMotas = (p, base, color) => {
    const g = motas.current;
    if (!g) return;
    g.visible = animar && p < 0.98;
    g.children.forEach((mo, i) => {
      const fase = clamp01(p * 1.4 - i * 0.12);
      mo.position.y = base * 0.5 + fase * (base + 0.5);
      if (mo.material) {
        mo.material.color.set(color);
        mo.material.opacity = 0.8 * Math.sin(fase * Math.PI);
      }
    });
  };

  // el color de una parte: pelaje de la raza (con `tinte` para manchas — el
  // color del animal ya viene como THREE.Color desde normalizarAnimales) o el
  // tono fijo de anatomía de la parte.
  const colorParte = (parte) => {
    if (!parte.porRaza) return parte.color;
    if (parte.tinte && animal.color) {
      return `#${animal.color.clone().multiplyScalar(parte.tinte).getHexString()}`;
    }
    return animal.colorCss;
  };

  useLayoutEffect(() => {
    inicio.current = null;
    aplicar(animar ? 0 : 1); // reposo → estado final; animando → arranque limpio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id, modo, animar, tier]);

  useFrame((state) => {
    if (!animar || !raiz.current) return;
    if (inicio.current == null) inicio.current = state.clock.elapsedTime;
    aplicar(clamp01((state.clock.elapsedTime - inicio.current) / dur));
  });

  return (
    <group ref={raiz}>
      {/* la sombra de contacto que lo POSA (nace: crece; muerte: se despide) */}
      <SombraContacto
        refExt={sombra}
        pos={[0, 0.004, 0]}
        radio={(esp.sombra || 0.3) * s0 * 1.25}
        opacidad={0.3}
      />
      {/* el cuerpo del animal: mismas partes del hato —anatomía y pelaje de la
          pasada de mundo abierto—, como mallas sueltas para poder animarle
          escala/opacidad/gesto/marcha propios */}
      <group
        ref={cuerpo}
        onClick={
          onPick
            ? (e) => {
                e.stopPropagation();
                onPick(animal);
              }
            : undefined
        }
      >
        {partes.map((parte, i) => (
          <mesh
            key={i}
            ref={
              parte.pata != null
                ? (el) => {
                    if (el) patas.current[parte.pata] = { mesh: el, parte };
                  }
                : undefined
            }
            position={parte.pos || [0, 0, 0]}
            rotation={(animal.orejaRecta && parte.rotRecta ? parte.rotRecta : parte.rot) || [0, 0, 0]}
            scale={parte.escala || [1, 1, 1]}
          >
            <GeometriaParte geo={parte.geo} />
            <meshLambertMaterial
              color={colorParte(parte)}
              onBeforeCompile={parchePelaje}
              transparent
              depthWrite={modo !== 'muerte'}
            />
          </mesh>
        ))}
      </group>

      {/* el brillo cálido del nacimiento */}
      {modo === 'nace' && (
        <mesh ref={halo} position={[0, alto * 0.5, 0]}>
          <sphereGeometry args={[0.4, 10, 8]} />
          <meshBasicMaterial color="#ffe6b0" transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* la memoria: una piedrita con su flor, al lado de donde estuvo. Cálida,
          sin dramatizar — el dato persiste, el ser se recuerda. */}
      {modo === 'muerte' && (
        <group ref={memoria} position={[0.22 * s0, 0, 0.14 * s0]}>
          <mesh position={[0, 0.05, 0]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshLambertMaterial color="#8f8574" flatShading transparent opacity={0} />
          </mesh>
          <mesh position={[0.03, 0.16, 0.05]}>
            <cylinderGeometry args={[0.008, 0.011, 0.16, 4]} />
            <meshLambertMaterial color="#5a7a3a" transparent opacity={0} />
          </mesh>
          <mesh position={[0.03, 0.25, 0.05]}>
            <sphereGeometry args={[0.032, 7, 6]} />
            <meshLambertMaterial color="#e2b4cf" flatShading transparent opacity={0} />
          </mesh>
          {[0, 1, 2, 3].map((k) => {
            const a = (k / 4) * Math.PI * 2;
            return (
              <mesh key={k} position={[0.03 + Math.cos(a) * 0.04, 0.25, 0.05 + Math.sin(a) * 0.04]}>
                <sphereGeometry args={[0.02, 6, 5]} />
                <meshLambertMaterial color="#efcfe0" flatShading transparent opacity={0} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* las motas que suben (nacimiento o adiós) */}
      {(modo === 'nace' || modo === 'muerte') && (
        <group ref={motas}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[(k - 1) * 0.09, 0, (k - 1) * 0.05]}>
              <octahedronGeometry args={[0.035, 0]} />
              <meshBasicMaterial color="#ffe6b0" transparent opacity={0} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* el vendido llega con su NOMBRE puesto: el dato viajó con él (mismo ser,
          otro mundo). Un rótulo de madera clavado, legible por ambas caras. */}
      {modo === 'llega' && animal.nombre && (
        <group position={[0, alto + 0.34, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.016, 0.022, 0.32, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[0.5, 0.18, 0.03]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {[0.02, -0.02].map((lado) => (
            <Text
              key={lado}
              position={[0, 0, lado]}
              rotation={[0, lado < 0 ? Math.PI : 0, 0]}
              fontSize={0.088}
              maxWidth={0.44}
              color="#241a10"
              anchorX="center"
              anchorY="middle"
            >
              {animal.nombre}
            </Text>
          ))}
        </group>
      )}
    </group>
  );
}
