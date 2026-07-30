/*
 * CompaiEscena — EL COMPAÑERO DEL MUNDO 3D, SEGÚN EL AVATAR QUE EL USUARIO ELIGIÓ.
 *
 * Drop-in de AbejaEscena (mismas props). Cierra el bug "oso→abeja": antes el
 * mundo montaba SIEMPRE a Angelita; ahora consulta el avatar elegido
 * (useCompaiElegido) y monta la escena propia del compañero si la tiene. Hoy
 * solo Angelita tiene arte 3D, así que maíz y zarigüeya caen a AbejaEscena (sin
 * regresión). Cuando el Fable de compai (#5) registre su <XEscena> en
 * compaiRegistry, este dispatcher la monta automáticamente — sin tocar este
 * archivo ni EscenaBase3D ni las escenas de cada mundo.
 *
 * Vive en escenas/ (chunk perezoso vendor-three): AbejaEscena arrastra
 * @react-three, así que este archivo NUNCA se importa desde el barrel base.
 */
import { AbejaEscena } from './useEntradaAbeja.jsx';
import useCompaiElegido from './useCompaiElegido.js';

/**
 * @param {object} props  las MISMAS de AbejaEscena (foco, entrando, hablando,
 *   rebote, animo, energia, estadoFinca, hayAlerta, reducedMotion, piso, tier,
 *   mundoId, viajeRef, ...). Se pasan tal cual al compañero resuelto.
 */
export function CompaiEscena(props) {
  const compai = useCompaiElegido();
  if (compai.EscenaComponent) {
    const Escena = compai.EscenaComponent;
    return <Escena {...props} compai={compai} />;
  }
  // Fallback: Angelita (angelita nativa, o maíz/zarigüeya aún sin arte 3D).
  return <AbejaEscena {...props} />;
}
