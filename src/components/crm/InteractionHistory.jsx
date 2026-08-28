/**
 * InteractionHistory.jsx — Historial de interacciones del CRM
 *
 * Componente que muestra el historial de interacciones de un contacto,
 * ordenado cronológicamente (más reciente primero).
 */

import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE,
} from '../../constants/crmConstants.js';

export const InteractionHistory = ({
  interactions = [],
  contactName = '',
  onNewInteraction = null,
}) => {
  const getInteractionIcon = (type) => {
    const icons = {
      [INTERACTION_TYPE.VISITA]: '🚜',
      [INTERACTION_TYPE.INTERCAMBIO]: '🌱',
      [INTERACTION_TYPE.VENTA]: '💰',
      [INTERACTION_TYPE.ASESORIA]: '📋',
      [INTERACTION_TYPE.LLAMADA]: '📞',
      [INTERACTION_TYPE.MENSAJE]: '💬',
    };
    return icons[type] || '📌';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDetails = (interaction) => {
    const details = interaction.attributes?.details || {};

    if (details.intercambio) {
      const { especie, cantidad, unidad } = details.intercambio;
      return `Intercambio: ${cantidad || 0} ${unidad || ''} de ${especie || 'especie desconocida'}`;
    }

    if (details.venta) {
      const { producto, cantidad, unidad, valor } = details.venta;
      return `Venta: ${cantidad || 0} ${unidad || ''} de ${producto || ''}${
        valor ? ` por $${valor}` : ''
      }`;
    }

    return null;
  };

  return (
    <div className="interaction-history">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          Historial de {contactName || 'Interacciones'}
        </h2>
        {onNewInteraction && (
          <button
            onClick={onNewInteraction}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Nueva Interacción
          </button>
        )}
      </div>

      {/* Lista de interacciones */}
      <div className="space-y-3">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay interacciones registradas
          </div>
        ) : (
          interactions.map((interaction) => {
            const interactionType = interaction.attributes?.crm_interaction_type;
            const icon = getInteractionIcon(interactionType);
            const detailsText = formatDetails(interaction);

            return (
              <div
                key={interaction.id}
                className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Icono */}
                  <div className="text-2xl">{icon}</div>

                  {/* Contenido */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {INTERACTION_TYPE_LABELS[interactionType] || 'Interacción'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(interaction.timestamp || interaction.attributes?.timestamp)}
                        </p>
                      </div>

                      {/* Estado */}
                      {interaction.attributes?.status && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            interaction.attributes.status === 'done'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {interaction.attributes.status === 'done' ? 'Completada' : 'Pendiente'}
                        </span>
                      )}
                    </div>

                    {/* Notas */}
                    {interaction.attributes?.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        {interaction.attributes.notes}
                      </p>
                    )}

                    {/* Detalles formateados */}
                    {detailsText && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded">
                        {detailsText}
                      </p>
                    )}

                    {/* Resultado */}
                    {interaction.attributes?.result && (
                      <p className="text-sm text-blue-600 mt-2">
                        ✅ {interaction.attributes.result}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contador */}
      {interactions.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {interactions.length} {interactions.length === 1 ? 'interacción' : 'interacciones'}
        </div>
      )}
    </div>
  );
};

export default InteractionHistory;
