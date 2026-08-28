/**
 * RedView.jsx — Vista read-only de la red de contactos
 * 
 * Componente que muestra estadísticas y resúmenes de la red
 * de contactos/aliados del usuario.
 */

import { useState } from 'react';
import {
  CONTACT_TYPE_LABELS,
  INTERACTION_TYPE_LABELS,
} from '../../constants/crmConstants.js';

export const RedView = ({ networkStats = null, loading = false }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500" role="status">Cargando red…</div>
      </div>
    );
  }

  if (!networkStats) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles para mostrar
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'contacts', label: 'Contactos' },
    { id: 'interactions', label: 'Interacciones' },
    { id: 'top', label: 'Más Activos' },
  ];

  return (
    <div className="red-view">
      <h2 className="text-xl font-semibold mb-4">Tu Red de Contactos</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id)}
            aria-pressed={selectedTab === tab.id}
            className={`px-4 py-2 transition-colors ${
              selectedTab === tab.id
                ? 'border-b-2 border-green-600 text-green-600 font-semibold'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido según tab */}
      <div className="p-4">
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total de contactos */}
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-3xl font-bold text-green-600">
                {networkStats.totalContactos}
              </h3>
              <p className="text-gray-600">Contactos en tu red</p>
            </div>

            {/* Total de interacciones */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-3xl font-bold text-blue-600">
                {networkStats.totalInteracciones}
              </h3>
              <p className="text-gray-600">Interacciones registradas</p>
            </div>
          </div>
        )}

        {selectedTab === 'contacts' && (
          <div>
            <h3 className="font-semibold mb-3">Contactos por Tipo</h3>
            <div className="space-y-2">
              {Object.entries(networkStats.contactosPorTipo || {}).map(([type, count]) => (
                <div
                  key={type}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span>{CONTACT_TYPE_LABELS[type] || type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(networkStats.contactosPorTipo || {}).length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay contactos registrados</p>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'interactions' && (
          <div>
            <h3 className="font-semibold mb-3">Interacciones por Tipo</h3>
            <div className="space-y-2">
              {Object.entries(networkStats.interaccionesPorTipo || {}).map(([type, count]) => (
                <div
                  key={type}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <span>{INTERACTION_TYPE_LABELS[type] || type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(networkStats.interaccionesPorTipo || {}).length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay interacciones registradas</p>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'top' && (
          <div>
            <h3 className="font-semibold mb-3">Contactos Más Activos</h3>
            <div className="space-y-2">
              {(networkStats.contactosMasActivos || []).map((contact, index) => (
                <div
                  key={contact.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm text-gray-500">
                        {CONTACT_TYPE_LABELS[contact.type] || contact.type}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">
                    {contact.count} {contact.count === 1 ? 'interacción' : 'interacciones'}
                  </span>
                </div>
              ))}
              {(networkStats.contactosMasActivos || []).length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No hay suficientes datos para mostrar
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RedView;
