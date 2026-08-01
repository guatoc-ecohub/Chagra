/*
 * DetalleSueloValle — el suelo VIVO del valle (patrón AoE).
 *
 * La auditoría midió ~84% de terreno pelado: verde plano sin nada que tocar
 * con el ojo. Los juegos de estrategia lo resuelven con MILLARES de detalles
 * instanciados: pasto, matojos, florecitas, piedritas — y la tierra de labor
 * contada en SURCOS (hileras de cultivo en estados de crecimiento). Eso es
 * este componente: DOS capas, todo InstancedMesh, 6 draw calls en total.
 *
 *   CAPA 1 — detalle de suelo (3 draw calls: matojos / flores / piedras)
 *     · presupuesto por tier: 400 / 2.000 / 8.000 instancias
 *     · densidad AoE: más tupido cerca de la casa-ancla (el corazón vivido
 *       del cuadro), ralo hacia el borde; el páramo queda en pajonal ralo
 *     · despeja lo compuesto: casa, patios de los mundos, senderos de tierra
 *       pisada, casitas de vecinos y el cauce de la quebrada — el detalle
 *       NUNCA le pisa la escena a la dirección
 *     · viento suave en vertex shader (uniform de tiempo + fase/amplitud por
 *       instancia vía InstancedBufferAttribute) — cero costo de CPU por frame
 *     · tinte por instancia desde PISOS_TERMICOS: el pasto del páramo es del
 *       páramo, el de tierra caliente es de tierra caliente
 *
 *   CAPA 2 — surcos de cultivo (3 draw calls: montículo / milpa / café)
 *     · presupuesto por tier: 60 / 200 / 500 matas repartidas por lote
 *     · hileras EN CURVA DE NIVEL (a lo largo de x — la pendiente del valle
 *       corre en z, y el campesino surca al través de la pendiente)
 *     · estados por color/altura de instancia: labrado (camellones de tierra),
 *       brotando (matica tierna), maduro (la mata hecha)
 *     · lotes por defecto que respetan piso térmico y composición (aire ≥1u
 *       de los mundos); el host puede traer los suyos vía `zonas.lotes`
 *
 * Contrato (lo cabla el host — este archivo NO toca la escena):
 *   <DetalleSueloValle
 *     alturaDe={alturaTerreno}   // (x, z) => y  — el dueño del terreno la da
 *     tier="alto"                // 'bajo' | 'medio' | 'alto'
 *     reducedMotion={false}      // true = viento quieto (cero animación)
 *     nocturno={false}           // opcional: apaga los materiales hacia azul
 *     zonas={null}               // opcional: { parches?, lotes? } (ver abajo)
 *   />
 *
 *   zonas.parches: [{ x0, x1, z0, z1, peso? }] — rectángulos DONDE poblar la
 *     capa 1 (si vienen, reemplazan el falloff global; peso sesga el reparto).
 *   zonas.lotes:   [{ x0, x1, z0, z1, cultivo: 'papa'|'milpa'|'cafe',
 *     estado: 'labrado'|'brotando'|'maduro' }] — reemplazan LOTES_VALLE.
 *
 * Determinista (semilla fija): el valle es EL MISMO valle en cada visita.
 * Montar SOLO dentro de un <Canvas>.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PRESUPUESTO,
  LOTES_VALLE,
  geomMatojo,
  geomFlorMenuda,
  geomPiedrita,
  geomMonticulo,
  geomMilpa,
  geomCafeMata,
  sembrarDetalle,
  sembrarSurcos,
} from './detalleSueloValle.geom.js';

/* ── Un banco instanciado: geometría + material + items (1 draw call) ───── */
function Banco({ geo, mat, items, viento = false }) {
  const ref = useRef(/** @type {THREE.InstancedMesh|null} */ (null));
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(it.rot[0], it.rot[1], it.rot[2]);
      q.setFromEuler(e);
      s.set(it.esc[0], it.esc[1], it.esc[2]);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (viento) {
      // fase + amplitud por instancia: cada matica se mece a su propio paso.
      const av = new Float32Array(items.length * 2);
      for (let i = 0; i < items.length; i++) {
        av[i * 2] = items[i].fase;
        av[i * 2 + 1] = items[i].amp;
      }
      geo.setAttribute('aViento', new THREE.InstancedBufferAttribute(av, 2));
    }
  }, [items, geo, viento]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

/* ── El componente ───────────────────────────────────────────────────────── */
export default function DetalleSueloValle({
  alturaDe,
  tier = 'alto',
  reducedMotion = false,
  nocturno = false,
  zonas = null,
}) {
  const presupuesto = PRESUPUESTO[tier] || PRESUPUESTO.alto;

  /* El reloj del viento: UN uniform compartido (caja mutable en ref),
     actualizado por frame — solo mueve el vertex shader, la CPU no toca ni
     una matriz. */
  const uTiempoRef = useRef({ value: 0 });
  const uTiempo = uTiempoRef.current;
  useFrame((st) => {
    if (!reducedMotion) uTiempoRef.current.value = st.clock.elapsedTime;
  });

  /* Material CON viento (capa 1): Lambert barato + inyección en begin_vertex.
     El peso del vaivén es position.y² — la base queda sembrada, la punta baila. */
  const matViento = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTiempo = uTiempo;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uTiempo;\nattribute vec2 aViento;',
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position );',
            'float pesoV = clamp(position.y, 0.0, 1.0);',
            'pesoV *= pesoV;',
            'float vaiven = sin(uTiempo * 1.7 + aViento.x) * 0.72 + sin(uTiempo * 2.9 + aViento.x * 1.83) * 0.28;',
            'transformed.x += vaiven * aViento.y * pesoV;',
            'transformed.z += vaiven * aViento.y * pesoV * 0.55;',
          ].join('\n'),
        );
    };
    m.customProgramCacheKey = () => 'detalle-suelo-viento';
    return m;
  }, [uTiempo]);

  /* Material quieto (capa 2): los surcos no se mecen — la mata sembrada pesa. */
  const matQuieto = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    [],
  );

  /* La noche del cine es AZUL: el color del material multiplica el tinte de
     cada instancia — un set y las seis capas se apagan juntas. */
  useLayoutEffect(() => {
    const c = nocturno ? '#5d6f8e' : '#ffffff';
    matViento.color.set(c);
    matQuieto.color.set(c);
  }, [nocturno, matViento, matQuieto]);

  /* Geometrías unidad: una sola vez, compartidas entre tiers. */
  const geos = useMemo(
    () => ({
      matojo: geomMatojo(),
      flor: geomFlorMenuda(),
      piedra: geomPiedrita(),
      monticulo: geomMonticulo(),
      milpa: geomMilpa(),
      cafe: geomCafeMata(),
    }),
    [],
  );

  /* Las siembras: deterministas, solo se rehacen si cambia tier o zonas. */
  const detalle = useMemo(
    () => sembrarDetalle(presupuesto.detalle, alturaDe, zonas?.parches || null),
    [presupuesto.detalle, alturaDe, zonas],
  );
  const surcos = useMemo(
    () => sembrarSurcos(presupuesto.surcos, alturaDe, zonas?.lotes || LOTES_VALLE),
    [presupuesto.surcos, alturaDe, zonas],
  );

  return (
    <group name="detalle-suelo-valle">
      {/* CAPA 1 — el suelo vivo (3 draw calls, viento en shader) */}
      <Banco geo={geos.matojo} mat={matViento} items={detalle.matojo} viento />
      <Banco geo={geos.flor} mat={matViento} items={detalle.flor} viento />
      <Banco geo={geos.piedra} mat={matViento} items={detalle.piedra} viento />
      {/* CAPA 2 — los surcos de labor (3 draw calls, quietos) */}
      <Banco geo={geos.monticulo} mat={matQuieto} items={surcos.monticulo} />
      <Banco geo={geos.milpa} mat={matQuieto} items={surcos.milpa} />
      <Banco geo={geos.cafe} mat={matQuieto} items={surcos.cafe} />
    </group>
  );
}
