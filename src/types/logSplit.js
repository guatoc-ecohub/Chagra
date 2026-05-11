/**
 * @typedef {Object} LogSplitAttributes
 * @property {number} timestamp
 * @property {'individual_to_aggregate' | 'aggregate_to_individual'} split_type
 * @property {string} parent_asset_id
 * @property {string[]} child_asset_ids
 * @property {number} [qty_per_child]
 * @property {string} rationale
 * @property {boolean} operator_confirmed
 * @property {boolean} log_chain_inherited
 */

/**
 * @typedef {Object} LogSplit
 * @property {string} id
 * @property {'log--split'} type
 * @property {LogSplitAttributes} attributes
 * @property {Object} relationships
 * @property {Object} relationships.asset
 * @property {Object} relationships.children_assets
 */

/**
 * Type guard to verify if a log is a LogSplit.
 * @param {any} log 
 * @returns {log is LogSplit}
 */
export const isLogSplit = (log) => {
    return log?.type === 'log--split';
};

/**
 * Validates the structure of a log--split event.
 * @param {any} log 
 * @throws {Error} If validation fails.
 */
export const validateLogSplit = (log) => {
    if (!isLogSplit(log)) throw new Error('Invalid log type for split event');
    const attr = log.attributes;
    if (!attr) throw new Error('Missing attributes in split log');
    if (!['individual_to_aggregate', 'aggregate_to_individual'].includes(attr.split_type)) {
        throw new Error('Invalid split_type');
    }
    if (!attr.parent_asset_id) throw new Error('Missing parent_asset_id');
    if (!Array.isArray(attr.child_asset_ids) || attr.child_asset_ids.length === 0) {
        throw new Error('Missing or empty child_asset_ids');
    }
    if (!attr.operator_confirmed) throw new Error('Split must be operator_confirmed');
};
