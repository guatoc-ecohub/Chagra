/**
 * src/config/messages.js — Catalogo centralizado de strings de UI (i18n-ready).
 *
 * TAREA 100 — Extraccion completa de strings en espanol hardcodeados.
 *
 * PATRON DE USO (ADR-050):
 *   import { MSG } from '../config/messages.js';
 *   <button>{MSG.cosecha.registrar}</button>
 *   <h1>{MSG.nav.plantas}</h1>
 *
 * CONVENCIONES:
 *   - Keys en camelCase, agrupadas por dominio funcional.
 *   - Valores en espanol (idioma base).
 *   - Strings con interpolacion usan MSG.format (ver abajo).
 *   - NUNCA hardcodear strings directamente en JSX/JS.
 *
 * ESTADO DE MIGRACION: parcial (auditado 2026-06-16, cubre strings comunes).
 * La regla ESLint 'chagra-i18n/no-hardcoded-spanish' (warn) en eslint.config.js
 * ayuda a detectar nuevos hardcodeos durante la migracion progresiva.
 */

function format(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? params[key] : '{' + key + '}',
  );
}

const messages = {
  nav: {
    plantas: 'Plantas',
    mapa: 'Mapa',
    hoyEnFinca: 'Hoy en finca',
    insumos: 'Insumos',
    tareas: 'Tareas',
    bitacora: 'Bitacora',
    biodiversidad: 'Flora y fauna',
    plagas: 'Plagas',
    casos: 'Casos',
    informes: 'Informes',
    perfil: 'Perfil',
    ayuda: 'Ayuda',
    agente: 'Agente',
  },
  action: {
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    eliminar: 'Eliminar',
    confirmar: 'Confirmar',
    buscar: 'Buscar',
    cerrar: 'Cerrar',
    editar: 'Editar',
    agregar: 'Agregar',
    crear: 'Crear',
    exportar: 'Exportar',
    sincronizar: 'Sincronizar',
  },
  cosecha: {
    registrar: 'Registrar cosecha',
    cantidad: 'Registrar cosecha de {qty} {unit}',
    cantidadConPlanta: 'Registrar cosecha de {qty} {unit} de {plant}',
  },
  riego: {
    registrar: 'Registrar riego',
    conCantidad: 'Registrar riego ({qty} {unit})',
  },
  observacion: {
    registrar: 'Registrar observacion',
    conNotas: 'Registrar observacion: "{notes}"',
  },
  aplicacion: {
    registrar: 'Registrar aplicacion',
    conProducto: 'Aplicacion: {product}',
    defaultNombreInsumo: 'Aplicación de insumo',
  },
  status: {
    cargando: 'Cargando...',
    sinConexion: 'Sin conexion',
    enLinea: 'En linea',
    sincronizando: 'Sincronizando...',
    pendientes: 'Pendientes',
    errorGeneral: 'Ocurrio un error',
    errorSincronizar: 'Error al sincronizar.',
    sinConexionPendientes: (count) =>
      `Sin conexion. ${count} registro${count !== 1 ? 's' : ''} guardado${count !== 1 ? 's' : ''} localmente.`,
    sinConexionSinPendientes: 'Sin conexion. Datos guardados localmente.',
  },
  agente: {
    placeholder: 'Escribe tu consulta...',
    pensando: 'Chagra esta pensando...',
    // Estado "pensando" del chat: el texto visible es solo la palabra (los
    // puntos suspensivos animados van en spans aparte) y el aria describe el
    // estado completo para lectores de pantalla.
    pensandoTexto: 'Pensando',
    pensandoAria: 'Chagra IA está pensando',
    // Fases visibles del "pensando" (perceived performance): el pipeline
    // interno (transcripción → entendimiento → grounding/tools → generación)
    // se asoma a la UI para que la espera larga se sienta viva y con avance,
    // no colgada. Las claves las setea AgentScreen (thinkingPhase).
    fases: {
      transcribiendo: 'Entendiendo tu voz',
      entendiendo: 'Entendiendo tu pregunta',
      consultando: 'Consultando el catálogo y tu chagra',
      escribiendo: 'Escribiendo tu respuesta',
    },
    confianzaAlta: 'Confianza alta',
    confianzaMedia: 'Confianza media',
    confianzaBaja: 'Confianza baja',
  },
  perfil: {
    nombre: 'Nombre',
    operador: 'Operador',
    finca: 'Finca',
    configuracion: 'Configuracion',
    cerrarSesion: 'Cerrar sesion',
    perfilActivo: 'Perfil activo',
  },
  confirm: {
    eliminarItem: 'Esta seguro de eliminar este elemento?',
    descartarCambios: 'Descartar cambios sin guardar?',
  },
  voz: {
    grabando: 'Grabando...',
    procesando: 'Procesando...',
    errorMicrofono: 'No se pudo acceder al microfono',
    transcripcion: 'Transcripción',
    ayudaVariaciones: 'Revisa la transcripción arriba. Si Chagra escuchó bien pero el cultivo es una variedad nueva o regional (ej. una cepa específica, una variedad local), todavía no la tengo en mi catálogo.',
    opciones: 'Tienes 3 opciones:',
    opcionManual: 'Agregar manual abajo',
    opcionManualDesc: 'toca el botón "+" y escribe el cultivo + cantidad directamente.',
    opcionRegrabar: 'Re-grabar más simple',
    opcionRegrabarDesc: 'cierra esto y vuelve a grabar diciendo solo el nombre común (ej. "5 plantas de tomate") sin variedades.',
    opcionCancelar: 'Cancelar',
    opcionCancelarDesc: 'si era una prueba o no querías registrar nada.',
    eliminarEntrada: 'Eliminar entrada {index}',
  },
  onboarding: {
    bienvenido: 'Bienvenido a Chagra',
    comenzar: 'Comenzar',
    primeraPlanta: 'Bienvenido a Chagra. Empiece registrando su primera planta.',
    zonasListas: (count) =>
      `Tiene ${count} ${count === 1 ? 'zona' : 'zonas'} lista${count === 1 ? '' : 's'}. Falta su primera planta.`,
    fincaConfigurada: 'Su finca está configurada. Sembremos la primera planta.',
    elegirRegistro: 'Elija cómo registrarla. Las tres rutas guardan lo mismo.',
    tipZonas: 'Tip: tras la primera, puede crear zonas (parcelas, camas) para organizarlas.',
  },
  // Instalación de la PWA — strings COMPARTIDOS entre IosInstallBanner,
  // AndroidInstallBanner y el momento "instalar" del recorrido de bienvenida
  // (BienvenidaFinca), para no duplicar el copy de los pasos.
  instalarApp: {
    titulo: 'Instale Chagra',
    subtituloAndroid: 'Téngala en su pantalla de inicio, como una aplicación.',
    cta: 'Instalar Chagra',
    cerrarAria: 'Cerrar',
    iosPaso1: 'Toque el botón Compartir en Safari.',
    iosPaso2: 'Elija “Añadir a pantalla de inicio”.',
  },
  // Bienvenida de PRIMERA VEZ (BienvenidaFinca) — secuencia de 5 momentos.
  // Tono "usted" cordial colombiano, frases cortas (muchos usuarios leen poco).
  bienvenida: {
    eyebrow: 'Bienvenido a Chagra',
    titulo1: 'Esta chagra es suya',
    copy1: 'Un cuaderno de campo que escucha, mira y aprende de su finca.',
    titulo2: 'Cuéntele como a un vecino',
    copy2: 'Sin formularios enredados. Así de simple:',
    capVozTitulo: 'Háblele',
    capVozCopy: 'Con su voz: qué sembró, qué le preocupa.',
    capFotoTitulo: 'Muéstrele la mata',
    capFotoCopy: 'Una foto y le dice qué tiene.',
    capVerifTitulo: 'Respuestas verificadas',
    capVerifCopy: 'Cada consejo va cosido a su fuente.',
    // Herramientas / "juguetes" del campo (voz, cámara, gafas). Mención opcional
    // para el usuario que trae equipo: Chagra lo entiende por voz o por foto.
    capHerramTitulo: 'Sus herramientas del campo',
    capHerramCopy: 'Si tiene micrófono, cámara o gafas, Chagra lo escucha y lo mira igual.',
    // Momento 3 — "Hola Chagra": hablarle con las manos ocupadas (modo campo).
    // HONESTO con el MVP de voz (push-to-talk, D9 de la arquitectura
    // voice-first): se toca el micrófono UNA vez y se habla; la escucha
    // continua siempre-atenta es fase 2 y este copy NO la promete.
    vozTitulo: '¿Manos en la tierra? Háblele',
    vozCopy: 'En el surco, con guantes o con las manos sucias, no tiene que escribir: abra el agente, toque el micrófono y salude.',
    vozEjemplo: '“Hola Chagra, ¿cuándo abono el café?”',
    vozChip1: 'Con guantes puestos',
    vozChip2: 'En pleno surco',
    vozChip3: 'Sin escribir nada',
    vozNota: 'Y Chagra le puede responder con voz, para que no suelte la herramienta.',
    vozFotoAlt: 'Manos campesinas sembrando una plántula en la tierra.',
    // Momento 4 — instalar la app (PWA): el porqué es el campo sin señal.
    instalarTitulo: 'Llévela en el bolsillo',
    instalarCopy: 'Instale Chagra como una app y le sirve hasta donde no llega la señal.',
    instalarPorque1: 'Funciona sin internet, allá arriba en el lote.',
    instalarPorque2: 'Lo que registre queda guardado en su celular, sin gastar datos.',
    instalarPorque3: 'Abre con un toque desde su pantalla, como cualquier app.',
    instalarCta: 'Instalar Chagra ahora',
    instalarListo: 'Listo: Chagra ya está instalada en este equipo.',
    instalarMenuHint: 'En el menú de su navegador (⋮) busque “Instalar aplicación” o “Añadir a pantalla de inicio”.',
    instalarFotoAlt: 'Caficultor cogiendo café en una ladera de Rioblanco, Tolima.',
    titulo3: '¿Dónde está su tierra?',
    copy3: 'Con un toque sabemos su vereda y su altura. Así el consejo llega acertado para su clima.',
    siguiente: 'Siguiente',
    ubicarFinca: 'Ubicar mi finca',
    ahoraNo: 'Ahora no, quiero mirar primero',
    // Explorar con la finca de ejemplo (SKIP rico): puebla Chagra con una finca
    // demostrativa (multi-piso, con historial y problemas) para mirar sin llenar
    // nada. Es el camino del demo público.
    explorarEjemplo: 'Explorar con finca de ejemplo',
    explorarEjemploAria: 'Saltar el registro y explorar con una finca de ejemplo ya poblada',
    explorarEjemploHint: 'Mire una finca completa de una vez — cafetera, papera y de tierra caliente — con sus siembras y problemas reales.',
    saltar: 'Saltar',
    saltarAria: 'Saltar la bienvenida',
    escuchar: 'Escuchar en voz alta',
    pasoDe: (n, total) => `Paso ${n} de ${total}`,
  },
  ui: {
    cargando: 'Cargando...',
    cargandoReportes: 'Cargando reportes...',
    cargandoPlan: 'Cargando plan...',
    cargandoCiclos: 'Cargando tus ciclos...',
    cargandoFotos: 'Cargando fotos...',
    cargandoTareas: 'Cargando tareas...',
    cargandoCatalogo: 'Cargando catálogo...',
    sincronizandoSensores: 'Sincronizando sensores...',
    sincronizandoRegistros: (count) =>
      `Sincronizando ${count} registro${count !== 1 ? 's' : ''}...`,
    sincronizarSensoresBtn: 'Sincronizar Sensores',
    sincronizarOffline: 'Sincronizar Offline...',
    registrarProduccion: 'Registrar Producción',
    guardarGeometria: 'Guardar geometría',
    tareasPendientes: 'Tareas Pendientes',
    configuracionSitio: 'Configuración del sitio',
    confirmarEliminar: '¿Eliminar este reporte? Esta acción no se puede deshacer.',
    eliminarReporte: 'Eliminar reporte',
    cancelarInvestigacion: 'Cancelar investigación',
    guardarPlantas: (count) =>
      `Guardar (${count} ${count === 1 ? 'planta' : 'plantas'})`,
    guardando: 'Guardando…',
    ingresoBitacora: 'Registrar en Bitácora',
    errorReporteCsv: 'No se pudo generar el reporte CSV.',
    errorAbastecer: 'No se pudo abastecer el insumo. Verifique el almacenamiento.',
    errorGps: 'No se pudo iniciar la captura GPS.',
    errorPermisoNegado: 'Permiso de ubicación denegado. En iPhone: Ajustes > Safari > Ubicación.',
    errorPermisoNegadoAndroid: 'Permiso de ubicación denegado. En iPhone: Ajustes > Safari > Ubicación. En Android: toca el candado de la barra de URL.',
    errorGpsNoDisponible: 'GPS no disponible. Sal al exterior y verifica que el GPS esté activo.',
    errorGpsNoDisponibleDetalle: 'GPS no disponible. Verifica que el GPS esté activo y que estés al exterior (no en sótano / lejos de ventana).',
    errorUbicacion: 'No se pudo obtener tu ubicación.',
    errorTimeout: 'Tiempo agotado esperando al GPS (30s). En iPhone, el GPS puede tardar más al aire libre — espera unos segundos y vuelve a tocar "Mi ubicación".',
    // Bug #57 — trazar caminando: warm-up del GPS antes de empezar el trazo.
    gpsAfinando: 'Afinando GPS… espera a que la señal mejore.',
    confirmarAbastecer: 'Confirmar',
    registrando: 'Registrando…',
  },
  // Strings de la pantalla de Perfil (ADR-050 i18n). Extraídos al añadir el
  // selector de perfil + override del operador (2026-06-19) para mantener el
  // archivo libre de hardcodeos (chagra-i18n/no-hardcoded-spanish).
  perfilScreen: {
    rolOperadorCampo: 'Operador de Campo',
    tituloPantalla: 'Perfil de Usuario',
    agregarFotoPerfil: 'Agregar foto de perfil',
    agregarFoto: 'Agregar foto',
    ubicacionDesc: 'Mapa, piso térmico y cultivos de tu zona',
    guardarCambios: 'Guardar cambios',
    telemetriaVozDesc: 'Registrar eventos del pipeline de voz',
    telemetriaAgenteDesc: 'Ayuda a mejorar el agente. Desactivado por defecto.',
    fincaActivaLabel: 'Finca activa:',
    guardar: 'Guardar',
  },
  // Hero de bienvenida (WelcomeStatsHero) — etiquetas del mini-grid de stats.
  welcomeStats: {
    plantasRegistradas: 'Plantas registradas',
    plantaTuya: 'Planta tuya',
    plantasTuyas: 'Plantas tuyas',
  },
  format,
};

export const MSG = new Proxy(messages, {
  get(target, prop) {
    if (prop === 'format') return target.format;
    return target[prop];
  },
});

export default messages;
