import { describe, it, expect, vi } from 'vitest';
import { previewSplit, executeSplit } from '../splitService';

describe('splitService', () => {
    const mockAsset = {
        id: 'asset-123',
        type: 'asset--plant',
        attributes: {
            name: 'Tomate Cherry',
            tracking_mode: 'individual',
            status: 'active'
        },
        relationships: {
            location: { data: [{ id: 'loc-1', type: 'asset--land' }] }
        }
    };

    describe('previewSplit', () => {
        it('creates aggregate preview from individual asset', () => {
            const { childrenToCreate, splitLogPreview } = previewSplit(/** @type {any} */ (mockAsset), 'individual_to_aggregate');

            expect(childrenToCreate).toHaveLength(1);
            expect(childrenToCreate[0].attributes.tracking_mode).toBe('aggregate');
            expect(childrenToCreate[0].attributes.name).toContain('(Agregado)');
            expect(splitLogPreview.attributes.split_type).toBe('individual_to_aggregate');
        });

        it('creates multiple individual previews from aggregate asset', () => {
            const aggAsset = { ...mockAsset, attributes: { ...mockAsset.attributes, tracking_mode: 'aggregate' } };
            const { childrenToCreate } = previewSplit(/** @type {any} */ (aggAsset), 'aggregate_to_individual', { qty: 3 });

            expect(childrenToCreate).toHaveLength(3);
            expect(childrenToCreate[0].attributes.tracking_mode).toBe('individual');
            expect(childrenToCreate[0].attributes.name).toContain('(Planta 1)');
        });
    });

    describe('executeSplit', () => {
        it('calls addAssetsBulk and addLog with correct data', async () => {
            const addLog = vi.fn();
            const addAssetsBulk = vi.fn();

            await executeSplit(/** @type {any} */ (mockAsset), 'individual_to_aggregate', {}, { addLog, addAssetsBulk });

            expect(addAssetsBulk).toHaveBeenCalledWith(expect.any(Array));
            expect(addLog).toHaveBeenCalledWith(expect.objectContaining({
                type: 'log--split'
            }));
        });
    });
});
