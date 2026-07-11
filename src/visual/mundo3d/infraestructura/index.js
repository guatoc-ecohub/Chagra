/*
 * src/visual/mundo3d/infraestructura — LA LIBRERÍA DE INFRAESTRUCTURA 3D.
 *
 * Data-driven como el registro de mundos: el catálogo (three-free) declara qué
 * infraestructura existe y con qué medidas; las piezas (R3F) la dibujan low-poly;
 * el dispatcher `<Infraestructura>` las une. Agregar la infraestructura real de
 * la finca a un mundo = una entrada en `infraestructuraData.js` + este componente.
 *
 *   import Infraestructura, { INFRAESTRUCTURA, INFRAESTRUCTURA_IDS }
 *     from '.../visual/mundo3d/infraestructura';
 *
 * IMPORTANTE (code-split): el catálogo es THREE-FREE; se puede importar en el
 * bundle base. Las piezas y el dispatcher importan `three`/R3F: móntelos dentro
 * de un chunk perezoso (la vitrina ya es `React.lazy`), como el resto del 3D.
 */

// El dispatcher 3D (importa three: perezoso).
export { default } from './Infraestructura.jsx';
export { default as Infraestructura, esFrugal } from './Infraestructura.jsx';

// La variante VIVA: se alimenta sola del estado real (useFincaViva) y refleja
// microclima/cosecha/ocupación. Importa three: perezosa como el dispatcher.
export { default as InfraestructuraViva } from './InfraestructuraViva.jsx';

// El registro render→componente (three) por si alguien quiere una pieza suelta.
export { PIEZAS_INFRA } from './piezasInfra.jsx';

// El catálogo + helpers (three-free, seguros en el bundle base).
export {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_IDS,
  INFRAESTRUCTURA_CATEGORIAS,
  infraPorId,
  clasificarAnimales,
  derivarVidaInfra,
} from './infraestructuraData.js';
