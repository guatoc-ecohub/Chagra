/*
 * etiquetasAntiColision — el ÁLGEBRA pura para que las etiquetas 3D→pantalla
 * NO SE PISEN (BUG real detectado en `#/mockups/mundo3d-sanidad`: varias
 * `<Html>` ancladas en puntos distintos del mundo pero CERCA entre sí quedan
 * amontonadas/ilegibles en pantalla en cuanto la cámara se aleja lo bastante
 * para que dos anclas proyecten sobre el mismo parche de pixeles).
 *
 * Es la MISMA técnica que ya resuelve esto hoy en el valle 3D de producción
 * — `RotulosLugares` en `mockups/valle/Valle3D.jsx` — extraída a GENÉRICA:
 * proyectar cada ancla a pantalla, calcular su caja aproximada y dejar que la
 * más relevante (el foco, si hay) se quede con su espacio primero; quien cae
 * ENCIMA de una caja ya tomada cede un modo (de nombre completo a chip
 * mínimo, y de ahí a invisible) en vez de pisarse con la otra. Aquí queda
 * SOLO el algoritmo de resolución de espacio en pantalla — nada de las
 * nociones propias del valle (zoom semántico, "la cosa del día", etc.) — para
 * que cualquier escena con Html's agrupadas lo reuse sin arrastrar ese
 * contexto. El consumidor de referencia es `EtiquetasMundo.jsx` (mismo
 * directorio), que lo llama dentro de un `useFrame` y escribe el resultado
 * imperativamente en `dataset` (cero re-render de React por cuadro).
 *
 * Puro: sin refs, sin efectos, sin montar nada. Testeable sin GPU.
 */

/**
 * Proyecta un Vector3 de MUNDO a coordenadas de pantalla (px) usando la
 * cámara y el tamaño del canvas actuales. Reusa el `scratch` (Vector3) que le
 * pase el llamador para no generar basura por cuadro.
 *
 * @param {import('three').Vector3} scratch  vector reusable (se muta)
 * @param {import('three').Vector3} puntoMundo
 * @param {import('three').Camera} camera
 * @param {{ width: number, height: number }} size
 * @returns {{ x: number, y: number, detras: boolean }}
 */
export function proyectarAPantalla(scratch, puntoMundo, camera, size) {
  scratch.copy(puntoMundo).project(camera);
  return {
    x: (scratch.x * 0.5 + 0.5) * size.width,
    y: (0.5 - scratch.y * 0.5) * size.height,
    detras: scratch.z > 1,
  };
}

/** Caja AABB centrada en (x,y) de ancho/alto `w`/`h`, con `margen` px de aire
 *  contra sus vecinas (dos chips pegados sin espacio no se leen). */
export function rectanguloDe(x, y, w, h, margen = 8) {
  return {
    x0: x - w / 2 - margen,
    x1: x + w / 2 + margen,
    y0: y - h / 2 - margen,
    y1: y + h / 2 + margen,
  };
}

/** ¿Se solapan dos cajas AABB? */
export function seSolapan(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** Clampa v al rango [mitad, total-mitad] (deja `mitad` px de aire contra
 *  cada borde). Si el rango se invierte — un chip más ancho que la pantalla —
 *  cede al centro: mejor centrado que cortado contra el filo. */
export function clamp1D(v, mitad, total) {
  const lo = mitad;
  const hi = total - mitad;
  if (lo > hi) return total / 2;
  return Math.min(Math.max(v, lo), hi);
}

/** Ancho aproximado (px) del chip según su modo: 'pleno' crece con el título,
 *  'punto'/'oculto' es el círculo mínimo fijo (44px = piso táctil WCAG 2.5.5). */
export function anchoDeChip(modo, titulo, { anchoPunto = 44, base = 76, porLetra = 9 } = {}) {
  return modo === 'pleno' ? base + (titulo?.length || 0) * porLetra : anchoPunto;
}

/**
 * Resuelve, para un conjunto de anclas YA proyectadas a pantalla, el modo de
 * cada una: 'pleno' (nombre completo, cabe sin pisar a nadie), 'punto' (cedió
 * el nombre pero conserva su lugar como chip mínimo) u 'oculto' (cedió del
 * todo — ya ni el punto cabe, o quedó detrás de la cámara).
 *
 * Orden de reclamo: el `focoId` (si lo hay y es elegible) entra PRIMERO a
 * tomar su espacio; el resto, por `prioridad` ascendente (por defecto, el
 * orden en que llegó el arreglo). Cada ancla intenta primero 'pleno'; si pisa
 * una caja ya tomada, cae a 'punto'; si tampoco cabe, cae a 'oculto'.
 *
 * @param {Array<{id: string, x: number, y: number, titulo: string, detras?: boolean, prioridad?: number}>} puntos
 * @param {{ focoId?: string|null, altoPunto?: number, altoPleno?: number, margen?: number }} [opts]
 * @returns {Map<string, 'pleno'|'punto'|'oculto'>}
 */
export function resolverModos(puntos, { focoId = null, altoPunto = 44, altoPleno = 48, margen = 8 } = {}) {
  const tomados = [];
  const pisa = (r) => tomados.some((o) => seSolapan(r, o));
  const orden = [...puntos].sort((a, b) => {
    if (a.id === focoId) return -1;
    if (b.id === focoId) return 1;
    return (a.prioridad ?? 0) - (b.prioridad ?? 0);
  });

  const modos = new Map();
  for (const p of orden) {
    if (p.detras) {
      modos.set(p.id, 'oculto');
      continue;
    }
    const rPleno = rectanguloDe(p.x, p.y, anchoDeChip('pleno', p.titulo), altoPleno, margen);
    if (!pisa(rPleno)) {
      tomados.push(rPleno);
      modos.set(p.id, 'pleno');
      continue;
    }
    const rPunto = rectanguloDe(p.x, p.y, anchoDeChip('punto', p.titulo), altoPunto, margen);
    if (!pisa(rPunto)) {
      tomados.push(rPunto);
      modos.set(p.id, 'punto');
      continue;
    }
    modos.set(p.id, 'oculto');
  }
  return modos;
}
