/*
 * EtiquetasMundo — grupo de chips de etiqueta 3D→pantalla que NUNCA se pisan
 * entre sí (arreglo directo del BUG de `#/mockups/mundo3d-sanidad`: ahí cada
 * estación educativa montaba 2-4 `<Html>` sueltas, cada una su propia
 * etiqueta sin saber de las demás — en cuanto la cámara se aleja, las que
 * quedan cerca en el mundo se amontonan y quedan ilegibles).
 *
 * Este componente reemplaza ESE patrón: recibe TODAS las etiquetas de un
 * grupo a la vez (una estación, un diorama, cualquier racimo de puntos de
 * interés) y las resuelve JUNTAS cada cuadro contra la pantalla (proyección +
 * caja de colisión), con la misma técnica que ya usa `RotulosLugares` en el
 * valle 3D de producción (`mockups/valle/Valle3D.jsx`) — aquí, GENÉRICA y sin
 * las nociones propias del valle (zoom semántico, "la cosa del día"). El
 * álgebra pura vive en `etiquetasAntiColision.js` (mismo directorio).
 *
 * Uso:
 *   <EtiquetasMundo
 *     items={[
 *       { id: 'hoja-sana', pos: [-0.68, 2.72, 0.2], titulo: 'Hoja sana' },
 *       { id: 'hoja-enferma', pos: [0.72, 2.72, 0.2], titulo: 'Hoja enferma' },
 *     ]}
 *     focoId={idOpcional}      // cuál se prioriza si no caben todas
 *     className="mi-chip"      // opcional: estilo propio del consumidor
 *   />
 *
 * `pos` es LOCAL: como cualquier `<group>` de r3f, hereda la transformación
 * del padre — se puede anidar dentro de una estación ya rotada/desplazada sin
 * recalcular nada (el mundo real de cada ancla se lee con
 * `getWorldPosition()` para la proyección, así que la anti-colisión es
 * correcta aunque el padre esté rotado).
 *
 * Modos por chip (mismo contrato visual del valle, ver etiquetasMundo.css):
 *   'pleno'  → nombre completo (cupo sin pisar a nadie);
 *   'punto'  → chip mínimo (cedió el nombre, no el lugar);
 *   'oculto' → cedió del todo (ya no cabe ni el punto, o quedó tras la cámara).
 * Con `reduced-motion` la resolución de colisión SIGUE viva (es legibilidad,
 * no movimiento); el CSS por defecto ya respeta `prefers-reduced-motion`
 * apagando solo la transición de entrada/salida.
 *
 * Frugal: UNA sola pasada de useFrame para todo el grupo (no una por chip),
 * a ~12 pasadas/s, imperativo sobre `dataset` — cero re-render de React por
 * cuadro.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { proyectarAPantalla, resolverModos } from './etiquetasAntiColision.js';
import './etiquetasMundo.css';

const _mundo = new THREE.Vector3();
const _proj = new THREE.Vector3();

export default function EtiquetasMundo({ items, focoId = null, className = 'mundo-etiqueta' }) {
  const grupos = useRef({});
  const chips = useRef({});
  const tick = useRef(0);

  useFrame(({ camera, size }) => {
    // ~12 pasadas/s alcanzan: es texto que no persigue el cuadro a 60fps.
    if (tick.current++ % 5 !== 0) return;

    const puntos = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const g = grupos.current[it.id];
      if (!g) continue;
      g.getWorldPosition(_mundo);
      const p = proyectarAPantalla(_proj, _mundo, camera, size);
      puntos.push({ id: it.id, titulo: it.titulo, prioridad: i, ...p });
    }
    const modos = resolverModos(puntos, { focoId });
    for (const p of puntos) {
      const el = chips.current[p.id];
      if (!el) continue;
      const modo = modos.get(p.id) || 'oculto';
      if (el.dataset.modo !== modo) el.dataset.modo = modo;
    }
  });

  return (
    <>
      {items.map((it) => (
        <group
          key={it.id}
          position={it.pos}
          ref={(el) => {
            grupos.current[it.id] = el;
          }}
        >
          <Html center zIndexRange={[30, 0]}>
            <div
              ref={(el) => {
                chips.current[it.id] = el;
              }}
              className={className}
              data-modo="pleno"
              aria-hidden="true"
            >
              {it.paso != null && <b>{it.paso}</b>}
              {it.titulo}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}
