/*
 * MundoSemillero3D — el VIVERO / SEMILLERO en 3D: el camino de la SEMILLA a la
 * PLÁNTULA lista para el campo, contado como un time-lapse que el usuario avanza
 * CON EL DEDO. Cuatro momentos de un vivero agroecológico de verdad:
 *
 *   1. Siembra        — bandeja/almácigo con SUSTRATO VIVO (compost + lombri-
 *                       compost, no químicos); la semilla apenas cubierta, riego
 *                       en llovizna, bajo media sombra.
 *   2. Germinación    — bajo tierra sale la RADÍCULA (busca agua hacia abajo) y
 *                       arriba asoman los COTILEDONES (las hojas de reserva).
 *   3. Repique        — con las primeras hojas verdaderas, se pasa la plántula
 *                       con su pan de tierra a una BOLSA con más sustrato.
 *   4. Endurecimiento — menos sombra, más sol, riego espaciado: la plántula se
 *                       fortalece antes de ir a campo. Un lote queda listo.
 *
 * La lección NO es un juego: es que un vivero es PACIENCIA, OBSERVACIÓN y suelo
 * vivo. El tiempo es una escala continua `t` en [0..3]; deslizarla hace germinar
 * y crecer la plántula de verdad (la radícula baja, los cotiledones abren, salen
 * las hojas verdaderas, la sombra se retira y entra el sol dorado).
 *
 * REÚSA EL FRAMEWORK, no lo edita:
 *   - `atmosferaMadre` (ATMOSFERA/PALETA) → la MISMA hora dorada y los mismos
 *     materiales low-poly de todos los mundos: entrar aquí se siente como
 *     acercarse dentro del mismo atardecer.
 *   - `ParticulasAmbientales` → el aire (polen dorado, motas en el haz, y unas
 *     mariposas al endurecer, ya al sol pleno).
 *   - `decidirTier` → device-tiering del framework (self-detect si no llega por
 *     props). Eco del espíritu de `MicrofaunaSuelo`: unas hebras de micorriza y
 *     una lombriz asoman en el corte del sustrato para recordar que está VIVO.
 *
 * ARCHIVO ÚNICO Y AUTOCONTENIDO (trae su propio <Canvas>). Opus lo cablea a una
 * ruta; este componente NO importa desde App.jsx ni toca otros archivos.
 *
 * Perf (contrato del framework, DR §6): SOLO `meshLambert`/`meshBasic`, sin
 * sombras, sin post-proceso, `dpr=[1,1.5]`, `AdaptiveDpr`, geometría 100%
 * procedural (cero GLTF/HDR/fuentes remotas), `frameloop='demand'` con
 * reduced-motion. Los controles del tiempo son DOM táctil fuera del Canvas.
 */
import {
  Suspense, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

import { ATMOSFERA, PALETA } from '../visual/mundo3d/atmosferaMadre.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import './MundoSemillero3D.css';

/* ── utilidades puras ─────────────────────────────────────────────────────── */

const clamp01 = (n) => Math.max(0, Math.min(1, n));
/** rampa suave 0→1 entre `a` y `b` (smoothstep). */
const rampa = (x, a, b) => {
  if (b === a) return x < a ? 0 : 1;
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/* PRNG determinista: el mismo vivero siempre, sin azar por frame. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── los cuatro momentos legibles del semillero ───────────────────────────── */

const ETAPAS = [
  {
    id: 'siembra', nombre: 'Siembra', emoji: '🌰',
    texto:
      'Llene la bandeja con sustrato VIVO —compost y lombricompost, no químicos— y '
      + 'coloque la semilla a poca profundidad. Riegue en llovizna y mantenga la '
      + 'humedad pareja. Bajo media sombra empieza todo; la primera labor es esperar.',
  },
  {
    id: 'germinacion', nombre: 'Germinación', emoji: '🌱',
    texto:
      'Bajo tierra la semilla saca primero la RADÍCULA, que busca agua hacia abajo. '
      + 'Luego asoman los COTILEDONES, las hojas de reserva. Observe cada mañana: la '
      + 'humedad, el color, hacia dónde se inclina el brote. No lo apure.',
  },
  {
    id: 'repique', nombre: 'Repique', emoji: '🪴',
    texto:
      'Cuando salen las primeras hojas verdaderas se hace el REPIQUE: pase la '
      + 'plántula con su pan de tierra a una bolsa con más sustrato. Tómela por las '
      + 'hojas, nunca por el tallo, y cuide de no romper la raíz.',
  },
  {
    id: 'endurecimiento', nombre: 'Endurecimiento', emoji: '☀️',
    texto:
      'Antes de ir a campo la plántula se ENDURECE: menos sombra, más sol y riego '
      + 'más espaciado, para que aguante el trasplante. Cuando el tallo está firme y '
      + 'la raíz llena la bolsa, el lote está listo para sembrar en tierra.',
  },
];

/* Días aproximados de vivero en los que se alcanza cada momento (cifras redondas
   y honestas, no exactas; varían por especie y clima). */
const DIAS = [0, 6, 22, 40];

/* Cada especie es solo un ACENTO de color (misma morfología de dicotiledónea:
   cotiledones + hojas verdaderas). Sin monocotiledóneas para no complicar. */
const ESPECIES = {
  tomate: { nombre: 'Tomate', emoji: '🍅', cotiledon: '#9ec46a', hoja: '#4f8f3f' },
  pimenton: { nombre: 'Pimentón', emoji: '🫑', cotiledon: '#a6c86f', hoja: '#4a8a3c' },
  lechuga: { nombre: 'Lechuga', emoji: '🥬', cotiledon: '#bcd471', hoja: '#7bbf4e' },
  generico: { nombre: 'La plántula', emoji: '🌱', cotiledon: '#9ec46a', hoja: '#4f8f3f' },
};
const ORDEN_ESPECIES = ['tomate', 'pimenton', 'lechuga', 'generico'];

/* Cuánta geometría/partículas por tier (gama baja = más sobria, DR §4.4/§6). */
const PRESUPUESTO = {
  alto: { hojas: 4, celdasBandeja: 12, bolsasLote: 5, vivo: true, polen: 1 },
  medio: { hojas: 3, celdasBandeja: 9, bolsasLote: 3, vivo: true, polen: 0.7 },
  bajo: { hojas: 2, celdasBandeja: 6, bolsasLote: 0, vivo: false, polen: 0 },
};
const presupuestoDe = (tier) => PRESUPUESTO[tier === '2d' ? 'bajo' : tier] || PRESUPUESTO.alto;

/* La superficie del sustrato (donde se apoya la plántula) es fija: así el repique
   —cambiar de bandeja a bolsa— no hace saltar la plántula de altura. */
const SUP = 0.55;

/**
 * El estado del semillero en función del tiempo continuo `t` (0..3). Todo lo
 * visible se deriva de aquí: así el dedo del usuario "es" el paso del tiempo.
 */
function crecimiento(t) {
  return {
    // la semilla visible se desvanece al germinar
    semilla: 1 - rampa(t, 0.4, 1.05),
    // la radícula baja al buscar agua
    radicula: rampa(t, 0.6, 1.5),
    // el hipocótilo (tallito) endereza el gancho y sube
    hipocotilo: rampa(t, 0.85, 1.6),
    // los cotiledones abren
    cotiledon: rampa(t, 0.95, 1.7),
    // salen las hojas verdaderas
    hojas: rampa(t, 1.7, 2.6),
    // el repique: 0 = en bandeja, 1 = ya en bolsa (cruce corto en t≈2)
    enBolsa: rampa(t, 1.8, 2.15),
    // se endurece y aparece el lote listo
    endurecido: rampa(t, 2.4, 3.0),
    // la sombra se retira y entra el sol pleno
    sol: rampa(t, 2.1, 2.95),
    // el porte general de la plántula
    porte: rampa(t, 0.9, 2.8),
  };
}

/* ── piezas del diorama ───────────────────────────────────────────────────── */

/* El piso cálido del vivero (tierra apisonada). */
function Piso() {
  return (
    <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[9, 40]} />
      <meshLambertMaterial color={PALETA.tierraClara} flatShading />
    </mesh>
  );
}

/* El banco de vivero: mesón de madera + patas. El sitio de trabajo. */
function BancoVivero() {
  return (
    <group>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[4.2, 0.14, 2.1]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {/* listón frontal */}
      <mesh position={[0, -0.2, 1.02]}>
        <boxGeometry args={[4.2, 0.14, 0.08]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      {[[-1.9, -0.98], [1.9, -0.98], [-1.9, 0.9], [1.9, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.82, z]}>
          <boxGeometry args={[0.14, 1.4, 0.14]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La bandeja de germinación (almácigo): base baja + rejilla de celdas con su
   semillita. Protagonista en la siembra; se atenúa un poco tras el repique. */
function BandejaGerminacion({ celdas, desvanece }) {
  const puestos = useMemo(() => {
    const cols = Math.min(4, celdas);
    const filas = Math.max(1, Math.round(celdas / cols));
    const lista = [];
    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < cols; c++) {
        lista.push({
          key: `${f}-${c}`,
          x: (c - (cols - 1) / 2) * 0.24,
          z: (f - (filas - 1) / 2) * 0.24,
        });
      }
    }
    return lista;
  }, [celdas]);
  const op = clamp01(1 - desvanece * 0.75);
  return (
    <group position={[-1.35, 0.02, -0.15]} rotation={[0, 0.2, 0]}>
      {/* base de la bandeja (plástico de vivero, verde oscuro) */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.15, 0.12, 0.72]} />
        <meshLambertMaterial color="#33402a" flatShading transparent opacity={op} />
      </mesh>
      {puestos.map((p) => (
        <group key={p.key} position={[p.x, 0.12, p.z]}>
          {/* sustrato de la celda */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.085, 0.06, 0.1, 8]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading transparent opacity={op} />
          </mesh>
          {/* la semillita sembrada */}
          <mesh position={[0, 0.09, 0]}>
            <icosahedronGeometry args={[0.028, 0]} />
            <meshLambertMaterial color={PALETA.madera} flatShading transparent opacity={op} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Unas hebras de micorriza + una lombriz asoman en el corte del sustrato: el eco
   de MicrofaunaSuelo que recuerda que el sustrato está VIVO (no es tierra
   muerta). Sutil, pequeño, sobre la cara cortada del bloque. */
function SustratoVivo({ visible, reducedMotion }) {
  const lombriz = useRef(null);
  const nodos = useMemo(() => {
    const r = rng(23);
    return Array.from({ length: 5 }, () => ({
      x: (r() - 0.5) * 0.42,
      y: 0.12 + r() * 0.34,
      z: 0.01 + r() * 0.02,
      s: 0.012 + r() * 0.014,
    }));
  }, []);
  useFrame((state) => {
    if (reducedMotion || !lombriz.current) return;
    const t = state.clock.elapsedTime;
    lombriz.current.rotation.z = Math.sin(t * 1.4) * 0.12;
  });
  if (visible <= 0.02) return null;
  return (
    <group>
      {/* hebras de hifas doradas (micorrizas) */}
      {nodos.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, n.z]}>
          <icosahedronGeometry args={[n.s, 0]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0.75 * visible} />
        </mesh>
      ))}
      {/* la lombriz (rubber-hose: cuerpo redondo, curvo) */}
      <group ref={lombriz} position={[0.12, 0.16, 0.02]} rotation={[0, 0, -0.5]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[i * 0.05, Math.sin(i * 0.9) * 0.03, 0]}>
            <sphereGeometry args={[0.032 - i * 0.004, 7, 6]} />
            <meshLambertMaterial color="#e39a86" flatShading transparent opacity={visible} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* El bloque de sustrato del recipiente hero, cortado por delante (cara en z=0)
   para ver la raíz. Comparte anclaje entre bandeja y bolsa: en el repique solo
   cambia el RECIPIENTE alrededor, no el sustrato ni la plántula. */
function BloqueSustrato({ enBolsa, vivo, reducedMotion }) {
  const alto = 0.5 + enBolsa * 0.18;
  return (
    <group>
      <mesh position={[0, SUP - alto / 2, -0.25]}>
        <boxGeometry args={[0.6, alto, 0.5]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      {/* la cara cortada, un pelín más clara (tierra removida al sol) */}
      <mesh position={[0, SUP - alto / 2, 0.001]}>
        <planeGeometry args={[0.6, alto]} />
        <meshLambertMaterial color="#5a3f28" flatShading />
      </mesh>
      {vivo && <SustratoVivo visible={1} reducedMotion={reducedMotion} />}
    </group>
  );
}

/* El recipiente BANDEJA-CELDA (paredes finas, plástico de vivero): tres caras +
   fondo, frente abierto para ver el corte. Se atenúa al pasar a bolsa. */
function VesijaBandeja({ opacidad }) {
  if (opacidad <= 0.02) return null;
  const c = '#33402a';
  const m = (
    <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
  );
  return (
    <group>
      <mesh position={[0, SUP - 0.25, -0.5]}>
        <boxGeometry args={[0.64, 0.52, 0.03]} />
        {m}
      </mesh>
      {[-0.31, 0.31].map((x, i) => (
        <mesh key={i} position={[x, SUP - 0.25, -0.25]}>
          <boxGeometry args={[0.03, 0.52, 0.5]} />
          <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
        </mesh>
      ))}
      {/* labio frontal bajito (para no tapar el corte) */}
      <mesh position={[0, SUP + 0.01, 0]}>
        <boxGeometry args={[0.64, 0.03, 0.03]} />
        <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
      </mesh>
    </group>
  );
}

/* El recipiente BOLSA de vivero (poly negra, más alta): tres caras + fondo +
   labio enrollado; frente abierto para seguir viendo el corte. Aparece al
   repicar. */
function VesijaBolsa({ opacidad, enBolsa }) {
  if (opacidad <= 0.02) return null;
  const c = '#2a2824';
  const alto = 0.5 + enBolsa * 0.18;
  return (
    <group>
      <mesh position={[0, SUP - alto / 2, -0.52]}>
        <boxGeometry args={[0.7, alto + 0.02, 0.03]} />
        <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
      </mesh>
      {[-0.34, 0.34].map((x, i) => (
        <mesh key={i} position={[x, SUP - alto / 2, -0.26]}>
          <boxGeometry args={[0.03, alto + 0.02, 0.54]} />
          <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
        </mesh>
      ))}
      {/* fondo */}
      <mesh position={[0, SUP - alto, -0.26]}>
        <boxGeometry args={[0.7, 0.04, 0.54]} />
        <meshLambertMaterial color={c} flatShading transparent opacity={opacidad} />
      </mesh>
      {/* labio enrollado */}
      <mesh position={[0, SUP + 0.02, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.03, 6, 14, Math.PI]} />
        <meshLambertMaterial color="#3a372f" flatShading transparent opacity={opacidad} />
      </mesh>
    </group>
  );
}

/* La raíz: pivote principal que baja por delante del corte + un par de raicillas
   laterales. Crece con `k`; en la bolsa gana algo más de largo (más sustrato). */
function Raiz({ k, enBolsa }) {
  const largo = Math.max(0.001, k * (0.3 + enBolsa * 0.16));
  const laterales = useMemo(() => {
    const r = rng(11);
    return [0.35, 0.62, 0.82].map((f) => ({
      f, lado: r() > 0.5 ? 1 : -1, l: 0.06 + r() * 0.07,
    }));
  }, []);
  return (
    <group position={[0, SUP, 0.02]}>
      {/* pivote */}
      <mesh position={[0, -largo / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.02, largo, 6]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      {laterales.map((lat, i) => {
        const y = -largo * lat.f;
        const ll = Math.max(0.001, lat.l * k);
        return (
          <mesh
            key={i}
            position={[lat.lado * ll * 0.5, y, 0]}
            rotation={[0, 0, lat.lado * 0.9]}
          >
            <cylinderGeometry args={[0.004, 0.008, ll, 5]} />
            <meshLambertMaterial color="#c7ad78" flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/* Los cotiledones: dos hojas de reserva, redondeadas, que abren desde el gancho.
   Rubber-hose suave (cuerpos redondos). */
function Cotiledones({ k, color }) {
  const s = Math.max(0.0001, k);
  const abre = 0.28 + k * 0.85;
  return (
    <group>
      {[1, -1].map((lado) => (
        <group key={lado} rotation={[0, 0, lado * abre]}>
          <mesh position={[lado * 0.12 * s, 0.02, 0]} scale={[s * 0.16, s * 0.05, s * 0.11]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Una hoja verdadera: un rombo low-poly (octaedro aplanado), como en CicloMata. */
function Hoja({ base, angulo, k, color }) {
  const escala = Math.max(0.0001, k);
  return (
    <group position={[0, base, 0]} rotation={[0, angulo, 0]}>
      <group rotation={[0, 0, -0.85]} position={[0.1 * escala, 0, 0]}>
        <mesh scale={[escala * 0.5, escala * 0.28, escala * 0.09]} position={[0.16, 0, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* La plántula entera: semilla → radícula → hipocótilo + cotiledones → hojas
   verdaderas. Respira con el viento si hay movimiento. */
function Plantula({ g, especie, presupuesto, reducedMotion }) {
  const sway = useRef(null);
  const alturaTallo = 0.06 + g.hipocotilo * (0.34 + g.porte * 0.22);

  // vaivén suave (apagado con reduced-motion); crece con la plántula
  useFrame((state) => {
    if (reducedMotion || !sway.current) return;
    const t = state.clock.elapsedTime;
    sway.current.rotation.z = Math.sin(t * 1.1) * 0.035 * g.hipocotilo;
  });

  const hojas = useMemo(() => {
    const r = rng(7);
    const n = presupuesto.hojas;
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      frac: 0.55 + (i / Math.max(1, n)) * 0.4,
      angulo: i * 2.399 + r() * 0.4,
      demora: i / n,
    }));
  }, [presupuesto]);

  const gancho = (1 - g.hipocotilo) * 0.7; // el hipocótilo asoma en gancho y endereza

  return (
    <group>
      {/* la semilla, visible antes de brotar */}
      {g.semilla > 0.02 && (
        <mesh position={[0, SUP + 0.03, 0.02]}>
          <icosahedronGeometry args={[0.05, 0]} />
          <meshLambertMaterial color={PALETA.madera} flatShading transparent opacity={g.semilla} />
        </mesh>
      )}

      <Raiz k={g.radicula} enBolsa={g.enBolsa} />

      <group ref={sway} position={[0, SUP, 0]}>
        {/* hipocótilo (tallito) con su gancho que endereza */}
        {g.hipocotilo > 0.01 && (
          <group rotation={[0, 0, gancho]}>
            <mesh position={[0, alturaTallo / 2, 0]}>
              <cylinderGeometry args={[0.018, 0.03, alturaTallo, 7]} />
              <meshLambertMaterial color="#6f9a4b" flatShading />
            </mesh>
            <group position={[0, alturaTallo, 0]}>
              {g.cotiledon > 0.02 && (
                <Cotiledones k={g.cotiledon} color={especie.cotiledon} />
              )}
              {/* las hojas verdaderas, por encima de los cotiledones */}
              {hojas.map((h) => {
                const k = clamp01((g.hojas - h.demora * 0.5) / 0.5);
                if (k <= 0.02) return null;
                return (
                  <Hoja
                    key={h.key}
                    base={0.04 + (h.frac - 0.55) * 0.5}
                    angulo={h.angulo}
                    k={k}
                    color={especie.hoja}
                  />
                );
              })}
            </group>
          </group>
        )}
      </group>
    </group>
  );
}

/* Una bolsa del LOTE endurecido (fondo): plántula firme lista para campo. Solo
   aparece al endurecer; escala/opacidad con `endurecido`. */
function BolsaLote({ x, z, escala, color }) {
  const s = Math.max(0.0001, escala);
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      {/* bolsa */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.44, 10]} />
        <meshLambertMaterial color="#2a2824" flatShading />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 10]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>
      {/* plantita firme */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.014, 0.02, 0.28, 6]} />
        <meshLambertMaterial color="#5f8a3f" flatShading />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = i * 2.1;
        return (
          <group key={i} position={[0, 0.7 + i * 0.05, 0]} rotation={[0, a, 0]}>
            <mesh position={[0.09, 0, 0]} rotation={[0, 0, -0.7]} scale={[0.22, 0.12, 0.05]}>
              <octahedronGeometry args={[0.4, 0]} />
              <meshLambertMaterial color={color} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* El cajón de madera que recibe el lote listo para llevar a campo. */
function CajonCampo({ visible }) {
  if (visible <= 0.02) return null;
  return (
    <group position={[1.55, 0.16, 0.45]} rotation={[0, -0.3, 0]} scale={[visible, visible, visible]}>
      <mesh>
        <boxGeometry args={[0.7, 0.3, 0.5]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0.255]}>
        <boxGeometry args={[0.72, 0.26, 0.02]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* La media sombra (malla de vivero sobre postes): protege del sol pleno cuando
   las plántulas son tiernas; se retira al endurecer y entra el sol dorado. */
function MediaSombra({ sol }) {
  const cobertura = 1 - sol;
  return (
    <group>
      {/* postes del marco (siempre; la estructura del vivero) */}
      {[[-2.0, -1.0], [2.0, -1.0], [-2.0, 1.0], [2.0, 1.0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.3, z]}>
          <boxGeometry args={[0.07, 2.8, 0.07]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      ))}
      {/* la malla, que se desliza hacia atrás y se desvanece al entrar el sol */}
      {cobertura > 0.02 && (
        <mesh
          position={[0, 2.62, -0.2 + sol * 2.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[4.2, 2.2, 6, 4]} />
          <meshBasicMaterial
            color="#4d5d38"
            transparent
            opacity={0.5 * cobertura}
            side={THREE.DoubleSide}
            wireframe={false}
          />
        </mesh>
      )}
    </group>
  );
}

/* El sol dorado que crece al endurecer: un disco cálido alto + la direccional
   principal cuya intensidad sube con `sol`. */
function SolVivero({ sol }) {
  return (
    <group>
      <directionalLight
        position={[3.2, 4.2, 2.0]}
        intensity={0.25 + sol * 1.05}
        color={ATMOSFERA.luz}
      />
      <mesh position={[3.4, 3.7, -2.4]}>
        <sphereGeometry args={[0.55, 16, 12]} />
        <meshBasicMaterial color="#ffe6a8" transparent opacity={0.35 + sol * 0.5} />
      </mesh>
    </group>
  );
}

/* La regadera del vivero: prop cálido y humilde sobre el banco. */
function Regadera() {
  return (
    <group position={[1.5, 0.12, -0.3]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.28, 12]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      {/* pico */}
      <mesh position={[0.24, 0.2, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.02, 0.03, 0.32, 8]} />
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      {/* asa */}
      <mesh position={[-0.02, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.02, 6, 12, Math.PI]} />
        <meshLambertMaterial color="#7a7468" flatShading />
      </mesh>
    </group>
  );
}

/* La escena completa: banco, bandeja, recipiente hero + plántula, lote, sombra,
   sol y el aire de partículas. */
function Escena({ g, especie, presupuesto, tier, reducedMotion }) {
  const lote = useMemo(() => {
    const n = presupuesto.bolsasLote;
    return Array.from({ length: n }, (_, i) => ({
      key: i,
      x: -0.9 + (i / Math.max(1, n - 1)) * 1.8,
      z: -0.7 - (i % 2) * 0.18,
      demora: (i / Math.max(1, n)) * 0.5,
    }));
  }, [presupuesto]);

  return (
    <group position={[0, -0.35, 0]}>
      <Piso />
      <MediaSombra sol={g.sol} />
      <SolVivero sol={g.sol} />
      <BancoVivero />
      <Regadera />

      <BandejaGerminacion celdas={presupuesto.celdasBandeja} desvanece={g.enBolsa} />

      {/* el recipiente hero + su plántula, al frente del banco */}
      <group position={[0.15, 0, 0.35]}>
        <BloqueSustrato enBolsa={g.enBolsa} vivo={presupuesto.vivo} reducedMotion={reducedMotion} />
        <VesijaBandeja opacidad={clamp01(1 - g.enBolsa)} />
        <VesijaBolsa opacidad={clamp01(g.enBolsa)} enBolsa={g.enBolsa} />
        <Plantula g={g} especie={especie} presupuesto={presupuesto} reducedMotion={reducedMotion} />
      </group>

      {/* el lote endurecido, listo para campo */}
      {lote.map((b) => {
        const k = clamp01((g.endurecido - b.demora) / 0.5);
        if (k <= 0.02) return null;
        return (
          <BolsaLote key={b.key} x={-1.3 + b.x} z={0.55 + b.z} escala={k} color={especie.hoja} />
        );
      })}
      <CajonCampo visible={g.endurecido} />

      {/* el aire de la hora dorada (polen siempre; motas en el haz; mariposas al
          sol pleno, ya listas para el campo) */}
      {presupuesto.polen > 0 && (
        <ParticulasAmbientales
          tipo="polen"
          densidad={presupuesto.polen}
          tier={tier}
          reducedMotion={reducedMotion}
          area={AIRE_POLEN}
          position={[0, 0.2, 0]}
          semilla={5}
        />
      )}
      {presupuesto.vivo && (
        <ParticulasAmbientales
          tipo="polvo"
          tier={tier}
          reducedMotion={reducedMotion}
          position={[2.4, 0.3, 0.4]}
          semilla={9}
        />
      )}
      {tier === 'alto' && !reducedMotion && g.sol > 0.35 && (
        <ParticulasAmbientales
          tipo="mariposas"
          densidad={0.7}
          tier={tier}
          reducedMotion={reducedMotion}
          area={AIRE_MARIPOSAS}
          position={[0, 0.4, 0]}
          semilla={3}
        />
      )}
    </group>
  );
}

/* Cajas de aire ESTABLES (constantes de módulo): la nube se re-siembra si cambia
   la referencia, así que nunca deben crearse por render. */
const AIRE_POLEN = /** @type {[number, number, number]} */ ([4.4, 2.6, 3.0]);
const AIRE_MARIPOSAS = /** @type {[number, number, number]} */ ([4.6, 1.4, 3.2]);

/* Fuerza un repintado cuando cambia `t` en `frameloop='demand'` (reduced-motion):
   sin bucle continuo, hay que invalidar a mano al deslizar. */
function Invalidador({ t }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [t, invalidate]);
  return null;
}

/* ── el componente público ────────────────────────────────────────────────── */

const idxEtapaInicial = (etapaInicial) => {
  if (typeof etapaInicial === 'number') return Math.max(0, Math.min(3, Math.round(etapaInicial)));
  const i = ETAPAS.findIndex((e) => e.id === etapaInicial);
  return i >= 0 ? i : 0;
};

/**
 * Mundo del semillero/vivero 3D. Autocontenido: trae su propio <Canvas> y sus
 * controles táctiles. `tier`/`reducedMotion` llegan por props (los cablea el
 * host) o se auto-detectan con `decidirTier()` para funcionar suelto.
 *
 * @param {object} p
 * @param {'tomate'|'pimenton'|'lechuga'|'generico'} [p.especie='tomate']
 * @param {number|string} [p.etapaInicial=0]  índice 0..3 o id de etapa.
 * @param {'alto'|'medio'|'bajo'|'2d'} [p.tier]  device-tier (auto si falta).
 * @param {boolean} [p.reducedMotion]  calma a11y (auto si falta).
 * @param {boolean} [p.autoplay=false]  arrancar reproduciendo (ignora si calma).
 * @param {(indice:number, etapa:object)=>void} [p.onEtapa]  al cambiar de momento.
 * @param {string} [p.className]  clase extra del contenedor.
 */
export default function MundoSemillero3D({
  especie = 'tomate',
  etapaInicial = 0,
  tier: tierProp,
  reducedMotion: reducedMotionProp,
  autoplay = false,
  onEtapa,
  className = '',
}) {
  // auto-detección del framework si no llega por props (una sola vez)
  const [auto] = useState(() => decidirTier());
  const tier = tierProp || auto.tier;
  const reducedMotion = reducedMotionProp ?? auto.reducedMotion;

  const [especieId, setEspecieId] = useState(
    ESPECIES[especie] ? especie : 'tomate',
  );
  const sp = ESPECIES[especieId] || ESPECIES.tomate;
  const presupuesto = presupuestoDe(tier);

  const [t, setT] = useState(() => idxEtapaInicial(etapaInicial));
  const [reproduciendo, setReproduciendo] = useState(autoplay && !reducedMotion);
  const idxEtapa = Math.min(3, Math.round(t));
  const etapa = ETAPAS[idxEtapa];

  const g = crecimiento(t);

  // avisar al cablear cuando cambia el momento legible
  const etapaPrev = useRef(idxEtapa);
  useEffect(() => {
    if (etapaPrev.current !== idxEtapa) {
      etapaPrev.current = idxEtapa;
      onEtapa?.(idxEtapa, ETAPAS[idxEtapa]);
    }
  }, [idxEtapa, onEtapa]);

  // reproducción automática del time-lapse (nunca con reduced-motion)
  useEffect(() => {
    if (!reproduciendo || reducedMotion) return undefined;
    let raf;
    let ultimo = performance.now();
    const DUR = 20; // segundos para recorrer el vivero entero (paciencia)
    const paso = (ahora) => {
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      setT((prev) => {
        const sig = prev + (dt * 3) / DUR;
        if (sig >= 3) { setReproduciendo(false); return 3; }
        return sig;
      });
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [reproduciendo, reducedMotion]);

  const irAEtapa = useCallback((i) => {
    setReproduciendo(false);
    setT(i);
  }, []);

  const alReproducir = useCallback(() => {
    setReproduciendo((r) => {
      if (r) return false;
      setT((prev) => (prev >= 2.98 ? 0 : prev));
      return true;
    });
  }, []);

  const alDeslizar = useCallback((e) => {
    setReproduciendo(false);
    setT(parseFloat(e.target.value));
  }, []);

  const cambiarEspecie = useCallback((id) => setEspecieId(id), []);

  return (
    <div className={`semillero${reducedMotion ? ' semillero--calma' : ''} ${className}`.trim()}>
      <Canvas
        className="semillero__lienzo"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [2.5, 1.9, 3.4], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <color attach="background" args={[ATMOSFERA.fondo]} />
        <fog attach="fog" args={[ATMOSFERA.niebla, 7, 18]} />
        <hemisphereLight intensity={1} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
        <ambientLight intensity={0.45} color={ATMOSFERA.cielo} />
        <Suspense fallback={null}>
          <Escena
            g={g}
            especie={sp}
            presupuesto={presupuesto}
            tier={tier}
            reducedMotion={reducedMotion}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={2.8}
          maxDistance={8}
          minPolarAngle={0.3}
          maxPolarAngle={1.45}
          enableDamping={!reducedMotion}
          dampingFactor={0.09}
          target={[0, 0.35, 0]}
        />
        <AdaptiveDpr pixelated />
        {reducedMotion && <Invalidador t={t} />}
      </Canvas>

      {/* ── los controles del tiempo (DOM táctil, fuera del Canvas) ── */}
      <div className="semillero-panel">
        <header className="semillero-panel__cab">
          <span className="semillero-panel__titulo">Semillero · Vivero</span>
          <span className="semillero-panel__dia">día ~{DIAS[idxEtapa]}</span>
        </header>

        <p className="semillero-panel__nota">
          <span aria-hidden="true">🪱</span> Vivero agroecológico: sustrato vivo, sin químicos.
        </p>

        <div className="semillero-etapa">
          <h3 className="semillero-etapa__titulo">
            <span aria-hidden="true">{etapa.emoji}</span> {etapa.nombre}
          </h3>
          <p className="semillero-etapa__texto">{etapa.texto}</p>
        </div>

        {/* selector de especie (solo cambia el acento de color) */}
        <div className="semillero-especies" role="group" aria-label="Especie del semillero">
          {ORDEN_ESPECIES.map((id) => (
            <button
              key={id}
              type="button"
              className={`semillero-chip semillero-chip--sp${id === especieId ? ' semillero-chip--activa' : ''}`}
              onClick={() => cambiarEspecie(id)}
              aria-pressed={id === especieId}
              title={ESPECIES[id].nombre}
            >
              <span aria-hidden="true">{ESPECIES[id].emoji}</span>
              <span className="semillero-chip__txt">{ESPECIES[id].nombre}</span>
            </button>
          ))}
        </div>

        {/* la barra del tiempo: deslícela con el dedo para ver pasar los días */}
        <label className="semillero-tiempo">
          <span className="semillero-tiempo__ayuda">
            {reducedMotion
              ? 'Toque cada momento o deslice para avanzar el tiempo.'
              : 'Deslice para ver pasar los días, o reproduzca el vivero completo.'}
          </span>
          <input
            className="semillero-tiempo__barra"
            type="range"
            min={0}
            max={3}
            step={0.01}
            value={t}
            onChange={alDeslizar}
            aria-label="Línea de tiempo del semillero"
            aria-valuetext={`${etapa.nombre}, día aproximado ${DIAS[idxEtapa]}`}
          />
        </label>

        <div className="semillero-fichas" role="group" aria-label="Momentos del semillero">
          {!reducedMotion && (
            <button
              type="button"
              className="semillero-chip semillero-chip--play"
              onClick={alReproducir}
              aria-pressed={reproduciendo}
            >
              {reproduciendo ? '⏸ Pausar' : '▶ Reproducir'}
            </button>
          )}
          {ETAPAS.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className={`semillero-chip${i === idxEtapa ? ' semillero-chip--activa' : ''}`}
              onClick={() => irAEtapa(i)}
              aria-current={i === idxEtapa ? 'step' : undefined}
              title={e.nombre}
            >
              <span className="semillero-chip__emoji" aria-hidden="true">{e.emoji}</span>
              <span className="semillero-chip__txt">{e.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
