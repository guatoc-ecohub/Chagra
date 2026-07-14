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
    sinConexion: 'Sin señal',
    enLinea: 'Con señal',
    sincronizando: 'Poniendo todo al día...',
    pendientes: 'Pendientes',
    errorGeneral: 'Algo no salió bien. Inténtelo otra vez.',
    errorSincronizar: 'No se pudieron subir los cambios. Chagra vuelve a intentar solo.',
    dataLossCheckFailed: 'No se pudo verificar el estado de pérdida de datos.',
    dataRecoveryFailed: 'No se pudieron recuperar los datos desde FarmOS.',
    backupReadFailed: 'No se pudo leer el archivo.',
    sinConexionPendientes: (count) =>
      `Sin señal. ${count} registro${count !== 1 ? 's' : ''} guardado${count !== 1 ? 's' : ''} en su teléfono.`,
    sinConexionSinPendientes: 'Sin señal. Sus datos quedaron guardados en el teléfono.',
  },
  agente: {
    placeholder: 'Cuéntele a Chagra qué pasa en su finca...',
    pensando: 'Chagra está pensando...',
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
    // Loading contextual (lever de velocidad PERCIBIDA): PASOS visibles dentro
    // de cada fase del "pensando". La fase REAL la marca el pipeline
    // (thinkingPhase en AgentScreen); dentro de 'consultando' — el tramo más
    // largo (grounding: catálogo + grafo AGE + guards/fuentes) — los pasos
    // rotan temporizados (~2s, sin loop: avanzan y se quedan en el último)
    // para que la espera de 22-34s se sienta viva y con avance, no colgada.
    // Ícono + texto corto: legible para baja alfabetización.
    fasesPasos: {
      transcribiendo: [{ icon: '🎙️', texto: 'Escuchando tu voz' }],
      entendiendo: [{ icon: '🌱', texto: 'Entendiendo tu pregunta' }],
      consultando: [
        { icon: '📖', texto: 'Consultando el catálogo' },
        { icon: '🌾', texto: 'Revisando el grafo de tu finca' },
        { icon: '🔍', texto: 'Verificando las fuentes' },
      ],
      escribiendo: [{ icon: '✍️', texto: 'Preparando la respuesta' }],
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
    eliminarItem: '¿Seguro que quiere borrar esto? No se puede deshacer.',
    descartarCambios: '¿Salir sin guardar? Se pierde lo que escribió.',
  },
  voz: {
    grabando: 'Grabando...',
    procesando: 'Un momento, estoy escuchando...',
    errorMicrofono: 'No pudimos usar el micrófono. Revise el permiso en su teléfono.',
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
    sincronizandoSensores: 'Poniendo los sensores al día...',
    sincronizandoRegistros: (count) =>
      `Subiendo ${count} registro${count !== 1 ? 's' : ''}...`,
    sincronizarSensoresBtn: 'Poner sensores al día',
    sincronizarOffline: 'Guardando...',
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
    errorMarcarPaso: 'No se pudo marcar el paso como hecho. Intente de nuevo en un momento.',
    errorReporteCsv: 'No se pudo crear el archivo del informe. Inténtelo otra vez.',
    errorAbastecer: 'No se pudo abastecer el insumo. Inténtelo otra vez en un momento.',
    errorGps: 'No pudimos empezar a marcar la ubicación. Inténtelo de nuevo.',
    errorPermisoNegado: 'Permiso de ubicación denegado. En iPhone: Ajustes > Safari > Ubicación.',
    errorPermisoNegadoAndroid: 'Permiso de ubicación denegado. En iPhone: Ajustes > Safari > Ubicación. En Android: toca el candado de la barra de URL.',
    errorGpsNoDisponible: 'GPS no disponible. Sal al exterior y verifica que el GPS esté activo.',
    errorGpsNoDisponibleDetalle: 'GPS no disponible. Verifica que el GPS esté activo y que estés al exterior (no en sótano / lejos de ventana).',
    errorUbicacion: 'No pudimos encontrar tu ubicación. Inténtalo de nuevo.',
    errorTimeout: 'El GPS se demoró más de la cuenta. Al aire libre puede tardar un poco — espera unos segundos y vuelve a tocar "Mi ubicación".',
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
    telemetriaVozDesc: 'Ayuda a mejorar cómo Chagra escucha su voz',
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
  // Modo campo / wake-word "hola chagra" (#2088) — ver ModoCampoPanel.jsx,
  // EnrollmentModoCampo.jsx, wakeWordService.js.
  modoCampo: {
    estadoCargando: 'Cargando…',
    estadoCargandoModelo: 'Cargando modelo…',
    estadoCargandoVoz: 'Cargando tu voz…',
    estadoPreparando: 'Preparando el oído de Chagra por primera vez… (unos segundos; después queda listo al instante)',
    estadoEscuchando: 'Escuchando «hola chagra»',
    estadoError: 'Hubo un problema',
    grabandoHableAhora: 'Grabando… hable ahora',
    errorCargaLibs: 'No se pudo cargar {src}',
  },
  // Recorrido de finca por voz (useRecorridoStore / recorridoService).
  recorrido: {
    errorRegistro: 'No se pudo registrar la observación',
  },
  format,
};

export const MSG = new Proxy(messages, {
  get(target, prop) {
    if (prop === 'format') return target.format;
  // ── Shell prod.chagra.app (2026-07-14) ──────────────────────
  shell: {
    valleTitulo: 'El valle de su finca',
    valleLema: 'Toque un mundo para entrar. Su finca es un lugar, no un menú.',
    explorarSinLogin: 'Explore el valle. Para entrar a los mundos, inicie sesión.',
    iniciarSesion: 'Iniciar sesión',
    cerrarSesion: 'Cerrar sesión',
    volverAlValle: 'Volver al valle',
    menu: 'Menú',
    perfil: 'Perfil',
    agente: 'Agente',
    mundos: 'Mundos',
    sierraGlobal: 'Sierra Nevada',
    galeriaPisos: 'Galería por piso térmico',
    offlineTitulo: 'Sin conexión',
    offlineMensaje: 'No hay conexión a internet. Puede explorar el valle y ver lo que ya tiene guardado.',
    actualizando: 'Actualizando Chagra...',
    actualizacionLista: 'Nueva versión disponible. Recargue para actualizar.',
  },

  return target[prop];
  },
});

export default messages;
