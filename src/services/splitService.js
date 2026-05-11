import { newUlid } from '../utils/id';
import { validateLogSplit } from '../types/logSplit';

/**
 * @typedef {import('./useAssetStore').Asset} Asset
 */

/**
 * Previews a split operation.
 * @param {Asset} parentAsset 
 * @param {'individual_to_aggregate' | 'aggregate_to_individual'} splitType 
 * @param {Object} options 
 * @param {number} [options.qty] Number of children to create (for agg->ind)
 * @param {string} [options.rationale]
 * @returns {Object} { childrenToCreate: Asset[], splitLogPreview: Object }
 */
export const previewSplit = (parentAsset, splitType, options = {}) => {
    const { qty = 1 } = options;
    const childrenCount = splitType === 'aggregate_to_individual' ? qty : 1;

    const childrenToCreate = Array.from({ length: childrenCount }).map((_, i) => ({
        id: crypto.randomUUID(),
        type: parentAsset.type,
        attributes: {
            ...parentAsset.attributes,
            name: splitType === 'aggregate_to_individual'
                ? `${parentAsset.attributes.name} (Planta ${i + 1})`
                : `${parentAsset.attributes.name} (Agregado)`,
            tracking_mode: splitType === 'individual_to_aggregate' ? 'aggregate' : 'individual',
            status: 'active',
        },
        relationships: {
            ...parentAsset.relationships,
            // Los children heredan la location del parent
        },
        _pending: true,
    }));

    const splitLogPreview = {
        id: newUlid(),
        type: 'log--split',
        attributes: {
            timestamp: Date.now(),
            split_type: splitType,
            parent_asset_id: parentAsset.id,
            child_asset_ids: childrenToCreate.map(c => c.id),
            qty_per_child: splitType === 'aggregate_to_individual' ? 1 : null,
            rationale: options.rationale || 'Operador solicitó cambio de tracking mode',
            operator_confirmed: true,
            log_chain_inherited: true,
        },
        relationships: {
            asset: { data: [{ type: parentAsset.type, id: parentAsset.id }] },
            children_assets: { data: childrenToCreate.map(c => ({ type: c.type, id: c.id })) }
        },
        _pending: true,
    };

    return { childrenToCreate, splitLogPreview };
};

/**
 * Executes a split operation.
 * @param {Asset} parentAsset 
 * @param {'individual_to_aggregate' | 'aggregate_to_individual'} splitType 
 * @param {Object} options 
 * @param {Object} storeHooks
 * @param {Function} storeHooks.addLog Function from useAssetStore to persist logs
 * @param {Function} storeHooks.addAssetsBulk Function from useAssetStore to persist new assets
 */
export const executeSplit = async (parentAsset, splitType, options, { addLog, addAssetsBulk }) => {
    const { childrenToCreate, splitLogPreview } = previewSplit(parentAsset, splitType, options);

    validateLogSplit(splitLogPreview);

    // 1. Crear los assets hijos
    await addAssetsBulk(childrenToCreate);

    // 2. Crear el log de split
    await addLog(splitLogPreview);

    return { splitLogId: splitLogPreview.id, childIds: splitLogPreview.attributes.child_asset_ids };
};
