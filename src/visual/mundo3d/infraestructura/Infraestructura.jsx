/*
 * Infraestructura — el DISPATCHER que dibuja CUALQUIER pieza del catálogo.
 *
 * El puente entre el catálogo three-free (infraestructuraData.js) y las piezas
 * R3F (piezasInfra.jsx). Se usa como un ladrillo más dentro de cualquier escena
 * 3D del framework o de la vitrina:
 *
 *   <Infraestructura tipo="invernadero_tunel" pos={[2, 0, -1]} rot={0.4}
 *                    dims={{ largo: 24, ancho: 6, alto: 3.2 }} tier="alto" />
 *
 *   · `tipo`  — id del catálogo (INFRAESTRUCTURA). Desconocido → no dibuja nada.
 *   · `pos`   — posición en el mundo [x, y, z] (default origen).
 *   · `rot`   — giro en Y (radianes) para orientarla en el terreno.
 *   · `dims`  — override de medidas { largo, ancho, alto } sobre los defaults del
 *               catálogo (el usuario mete las de su finca, medidas con cinta).
 *   · `params`— override de parámetros de la pieza (colores, módulos…).
 *   · `tier`  — device-tier del framework: 'bajo'/'medio' → `frugal` (menos
 *               segmentos, sin detalle fino). Respeta el contrato de perf.
 *   · `reducedMotion` — sin animación de llenado: estado final directo.
 *   · `estadoFinca` — el estado REAL de la finca (forma de useFincaViva /
 *               reaccionFinca). Con él las piezas dejan de ser utilería: el
 *               invernadero enseña su microclima, el almacén se llena tras la
 *               cosecha y el galpón/establo se ocupan según los animales.
 *               Sin él (default null) → pieza NEUTRA, idéntica al catálogo
 *               (contrato anti-fabricación: nada de fingir finca). Para el
 *               drop-in que se alimenta solo, ver <InfraestructuraViva>.
 *
 * Devuelve un `<group>` de mallas (sin Canvas/luces): quien lo monta pone el
 * escenario. Agregar la infraestructura real a un mundo = una entrada de datos +
 * este componente; ver la infraestructura del catálogo junta = la vitrina
 * (#/mockups/infraestructura-3d).
 */
import { useMemo } from 'react';
import { INFRAESTRUCTURA, derivarVidaInfra } from './infraestructuraData.js';
import { PIEZAS_INFRA } from './piezasInfra.jsx';

/* Helper puro de tier (no es un componente): se comparte con el barrel/vitrina.
   El fast-refresh no aplica a esta librería 3D perezosa. */
// eslint-disable-next-line react-refresh/only-export-components
export const esFrugal = (tier) => tier === 'bajo' || tier === 'medio';

export default function Infraestructura({
  tipo,
  pos = [0, 0, 0],
  rot = 0,
  dims: dimsOverride,
  params: paramsOverride,
  tier = 'alto',
  reducedMotion = false,
  estadoFinca = null,
}) {
  // El estado FUNCIONAL de la pieza (three-free, puro). null → pieza neutra.
  // Antes de los early-return: los hooks no pueden ser condicionales.
  const vida = useMemo(() => derivarVidaInfra(estadoFinca), [estadoFinca]);

  const entrada = INFRAESTRUCTURA[tipo];
  if (!entrada) return null; // tipo desconocido: no dibuja (nunca una caja huérfana)

  const Pieza = PIEZAS_INFRA[entrada.render];
  if (!Pieza) return null;

  // Medidas y parámetros = defaults del catálogo + overrides del usuario.
  const dims = { ...entrada.dims, ...(dimsOverride || {}) };
  const params = { ...entrada.params, ...(paramsOverride || {}) };
  const frugal = esFrugal(tier);

  return (
    <group position={/** @type {[number, number, number]} */ (pos)} rotation={[0, rot, 0]}>
      <Pieza
        dims={dims}
        params={params}
        frugal={frugal}
        reducedMotion={reducedMotion}
        vida={vida}
      />
    </group>
  );
}
