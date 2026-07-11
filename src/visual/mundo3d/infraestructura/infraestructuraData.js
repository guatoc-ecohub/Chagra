/*
 * INFRAESTRUCTURA — el CATÁLOGO DATA-DRIVEN de la infraestructura de la finca.
 *
 * El hermano del registro de mundos (mundoData.js): así como un MUNDO es una
 * entrada de datos que apunta a un arquetipo de escena, una INFRAESTRUCTURA es
 * una entrada de datos que apunta a una PIEZA low-poly (`render`). El objetivo:
 * que el campesino pueda AGREGAR su infraestructura real a los mundos y verla lo
 * más parecida posible — su invernadero, su galpón, su tanque — poniendo UNA
 * entrada aquí (o reusando una que ya existe con otras medidas).
 *
 *   INFRAESTRUCTURA[id] = {
 *     id,          // clave estable (== la propiedad)
 *     nombre,      // nombre campesino, en "usted" (etiquetas de UI)
 *     emoji,       // ícono para leyendas/fallback 2D
 *     categoria,   // familia: 'cultivo protegido' | 'pecuaria' | 'poscosecha' | 'agua' | 'almacenamiento'
 *     render,      // clave de PIEZAS_INFRA (piezasInfra.jsx) — el componente R3F que la dibuja
 *     dims,        // medidas TÍPICAS en METROS: { largo, ancho, alto } (parametrizables)
 *     params,      // parámetros propios de la pieza (color, módulos, tipo de techo…)
 *     descripcion, // una línea didáctica de para qué sirve
 *   }
 *
 * Sumar una infraestructura = UNA de estas entradas. Si su forma ya existe (p.ej.
 * otra bodega de otro tamaño), es SOLO datos (cambia `dims`/`params`). Si es una
 * forma genuinamente nueva, se suma su pieza en `piezasInfra.jsx` — igual que un
 * arquetipo de escena nuevo. Este archivo es THREE-FREE a propósito (como
 * mundoData.js/arquetipos.js): no importa `three`, así no infla el bundle base;
 * el mapeo render→componente vive en la capa 3D (piezasInfra.jsx).
 *
 * Medidas: tomadas de rangos reales de finca andina de pequeña/mediana escala
 * (macrotúnel de 6 m de boca, galpón avícola de 8 m, tanque de 4 m…). Son los
 * DEFAULTS; el usuario las ajusta con su cinta métrica desde `<Infraestructura
 * dims={{largo, ancho, alto}} />`.
 */

export const INFRAESTRUCTURA = {
  // ── Cultivo protegido ────────────────────────────────────────────────────

  // ⛺ INVERNADERO TÚNEL (macrotúnel): un arco de plástico sobre la cama de
  //    siembra. Lo más común y barato: media caña de guadua/tubo forrada en
  //    plástico. Boca de ~6 m, alto = radio del arco.
  invernadero_tunel: {
    id: 'invernadero_tunel',
    nombre: 'Invernadero túnel',
    emoji: '⛺',
    categoria: 'cultivo protegido',
    render: 'invernaderoTunel',
    dims: { largo: 15, ancho: 6, alto: 3 },
    params: { arcos: 6, plastico: '#dfeef2', puerta: true },
    descripcion:
      'El arco de plástico sobre la cama de siembra: guarda el calor y tapa el aguacero. Lo más barato de armar.',
  },

  // 🏠 INVERNADERO CUADRADO / CAPILLA (dos aguas): paredes rectas y techo a dos
  //    aguas con cumbrera. Más alto y ventilado que el túnel; el estándar de
  //    tomate y pimentón bajo cubierta en clima frío andino.
  invernadero_capilla: {
    id: 'invernadero_capilla',
    nombre: 'Invernadero capilla',
    emoji: '🏠',
    categoria: 'cultivo protegido',
    render: 'invernaderoCapilla',
    dims: { largo: 20, ancho: 8, alto: 4.2 },
    params: { pared: 2.5, plastico: '#dfeef2', naves: 1 },
    descripcion:
      'De paredes rectas y techo a dos aguas (cumbrera). Más alto y aireado que el túnel: el de tomate y pimentón.',
  },

  // 🌿 MEDIA-SOMBRA / VIVERO (casa de sombra): estructura de techo plano con
  //    polisombra (malla que corta el sol) y mesas de propagación. Donde nacen
  //    las plántulas antes de ir al campo.
  media_sombra: {
    id: 'media_sombra',
    nombre: 'Media-sombra / vivero',
    emoji: '🌿',
    categoria: 'cultivo protegido',
    render: 'mediaSombra',
    dims: { largo: 10, ancho: 6, alto: 2.5 },
    params: { sombra: '#4f6f42', mesas: 2 },
    descripcion:
      'La casa de sombra donde nacen las plántulas: polisombra que corta el sol fuerte y mesas de propagación.',
  },

  // ── Pecuaria ─────────────────────────────────────────────────────────────

  // 🐔 GALLINERO A CAMPO ABIERTO: un refugio techado (dormida y ponederos) con
  //    un corral de malla al aire libre. Gallina feliz que picotea afuera y se
  //    guarda de noche del zorro.
  gallinero_campo: {
    id: 'gallinero_campo',
    nombre: 'Gallinero a campo abierto',
    emoji: '🐔',
    categoria: 'pecuaria',
    render: 'gallineroCampo',
    dims: { largo: 8, ancho: 5, alto: 2.2 },
    params: { refugio: 3, malla: '#b9c2b0' },
    descripcion:
      'Refugio techado con ponederos y un corral de malla al aire libre: la gallina picotea afuera y se guarda de noche.',
  },

  // 🏭 GALPÓN (avícola cerrado): nave larga y baja, cerrada, con cortinas
  //    laterales y techo de zinc. Para lote grande de pollo/gallina bajo control
  //    de clima.
  galpon: {
    id: 'galpon',
    nombre: 'Galpón avícola',
    emoji: '🏭',
    categoria: 'pecuaria',
    render: 'galpon',
    dims: { largo: 24, ancho: 8, alto: 3.2 },
    params: { cortina: '#c9b487', techo: '#8b8578' },
    descripcion:
      'Nave larga y cerrada con cortinas laterales y techo de zinc: el lote grande de pollo o gallina bajo control.',
  },

  // 🐄 ESTABLO (bovinos): cobertizo de lados abiertos con comedero corrido y
  //    piso firme. La sombra y el techo para ordeño, suplemento y descanso del
  //    ganado.
  establo: {
    id: 'establo',
    nombre: 'Establo de bovinos',
    emoji: '🐄',
    categoria: 'pecuaria',
    render: 'establo',
    dims: { largo: 12, ancho: 6, alto: 3.5 },
    params: { techo: '#8b8578', comedero: true, plazas: 4 },
    descripcion:
      'Cobertizo de lados abiertos con comedero corrido y piso firme: sombra y techo para el ordeño y el descanso.',
  },

  // ── Almacenamiento ───────────────────────────────────────────────────────

  // 📦 ALMACÉN / BODEGA: construcción cerrada de paredes y portón para guardar
  //    cosecha, herramienta e insumos secos y a la sombra.
  almacen_bodega: {
    id: 'almacen_bodega',
    nombre: 'Almacén / bodega',
    emoji: '📦',
    categoria: 'almacenamiento',
    render: 'almacenBodega',
    dims: { largo: 8, ancho: 6, alto: 4 },
    params: { pared: '#e3d7bf', techo: '#8b8578', porton: true },
    descripcion:
      'Cerrada, de paredes y portón: guarda la cosecha, la herramienta y los insumos secos y a la sombra.',
  },

  // ♻️ COMPOSTERA: módulos de tablas (guadua/madera) donde el abono madura por
  //    tandas — fresco, medio y hecho. El corazón del reciclaje de la finca.
  compostera: {
    id: 'compostera',
    nombre: 'Compostera',
    emoji: '♻️',
    categoria: 'almacenamiento',
    render: 'compostera',
    dims: { largo: 4.5, ancho: 1.5, alto: 1.2 },
    params: { modulos: 3, madera: '#7a5a38' },
    descripcion:
      'Módulos de tablas donde el abono madura por tandas: fresco, medio y hecho. El reciclaje de la finca.',
  },

  // ── Agua ─────────────────────────────────────────────────────────────────

  // 💧 TANQUE / RESERVORIO DE AGUA: depósito cilíndrico que guarda el agua de la
  //    quebrada o la lluvia para el riego y la casa. La seguridad hídrica en
  //    temporada seca.
  tanque_agua: {
    id: 'tanque_agua',
    nombre: 'Tanque / reservorio',
    emoji: '💧',
    categoria: 'agua',
    render: 'tanqueAgua',
    dims: { largo: 4, ancho: 4, alto: 2.5 },
    params: { material: '#9a8b74', tapa: true, tuberia: true },
    descripcion:
      'El depósito que guarda el agua de la quebrada o la lluvia para el riego y la casa: la reserva de la sequía.',
  },

  // ── Poscosecha ───────────────────────────────────────────────────────────

  // ☕ SECADERO DE CAFÉ (parabólico / marquesina): túnel bajo de plástico sobre
  //    camas elevadas donde el pergamino seca al sol sin mojarse. El paso que
  //    define la taza.
  secadero_cafe: {
    id: 'secadero_cafe',
    nombre: 'Secadero de café',
    emoji: '☕',
    categoria: 'poscosecha',
    render: 'secaderoCafe',
    dims: { largo: 12, ancho: 5, alto: 2.6 },
    params: { plastico: '#e8e0cf', grano: '#d4c199', camas: true },
    descripcion:
      'Túnel parabólico sobre camas elevadas: el pergamino seca al sol sin mojarse. El paso que define la taza.',
  },
};

/** Ids de todas las infraestructuras registradas, en orden de catálogo. */
export const INFRAESTRUCTURA_IDS = Object.keys(INFRAESTRUCTURA);

/** Las categorías presentes, en orden de primera aparición (para agrupar la vitrina). */
export const INFRAESTRUCTURA_CATEGORIAS = INFRAESTRUCTURA_IDS.reduce((acc, id) => {
  const c = INFRAESTRUCTURA[id].categoria;
  if (!acc.includes(c)) acc.push(c);
  return acc;
}, /** @type {string[]} */ ([]));

/** Resuelve una entrada del catálogo por id (o `null` si no existe). */
export const infraPorId = (id) => INFRAESTRUCTURA[id] || null;
