/*
 * ARQUETIPOS — el conjunto CERRADO y filtrable de clases de escena del framework
 * de mundos.
 *
 * Un mundo (`MUNDO[id].escena`) apunta a un arquetipo por su clave. Cada
 * arquetipo declara su DIMENSIÓN (`dim: '2d' | '3d'`) — el eje que decide todo:
 *
 *   · dim '3d' → diorama espacial (cutaway/flujo/recinto/estratos/valle). Se monta
 *     SOLO si el equipo aguanta 3D (device-tier); si no, cae a su ESPEJO 2D.
 *   · dim '2d' → arquetipo 2D de PRIMERA CLASE (mirror/lamina/infografia/ficha/
 *     valle2d). No es "el fallback tonto": un mundo-dato (mercado, toxicología,
 *     ficha de cultivo) lo declara DIRECTO, porque su valor ES el dato/foto.
 *
 * Sumar un mundo NO toca este mapa: se añade una entrada de datos que apunta a un
 * arquetipo YA existente. Se toca AQUÍ solo cuando aparece una metáfora espacial
 * genuinamente nueva (rarísimo) — la única vez que se escribe R3F/SVG de escena.
 */

/** @typedef {'2d'|'3d'} Dim */

export const ARQUETIPOS = {
  // ── Arquetipos 3D (dioramas) ─────────────────────────────────────────────
  // Cada uno declara su GEMELO 2D (`espejo`): el reemplazo de primera clase que
  // `resolverMundo` monta cuando el equipo no aguanta 3D o el mundo se pide en 2D.
  cutaway: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'cutaway', espejo: 'corte2d',
    nombre: 'Corte de suelo', clave: 'lo invisible del subsuelo, hecho visible',
    ejemplo: 'suelo', tambien: ['abono'],
  },
  flujo: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'flujo', espejo: 'flujo2d',
    nombre: 'Camino del agua', clave: 'gravedad y pendiente: por dónde baja el agua',
    ejemplo: 'agua', tambien: [],
  },
  recinto: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'recinto', espejo: 'recinto2d',
    nombre: 'El corral', clave: 'el ciclo cerrado del abono como anillo espacial',
    ejemplo: 'animales', tambien: [],
  },
  estratos: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'estratos', espejo: 'estratos2d',
    nombre: 'Estratos del bosque', clave: 'la verticalidad de los 7 estratos comestibles',
    ejemplo: 'disenio', tambien: [],
  },
  valle: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'valle', espejo: 'valle2d',
    nombre: 'El valle (mapa)', clave: 'la finca como mapa navegable; cada mundo es un lugar',
    ejemplo: 'valle', tambien: [],
  },

  // ── Gemelos 2D de los dioramas (reemplazo de primera clase) ──────────────
  // NO son "el fallback tonto": enseñan LO MISMO que su diorama con otro lenguaje
  // visual (SVG isométrico/planta/corte), mismos `params` + hotspots, misma
  // paleta (`palette/chagra.js`). Los elige el `espejo` del arquetipo 3D.
  corte2d: {
    dim: '2d', role: 'mundo2d-gemelo', motivo: 'cutaway', de: 'cutaway',
    nombre: 'Corte-lámina 2.5D', clave: 'el subsuelo en corte isométrico: capas etiquetadas + vida del suelo',
  },
  flujo2d: {
    dim: '2d', role: 'mundo2d-gemelo', motivo: 'flujo', de: 'flujo',
    nombre: 'Flujo 2D', clave: 'la ladera de perfil: el agua baja por la pendiente (motion-path + gotas)',
  },
  recinto2d: {
    dim: '2d', role: 'mundo2d-gemelo', motivo: 'recinto', de: 'recinto',
    nombre: 'Recinto 2D', clave: 'el corral visto en planta: zonas etiquetadas + íconos-animal + ciclo del abono',
  },
  estratos2d: {
    dim: '2d', role: 'mundo2d-gemelo', motivo: 'estratos', de: 'estratos',
    nombre: 'Estratos 2D', clave: 'corte vertical de los 7 pisos: siluetas de cultivo + grade por altura',
  },

  // ── Arquetipos 2D (primera clase) ────────────────────────────────────────
  mirror: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Lámina espejo', clave: 'el dibujo 2D genérico de un diorama (respaldo de los gemelos por-motivo)',
  },
  lamina: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Ficha ilustrada', clave: 'reusa src/visual/laminas (maíz, cafeto, mata por etapa)',
  },
  infografia: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Infografía de datos', clave: 'cifras/dosis/precios (mercado, toxicología, boletín)',
  },
  ficha: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Tarjeta de especie', clave: 'ficha foto-secuencial (frutales, botica, café)',
  },
  valle2d: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Valle dibujado', clave: 'el mapa isométrico SVG (espejo 2D del valle)',
  },
};

/** Claves de todos los arquetipos, en orden canónico. */
export const ARQUETIPOS_KEYS = Object.keys(ARQUETIPOS);

/** ¿Es un arquetipo de dimensión 3D? */
export const esArquetipo3D = (key) => ARQUETIPOS[key]?.dim === '3d';

/** Solo los arquetipos 3D (para el device-tiering y el filtro `piezas3D`). */
export const ARQUETIPOS_3D = ARQUETIPOS_KEYS.filter(esArquetipo3D);

/** Solo los arquetipos 2D (primera clase + espejos). */
export const ARQUETIPOS_2D = ARQUETIPOS_KEYS.filter((k) => ARQUETIPOS[k].dim === '2d');
