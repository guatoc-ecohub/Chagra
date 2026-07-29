/*
 * NieblaLadera — BANCOS de niebla que RUEDAN por la ladera del valle
 * (componente r3f montable). No es el fog uniforme de la escena: son nubes
 * bajas con cuerpo que derivan lentas monte abajo, se enredan entre los
 * árboles (cada banco abraza SU loma: la altura sale del terreno real) y,
 * en modo `amanecer`, jirones que SUBEN de la quebrada con la primera luz —
 * el vapor del río, como lo ve el campesino a las 5:30.
 *
 * Dos capas, un draw call cada una:
 *   1. BANCOS — un THREE.Points de halos grandes y suaves (blending normal),
 *      sembrados pegados al terreno, derivando despacio en x con ondulación
 *      menuda en y. El solape entre halos les da el cuerpo de nube.
 *   2. JIRONES (solo `modo="amanecer"`, tier alto/medio) — un Points aditivo
 *      sobre el cauce: cada jirón nace en el agua, sube ~1.6 u y se deshace
 *      (fade por vertex-color; aditivo: negro = invisible).
 *
 * CABLEO (para el host, sin tocar este archivo):
 *
 *   import { NieblaLadera } from '../../visual/mundo3d/atmosfera/clima/NieblaLadera.jsx';
 *   // dentro del <Canvas> (Valle3D: dentro de <Escena>):
 *   {clima === 'niebla' && (
 *     <NieblaLadera alturaDe={alturaTerreno} tier={tier} reducedMotion={reducedMotion} />
 *   )}
 *   {clima === 'amanecer' && (
 *     <NieblaLadera
 *       modo="amanecer" intensidad={0.55}
 *       alturaDe={alturaTerreno} tier={tier} reducedMotion={reducedMotion}
 *     />
 *   )}
 *
 *   - CONVIVE con el fog exponencial del preset (CLIMAS.niebla): el fog da el
 *     velo lejano, esta pieza pone los bancos CERCA con volumen.
 *   - `banda` acota dónde viven los bancos (default: la media ladera del
 *     valle, z -7.5..3.5 — entre el páramo y la tierra templada).
 *
 * REDUCED-MOTION: los bancos quedan QUIETOS en su siembra (presencia sin
 * movimiento); los jirones quedan a media subida con brillo fijo.
 *
 * FRUGALIDAD: 2 draw calls (1 en tier bajo o modo ladera), ≤34 sprites en
 * total, buffers mutados in-place, `alturaDe` se llama solo para el puñado
 * de bancos (≤22/frame, aritmética trivial).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  NIEBLA_TIER,
  PALETA_NIEBLA,
  CAUCE_QUEBRADA,
  puntosSobreCauce,
  azarClima,
  texturaHalo,
  clamp01,
} from './climaVivoData.js';

/* Banda default: la media ladera (referencia ESTABLE de módulo). */
const BANDA_LADERA = { x: [-9, 9], z: [-7.5, 3.5] };

/* ------------------------------------------------------------------ *
 * Bancos — halos grandes que ruedan monte abajo abrazando su loma.
 * ------------------------------------------------------------------ */
function Bancos({ n, banda, alturaDe, velocidad, intensidad, nocturno, reducedMotion, semilla }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const rng = azarClima(semilla);
    const [x0, x1] = banda.x;
    const [z0, z1] = banda.z;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    const alt = new Float32Array(n); // altura del banco sobre SU terreno
    const fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const x = x0 + rng() * (x1 - x0);
      const z = z0 + rng() * (z1 - z0);
      alt[i] = 0.45 + rng() * 1.0;
      pos[j] = x;
      pos[j + 1] = (alturaDe ? alturaDe(x, z) : 0) + alt[i];
      pos[j + 2] = z;
      vel[i] = 0.1 + rng() * 0.16;
      fase[i] = rng() * Math.PI * 2;
    }
    return { pos, vel, alt, fase };
  }, [n, banda, alturaDe, semilla]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion || !ref.current) return;
    const dt = Math.min(delta, 0.1);
    const t = clock.elapsedTime;
    const [x0, x1] = banda.x;
    const ancho = x1 - x0;
    const p = ref.current.geometry.attributes.position.array;
    const { vel, alt, fase } = datos;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      p[j] += vel[i] * velocidad * dt;
      if (p[j] > x1) p[j] -= ancho; // reentra por el borde (el fog lejano lo tapa)
      // El banco abraza su loma: terreno bajo el punto + su altura + respiración.
      const suelo = alturaDe ? alturaDe(p[j], p[j + 2]) : 0;
      p[j + 1] = suelo + alt[i] + Math.sin(t * 0.3 + fase[i]) * 0.08;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false} renderOrder={7}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texturaHalo() || undefined}
        color={nocturno ? PALETA_NIEBLA.bancoNoche : PALETA_NIEBLA.banco}
        size={5.4}
        transparent
        opacity={0.34 + 0.24 * intensidad}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Jirones del amanecer — el vapor que sube del río con la primera luz.
 * Aditivos: el fade viaja en vertex-color (negro = invisible), así el
 * ciclo nacer-subir-deshacerse no necesita opacidad por punto.
 * ------------------------------------------------------------------ */
function Jirones({ n, cauce, alturaDe, intensidad, reducedMotion, semilla }) {
  const ref = useRef(null);
  const datos = useMemo(() => {
    const rng = azarClima(semilla + 59);
    const bases = puntosSobreCauce(cauce, n, rng, 0.6);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const meta = [];
    const tinta = new THREE.Color(PALETA_NIEBLA.jiron);
    for (let i = 0; i < n; i++) {
      const [x, z] = bases[i];
      const y0 = (alturaDe ? alturaDe(x, z) : 0) + 0.4;
      meta.push({ x, z, y0, vel: 0.35 + rng() * 0.3, fase: rng(), deriva: (rng() - 0.5) * 0.5 });
      pos[i * 3] = x;
      pos[i * 3 + 1] = y0 + (reducedMotion ? 0.8 : 0);
      pos[i * 3 + 2] = z;
      const b = reducedMotion ? 0.35 : 0;
      col[i * 3] = tinta.r * b;
      col[i * 3 + 1] = tinta.g * b;
      col[i * 3 + 2] = tinta.b * b;
    }
    return { pos, col, meta, tinta };
  }, [n, cauce, alturaDe, reducedMotion, semilla]);

  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    const t = clock.elapsedTime;
    const geo = ref.current.geometry;
    const p = geo.attributes.position.array;
    const c = geo.attributes.color.array;
    const { meta, tinta } = datos;
    for (let i = 0; i < meta.length; i++) {
      const m = meta[i];
      const f = (t * m.vel * 0.22 + m.fase) % 1; // ciclo nacer→subir→deshacerse
      p[i * 3] = m.x + m.deriva * f;
      p[i * 3 + 1] = m.y0 + f * 1.6;
      p[i * 3 + 2] = m.z;
      const b = Math.sin(f * Math.PI) * (0.4 + 0.4 * intensidad); // entra y sale suave
      c[i * 3] = tinta.r * b;
      c[i * 3 + 1] = tinta.g * b;
      c[i * 3 + 2] = tinta.b * b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={ref} frustumCulled={false} renderOrder={8}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[datos.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[datos.col, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texturaHalo() || undefined}
        size={2.6}
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Bancos de niebla que ruedan por la ladera (+ vapor del río al amanecer).
 *
 * @param {object} p
 * @param {number}   [p.intensidad=1]   0..1 — velo tenue → niebla cerrada.
 * @param {'alto'|'medio'|'bajo'} [p.tier='medio']  de `decidirTier()`.
 * @param {boolean}  [p.reducedMotion=false]  bancos quietos, jirones fijos.
 * @param {(x:number,z:number)=>number} [p.alturaDe]  terreno del host: cada
 *                                      banco abraza su loma. Sin ella, y=0.
 * @param {'ladera'|'amanecer'} [p.modo='ladera']  `amanecer` suma los jirones
 *                                      que suben de la quebrada.
 * @param {{x:[number,number], z:[number,number]}} [p.banda]  dónde viven los
 *                                      bancos. Referencia ESTABLE (re-siembra).
 * @param {Array<[number,number]>} [p.cauce=CAUCE_QUEBRADA]  quebrada del host
 *                                      (nacedero de los jirones).
 * @param {number}   [p.velocidad=1]    multiplicador del rodar.
 * @param {boolean}  [p.nocturno=false] bancos azulados de luna.
 * @param {number}   [p.semilla=17]     siembra determinista.
 */
export function NieblaLadera({
  intensidad = 1,
  tier = 'medio',
  reducedMotion = false,
  alturaDe = null,
  modo = 'ladera',
  banda = BANDA_LADERA,
  cauce = CAUCE_QUEBRADA,
  velocidad = 1,
  nocturno = false,
  semilla = 17,
}) {
  const conf = NIEBLA_TIER[tier] || NIEBLA_TIER.medio;
  const inten = clamp01(intensidad);
  const claveBancos = `${conf.bancos}:${semilla}:${banda.x.join(',')}:${banda.z.join(',')}`;
  return (
    <group>
      <Bancos
        key={claveBancos}
        n={conf.bancos}
        banda={banda}
        alturaDe={alturaDe}
        velocidad={velocidad}
        intensidad={inten}
        nocturno={nocturno}
        reducedMotion={reducedMotion}
        semilla={semilla}
      />
      {modo === 'amanecer' && conf.jirones > 0 && cauce && (
        <Jirones
          n={conf.jirones}
          cauce={cauce}
          alturaDe={alturaDe}
          intensidad={inten}
          reducedMotion={reducedMotion}
          semilla={semilla}
        />
      )}
    </group>
  );
}

export default NieblaLadera;
