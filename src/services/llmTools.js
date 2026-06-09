/**
 * llmTools.js — Tool registry para function calling.
 *
 * Implementa el patrón de registry paralelo a moduleRegistry.js.
 * Herramientas mínimas para DR-034 + tool use básico.
 *
 * Pre-requisito: un modelo que soporte function calling.
 * Algunos modelos locales NO soportan function calling.
 */

import useAssetStore from '../store/useAssetStore';

/**
 * @typedef {Object} ToolDefinition
 * @property {string} name - nombre de la tool (e.g., "agendar_riego")
 * @property {string} description - descripción en lenguaje natural para el LLM
 * @property {Object} parameters - JSON Schema de inputs
 * @property {Function} handler - función async que ejecuta la tool
 * @property {boolean} requiresGate - true para acciones write, false para read-only
 * @property {boolean} [enabledForLLM=true] - false hasta que la persistencia esté conectada
 */

/**
 * @type {Object.<string, ToolDefinition>}
 */
const tools = {};

/**
 * Registrar una nueva tool en el registry.
 * @param {ToolDefinition} tool
 */
export function registerTool(tool) {
  if (!tool.name || !tool.handler) {
    throw new Error('Tool must have name and handler');
  }
  tools[tool.name] = tool;
}

/**
 * Obtener una tool por nombre.
 * @param {string} name
 * @returns {ToolDefinition|null}
 */
export function getTool(name) {
  return tools[name] || null;
}

/**
 * Listar todas las tools registradas.
 * @returns {Array<{name: string, description: string, requiresGate: boolean}>}
 */
export function listTools() {
  return Object.values(tools).map((t) => ({
    name: t.name,
    description: t.description,
    requiresGate: t.requiresGate,
  }));
}

/**
 * Obtener tools en formato OpenAI function calling (para LLM).
 * @returns {Array}
 */
export function getToolsForLLM() {
  return Object.values(tools)
    .filter((t) => t.enabledForLLM !== false)
    .map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: t.parameters?.properties || {},
        required: t.parameters?.required || [],
      },
    },
    }));
}

// =============================================================================
// Herramientas implementadas
// =============================================================================

/**
 * Tool: crear_log
 * Crear un nuevo registro/log en Chagra para un asset.
 */
registerTool({
  name: 'crear_log',
  description: 'Crear un nuevo registro/log en Chagra para un activo (planta, estructura, etc.)',
  parameters: {
    type: 'object',
    properties: {
      asset_id: {
        type: 'string',
        description: 'ID del activo (asset) al que associate el log',
      },
      log_type: {
        type: 'string',
        enum: ['log--observation', 'log--harvest', 'log--task', 'log--input', 'log--split'],
        description: 'Tipo de log a crear',
      },
      notes: {
        type: 'string',
        description: 'Notas o descripción del log (opcional)',
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha y hora del log (ISO 8601). Si no se especifica, usa ahora.',
      },
      quantity: {
        type: 'number',
        description: 'Cantidad harvested/aplicada (para log_type=harvest/input)',
      },
      unit: {
        type: 'string',
        description: 'Unidad de la cantidad (kg, g, lb, unidades, ml, L)',
      },
    },
    required: ['asset_id', 'log_type'],
  },
  handler: async (params) => {
    try {
      const { asset_id, log_type, notes, timestamp, quantity, unit } = params;
      const store = useAssetStore.getState();
      
      const logData = {
        type: log_type,
        attributes: {
          notes: notes || '',
          timestamp: timestamp || new Date().toISOString(),
          ...(quantity && unit && { quantity: { value: quantity, unit } }),
        },
        relationships: {
          asset: { data: { type: 'asset', id: asset_id } },
        },
      };

      if (typeof store.addLog === 'function') {
        await store.addLog(asset_id, logData);
      }
      
      return { success: true, message: `Log ${log_type} creado para asset ${asset_id}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  requiresGate: true,
  // useAssetStore no expone addLog. No ofrecer esta acción al LLM hasta
  // conectarla a useLogStore/FarmOS y probar persistencia real.
  enabledForLLM: false,
});

/**
 * Tool: actualizar_planta
 * Actualizar información de una planta/asset.
 */
registerTool({
  name: 'actualizar_planta',
  description: 'Actualizar información de una planta o activo en Chagra',
  parameters: {
    type: 'object',
    properties: {
      asset_id: {
        type: 'string',
        description: 'ID del activo a actualizar',
      },
      name: {
        type: 'string',
        description: 'Nuevo nombre para el activo (opcional)',
      },
      notes: {
        type: 'string',
        description: 'Nuevas notas (opcional)',
      },
      status: {
        type: 'string',
        enum: ['active', 'archived', 'falling'],
        description: 'Nuevo estado del activo',
      },
    },
    required: ['asset_id'],
  },
  handler: async (params) => {
    try {
      const { asset_id, name, notes, status } = params;
      const store = useAssetStore.getState();
      
      const updates = {};
      if (name) updates.name = name;
      if (notes) updates.notes = notes;
      if (status) updates.status = status;

      if (typeof store.updateAsset === 'function') {
        await store.updateAsset(asset_id, updates);
      }
      
      return { success: true, message: `Asset ${asset_id} actualizado` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  requiresGate: true,
  // El handler actual no satisface la firma updateAsset(assetType, asset,
  // pendingTxs). Mantener fuera del function calling evita un falso éxito.
  enabledForLLM: false,
});

/**
 * Tool: agendar_riego
 * Programar riego para un cultivo.
 */
registerTool({
  name: 'agendar_riego',
  description: 'Programar riego para un cultivo o planta',
  parameters: {
    type: 'object',
    properties: {
      asset_id: {
        type: 'string',
        description: 'ID del activo (cultivo) para programar riego',
      },
      scheduled_time: {
        type: 'string',
        format: 'date-time',
        description: 'Fecha y hora programada para el riego (ISO 8601)',
      },
      duration_minutes: {
        type: 'number',
        description: 'Duración del riego en minutos',
      },
      method: {
        type: 'string',
        enum: ['goteo', 'aspersion', 'manual', 'inundacion'],
        description: 'Método de riego a usar',
      },
      notes: {
        type: 'string',
        description: 'Notas adicionales sobre el riego',
      },
    },
    required: ['asset_id', 'scheduled_time'],
  },
  handler: async (params) => {
    try {
      const { asset_id, scheduled_time, duration_minutes, method, notes } = params;
      const store = useAssetStore.getState();
      
      const logData = {
        type: 'log--task',
        attributes: {
          notes: `Riego programado${method ? ` (${method})` : ''}${duration_minutes ? ` - ${duration_minutes} min` : ''}${notes ? `. ${notes}` : ''}`,
          timestamp: scheduled_time,
          status: 'pending',
        },
        relationships: {
          asset: { data: { type: 'asset', id: asset_id } },
        },
      };

      if (typeof store.addLog === 'function') {
        await store.addLog(asset_id, logData);
      }
      
      return { 
        success: true, 
        message: `Riego programado para ${new Date(scheduled_time).toLocaleString('es-CO')}` 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  requiresGate: true,
  // Igual que crear_log: todavía no existe addLog en useAssetStore.
  enabledForLLM: false,
});

/**
 * Tool: query_corpus_dr034
 * Buscar información en el corpus DR-034 de ciclo de especies.
 */
registerTool({
  name: 'query_corpus_dr034',
  description: 'Buscar información en el corpus DR-034 de ciclo de especies agroecológicas',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Pregunta o búsqueda en lenguaje natural',
      },
      species: {
        type: 'string',
        enum: ['lechuga', 'fresa', 'tomate', 'tomate_chonto', 'cafe', 'aguacate', 'aguacate_hass'],
        description: 'Filtrar por especie específica (opcional)',
      },
    },
    required: ['query'],
  },
  handler: async (params) => {
    try {
      const { query, species } = params;
      
      const speciesMap = {
        'lechuga': 'lechuga',
        'fresa': 'fresa', 
        'tomate': 'tomate_chonto',
        'tomate_chonto': 'tomate_chonto',
        'cafe': null,
        'aguacate': null,
        'aguacate_hass': null,
      };
      
      const fileName = species ? speciesMap[species] : null;
      
      if (!fileName) {
        return { 
          success: false, 
          error: `No hay corpus disponible para ${species || 'ninguna especie'}. Disponibles: lechuga, fresa, tomate` 
        };
      }
      
      const response = await fetch(`${import.meta.env.BASE_URL}cycle-content/${fileName}.json`);
      if (!response.ok) {
        return { 
          success: false, 
          error: `No se pudo cargar el corpus de ${species}` 
        };
      }
      
      const corpusData = await response.json();
      const queryLower = query.toLowerCase();
      const results = [];
      
      const searchInObject = (obj, path = '') => {
        if (typeof obj === 'string') {
          if (obj.toLowerCase().includes(queryLower)) {
            results.push({ path, content: obj.slice(0, 500) });
          }
        } else if (Array.isArray(obj)) {
          obj.forEach((item, i) => searchInObject(item, `${path}[${i}]`));
        } else if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, value]) => 
            searchInObject(value, path ? `${path}.${key}` : key)
          );
        }
      };
      
      searchInObject(corpusData);
      
      if (results.length === 0) {
        return { 
          success: true, 
          message: `No se encontró información específica para "${query}" en el corpus de ${species}`,
          results: [],
        };
      }
      
      return {
        success: true,
        species,
        query,
        results: results.slice(0, 10),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  requiresGate: false,
});

export default {
  registerTool,
  getTool,
  listTools,
  getToolsForLLM,
};
