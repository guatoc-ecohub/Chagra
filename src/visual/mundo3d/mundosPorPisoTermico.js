/*
 * Proyeccion pura del registro MUNDO sobre los pisos termicos de la Sierra.
 * No persiste estado ni contiene decisiones visuales: entrega al host los
 * mundos agrupados de menor a mayor altitud y su compatibilidad con la finca.
 */
import { MUNDO } from './mundoData.js';
import { altitudAFraccion, compatibilidadPiso } from './pisosTermicos.js';

/**
 * @param {unknown} pisoUsuario id, nombre, altitud u objeto aceptado por compatibilidadPiso
 * @returns {{pisoUsuarioId:string|null, hayPisoUsuario:boolean, pisos:Array<object>, mundos:Array<object>}}
 */
export function mundosPorPisoTermico(pisoUsuario) {
  const compatibilidad = compatibilidadPiso(pisoUsuario);
  const pisosPorId = new Map(compatibilidad.pisos.map((piso) => [piso.id, piso]));
  const mundos = Object.entries(MUNDO).map(([id, mundo]) => {
    const piso = pisosPorId.get(mundo.pisoTermico);
    if (!piso) {
      throw new Error(`El mundo "${id}" no tiene un piso termico valido`);
    }
    const altitudM = (piso.min + piso.max) / 2;
    return {
      id,
      mundo,
      pisoTermico: piso.id,
      altitudM,
      altitudFraccion: altitudAFraccion(altitudM),
      compatible: piso.compatible,
      estadoCompatibilidad: piso.estado,
      explorable: piso.explorable,
    };
  });

  const mundosPorPiso = new Map();
  mundos.forEach((mundo) => {
    const grupo = mundosPorPiso.get(mundo.pisoTermico) || [];
    grupo.push(mundo);
    mundosPorPiso.set(mundo.pisoTermico, grupo);
  });

  return {
    pisoUsuarioId: compatibilidad.pisoUsuarioId,
    hayPisoUsuario: compatibilidad.hayPisoUsuario,
    pisos: compatibilidad.pisos.map((piso) => ({
      ...piso,
      mundos: mundosPorPiso.get(piso.id) || [],
    })),
    mundos,
  };
}

export default mundosPorPisoTermico;
