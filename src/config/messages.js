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
