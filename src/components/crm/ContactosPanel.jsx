/**
 * ContactosPanel.jsx — Panel de contactos del CRM agroecológico
 * 
 * Componente que muestra la lista de contactos/aliados con filtros
 * y acciones básicas (crear, ver historial).
 */

import { useState, useMemo } from 'react';
import {
  CONTACT_TYPE,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS,
  CONTACT_STATUS_CONFIG,
} from '../../constants/crmConstants.js';

export const ContactosPanel = ({
  contacts = [],
  onContactSelect = null,
  onNewContact = null,
  showFilters = true,
}) => {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.attributes?.contact_type === filterType);
    }

    // Filtrar por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.attributes?.status === filterStatus);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const name = (c.attributes?.name || '').toLowerCase();
        const vereda = (c.attributes?.vereda || '').toLowerCase();
        return name.includes(term) || vereda.includes(term);
      });
    }

    return filtered;
  }, [contacts, filterType, filterStatus, searchTerm]);

  const getStatusConfig = (status) => {
    return CONTACT_STATUS_CONFIG[status] || CONTACT_STATUS_CONFIG[CONTACT_STATUS.ARCHIVADO];
  };

  return (
    <div className="contactos-panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Contactos</h2>
        {onNewContact && (
          <button
            type="button"
            onClick={onNewContact}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Nuevo Contacto
          </button>
        )}
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Búsqueda */}
          <div>
            <input
              type="text"
              aria-label="Buscar contactos"
              placeholder="Buscar por nombre o vereda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Filtro por tipo */}
          <div>
            <select
              aria-label="Filtrar contactos por tipo"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estado */}
          <div>
            <select
              aria-label="Filtrar contactos por estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos los estados</option>
              {Object.values(CONTACT_STATUS_CONFIG).map((config) => (
                <option key={config.id} value={config.id}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Lista de contactos */}
      <div className="space-y-2">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay contactos que coincidan con los filtros
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const statusConfig = getStatusConfig(contact.attributes?.status);
            const content = (
              <>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {contact.attributes?.name || 'Sin nombre'}
                      </h3>
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: statusConfig.color,
                          color: statusConfig.textColor,
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {CONTACT_TYPE_LABELS[contact.attributes?.crm_contact_type] || 'Contacto'}
                    </p>
                    {(contact.attributes?.vereda || contact.attributes?.municipio) && (
                      <p className="text-sm text-gray-500 mt-1">
                        {contact.attributes?.vereda && `📍 ${contact.attributes.vereda}`}
                        {contact.attributes?.municipio && `, ${contact.attributes.municipio}`}
                      </p>
                    )}
                    {contact.attributes?.phone && (
                      <p className="text-sm text-gray-500 mt-1">
                        📞 {contact.attributes.phone}
                      </p>
                    )}
                  </div>
                  {onContactSelect && <span className="text-gray-400" aria-hidden="true">→</span>}
                </div>
              </>
            );

            if (onContactSelect) {
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onContactSelect(contact)}
                  aria-label={`Ver historial de ${contact.attributes?.name || 'contacto'}`}
                  className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:shadow-md transition-colors cursor-pointer"
                >
                  {content}
                </button>
              );
            }
            return (
              <div
                key={contact.id}
                className="p-4 border rounded-lg"
              >
                {content}
              </div>
            );
          })
        )}
      </div>

      {/* Contador */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Mostrando {filteredContacts.length} de {contacts.length} contactos
      </div>
    </div>
  );
};

export default ContactosPanel;
