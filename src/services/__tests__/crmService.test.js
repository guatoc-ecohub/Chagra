import { beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({
  assetPut: vi.fn(), assetGet: vi.fn(), assetGetByType: vi.fn(),
  logsPut: vi.fn(), logsByAsset: vi.fn(), logsByType: vi.fn(),
}));

vi.mock('../../db/assetCache.js', () => ({
  assetCache: {
    put: cache.assetPut,
    getAsset: cache.assetGet,
    getByType: cache.assetGetByType,
  },
}));
vi.mock('../../db/logCache.js', () => ({
  logCache: {
    put: cache.logsPut,
    getLogsByAsset: cache.logsByAsset,
    getByType: cache.logsByType,
  },
}));

import {
  CONTACT_STATUS,
  CONTACT_TYPE,
  INTERACTION_TYPE,
  createContact,
  createInteraction,
  getAllInteractions,
  getContactById,
  getContactHistory,
  getContactWithHistory,
  getContacts,
  getNetworkStats,
  searchContacts,
  updateContact,
} from '../crmService.js';

const contact = (id, name, type = CONTACT_TYPE.CAMPESINO, status = CONTACT_STATUS.ACTIVO) => ({
  id, type: 'asset--person', attributes: { name, crm_contact_type: type, status },
});
const interaction = (id, contactId, type = INTERACTION_TYPE.VISITA, timestamp = 100) => ({
  id, type: 'log--activity', asset_id: contactId, timestamp,
  attributes: { crm_interaction_type: type, status: 'done' },
  relationships: { asset: { data: { id: contactId, type: 'asset--person' } } },
});

describe('crmService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    cache.assetPut.mockResolvedValue();
    cache.logsPut.mockResolvedValue();
    cache.assetGetByType.mockResolvedValue([]);
    cache.assetGet.mockResolvedValue(null);
    cache.logsByAsset.mockResolvedValue([]);
    cache.logsByType.mockResolvedValue([]);
  });

  it('creates a pending person contact with only the minimal CRM attributes', async () => {
    const created = await createContact({ name: '  Juana  ', contact_type: CONTACT_TYPE.TECNICO, vereda: 'La Esperanza' });

    expect(created.type).toBe('asset--person');
    expect(created.attributes).toMatchObject({ name: 'Juana', crm_contact_type: 'tecnico', status: 'active', vereda: 'La Esperanza' });
    expect(created._pending).toBe(true);
    expect(cache.assetPut).toHaveBeenCalledWith('person', created);
  });

  it('rejects invalid contact input', async () => {
    await expect(createContact({ name: '' })).rejects.toThrow('El nombre es obligatorio');
    await expect(createContact({ name: 'Juana', contact_type: 'comprador' })).rejects.toThrow('Tipo de contacto no válido');
  });

  it('returns only CRM-marked people with filters and search', async () => {
    const juana = contact('1', 'Juana', CONTACT_TYPE.TECNICO);
    const juan = contact('2', 'Juan', CONTACT_TYPE.CAMPESINO, CONTACT_STATUS.ARCHIVADO);
    cache.assetGetByType.mockResolvedValue([juan, { id: 'operator', type: 'asset--person', attributes: { name: 'Operador' } }, juana]);

    await expect(getContacts({ contact_type: CONTACT_TYPE.TECNICO })).resolves.toEqual([juana]);
    await expect(getContacts({ status: CONTACT_STATUS.ARCHIVADO })).resolves.toEqual([juan]);
    await expect(searchContacts('juan')).resolves.toEqual([juan, juana]);
    expect(cache.assetGetByType).toHaveBeenCalledWith('person');
  });

  it('does not expose ordinary people as CRM contacts', async () => {
    cache.assetGet.mockResolvedValue({ id: 'operator', type: 'asset--person', attributes: { name: 'Operador' } });
    await expect(getContactById('operator')).resolves.toBeNull();

    const juana = contact('1', 'Juana', CONTACT_TYPE.TECNICO);
    cache.assetGet.mockResolvedValue(juana);
    await expect(getContactById('1')).resolves.toEqual(juana);
  });

  it('updates only allowed contact attributes and preserves its CRM role', async () => {
    const existing = contact('1', 'Juana', CONTACT_TYPE.TECNICO);
    cache.assetGet.mockResolvedValue(existing);

    const updated = await updateContact('1', { name: 'Juana Mora', status: CONTACT_STATUS.ARCHIVADO, crm_contact_type: CONTACT_TYPE.PROVEEDOR });

    expect(updated.attributes).toMatchObject({ name: 'Juana Mora', status: 'archived', crm_contact_type: CONTACT_TYPE.TECNICO });
    expect(cache.assetPut).toHaveBeenCalledWith('person', updated);
    cache.assetGet.mockResolvedValue(null);
    await expect(updateContact('missing', {})).rejects.toThrow('Contacto no encontrado: missing');

    cache.assetGet.mockResolvedValue(existing);
    await expect(updateContact('1', { status: 'inactive' })).rejects.toThrow('Estado de contacto no válido');
  });

  it('records an interaction as a pending activity log indexed by its contact', async () => {
    const created = await createInteraction({ contact_id: 'contact-1', interaction_type: INTERACTION_TYPE.INTERCAMBIO, timestamp: 1700000000000, notes: 'Semillas de fríjol' });

    expect(created).toMatchObject({
      type: 'log--activity', asset_id: 'contact-1', timestamp: 1700000000,
      attributes: { crm_interaction_type: 'intercambio', status: 'done', notes: 'Semillas de fríjol' },
      relationships: { asset: { data: { id: 'contact-1', type: 'asset--person' } } },
    });
    expect(cache.logsPut).toHaveBeenCalledWith(created);
  });

  it('rejects invalid interaction input and filters only CRM activity logs', async () => {
    await expect(createInteraction({ contact_id: '', interaction_type: INTERACTION_TYPE.VISITA })).rejects.toThrow('El contacto es obligatorio');
    await expect(createInteraction({ contact_id: '1', interaction_type: 'otro' })).rejects.toThrow('Tipo de interacción no válido');

    const crmVisit = interaction('i1', '1', INTERACTION_TYPE.VISITA, 100);
    const crmCall = interaction('i2', '1', INTERACTION_TYPE.LLAMADA, 200);
    cache.logsByType.mockResolvedValue([{ id: 'task', type: 'log--activity', attributes: { status: 'done' } }, crmVisit, crmCall]);
    await expect(getAllInteractions({ interaction_type: INTERACTION_TYPE.VISITA })).resolves.toEqual([crmVisit]);
  });

  it('derives a contact history and network stats from contacts and logs', async () => {
    const juana = contact('1', 'Juana', CONTACT_TYPE.TECNICO);
    const pedro = contact('2', 'Pedro', CONTACT_TYPE.CAMPESINO);
    const i1 = interaction('i1', '1', INTERACTION_TYPE.VISITA, 100);
    const i2 = interaction('i2', '1', INTERACTION_TYPE.LLAMADA, 200);
    const i3 = interaction('i3', '2', INTERACTION_TYPE.VISITA, 150);
    cache.assetGet.mockResolvedValue(juana);
    cache.logsByAsset.mockResolvedValue([i2, { id: 'task', type: 'log--activity', attributes: {} }, i1]);
    await expect(getContactHistory('1')).resolves.toEqual([i2, i1]);
    await expect(getContactWithHistory('1')).resolves.toMatchObject({ contacto: juana, totalInteracciones: 2, ultimaInteraccion: 200 });

    cache.assetGetByType.mockResolvedValue([juana, pedro]);
    cache.logsByType.mockResolvedValue([i1, i2, i3]);
    await expect(getNetworkStats()).resolves.toEqual({
      totalContactos: 2, totalInteracciones: 3,
      contactosPorTipo: { tecnico: 1, campesino: 1 },
      interaccionesPorTipo: { visita: 2, llamada: 1 },
      contactosMasActivos: [
        { id: '1', name: 'Juana', count: 2, type: 'tecnico' },
        { id: '2', name: 'Pedro', count: 1, type: 'campesino' },
      ],
    });
  });
});
