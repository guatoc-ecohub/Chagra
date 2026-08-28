import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ContactosPanel from '../components/crm/ContactosPanel.jsx';
import InteractionHistory from '../components/crm/InteractionHistory.jsx';
import RedView from '../components/crm/RedView.jsx';

const CONTACTS = [
  { id: 'ana', attributes: { name: 'Ana Cuaran', crm_contact_type: 'campesino', status: 'active', vereda: 'El Rosal', municipio: 'La Unión', phone: '300 000 0000' } },
  { id: 'diego', attributes: { name: 'Diego Ramos', crm_contact_type: 'tecnico', status: 'active', vereda: 'La Esperanza', municipio: 'La Unión' } },
  { id: 'semillas', attributes: { name: 'Semillas del Alto', crm_contact_type: 'proveedor', status: 'active', municipio: 'Pasto' } },
];

const INTERACTIONS = [
  { id: 'i-ana-1', asset_id: 'ana', timestamp: 1735689600, attributes: { crm_interaction_type: 'intercambio', status: 'done', notes: 'Intercambio de semilla criolla.', details: { intercambio: { especie: 'fríjol', cantidad: 2, unidad: 'kg' } } } },
  { id: 'i-ana-2', asset_id: 'ana', timestamp: 1733011200, attributes: { crm_interaction_type: 'visita', status: 'done', result: 'Acordamos visita al semillero.' } },
  { id: 'i-diego-1', asset_id: 'diego', timestamp: 1734220800, attributes: { crm_interaction_type: 'asesoria', status: 'done', notes: 'Revisión de cobertura viva.' } },
  { id: 'i-semillas-1', asset_id: 'semillas', timestamp: 1734480000, attributes: { crm_interaction_type: 'venta', status: 'done', details: { venta: { producto: 'Semilla de maíz', cantidad: 1, unidad: 'kg' } } } },
];

const NETWORK_STATS = {
  totalContactos: CONTACTS.length,
  totalInteracciones: INTERACTIONS.length,
  contactosPorTipo: { campesino: 1, tecnico: 1, proveedor: 1 },
  interaccionesPorTipo: { intercambio: 1, visita: 1, asesoria: 1, venta: 1 },
  contactosMasActivos: [
    { id: 'ana', name: 'Ana Cuaran', count: 2, type: 'campesino' },
    { id: 'diego', name: 'Diego Ramos', count: 1, type: 'tecnico' },
    { id: 'semillas', name: 'Semillas del Alto', count: 1, type: 'proveedor' },
  ],
};

export default function CrmAgroecologico({ onBack }) {
  const [selectedContact, setSelectedContact] = useState(CONTACTS[0]);
  const history = useMemo(
    () => INTERACTIONS.filter((interaction) => interaction.asset_id === selectedContact.id),
    [selectedContact.id],
  );

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start gap-4">
          {onBack && (
            <button type="button" onClick={onBack} className="p-2 rounded text-green-800 hover:bg-green-100" aria-label="Volver al inicio">
              <ArrowLeft aria-hidden="true" />
            </button>
          )}
          <div>
            <p className="text-sm text-green-800 font-semibold">Mockup navegable</p>
            <h1 className="text-3xl font-bold">CRM agroecológico</h1>
            <p className="text-stone-600 mt-1">Contactos, historial y red derivados de actividades. Los datos son de muestra.</p>
          </div>
        </header>

        <section className="grid lg:grid-cols-2 gap-6" aria-label="Contactos e historial">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <ContactosPanel contacts={CONTACTS} onContactSelect={setSelectedContact} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <InteractionHistory interactions={history} contactName={selectedContact.attributes.name} />
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-5" aria-label="Resumen de la red">
          <RedView networkStats={NETWORK_STATS} />
        </section>
      </div>
    </main>
  );
}
