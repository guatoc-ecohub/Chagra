/*
 * EscenaValle — ARQUETIPO `valle`: el MAPA de la finca (la capa lejana).
 *
 * A diferencia de los otros arquetipos (dioramas enfocados que comparten
 * `EscenaBase3D`), el valle YA es una escena-mapa completa y autocontenida:
 * `Valle3D` (traído byte-fiel del mockup "El valle de mi finca"). Este arquetipo
 * es un ADAPTADOR: traduce el contrato uniforme del framework a las props de
 * `Valle3D`, para que el mapa sea "un mundo más" del registro. Tocar un landmark
 * (un mundo del valle) sale por `onHotspot('mundo', { mundoId })` — el host
 * decide si abre ese mundo con `<Mundo>` o navega a su 2D.
 *
 * El componente físico vive en `src/mockups/valle` (el mockup del mapa); aquí solo
 * se adapta, sin redibujarlo — misma geometría procedural, mismo chunk perezoso.
 */
import Valle3D from '../../../mockups/valle/Valle3D.jsx';

export default function EscenaValle({ params, entrada, reducedMotion = false, onHotspot, animo = 'sereno', energia = 1, tier = 'alto' }) {
  const clima = params?.clima || entrada?.clima || 'soleado';
  return (
    <Valle3D
      clima={clima}
      focoId={null}
      animo={animo}
      energia={energia}
      tier={tier}
      reducedMotion={reducedMotion}
      onEntrar={(id) => onHotspot?.('mundo', { mundoId: id })}
      onAlerta={() => onHotspot?.(entrada?.alertaView || 'hoy_finca')}
    />
  );
}
