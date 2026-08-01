/*
 * Librería visual de EFECTOS de Chagra (effects) — las TÉCNICAS DE CINE del
 * catálogo (§13), una sola vez y reutilizables. Antes de re-hilvanar un
 * velo/viñeta/grade/glow/latido/auto-dibujado/acuarela, use esto.
 *
 * Dos piezas:
 *   1. `effects.css` — clases `vfx-*` + custom properties `--vfx-*`
 *      (velos, viñeta, scrims, grades por piso térmico, pulso cardíaco,
 *      auto-dibujado, flujo por dash). Importalo UNA vez donde lo uses:
 *          import '../../visual/effects/effects.css';
 *   2. Helpers SVG (este barrel): `GlowFilter`, `FiltroAcuarela`, `AutoDibujo`.
 *
 * Reglas de la casa: solo transform/opacity animados; blur/filtros estáticos;
 * reduced-motion = fotograma final digno; cero dependencias nuevas.
 */
export { GlowFilter } from './GlowFilter.jsx';
export { FiltroAcuarela } from './FiltroAcuarela.jsx';
export { AutoDibujo } from './AutoDibujo.jsx';

/* Ritmo del latido/respiración compartido (= `--vfx-beat` en effects.css y
   `--motion-beat`/`--fvo-beat` en el resto del repo). Útil desde JS cuando una
   escena necesita sincronizar un timing sin leer el CSS. */
export const VFX_BEAT_MS = 5200;

/* Registro consultable de los pisos térmicos y su grade de luz (§13.2).
   `token` = la custom property de effects.css; `clase` = la clase modificadora
   de `.vfx-grade`. Orden de menor a mayor altura invertido: de nevado a río. */
export const VFX_PISOS = [
  { slug: 'glacial',  nombre: 'Nevado',   token: '--vfx-piso-glacial',  clase: 'vfx-grade--glacial',  luz: 'azul glacial' },
  { slug: 'paramo',   nombre: 'Páramo',   token: '--vfx-piso-paramo',   clase: 'vfx-grade--paramo',   luz: 'cian páramo' },
  { slug: 'frio',     nombre: 'Frío',     token: '--vfx-piso-frio',     clase: 'vfx-grade--frio',     luz: 'neutro frío' },
  { slug: 'templado', nombre: 'Templado', token: '--vfx-piso-templado', clase: 'vfx-grade--templado', luz: 'hora dorada' },
  { slug: 'calido',   nombre: 'Cálido',   token: '--vfx-piso-calido',   clase: 'vfx-grade--calido',   luz: 'ámbar cálido' },
  { slug: 'valle',    nombre: 'Valle/río', token: '--vfx-piso-valle',   clase: 'vfx-grade--valle',    luz: 'turquesa río' },
];
