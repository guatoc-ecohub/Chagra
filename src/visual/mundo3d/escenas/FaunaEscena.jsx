/*
 * FaunaEscena — SEMBRAR las escenas-mundo con la fauna que YA existe.
 *
 * Los dioramas 3D se sentían vacíos. Aquí la vida de la finca (las creatures de
 * `src/visual/creatures`) entra a cualquier escena SIN redibujarse: reusamos el
 * MISMO componente SVG y lo colgamos como billboard `<Html>` de drei —idéntico
 * patrón que Angelita en `useEntradaAbeja.jsx`— con un micro-movimiento suave que
 * la escena posee (revoloteo para lo que vuela, reptar para lo que anda a ras).
 * La creature POSEE el cuerpo; la escena POSEE la coreografía (contrato del DR).
 *
 * RENDIMIENTO: como son billboards DOM (SVG), no aplican `InstancedMesh` (eso es
 * para las MALLAS repetidas —árboles, hifas, postes— que cada arquetipo ya
 * resuelve). La regla acá es la contraria y más barata: POCAS bien colocadas por
 * criterio ecológico, nunca un enjambre. Cada escena siembra 2–3.
 *
 * REDUCED-MOTION: el vaivén se congela (la escena corre `frameloop='demand'`), y
 * a la creature se le pasa `animated={false}` para apagar también su aleteo CSS.
 * Vive en escenas/ (chunk perezoso `vendor-three`): importa @react-three/three.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Colibri } from '../../creatures/Colibri.jsx';
import { Mariposa } from '../../creatures/Mariposa.jsx';
import { Escarabajo } from '../../creatures/Escarabajo.jsx';
import { Lombriz } from '../../creatures/Lombriz.jsx';

/* Sólo la fauna reutilizable en escena (Angelita la coloca `useEntradaAbeja`). */
const COMPS = { colibri: Colibri, mariposa: Mariposa, escarabajo: Escarabajo, lombriz: Lombriz };

/* Micro-movimiento por patrón, en unidades de escena (amplitudes chicas: vida,
   no espectáculo). `fase` desincroniza varios bichos para que no latan a la par. */
function deriva(patron, t, fase) {
  if (patron === 'reptar') {
    // anda a ras: avance lento en x, con un cabeceo mínimo (escarabajo / lombriz)
    return [Math.sin(t * 0.4 + fase) * 0.09, Math.abs(Math.sin(t * 1.1 + fase)) * 0.02, 0];
  }
  // revoloteo: vuelo suspendido —sube/baja y deriva apenas (colibrí / mariposa)
  return [
    Math.sin(t * 0.9 + fase) * 0.12,
    Math.sin(t * 1.7 + fase) * 0.1,
    Math.cos(t * 0.8 + fase) * 0.09,
  ];
}

/**
 * Un bicho de la librería, posado en la escena como billboard.
 * @param {object} p
 * @param {'colibri'|'mariposa'|'escarabajo'|'lombriz'} p.tipo
 * @param {[number,number,number]} p.base  ancla en coordenadas de la escena.
 * @param {number}  [p.size=30]     tamaño en px del SVG (subordinado a Angelita).
 * @param {'revoloteo'|'reptar'} [p.patron='revoloteo']
 * @param {number}  [p.fase=0]      desfase del vaivén.
 * @param {number}  [p.df=7]        distanceFactor (misma escala que Angelita).
 * @param {string}  [p.title]       etiqueta (decorativa; el billboard es aria-hidden).
 * @param {boolean} [p.reducedMotion=false]
 */
export function Bicho({
  tipo, base, size = 30, patron = 'revoloteo', fase = 0, df = 7, title, reducedMotion = false,
}) {
  const ref = useRef(null);
  const Comp = COMPS[tipo];
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const [dx, dy, dz] = deriva(patron, state.clock.elapsedTime, fase);
    ref.current.position.set(base[0] + dx, base[1] + dy, base[2] + dz);
  });
  if (!Comp) return null;
  return (
    <group ref={ref} position={base}>
      <Html center distanceFactor={df} zIndexRange={[20, 0]}>
        <div className="mundo-fauna" aria-hidden="true">
          <Comp size={size} animated={!reducedMotion} title={title} />
        </div>
      </Html>
    </group>
  );
}

/**
 * Siembra una lista de bichos en la escena (una línea por diorama).
 * @param {object} p
 * @param {Array<object>} p.items  cada uno = props de `<Bicho>`.
 * @param {boolean} [p.reducedMotion=false]
 */
export function Fauna({ items = [], reducedMotion = false }) {
  return (
    <group>
      {items.map((it, i) => (
        <Bicho key={it.key ?? i} reducedMotion={reducedMotion} {...it} />
      ))}
    </group>
  );
}
