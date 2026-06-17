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
  },
  status: {
    cargando: 'Cargando...',
    sinConexion: 'Sin conexion',
    enLinea: 'En linea',
    sincronizando: 'Sincronizando...',
    pendientes: 'Pendientes',
    errorGeneral: 'Ocurrio un error',
  },
  agente: {
    placeholder: 'Escribe tu consulta...',
    pensando: 'Chagra esta pensando...',
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
  },
  confirm: {
    eliminarItem: 'Esta seguro de eliminar este elemento?',
    descartarCambios: 'Descartar cambios sin guardar?',
  },
  voz: {
    grabando: 'Grabando...',
    procesando: 'Procesando...',
    errorMicrofono: 'No se pudo acceder al microfono',
  },
  onboarding: {
    bienvenido: 'Bienvenido a Chagra',
    comenzar: 'Comenzar',
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
