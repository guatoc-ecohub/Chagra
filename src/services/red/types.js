/**
 * red/types.js — modelo de datos de la RED humana de Chagra (campesino ↔
 * campesino). Constantes canónicas + typedefs JSDoc. CERO lógica, CERO red,
 * CERO I/O: solo el vocabulario compartido por los servicios de la red.
 *
 * PRINCIPIO RECTOR (del DR de red groundeado): la red social y la reputación
 * NO se construyen pidiéndole datos al campesino ni con votos — son
 * SUBPRODUCTO de transacciones del mercado que YA ocurren. Cada trato cerrado
 * codifica quién cultiva qué, en qué vereda, con qué fiabilidad de entrega y
 * qué calidad calificada. De ahí sale el grafo (productor–cultivo–vereda) y la
 * reputación GANADA, anclada a hechos verificables. Esto evita el cold-start y
 * sirve desde n muy pequeño (piloto de ~15 productores).
 *
 * ANTI-EXTRACTIVO (regla inviolable): el dato crudo vive en el dispositivo por
 * default. La compartición es opt-in en 3 niveles (ver SHARE_LEVEL). Nada se
 * monetiza en la capa de pares — el mercado es la única superficie de dinero.
 *
 * @module services/red/types
 */

/**
 * Niveles de compartición opt-in (anti-extractivo). El dato nace PRIVADO; el
 * productor decide, paso a paso, cuánto sale de su dispositivo.
 *
 *   1 PRIVADO     — solo en el dispositivo. NUNCA entra al grafo ni al
 *                   matchmaking. Es el default seguro.
 *   2 PARES       — compartido con los pares de la red: alimenta el grafo
 *                   social + la reputación + el "pregúntele al vecino". El MVP
 *                   opera en niveles 1–2.
 *   3 CANONIZADO  — un sabedor/experto lo canoniza y pasa a conocimiento
 *                   comunitario (puente con el grafo DR-SOCIAL-1:
 *                   Caso —SE_VUELVE→ ConocimientoComunitario). Se MODELA aquí
 *                   aunque el MVP todavía no lo ejecute.
 *
 * @readonly
 * @enum {number}
 */
export const SHARE_LEVEL = Object.freeze({
  PRIVADO: 1,
  PARES: 2,
  CANONIZADO: 3,
});

/** Etiquetas humanas de cada nivel (usted, español de Colombia). */
export const SHARE_LEVEL_COPY = Object.freeze({
  [SHARE_LEVEL.PRIVADO]: {
    label: 'Privado',
    explica: 'Este dato se queda solo en su teléfono. Nadie más lo ve.',
  },
  [SHARE_LEVEL.PARES]: {
    label: 'Con los vecinos',
    explica: 'Comparte este trato con la red de pares: ayuda a que un vecino lo encuentre cuando busque quién cultiva lo mismo cerca.',
  },
  [SHARE_LEVEL.CANONIZADO]: {
    label: 'Saber comunitario',
    explica: 'Un sabedor de la comunidad revisó su práctica y la volvió conocimiento compartido para todos.',
  },
});

/**
 * Resultado de ENTREGA de un trato (el hecho verificable que gana fiabilidad).
 * @readonly
 * @enum {string}
 */
export const ENTREGA = Object.freeze({
  ENTREGADO: 'entregado',
  PARCIAL: 'parcial',
  NO_ENTREGADO: 'no_entregado',
  PENDIENTE: 'pendiente',
});

/**
 * Quién confirmó el trato (procedencia de la reputación). Cuanto más cruzada
 * la confirmación, más fuerte el hecho: `ambos` (comprador + productor) es el
 * ancla más sólida; `productor` (solo el vendedor lo dice) es la más débil.
 * @readonly
 * @enum {string}
 */
export const CONFIRMADO_POR = Object.freeze({
  PRODUCTOR: 'productor',
  COMPRADOR: 'comprador',
  AMBOS: 'ambos',
  SISTEMA: 'sistema',
});

/**
 * Nivel de reputación de un productor para un cultivo. Espeja el idioma
 * verde/ámbar/rojo del semáforo de confianza (semaforoConfianza.js), pero para
 * un actor humano, no para un dato: aquí el color resume HECHOS de entrega, no
 * curaduría de fuentes.
 * @readonly
 * @enum {string}
 */
export const NIVEL_REPUTACION = Object.freeze({
  NUEVO: 'nuevo', // aún sin historial suficiente — honesto, no penaliza
  VERDE: 'verde', // entregó parejo y con buena calidad
  AMBAR: 'ambar', // respaldo parcial; conviene confirmar
  ROJO: 'rojo', // historial de fallas de entrega demostradas
});

/**
 * @typedef {Object} RedTransaction
 * Un TRATO cerrado del mercado, registrado como HECHO append-only. Es el ancla
 * de todo el grafo y la reputación. Referencia opcionalmente la oferta del
 * mercado que lo originó.
 *
 * @property {string} id                     Id único generado en cliente.
 * @property {number} createdAt              Epoch ms (ordena el timeline).
 * @property {string|null} ofertaId          Ref a marketplace_ofertas (o null).
 * @property {string} productorHash          Id pseudonimizado del vendedor
 *                                           (operatorIdentityService, Ley 1581).
 *                                           Es el ancla de la reputación.
 * @property {string|null} compradorHash     Id pseudonimizado del comprador.
 * @property {string} producto               Nombre del producto (texto libre).
 * @property {string|null} cultivoId         Slug de especie resuelto (o null).
 * @property {string} categoria              Id de categoría del mercado.
 * @property {string} vereda                 Vereda del trato.
 * @property {string} municipio              Municipio/departamento.
 * @property {number} cantidad               Cantidad transada (> 0).
 * @property {string} unidad                 Unidad (kg, arroba, bulto…).
 * @property {string} entrega       Resultado de la entrega.
 * @property {number|null} calidad           Calificación de calidad 1..5 (o null).
 * @property {string} confirmadoPor  Procedencia.
 * @property {number} shareLevel             Nivel de compartición opt-in (1..3).
 */

/**
 * @typedef {Object} Reputacion
 * Reputación DERIVADA (materializada) de un productor para UN cultivo. Nunca se
 * persiste como fuente de verdad — se recomputa desde los tratos (ADR-019: el
 * log manda, esto es cache reconstruible).
 *
 * @property {string} productorHash
 * @property {string} producto
 * @property {string} productoNorm          Producto normalizado (matching).
 * @property {string} vereda                Vereda predominante del productor.
 * @property {string} municipio             Municipio predominante.
 * @property {number} nTransacciones        Total de tratos considerados (volumen).
 * @property {number} nConfirmadas          Tratos con entrega ya resuelta.
 * @property {number} nEntregados           Entregas cumplidas (parcial = 0.5).
 * @property {number} fiabilidad            0..1 con suavizado bayesiano (n bajo → 0.5).
 * @property {number|null} calidadPromedio  Promedio 1..5 (o null si sin calificar).
 * @property {number|null} calidadNorm      Calidad normalizada 0..1 (o null).
 * @property {number} reciente              Timestamp del trato más reciente.
 * @property {number} score                 0..1 compuesto para ranking.
 * @property {string} nivel  Semáforo humano.
 * @property {string} motivo                Motivo legible del nivel.
 */

/**
 * @typedef {Object} SocialGraph
 * Grafo social derivado de los tratos compartibles. Nodos + aristas agregadas.
 *
 * @property {{ productores: string[], cultivos: string[], veredas: string[] }} nodos
 * @property {Array<{productorHash:string, producto:string, cultivoId:string|null, count:number, entregados:number, reciente:number}>} cultiva   Arista CULTIVA.
 * @property {Array<{productorHash:string, vereda:string, municipio:string, count:number}>} ubicadoEn  Arista EN (productor→vereda).
 * @property {Array<{productorHash:string, compradorHash:string, count:number}>} entregoA  Arista ENTREGO_A.
 * @property {{ tratos:number, compartidos:number, minShareLevel:number }} meta
 */

/**
 * @typedef {Object} PeerMatch
 * Un vecino competente encontrado por el matchmaking.
 * @property {string} productorHash
 * @property {string} producto
 * @property {string} nivel
 * @property {number} score
 * @property {number} proximidad            3 misma vereda · 2 mismo municipio · 1 más lejos.
 * @property {string} proximidadLabel
 * @property {string} vereda
 * @property {string} municipio
 * @property {number} nTransacciones
 * @property {number} reciente
 */
