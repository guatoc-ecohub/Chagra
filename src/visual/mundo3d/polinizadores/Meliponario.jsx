/*
 * Meliponario — LA CASA DE LA ANGELITA, Y EL OFICIO QUE LA SOSTIENE.
 *
 * Tres cajas bajo un alero, a media sombra, con su platón de agua al lado. No es
 * una postal: cada cosa está donde está por una razón que un meliponicultor
 * reconocería:
 *
 *   · MEDIA SOMBRA — bajo el sombrío, no a sol pleno (se sobrecalienta la
 *     colonia) ni en rincón húmedo y oscuro. El árbol que le da esa sombra es
 *     parte del meliponario, no decorado.
 *   · SOBRE UN BANCO — nunca en el suelo: hormigas y humedad.
 *   · EL PLATÓN DE AGUA con piedritas — en verano el rocío no alcanza y una
 *     abeja se ahoga en agua lisa. Cuesta nada y salva colonias.
 *   · LAS GUARDIANAS — el detalle que delata a quien ha visto una colonia de
 *     angelita de verdad: frente al tubo de cera se quedan unas obreras
 *     SUSPENDIDAS EN EL AIRE, quietas, mirando la entrada, y otras paradas en el
 *     borde del tubo. No pican —no tienen con qué—: solo vigilan. Quien haya
 *     estado frente a una piquera de angelita reconoce esa quietud antes que
 *     cualquier otra cosa de este mundo.
 *
 * Y hay tráfico: las angelitas del enjambre salen de aquí y vuelven cargadas a
 * descargar. La caja no es un adorno con abejas alrededor — es de donde salen.
 *
 * TIER-SAFE: las cajas son pocas (2-3) y van instanciadas; las guardianas son un
 * InstancedMesh que reutiliza EL MISMO cuerpo de la angelita del enjambre. En
 * 'bajo' queda una caja: el oficio se sigue leyendo. No hace falta tierra ni
 * plata para empezar — un rincón sombreado alcanza. Ese mensaje sobrevive al
 * recorte.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { perfilDeTier } from '../deviceTier.js';
import { PAL, POLINIZADORES, calidadDe, rng } from './polinizadoresIdentidad.js';
import { geomCajaRacional, geomBancoMeliponario, geomPlatonAgua, PIQUERA_POS } from './meliponario.geom.js';
import { geomAngelita, BICHO_BASE } from './polinizadores.geom.js';
import { sitioMeliponario } from './sembrado.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/**
 * El meliponario. Montar dentro del <Canvas>.
 * @param {Object} props
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {'dia'|'noche'} [props.momento]
 * @param {boolean} [props.abierta]  vista de corte de la primera caja: se ven los
 *   POTES DE CERUMEN y el nido de cría. Adentro no hay panales — hay potecitos, y
 *   la miel se guarda aparte de la cría. Por eso no se cosecha aplastando.
 * @param {number} [props.diezmado]  0..1 — si el veneno pasó, las guardianas
 *   escasean. La piquera de una colonia diezmada se ve sola, y eso se siente.
 */
export default function Meliponario({
  tier = 'alto',
  reducedMotion = false,
  momento = 'dia',
  abierta = false,
  diezmado = 0,
}) {
  const perfil = perfilDeTier(tier);
  const q = calidadDe(tier);
  const sitio = useMemo(() => sitioMeliponario(tier), [tier]);

  /* La caja abierta (corte) es su propia geometría: solo se construye si se
     pide, así en gama baja no se paga el interior que nadie va a ver. */
  const geoCaja = useMemo(() => geomCajaRacional({ q, abierta: false }, 21), [q]);
  const geoCajaCorte = useMemo(
    () => (abierta ? geomCajaRacional({ q, abierta: true }, 22) : null),
    [q, abierta],
  );
  const geoBanco = useMemo(
    () => geomBancoMeliponario({ q, largo: sitio.banco.largo }),
    [q, sitio.banco.largo],
  );
  const geoAgua = useMemo(() => geomPlatonAgua({ q }, 33), [q]);
  const geoGuardiana = useMemo(() => geomAngelita({ q }), [q]);

  const mat = useMemo(() => {
    const base = { vertexColors: true, flatShading: perfil.flatShading };
    return perfil.materialRico
      ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, metalness: 0 })
      : new THREE.MeshLambertMaterial(base);
  }, [perfil.materialRico, perfil.flatShading]);

  const matBicho = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  /* Las cajas visibles: la primera puede ir en corte. */
  const cajasCerradas = useMemo(
    () => (abierta ? sitio.cajas.slice(1) : sitio.cajas),
    [abierta, sitio.cajas],
  );

  /*
   * LAS GUARDIANAS. Unas suspendidas en el aire frente a la boca del tubo (esa
   * quietud tensa que hacen las angelitas), otras paradas en el borde. Cuántas
   * hay depende de qué tan viva esté la colonia: si el veneno pasó, la piquera
   * queda sola.
   */
  const guardianas = useMemo(() => {
    const r = rng(444);
    const base = tier === 'bajo' ? 3 : tier === 'medio' ? 5 : 8;
    const out = [];
    for (const caja of sitio.cajas) {
      const bocaX = caja.pos[0] + PIQUERA_POS[0];
      const bocaY = PIQUERA_POS[1];
      const bocaZ = caja.pos[2];
      for (let k = 0; k < base; k++) {
        const enElBorde = k % 3 === 0; // unas paradas, otras en vuelo
        out.push({
          // Las de vuelo se quedan clavadas a un palmo de la boca, mirándola.
          x: bocaX + (enElBorde ? 0.03 : 0.08 + r() * 0.1),
          y: bocaY + (r() - 0.5) * 0.07,
          z: bocaZ + (r() - 0.5) * 0.09,
          fase: r() * 100,
          enElBorde,
          suerte: r(),
        });
      }
    }
    return out;
  }, [sitio.cajas, tier]);

  const refGuard = useRef(null);

  useLayoutEffect(
    () => () => {
      geoCaja?.dispose();
      geoCajaCorte?.dispose();
      geoBanco?.dispose();
      geoAgua?.dispose();
      geoGuardiana?.dispose();
      mat.dispose();
      matBicho.dispose();
    },
    [geoCaja, geoCajaCorte, geoBanco, geoAgua, geoGuardiana, mat, matBicho],
  );

  useFrame((state) => {
    const g = refGuard.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const esc = BICHO_BASE * POLINIZADORES.angelita.escala;
    let n = 0;

    for (let i = 0; i < guardianas.length; i++) {
      const gd = guardianas[i];
      // De noche la colonia se recoge: solo quedan unas pocas en el borde. Las
      // abejas tienen horario — por eso fumigar de noche las alcanza menos.
      const deNoche = momento === 'noche';
      const presente = gd.suerte >= diezmado && (!deNoche || gd.enElBorde);
      if (!presente) continue;

      /* La quietud tensa: no están posadas, están SOSTENIÉNDOSE en el aire,
         corrigiendo micro-desvíos todo el tiempo. Eso es lo que se ve raro y
         bonito en una piquera de angelita. */
      const tiemble = reducedMotion ? 0 : Math.sin(t * 7 + gd.fase) * 0.006;
      const flota = reducedMotion || gd.enElBorde ? 0 : Math.sin(t * 2.1 + gd.fase) * 0.012;

      _e.set(0, Math.PI, 0); // todas miran a la boca del tubo
      _q.setFromEuler(_e);
      _v.set(gd.x + tiemble, gd.y + flota, gd.z + tiemble * 0.5);
      _s.setScalar(esc);
      _m.compose(_v, _q, _s);
      g.setMatrixAt(n, _m);
      n++;
    }
    g.count = n;
    g.instanceMatrix.needsUpdate = true;
  });

  const sombra = perfil.sombras;

  return (
    <group>
      {/* El banco: las cajas nunca van en el suelo. */}
      <mesh
        geometry={geoBanco}
        material={mat}
        position={/** @type {[number, number, number]} */ (sitio.banco.pos)}
        castShadow={sombra}
        receiveShadow={sombra}
      />

      {/* Las cajas racionales, con su piquera de cera. */}
      {cajasCerradas.map((c, i) => (
        <mesh
          key={i}
          geometry={geoCaja}
          material={mat}
          position={[c.pos[0], 0, c.pos[2]]}
          rotation={[0, c.rotY, 0]}
          castShadow={sombra}
          receiveShadow={sombra}
        />
      ))}

      {/* La caja en corte: los POTES DE CERUMEN. Adentro no hay panales. */}
      {abierta && geoCajaCorte && sitio.cajas[0] && (
        <mesh
          geometry={geoCajaCorte}
          material={mat}
          position={[sitio.cajas[0].pos[0], 0, sitio.cajas[0].pos[2]]}
          rotation={[0, sitio.cajas[0].rotY, 0]}
          castShadow={sombra}
          receiveShadow={sombra}
        />
      )}

      {/* El platón con piedritas: en verano el rocío no alcanza. */}
      <mesh geometry={geoAgua} material={mat} position={/** @type {[number, number, number]} */ (sitio.agua.pos)} receiveShadow={sombra} />

      {/* Las guardianas de la piquera. */}
      <instancedMesh
        ref={refGuard}
        args={[geoGuardiana, matBicho, guardianas.length]}
        frustumCulled={false}
        name="guardianas-piquera"
      />

      {/* EL SOMBRÍO: el árbol que le da la media sombra a las cajas. Sin él, el
          meliponario estaría mal puesto — así que es infraestructura, no paisaje. */}
      <group position={/** @type {[number, number, number]} */ (sitio.sombrio.pos)}>
        <mesh castShadow={sombra} position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.07, 0.11, 1.8, 6]} />
          <meshLambertMaterial color="#6b5236" />
        </mesh>
        <mesh castShadow={sombra} position={[0.25, 1.95, 0.1]}>
          <sphereGeometry args={[0.75, 8, 6]} />
          <meshLambertMaterial color={PAL.monte} />
        </mesh>
        <mesh castShadow={sombra} position={[-0.3, 1.75, -0.15]}>
          <sphereGeometry args={[0.55, 8, 6]} />
          <meshLambertMaterial color="#4a6b3c" />
        </mesh>
      </group>
    </group>
  );
}
