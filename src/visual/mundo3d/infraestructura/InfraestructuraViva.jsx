/*
 * InfraestructuraViva — la pieza que SE ALIMENTA SOLA del estado real.
 *
 * Drop-in sobre <Infraestructura>: mismos props, pero el `estadoFinca` lo trae
 * ella misma de useFincaViva (el espejo vivo del dato real, read-only). Con eso
 * la pieza deja de ser utilería:
 *
 *   · invernaderos → microclima visible (aire cálido, condensación, matas
 *     adelantadas si hay saludFinca real; refugio legible en El Niño).
 *   · almacén/bodega → se llena tras la cosecha reciente (costales, huacales).
 *   · galpón/establo/gallinero → ocupados según los animales del inventario
 *     (foco prendido, paja, siluetas); [] → apagados.
 *
 * CONTRATO ANTI-FABRICACIÓN: hereda el de useFincaViva/derivarVidaInfra — dato
 * "en camino" (procesos cargando, finca vacía, sin cosecha, sin animales) →
 * pieza NEUTRA, idéntica al catálogo. Nunca se finge finca.
 *
 * PERF: cada instancia monta su useFincaViva (caches síncronos + una lectura
 * de IndexedDB). Para UNA o dos piezas es lo cómodo; si una escena riega
 * muchas piezas, mejor llamar useFincaViva UNA vez arriba y pasar
 * `estadoFinca` a cada <Infraestructura> (prop-driven, cero duplicación).
 */
import Infraestructura from './Infraestructura.jsx';
import { useFincaViva } from '../useFincaViva.js';

export default function InfraestructuraViva(props) {
  const estadoFinca = useFincaViva();
  return <Infraestructura {...props} estadoFinca={estadoFinca} />;
}
