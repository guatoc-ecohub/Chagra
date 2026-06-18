/**
 * src/data/aprendizaje/guias-demo.js — Datos de demo para guías fenológicas.
 *
 * Este archivo contiene datos hardcoded de ejemplos para el módulo de APRENDIZAJE.
 * TODO: Integrar con fuente de datos real cuando esté disponible (catálogo v3.1+).
 *
 * NOTA: Estos son datos de dominio específicos (manejo agronómico), no strings de UI.
 * Por tanto, están exentos de la regla chagra-i18n/no-hardcoded-spanish.
 */

/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Datos de dominio agronómico, no strings de UI */

export const GUIAS_DEMO = {
  papa: [
    {
      orden: 1,
      nombre: 'Germinación',
      dias: '7-14 días',
      manejo: 'Mantener humedad constante. Proteger de heladas.',
      plaga_ventana: 'Pulguilla de la papa (Epitrix)'
    },
    {
      orden: 2,
      nombre: 'Vegetativo',
      dias: '15-45 días',
      manejo: 'Apilar suavemente tierra (aporcar). Fertilizar orgánico.',
      plaga_ventana: 'Gusano blanco (Premnotrypes)'
    },
    {
      orden: 3,
      nombre: 'Floración',
      dias: '46-60 días',
      manejo: 'Monitorear floración. Riego moderado.',
      plaga_ventana: 'Gorgojo de los andes (Rhigopsidius)'
    },
    {
      orden: 4,
      nombre: 'Fructificación',
      dias: '61-90 días',
      manejo: 'Reducir riego. Dejar secar follaje.',
      plaga_ventana: 'Pudrición blanda (Pectobacterium)'
    },
    {
      orden: 5,
      nombre: 'Cosecha',
      dias: '90-120 días',
      manejo: 'Cosechar en día seco. Curar en oscuridad 2 semanas.',
      plaga_ventana: 'Pudrición seca (Fusarium)'
    },
    {
      orden: 6,
      nombre: 'Producto',
      dias: 'Post-cosecha',
      manejo: 'Guardar en lugar fresco y oscuro. Selecionar semilla.',
      plaga_ventana: 'Polilla de la papa (Phthorimaea)'
    }
  ],
  cafe: [
    {
      orden: 1,
      nombre: 'Germinación',
      dias: '30-60 días',
      manejo: 'Sembrar en semillero con sombra. Riego diario suave.',
      plaga_ventana: 'Hormiga cortadora (Atta)'
    },
    {
      orden: 2,
      nombre: 'Vegetativo',
      dias: '2-6 meses',
      manejo: 'Trasplantar a sitio definitivo. Sombra temporal.',
      plaga_ventana: 'Minador de la hoja (Leucoptera)'
    },
    {
      orden: 3,
      nombre: 'Floración',
      dias: '6-12 meses',
      manejo: 'Regar en floración. Evitar fertilización nitrogenada.',
      plaga_ventana: 'Broca del café (Hypothenemus)'
    },
    {
      orden: 4,
      nombre: 'Fructificación',
      dias: '12-18 meses',
      manejo: 'Monitorear llenado de grano. Control de malezas.',
      plaga_ventana: 'Cercóspora (Cercospora)'
    },
    {
      orden: 5,
      nombre: 'Cosecha',
      dias: '18-24 meses',
      manejo: 'Cosechar cerezas maduras. Separar flor seca.',
      plaga_ventana: 'Ojo de gallo (Mycena)'
    },
    {
      orden: 6,
      nombre: 'Producto',
      dias: 'Post-cosecha',
      manejo: 'Beneficiar: lavar, fermentar, secar. Almacenar seco.',
      plaga_ventana: 'Hongo del almacenamiento (Aspergillus)'
    }
  ]
};

export default GUIAS_DEMO;