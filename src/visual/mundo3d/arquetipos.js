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
  cutaway: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'cutaway', espejo: 'mirror',
    nombre: 'Corte de suelo', clave: 'lo invisible del subsuelo, hecho visible',
    ejemplo: 'suelo', tambien: ['abono'],
  },
  flujo: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'flujo', espejo: 'mirror',
    nombre: 'Camino del agua', clave: 'gravedad y pendiente: por dónde baja el agua',
    ejemplo: 'agua', tambien: [],
  },
  recinto: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'recinto', espejo: 'mirror',
    nombre: 'El corral', clave: 'el ciclo cerrado del abono como anillo espacial',
    ejemplo: 'animales', tambien: [],
  },
  estratos: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'estratos', espejo: 'mirror',
    nombre: 'Estratos del bosque', clave: 'la verticalidad de los 7 estratos comestibles',
    ejemplo: 'disenio', tambien: [],
  },
  valle: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'valle', espejo: 'valle2d',
    nombre: 'El valle (mapa)', clave: 'la finca como mapa navegable; cada mundo es un lugar',
    ejemplo: 'valle', tambien: [],
  },
  // La ÚNICA metáfora espacial nueva del batch (README §case-3): la bóveda de
  // cielo. Su espejo 2D es una lámina de cielo (motivo `boveda` en LaminaMundo).
  boveda: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'boveda', espejo: 'mirror',
    nombre: 'La bóveda del cielo', clave: 'el cielo de la finca: hora del día + temporada bimodal andina',
    ejemplo: 'clima', tambien: [],
  },
  // La huerta-clínica: la familia del `recinto` (un lugar cercado que se
  // camina), pero su lección es el manejo SIN veneno — trampas cromáticas,
  // biocontrol (Beauveria/Metarhizium), borde push-pull y enemigos naturales.
  // En equipo humilde cae a su ficha 2D (infografía de la sanidad).
  sanidad: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'sanidad', espejo: 'mirror',
    nombre: 'La huerta-clínica', clave: 'el manejo agroecológico de plagas: trampas, biocontrol y enemigos naturales',
    ejemplo: 'sanidad', tambien: [],
  },
  // El mercado campesino: la familia del `flujo` (una ruta que se recorre) hecha
  // cadena corta del campo a la mesa. Su lección es la comercialización justa —
  // puestos con toldo, canastos con la cosecha de la finca, la procedencia
  // andina (terroir/sello de origen) y el precio justo del trato directo (sin la
  // tajada del intermediario). En equipo humilde cae a su ficha 2D (la
  // infografía del mercado y la despensa).
  mercado: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'mercado', espejo: 'mirror',
    nombre: 'El mercado campesino', clave: 'la cadena corta del campo a la mesa: puestos, procedencia y precio justo',
    ejemplo: 'mercado', tambien: [],
  },
  // El cafetal bajo sombra: la familia del `recinto` (un lugar que se camina)
  // hecha CULTIVO BANDERA. Su lección es el café real del país — el arbusto que
  // vive BAJO el techo de guamo/nogal, la cereza que se vuelve pergamino y oro
  // (sin tostar en la finca), la roya y la broca manejadas con criterio, y el
  // beneficio (despulpar, fermentar, secar). En equipo humilde cae a su ficha 2D
  // (la infografía del café). (anti-conflicto: arquetipo 3D nuevo al final del bloque.)
  cafe: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'cafe', espejo: 'mirror',
    nombre: 'El cafetal bajo sombra', clave: 'el cultivo bandera: café de sombra, el grano cereza→pergamino→oro, roya/broca y beneficio',
    ejemplo: 'cafe', tambien: [],
  },
  // El semillero/vivero: la familia del `recinto` (un lugar cercado y PROTEGIDO
  // que se camina), pero su lección es la PROPAGACIÓN — germinar en bandeja,
  // repicar a bolsa/era y endurecer la plántula bajo el túnel de media-sombra
  // antes de llevarla al campo. En equipo humilde cae a su ficha 2D (infografía
  // del semillero). (anti-conflicto: arquetipo 3D nuevo al final del bloque.)
  semillero: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'semillero', espejo: 'mirror',
    nombre: 'El semillero/vivero', clave: 'la propagación: germinar, repicar y endurecer bajo el túnel protegido',
    ejemplo: 'semillero', tambien: [],
  },
  // El SUELO VIVO bajo tierra: la RED MICORRÍZICA (el wood-wide web). Familia
  // propia (una escena espacial genuinamente nueva: la cámara BAJO el suelo): la
  // red de hongos bioluminiscente que enlaza las raíces de las plantas y reparte
  // fósforo/agua ↔ carbono, con pulsos de nutrientes corriendo por los hilos y el
  // Ent asomando. En equipo humilde cae a su espejo 2D (motivo `micorrizas`).
  // (anti-conflicto: arquetipo 3D nuevo al final del bloque.)
  micorrizas: {
    dim: '3d', role: 'mundo3d-archetype', motivo: 'micorrizas', espejo: 'mirror',
    nombre: 'La red del suelo', clave: 'el wood-wide web: la red de hongos que conecta las raíces y reparte nutrientes bajo tierra',
    ejemplo: 'micorrizas', tambien: [],
  },

  // ── Arquetipos 2D (primera clase) ────────────────────────────────────────
  mirror: {
    dim: '2d', role: 'mundo2d-archetype',
    nombre: 'Lámina espejo', clave: 'el dibujo 2D digno de un diorama 3D (mismos datos + hotspots)',
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
