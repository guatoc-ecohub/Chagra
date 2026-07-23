/*
 * EscenaCasaAdentro — LA CASA POR DENTRO: el interior navegable de la
 * casa-ancla del valle. No una postal: SE ESTÁ adentro.
 *
 * Un solo cuarto de casa campesina andina, cálido y en penumbra: el fogón de
 * leña prendido (candela que titila, humo que sube a la teja), la mesa con sus
 * taburetes, la luz del día entrando en haz por la ventana del sur, la repisa,
 * el costal, el sombrero en su clavo. Es "el punto de silencio" del valle: la
 * casa NO pide nada — abriga.
 *
 * Dos accesos LEGIBLES desde adentro (contrato con el host):
 *   · LA VENTANA DE LOS MUNDOS (muro del fondo): el vano con postigos abiertos
 *     resplandece con el cielo-portal y cinco luces de colores titilando (los
 *     mundos llamando). Tocarla → `onPortales`.
 *   · EL RINCÓN DE LOS FERMENTOS (estante del oriente): los frascos de vidrio
 *     con la chicha, el vinagre y el mortiño, con su anillo que respira en el
 *     piso. Tocarlo → `onFermentos`.
 *
 * La casa VIVE con el valle: la atmósfera del kit (familia `corral`) pone la
 * hora — el color del cielo que se ve por la puerta y la ventana, y el tono
 * del haz de luz, amanecen y anochecen con el resto del juego. El fogón es la
 * luz que NO cambia: la casa siempre espera caliente.
 *
 * PASADA NOLAN (la luz tiene fuente, la hora se siente):
 *   · TODA la luz del día entra por los vanos: la direccional sigue el arco
 *     REAL del sol (hora decimal continua, no franjas a saltos) y por eso el
 *     RECTÁNGULO DE SOL que la ventana del sur riega en el piso camina y se
 *     alarga con el día — sliver pegado al muro a mediodía cenital ecuatorial,
 *     alfombra honda y ámbar al filo de la mañana y de la tarde. La casa es
 *     también un reloj.
 *   · La imagen imposible: el HAZ que une el vano con su rectángulo, con las
 *     MOTAS DE POLVO flotando adentro — la cortina de luz que corta la
 *     penumbra. Y al mediodía, la TEJA DE VIDRIO (la claraboya campesina)
 *     deja caer su columna cenital al centro del piso.
 *   · La PENUMBRA es la imagen: el ambiente se queda corto a propósito — una
 *     casa de tapia se alumbra por UN vano y el resto es sombra que abriga.
 *   · De noche el sol se va de verdad: queda la luna plata entrando por la
 *     ventana del norte y el FOGÓN mandando — la única luz que no obedece
 *     al reloj.
 *
 * Todo procedural (cero CDN/GLTF/imágenes). El cuarto entero es UNA geometría
 * fusionada (casaAdentro.geom, vertexColors). Tier-safe vía `perfilDeTier`:
 * 'alto' sombras + humo pleno + candela que titila; 'medio' frugal; 'bajo'
 * mínimo. Con `reducedMotion` monta QUIETO (frameloop demand): humo estático,
 * candela fija, cero vaivén. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { useAtmosferaMundo, CamaraDirector } from '../kit/index.js';
import useCicloDia from '../useCicloDia.js';
import { mezclar, VERDES, NIEBLAS, LUCES, ACENTOS, AGUAS, CASA, NEUTROS } from '../paleta/index.js';
import {
  SALA,
  PUERTA,
  VENTANA_SUR,
  VENTANA_MUNDOS,
  TEJA_LUZ,
  FRASCOS,
  CANASTO,
  construirCasaAdentro,
} from './casaAdentro.geom.js';

/* La casa pertenece a la familia del patio de la finca: `corral`. */
const FAMILIA_CASA = 'corral';

/* Lo que se ve por las RENDIJAS del techo (y sobre las culatas) es el CIELO
   de afuera: el fondo del canvas. La familia `corral` tiñe el DÍA de crema
   de patio, pero ese crema de noche quedaba gris-claro — rendijas blancas a
   las ocho de la noche, luz sin fuente. El cielo nocturno de la casa es
   índigo hondo con un asomo de luna: franjas azules y tenues, o nada. */
const CIELO_NOCHE_CASA = mezclar('#131a34', LUCES.luna, 0.1);

/* Cursor de "esto se toca" (mismo gesto que la puerta del valle). */
const alApuntar = (e) => {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
};
const alSoltar = () => {
  document.body.style.cursor = '';
};

/* ── EL RELOJ DE SOL DE LA CASA (pasada Nolan: la luz tiene fuente) ────────
   Del reloj continuo del valle (hora decimal) se deriva la posición REAL del
   sol y lo que esa posición hace ADENTRO:
     · `pos`  — de dónde viene la direccional (el arco de oriente a poniente,
       casi cenital a mediodía: 4-5° N, sol ecuatorial).
     · `rect` — el rectángulo que la ventana del sur proyecta en el piso:
       geometría de sombra de verdad (dintel y alféizar proyectados por la
       altura solar). Corto y pegado al muro a mediodía; hondo al amanecer y
       al atardecer. La mañana lo corre al poniente, la tarde al oriente.
     · `haz`  — la cortina de luz que une el vano con su rectángulo (posición,
       largo e inclinación para las láminas aditivas y las motas).
     · `cenital` — cuánto prende la teja de vidrio (solo con el sol alto).
   Pura y barata: se memoíza por hora cuantizada (~3 min). */
function solDeCasa(hora) {
  const hz = SALA.fondo / 2;
  const dia = (hora - 6) / 12; // 0 = sale (~6:00) · 1 = se esconde (~18:00)
  if (dia <= 0.015 || dia >= 0.985) return { deDia: false, fade: 0 };
  const arco = Math.PI * dia;
  const pos = [9 * Math.cos(arco), 2.2 + 11.5 * Math.sin(arco), 3.5];
  const alt = Math.atan2(pos[1], Math.hypot(pos[0], pos[2]));
  // tras el filo de la cordillera el sol existe pero todavía no entra
  const fade = Math.min(1, Math.max(0, (alt - 0.12) / 0.15));
  if (fade <= 0) return { deDia: true, pos, fade: 0 };

  const tanAlt = Math.tan(alt);
  let z0 = Math.max(hz - VENTANA_SUR.alto / tanAlt, -hz + 0.4); // borde hondo (el dintel)
  let z1 = Math.min(hz - VENTANA_SUR.base / tanAlt, hz - 0.12); // borde cercano (el alféizar)
  const yMedio = (VENTANA_SUR.base + VENTANA_SUR.alto) / 2;
  const cxVano = (VENTANA_SUR.x0 + VENTANA_SUR.x1) / 2;
  // la mañana corre la mancha al poniente; la tarde la manda LEJOS, al
  // oriente, cruzando el cuarto (la alfombra larga de las cinco)
  const corrido = cxVano - (pos[0] * yMedio) / pos[1];
  const cx = Math.min(2.9, Math.max(-2.9, corrido));
  // si el sol entra tan sesgado que la mancha se sale del piso (madrugada:
  // el primer sol da en el muro del fogón, no en la tierra), se apaga
  const sesgo = Math.abs(corrido - cx) > 0.01 ? Math.max(0, 1 - Math.abs(corrido - cx) * 0.7) : 1;
  const largo = z1 - z0;
  let rect = null;
  let haz = null;
  if (largo > 0.05 && sesgo > 0.05) {
    const rasante = Math.cos(arco) * Math.cos(arco); // la luz baja es la más dramática
    rect = {
      x: cx,
      z: (z0 + z1) / 2,
      largo,
      ancho: (VENTANA_SUR.x1 - VENTANA_SUR.x0) * (0.92 + 0.55 * (1 - Math.sin(alt))),
      op: (0.11 + 0.11 * rasante) * fade * sesgo,
    };
    const dx = rect.x - cxVano;
    const dz = hz - 0.06 - rect.z;
    rect.haz = true;
    haz = {
      mid: [(cxVano + rect.x) / 2, (yMedio + 0.03) / 2, (hz - 0.06 + rect.z) / 2],
      len: Math.hypot(dx, yMedio, dz) + 0.35,
      rotX: Math.atan2(dz, yMedio),
      rotZ: Math.atan2(dx, yMedio) * 0.85,
      op: rect.op * 0.55,
    };
  }
  // la teja de vidrio solo con el sol alto (el haz cenital del mediodía)
  const cenital = Math.min(1, Math.max(0, ((alt * 180) / Math.PI - 52) / 22)) * fade;
  return { deDia: true, pos, fade, rect, haz, cenital };
}

/* Pseudo-azar estable por índice (las motas no cambian de sitio entre frames). */
const azar = (i, sal) => {
  const x = Math.sin(i * 127.1 + sal * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ── LAS MOTAS DEL HAZ: el polvo de la casa flotando en la cortina de luz ──
   La imagen imposible de adentro: partículas diminutas, aditivas, que solo
   viven DENTRO del haz (coordenadas locales del grupo inclinado) y derivan
   despacio hacia abajo, titilando al cruzar la luz. */
function MotasDelHaz({ n, haz, color, reducedMotion }) {
  const grupo = useRef(null);
  const motas = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        u: azar(i, 1) - 0.5, // a lo largo del haz
        x: (azar(i, 2) - 0.5) * 0.72,
        z: (azar(i, 3) - 0.5) * 0.2,
        fase: azar(i, 4) * Math.PI * 2,
        vel: 0.014 + azar(i, 5) * 0.02,
        r: 0.011 + azar(i, 6) * 0.013,
      })),
    [n],
  );
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || !haz || reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = motas[i];
      const u = ((d.u + 0.5 - t * d.vel) % 1 + 1) % 1; // cae despacio a lo largo del haz
      m.position.set(
        d.x + 0.03 * Math.sin(t * 0.4 + d.fase),
        (u - 0.5) * haz.len,
        d.z + 0.02 * Math.cos(t * 0.33 + d.fase),
      );
      m.material.opacity = haz.op * (2.2 + 1.8 * Math.sin(t * 0.9 + d.fase)) * Math.sin(Math.PI * u);
    }
  });
  if (!n || !haz) return null;
  return (
    <group ref={grupo} position={haz.mid} rotation={[haz.rotX, 0, haz.rotZ]}>
      {motas.map((d, i) => (
        <mesh key={i} position={[d.x, d.u * haz.len, d.z]}>
          <sphereGeometry args={[d.r, 5, 4]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={reducedMotion ? haz.op * 2.4 : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── EL HAZ DE LA TEJA DE VIDRIO: la columna cenital del mediodía ──────────
   La claraboya campesina (una teja translúcida entre las de barro) deja caer
   una columna de luz vertical al centro del piso cuando el sol va alto. Dos
   láminas cruzadas + la teja encendida + su charco. */
const INCLINACION_TECHO = Math.atan2(SALA.cumbre - SALA.alero, SALA.fondo / 2 + 0.1);

function HazDeLaTeja({ f, color }) {
  if (f <= 0.03) return null;
  const [tx, ty, tz] = TEJA_LUZ.pos;
  const alto = ty - 0.02;
  return (
    <group>
      {/* la teja encendida (la fuente SE VE en el techo) */}
      <mesh position={[tx, ty, tz]} rotation={[Math.PI / 2 - INCLINACION_TECHO, 0, 0]}>
        <planeGeometry args={[TEJA_LUZ.ancho, TEJA_LUZ.largo]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55 * f}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* la columna: dos láminas cruzadas, levemente más anchas abajo */}
      {[0, Math.PI / 2].map((ry) => (
        <mesh key={ry} position={[tx, alto / 2, tz]} rotation={[0, ry, 0]}>
          <planeGeometry args={[TEJA_LUZ.ancho * 0.92, alto]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.085 * f}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* el charco cenital en la tierra pisada */}
      <mesh position={TEJA_LUZ.piso} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.72, 1]}>
        <circleGeometry args={[0.34, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2 * f} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/* ── EL FUEGO DEL FOGÓN: dos llamas que titilan + la luz de la candela ────── */
function FuegoFogon({ tier, reducedMotion, fuerza = 1 }) {
  const llama1 = useRef(null);
  const llama2 = useRef(null);
  const luz = useRef(null);
  const anima = !reducedMotion && tier !== 'bajo';
  useFrame(({ clock }) => {
    if (!anima) return;
    const t = clock.elapsedTime;
    const p = 0.82 + 0.18 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1.2);
    if (llama1.current) llama1.current.scale.set(1, p, 1);
    if (llama2.current) llama2.current.scale.set(1, 1.5 - p * 0.5, 1);
    if (luz.current) luz.current.intensity = (1.08 + 0.26 * (p - 0.82)) * fuerza;
  });
  return (
    // En la BOCA de la candela, no adentro de la masa: el hueco de la boca es
    // geometría maciza (caja tinta hasta x=-2.06) y el grupo vivía en -2.34 —
    // las llamas quedaban ENTERRADAS en el adobe, invisibles. Aquí el fuego
    // asoma por el frente de la boca, que es donde se ve de verdad.
    <group position={[-2.06, 0.16, 0.2]}>
      {/* las brasas y las dos lenguas de candela */}
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.4]} />
        <meshBasicMaterial color="#e05a2b" />
      </mesh>
      <mesh ref={llama1} position={[0.04, 0.16, -0.06]}>
        <coneGeometry args={[0.085, 0.26, 6]} />
        <meshBasicMaterial color="#ff9a3d" transparent opacity={0.92} />
      </mesh>
      <mesh ref={llama2} position={[0.07, 0.13, 0.09]}>
        <coneGeometry args={[0.06, 0.18, 6]} />
        <meshBasicMaterial color={LUCES.candela} transparent opacity={0.85} />
      </mesh>
      {/* la luz de la candela: la casa siempre espera caliente — y de noche,
          cuando el sol se va de verdad, es ELLA la que manda en el cuarto */}
      <pointLight
        ref={luz}
        color="#ffb066"
        intensity={1.15 * fuerza}
        distance={7.5}
        decay={1.8}
        position={[0.15, 0.55, 0]}
      />
    </group>
  );
}

/* ── EL HUMO: volutas que suben del fogón a la teja y se deshacen ─────────── */
function HumoFogon({ n, reducedMotion }) {
  const grupo = useRef(null);
  const volutas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        fase: (i / n) * 1.0,
        vel: 0.09 + (i % 3) * 0.02,
        deriva: 0.18 + (i % 2) * 0.12,
        r: 0.16 + (i % 3) * 0.05,
      });
    }
    return out;
  }, [n]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g || reducedMotion) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = volutas[i];
      const frac = (t * d.vel + d.fase) % 1;
      m.position.set(
        -2.62 + frac * d.deriva + 0.1 * Math.sin(t * 0.7 + i * 2.1),
        0.98 + frac * 2.3,
        0.2 + 0.14 * Math.cos(t * 0.5 + i * 1.7),
      );
      const s = 0.5 + frac * 1.6;
      m.scale.setScalar(s);
      m.material.opacity = 0.13 * Math.sin(Math.PI * Math.min(1, frac * 1.15));
    }
  });

  if (!n) return null;
  return (
    <group ref={grupo}>
      {volutas.map((d, i) => (
        <mesh
          key={i}
          position={reducedMotion ? [-2.6, 1.2 + (i / n) * 2.0, 0.2] : [-2.62, 1.0, 0.2]}
          scale={reducedMotion ? 0.8 + (i / n) * 1.2 : 0.5}
        >
          <sphereGeometry args={[d.r, 7, 5]} />
          <meshBasicMaterial
            color={NIEBLAS.lechosa}
            transparent
            opacity={reducedMotion ? 0.07 : 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── LA VENTANA DE LOS MUNDOS: el vano-portal del muro del fondo ──────────── */
const LUCES_MUNDOS = [
  { color: ACENTOS.guayacan, pos: [-0.42, 1.75] },
  { color: AGUAS.viva, pos: [0.34, 1.9] },
  { color: ACENTOS.florDeMonte, pos: [0.5, 1.35] },
  { color: VERDES.templadoVivo, pos: [-0.25, 1.2] },
  { color: LUCES.luna, pos: [0.05, 1.58] },
];

function VentanaMundos({ atm, noche, reducedMotion, onPortales }) {
  const velo = useRef(null);
  const luces = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (velo.current) velo.current.opacity = 0.06 + 0.04 * Math.sin(t * 1.1);
    const g = luces.current;
    if (g) {
      for (let i = 0; i < g.children.length; i++) {
        g.children[i].material.opacity = 0.55 + 0.4 * Math.sin(t * 1.6 + i * 1.9);
      }
    }
  });
  const cx = (VENTANA_MUNDOS.x0 + VENTANA_MUNDOS.x1) / 2;
  const cy = (VENTANA_MUNDOS.base + VENTANA_MUNDOS.alto) / 2;
  const w = VENTANA_MUNDOS.x1 - VENTANA_MUNDOS.x0 - 0.04;
  const h = VENTANA_MUNDOS.alto - VENTANA_MUNDOS.base - 0.04;
  const z = -SALA.fondo / 2 + 0.02;
  /* LO QUE SE VE POR EL VANO ES PAISAJE, no un plano quemado: de día el cielo
     azulado del valle (rellenoFrio templa el crema del corral, que solo
     dejaba blanco puro), la cordillera lejana en bruma y la loma verde
     cercana. De noche todo baja a índigo de luna. */
  const cieloAfuera = noche
    ? mezclar(CIELO_NOCHE_CASA, LUCES.luna, 0.18)
    : mezclar(LUCES.rellenoFrio, atm.cielo, 0.32);
  const cordillera = noche
    ? mezclar(CIELO_NOCHE_CASA, VERDES.altoAndino, 0.3)
    : mezclar(VERDES.altoAndino, LUCES.luna, 0.42);
  const loma = noche
    ? mezclar(VERDES.monte, CIELO_NOCHE_CASA, 0.72)
    : mezclar(VERDES.brote, NIEBLAS.dorada, 0.18);
  return (
    <group
      onClick={
        onPortales
          ? (e) => {
              e.stopPropagation();
              onPortales();
            }
          : undefined
      }
      onPointerOver={onPortales ? alApuntar : undefined}
      onPointerOut={onPortales ? alSoltar : undefined}
    >
      {/* el cielo de afuera (la hora del valle, templada — nunca blanco) */}
      <mesh position={[cx, cy, z]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={cieloAfuera} />
      </mesh>
      {/* la cordillera lejana, en bruma */}
      <mesh position={[cx, VENTANA_MUNDOS.base + 0.34, z + 0.006]}>
        <planeGeometry args={[w, 0.42]} />
        <meshBasicMaterial color={cordillera} />
      </mesh>
      {/* la loma verde cercana (el valle asomándose al vano) */}
      <mesh position={[cx, VENTANA_MUNDOS.base + 0.12, z + 0.012]}>
        <planeGeometry args={[w, 0.22]} />
        <meshBasicMaterial color={loma} />
      </mesh>
      {/* el velo dorado que respira sobre el vano (la invitación, tenue) */}
      <mesh position={[cx, cy, z + 0.015]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={velo}
          color={NIEBLAS.dorada}
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* los mundos titilando: cinco luces de colores llamando desde el vano */}
      <group ref={luces}>
        {LUCES_MUNDOS.map((l, i) => (
          <mesh key={i} position={[l.pos[0], l.pos[1], z + 0.03]}>
            <circleGeometry args={[0.05, 10]} />
            <meshBasicMaterial
              color={l.color}
              transparent
              opacity={0.8}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      {/* el charco de luz que el vano tira al piso (afordancia de "se toca") */}
      <mesh position={[cx, 0.02, -1.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 18]} />
        <meshBasicMaterial color={LUCES.luna} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── EL RINCÓN DE LOS FERMENTOS: frascos de vidrio + anillo que respira ───── */
function RinconFermentos({ reducedMotion, onFermentos }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.22;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.14 + 0.12 * Math.sin(t * 1.4);
    m.scale.setScalar(1 + 0.05 * Math.sin(t * 1.4));
  });
  return (
    <group
      onClick={
        onFermentos
          ? (e) => {
              e.stopPropagation();
              onFermentos();
            }
          : undefined
      }
      onPointerOver={onFermentos ? alApuntar : undefined}
      onPointerOut={onFermentos ? alSoltar : undefined}
    >
      {/* la caja de toque del estante entero (invisible, generosa al dedo) */}
      <mesh position={[3.3, 1.0, -0.75]} visible={false}>
        <boxGeometry args={[0.7, 1.7, 1.8]} />
        <meshBasicMaterial />
      </mesh>
      {/* los frascos: el líquido de cada fermento + su vidrio */}
      {FRASCOS.map((f, i) => (
        <group key={i} position={f.pos}>
          <mesh>
            <cylinderGeometry args={[f.r - 0.018, f.r - 0.018, f.h * 0.68, 10]} />
            <meshLambertMaterial color={f.liquido} emissive={f.liquido} emissiveIntensity={0.28} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[f.r, f.r * 0.94, f.h, 10, 1, true]} />
            <meshLambertMaterial
              color={NEUTROS.hueso}
              transparent
              opacity={0.22}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      {/* el anillo que respira al pie del estante */}
      <mesh ref={anillo} position={[2.85, 0.02, -0.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.56, 24]} />
        <meshBasicMaterial
          color={ACENTOS.ambar}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* una candela tibia sobre los frascos (que el rincón se vea rincón) */}
      <pointLight color={ACENTOS.ambar} intensity={0.35} distance={2.6} decay={1.8} position={[3.0, 1.5, -0.75]} />
    </group>
  );
}

/* ── El anillo del paso didáctico (mismo contrato que cafetal/invernadero) ── */
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
    <mesh ref={anillo} position={[foco[0], foco[1], foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.68, 28]} />
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

/* ── El diorama: el cuarto + la vida + los accesos ────────────────────────── */
function Diorama({ tier, reducedMotion, foco, onPortales, onFermentos }) {
  const perfil = perfilDeTier(tier);

  /* La HORA del valle (familia corral): tiñe lo que se ve por los vanos y el
     haz de la ventana. El fogón no la obedece — la casa siempre está tibia. */
  const atm = useAtmosferaMundo({ familia: FAMILIA_CASA, reducedMotion });

  /* El RELOJ CONTINUO (no la franja): de aquí sale el arco real del sol y el
     rectángulo que camina por el piso. Cuantizado a ~3 min para memoizar. */
  const { hora } = useCicloDia({ reducedMotion });
  const horaQ = Math.round(hora * 20) / 20;
  const sol = useMemo(() => solDeCasa(horaQ), [horaQ]);

  /* De noche y al filo del día, el fogón MANDA (la única luz sin reloj). */
  const fogonFuerza = !sol.deDia ? 1.55 : sol.fade < 0.35 ? 1.28 : 0.92;

  /* El cielo de las rendijas obedece el MISMO reloj que el haz (solDeCasa):
     de noche índigo de luna; al filo del día todavía oscuro (sigue el fade). */
  const fondoCasa = !sol.deDia
    ? CIELO_NOCHE_CASA
    : mezclar(CIELO_NOCHE_CASA, atm.fondo, Math.min(1, 0.3 + 0.7 * sol.fade));

  const geoCasa = useMemo(() => construirCasaAdentro(tier === 'alto'), [tier]);

  const nHumo = tier === 'alto' ? 7 : tier === 'medio' ? 4 : 0;
  const nMotas = tier === 'alto' ? 22 : tier === 'medio' ? 10 : 0;

  const controls = useRef(null);
  const hz = SALA.fondo / 2;

  return (
    <>
      {/* el fondo: el cielo de afuera — lo que asoma por las rendijas del
          techo. De día la hora del valle; de noche se APAGA a índigo. */}
      <color attach="background" args={[fondoCasa]} />

      {/* LA PENUMBRA sigue siendo la imagen, pero con LUZ DE LECTURA: la
          cocina tiene que leerse (el fogón, la loza, la cuelga). El refuerzo
          compensa cuando la atmósfera viene tenue (patrón de #2707) y la base
          sube para que el interior no sea un pardo ciego. De noche baja y
          manda el fogón. */}
      <ambientLight
        color={LUCES.ambienteTibio}
        intensity={
          sol.deDia
            ? 0.24 + 0.16 * atm.intensidad + 0.12 * Math.max(0, 1 - atm.intensidad)
            : 0.14
        }
      />
      <hemisphereLight
        skyColor={atm.cielo}
        groundColor={NEUTROS.tinta}
        intensity={sol.deDia ? 0.26 : 0.13}
      />
      {/* LA LUZ TIENE FUENTE: de día la direccional viaja por el arco REAL del
          sol (por eso el rectángulo de la ventana camina y las sombras giran
          con la hora); de noche es la luna plata entrando desde el norte, por
          la ventana de los mundos. */}
      <directionalLight
        color={atm.luz}
        intensity={sol.deDia ? 0.32 + 0.62 * sol.fade : 0.34}
        position={sol.deDia ? sol.pos : atm.solPos}
        castShadow={perfil.sombras}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-2}
        shadow-camera-far={16}
      />

      {/* EL CUARTO ENTERO: una geometría, una draw-call */}
      <mesh geometry={geoCasa} castShadow={perfil.sombras} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors />
      </mesh>

      {/* el canasto de cosecha (cilindro abierto → DoubleSide, va aparte) */}
      <mesh position={CANASTO.pos}>
        <cylinderGeometry args={[CANASTO.rTop, CANASTO.rBase, CANASTO.h, 10, 1, true]} />
        <meshLambertMaterial color={CASA.bejuco} side={THREE.DoubleSide} />
      </mesh>

      {/* lo que se ve AFUERA por la puerta: el pasto del valle a la hora
          viva. Arranca PASADO el borde del piso (el piso llega a z=2.9; a ras
          y solapado hacía z-fighting: el rectángulo verde lima ADENTRO de la
          casa). Y de noche el pasto duerme: verde-índigo, nunca lima. */}
      <mesh position={[1.1, -0.02, 5.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 5]} />
        <meshBasicMaterial
          color={
            sol.deDia
              ? mezclar(VERDES.brote, atm.niebla, 0.3)
              : mezclar(VERDES.brote, CIELO_NOCHE_CASA, 0.82)
          }
        />
      </mesh>
      {/* lo que se ve por el vano de la PUERTA: cielo, loma y el pasto del
          umbral — paisaje de verdad, no un plano dorado quemado */}
      <group position={[(PUERTA.x0 + PUERTA.x1) / 2, 0, hz + 0.03]}>
        <mesh position={[0, PUERTA.alto / 2, 0]}>
          <planeGeometry args={[PUERTA.x1 - PUERTA.x0 - 0.04, PUERTA.alto - 0.04]} />
          <meshBasicMaterial
            color={
              sol.deDia
                ? mezclar(mezclar(LUCES.rellenoFrio, atm.cielo, 0.4), NIEBLAS.dorada, 0.18)
                : mezclar(CIELO_NOCHE_CASA, LUCES.luna, 0.16)
            }
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.68, 0.012]}>
          <planeGeometry args={[PUERTA.x1 - PUERTA.x0 - 0.04, 0.3]} />
          <meshBasicMaterial
            color={
              sol.deDia
                ? mezclar(VERDES.templado, LUCES.luna, 0.3)
                : mezclar(VERDES.monte, CIELO_NOCHE_CASA, 0.7)
            }
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.27, 0.024]}>
          <planeGeometry args={[PUERTA.x1 - PUERTA.x0 - 0.04, 0.56]} />
          <meshBasicMaterial
            color={
              sol.deDia
                ? mezclar(VERDES.brote, atm.niebla, 0.3)
                : mezclar(VERDES.brote, CIELO_NOCHE_CASA, 0.82)
            }
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* y por la VENTANA DEL SUR: el mismo día con su loma (de aquí sale el
          haz — luminosa sí, quemada no) */}
      <group
        position={[
          (VENTANA_SUR.x0 + VENTANA_SUR.x1) / 2,
          0,
          hz + 0.03,
        ]}
      >
        <mesh position={[0, (VENTANA_SUR.base + VENTANA_SUR.alto) / 2, 0]}>
          <planeGeometry args={[VENTANA_SUR.x1 - VENTANA_SUR.x0 - 0.04, VENTANA_SUR.alto - VENTANA_SUR.base - 0.04]} />
          <meshBasicMaterial
            color={
              sol.deDia
                ? mezclar(mezclar(LUCES.rellenoFrio, atm.cielo, 0.48), NIEBLAS.dorada, 0.14)
                : mezclar(CIELO_NOCHE_CASA, LUCES.luna, 0.14)
            }
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, VENTANA_SUR.base + 0.16, 0.012]}>
          <planeGeometry args={[VENTANA_SUR.x1 - VENTANA_SUR.x0 - 0.04, 0.3]} />
          <meshBasicMaterial
            color={
              sol.deDia
                ? mezclar(VERDES.brote, NIEBLAS.dorada, 0.22)
                : mezclar(VERDES.monte, CIELO_NOCHE_CASA, 0.72)
            }
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* EL RECTÁNGULO DE SOL: la ventana del sur riega su vano en el piso y
          la mancha CAMINA con el día — sliver al pie del muro a mediodía,
          alfombra honda y ámbar al filo de la mañana y de la tarde. El halo
          de abajo la asienta en la tierra pisada. */}
      {sol.rect && (
        <group>
          <mesh
            position={[sol.rect.x, 0.026, sol.rect.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[sol.rect.ancho, sol.rect.largo, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={atm.luz}
              transparent
              opacity={sol.rect.op}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh
            position={[sol.rect.x, 0.02, sol.rect.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[sol.rect.ancho * 1.45, sol.rect.largo * 1.35, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              color={atm.luz}
              transparent
              opacity={sol.rect.op * 0.32}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {/* LA CORTINA DE LUZ: el haz que une el vano con su rectángulo — dos
          láminas anidadas (la de adentro más densa) + las motas de polvo
          flotando. La imagen imposible de la casa. */}
      {sol.haz && (
        <group position={sol.haz.mid} rotation={[sol.haz.rotX, 0, sol.haz.rotZ]}>
          <mesh>
            <planeGeometry args={[0.88, sol.haz.len]} />
            <meshBasicMaterial
              color={atm.luz}
              transparent
              opacity={sol.haz.op}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.48, sol.haz.len]} />
            <meshBasicMaterial
              color={atm.luz}
              transparent
              opacity={sol.haz.op * 0.85}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      <MotasDelHaz n={nMotas} haz={sol.haz} color={atm.luz} reducedMotion={reducedMotion} />

      {/* LA TEJA DE VIDRIO: la columna cenital del mediodía ecuatorial */}
      <HazDeLaTeja f={sol.cenital ?? 0} color={atm.luz} />

      {/* EL FOGÓN VIVO: candela + humo subiendo a la teja */}
      <FuegoFogon tier={tier} reducedMotion={reducedMotion} fuerza={fogonFuerza} />
      <HumoFogon n={nHumo} reducedMotion={reducedMotion} />

      {/* LOS DOS ACCESOS legibles desde adentro */}
      <VentanaMundos atm={atm} noche={!sol.deDia} reducedMotion={reducedMotion} onPortales={onPortales} />
      <RinconFermentos reducedMotion={reducedMotion} onFermentos={onFermentos} />

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      {/* EL ENCUADRE MIRA AL FOGÓN: el paso 1 se llama "El fogón" y la cámara
          tiene que abrirle el cuadro — el rincón del fuego, la cuelga y el
          humo, con la mesa de refilón. (Antes miraba la mesa vacía y el
          corazón de la cocina quedaba fuera de pantalla.) */}
      <OrbitControls
        ref={controls}
        makeDefault
        target={[-1.6, 0.95, 0.15]}
        enablePan={false}
        enableZoom
        minDistance={1.3}
        maxDistance={4.0}
        minPolarAngle={0.6}
        maxPolarAngle={1.52}
        minAzimuthAngle={-1.35}
        maxAzimuthAngle={1.35}
        enableDamping
        dampingFactor={0.08}
      />
      {/* La LLEGADA: el dolly corto de cruzar el umbral — de la puerta hacia
          el rincón del fogón, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[1.5, 1.7, 1.45]}
        mirada={[-1.6, 1.05, 0.15]}
        respiro={0.03}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoCasaAdentro"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * La casa por dentro. Montar SOLO perezosa (lazy).
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   foco?: number[]|null,
 *   onPortales?: (() => void)|null,
 *   onFermentos?: (() => void)|null,
 * }} props
 */
export default function EscenaCasaAdentro({
  tier = 'alto',
  reducedMotion = false,
  foco = null,
  onPortales = null,
  onFermentos = null,
}) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`casadentro-canvas${listo ? ' casadentro-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [1.5, 1.7, 1.45], fov: 48 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama
        tier={tier}
        reducedMotion={reducedMotion}
        foco={foco}
        onPortales={onPortales}
        onFermentos={onFermentos}
      />
    </Canvas>
  );
}
