/*
 * FaunaCalido — SEMBRAR los mundos de TIERRA CALIENTE (cafetal, cacaotal) con la
 * fauna emblemática del piso cálido-tropical bajo colombiano.
 *
 * La auditoría 3D marcó que a los mundos cálidos les faltaba SU fauna: el dosel
 * del sombrío está lleno de vida en la tierra caliente y estaba mudo. Aquí entran
 * los bichos que de verdad viven ese piso (0–1.000/1.400 msnm), cada uno como
 * billboard SVG `<Html>` de drei (mismo patrón que FaunaEscena/CondorBillboard) y
 * con un movimiento DICTADO POR SU NICHO — la creature pone el cuerpo, la escena
 * pone la coreografía (contrato del DR):
 *
 *   · 'vuela'  guacamaya (Ara macao) — ronda el dosel en elipse ancha, banqueando.
 *   · 'posa'   tucán (Ramphastos tucanus) — posado en la rama, respira, casi quieto.
 *   · 'trepa'  mico maicero (Saimiri sciureus) — bandazos suaves entre ramas.
 *   · 'cuelga' perezoso (Bradypus variegatus) — se mece LENTÍSIMO colgado.
 *   · 'asolea' iguana (Iguana iguana) — quieta al sol, solo la papada late.
 *   · 'morfo'  morfo azul (Morpho peleides) — deriva ancha y ondulante.
 *
 * POCOS y bien puestos por criterio ecológico (nunca un enjambre): son billboards
 * DOM, así que la regla es la barata — 2–4 por escena, recortados por device-tier
 * desde la escena. Con reduced-motion la escena corre `frameloop='demand'` y aquí
 * `animated={false}` congela también el gesto interno del SVG. Importa
 * three/@react-three → vive en escenas/ (chunk perezoso `vendor-three`).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Tucan } from '../../creatures/Tucan.jsx';
import { Guacamaya } from '../../creatures/Guacamaya.jsx';
import { MicoMaicero } from '../../creatures/MicoMaicero.jsx';
import { Iguana } from '../../creatures/Iguana.jsx';
import { MorphoAzul } from '../../creatures/MorphoAzul.jsx';
import { Perezoso } from '../../creatures/Perezoso.jsx';
import '../../creatures/faunaCalido.css';

/* La fauna reutilizable del piso cálido (cada clave = `tipo` de un item). */
const COMPS = {
  tucan: Tucan,
  guacamaya: Guacamaya,
  mico: MicoMaicero,
  iguana: Iguana,
  morfo: MorphoAzul,
  perezoso: Perezoso,
};

/**
 * Coreografía por NICHO: el offset [dx, dy, dz] (unidades de escena) respecto del
 * ancla, dado el tiempo `t` y una `fase` que desincroniza a cada individuo. Pura y
 * determinista (estable en SSR/tests). Amplitudes a medida: vida, no espectáculo.
 * @param {'vuela'|'posa'|'trepa'|'cuelga'|'asolea'|'morfo'} patron
 * @param {number} t
 * @param {number} [fase]
 * @returns {[number, number, number]}
 */
export function coreoCalido(patron, t, fase = 0) {
  switch (patron) {
    case 'vuela': {
      // guacamaya rondando el dosel: elipse ancha y lenta + deriva de altura.
      const a = t * 0.16 + fase;
      return [Math.cos(a) * 3.4, Math.sin(t * 0.22 + fase) * 0.6, Math.sin(a) * 1.8];
    }
    case 'posa':
      // tucán posado: respiro mínimo, presencia sin ruido.
      return [Math.sin(t * 0.5 + fase) * 0.04, Math.abs(Math.sin(t * 0.8 + fase)) * 0.05, 0];
    case 'trepa': {
      // mico entre ramas: bandazos suaves en las tres direcciones.
      const u = t * 0.3 + fase;
      return [Math.sin(u) * 0.5, Math.sin(u * 1.7 + 1) * 0.28, Math.cos(u * 0.8) * 0.22];
    }
    case 'cuelga':
      // perezoso: mecerse LENTÍSIMO (su gracia es la quietud).
      return [Math.sin(t * 0.14 + fase) * 0.06, Math.sin(t * 0.1 + fase) * 0.04, 0];
    case 'asolea':
      // iguana asoleándose: casi inmóvil, apenas el fuelle de respirar.
      return [0, Math.abs(Math.sin(t * 0.3 + fase)) * 0.02, 0];
    case 'morfo':
    default:
      // morfo azul: vuelo lento y ondulante, deriva ancha por el sotobosque.
      return [
        Math.sin(t * 0.45 + fase) * 0.42,
        Math.sin(t * 0.8 + fase) * 0.24,
        Math.cos(t * 0.4 + fase) * 0.3,
      ];
  }
}

/** El banqueo (grados) del billboard según el nicho: la guacamaya se inclina al
    girar; el morfo cabecea apenas; el resto va derecho. */
function bancoCalido(patron, t, fase) {
  if (patron === 'vuela') return Math.sin(t * 0.16 + fase) * 11;
  if (patron === 'morfo') return Math.sin(t * 0.8 + fase) * 7;
  return 0;
}

/**
 * Un bicho del piso cálido, posado/volando en la escena como billboard.
 * @param {object} p
 * @param {'tucan'|'guacamaya'|'mico'|'iguana'|'morfo'|'perezoso'} p.tipo
 * @param {[number,number,number]} p.base  ancla en coordenadas de la escena.
 * @param {'vuela'|'posa'|'trepa'|'cuelga'|'asolea'|'morfo'} p.patron  nicho → gesto.
 * @param {number} [p.size=64]  tamaño en px del SVG.
 * @param {number} [p.fase=0]   desfase del vaivén.
 * @param {number} [p.df=10]    distanceFactor del <Html> (escala en mundo).
 * @param {string} [p.title]    especie + nombre científico (decorativo).
 * @param {boolean} [p.reducedMotion=false]
 */
export function BichoCalido({
  tipo, base, patron = 'morfo', size = 64, fase = 0, df = 10, title, reducedMotion = false,
}) {
  const grupo = useRef(/** @type {any} */ (null));
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const Comp = COMPS[tipo];
  useFrame((state) => {
    if (reducedMotion || !grupo.current) return;
    const t = state.clock.elapsedTime;
    const [dx, dy, dz] = coreoCalido(patron, t, fase);
    grupo.current.position.set(base[0] + dx, base[1] + dy, base[2] + dz);
    if (capa.current) {
      const b = bancoCalido(patron, t, fase);
      capa.current.style.transform = b ? `rotate(${b.toFixed(1)}deg)` : '';
    }
  });
  if (!Comp) return null;
  return (
    <group ref={grupo} position={base}>
      <Html center distanceFactor={df} zIndexRange={[18, 0]} pointerEvents="none">
        <div ref={capa} className="fc-billboard" aria-hidden="true">
          <Comp size={size} animated={!reducedMotion} title={title} />
        </div>
      </Html>
    </group>
  );
}

/**
 * Siembra una lista de bichos del piso cálido (una línea por diorama).
 * @param {object} p
 * @param {Array<object>} p.items  cada uno = props de `<BichoCalido>`.
 * @param {boolean} [p.reducedMotion=false]
 */
export function FaunaCalido({ items = [], reducedMotion = false }) {
  return (
    <group>
      {items.map((it, i) => (
        <BichoCalido key={it.key ?? i} reducedMotion={reducedMotion} {...it} />
      ))}
    </group>
  );
}

export default FaunaCalido;
