/**
 * Inventory Reconciliation Service
 * ADR-027.i+ii — Reducción de eventos a estado de stock + detección de anomalías.
 */

/**
 * Reconcilia una lista de eventos para un ítem específico.
 * 
 * @param {Array} events - Lista de eventos del log de inventario.
 * @param {number} initialStock - Stock inicial (base).
 * @returns {Object} { currentStock, history, issues }
 */
export const reconcileInventory = (events, initialStock = 0) => {
    // Ordenar por timestamp cronológico
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    let currentStock = initialStock;
    const history = [];
    const issues = [];

    for (const event of sortedEvents) {
        const { event_type, payload, timestamp } = event;
        const value = parseFloat(payload?.quantity?.value) || 0;

        let delta = 0;
        let isAudit = false;

        switch (event_type) {
            case 'audit':
                currentStock = value;
                delta = 0;
                isAudit = true;
                break;
            case 'input':
                delta = -value;
                currentStock += delta;
                break;
            case 'harvest':
            case 'refill':
            case 'production':
                delta = value;
                currentStock += delta;
                break;
            case 'adjustment':
                delta = value;
                currentStock += delta;
                break;
            default:
                // Por defecto tratamos payloads desconocidos con cautela
                console.warn(`[Reconcile] Tipo de evento desconocido: ${event_type}`);
        }

        // Redondeo para evitar errores de punto flotante (JS floating point magic)
        currentStock = Math.round(currentStock * 1000) / 1000;

        if (currentStock < 0) {
            issues.push({
                type: 'NEGATIVE_STOCK',
                timestamp,
                value: currentStock,
                eventId: event.id
            });
        }

        history.push({
            ...event,
            stockAfter: currentStock,
            delta,
            isAudit
        });
    }

    // Detectar gaps > 7 días (604800 segundos)
    for (let i = 1; i < sortedEvents.length; i++) {
        const gap = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
        if (gap > 7 * 24 * 60 * 60) {
            issues.push({
                type: 'SEQUENCE_GAP',
                timestamp: sortedEvents[i].timestamp,
                gapDays: Math.floor(gap / (24 * 60 * 60)),
                previousEventId: sortedEvents[i - 1].id,
                currentEventId: sortedEvents[i].id
            });
        }
    }

    return {
        currentStock,
        history,
        issues
    };
};

/**
 * Agrupa eventos por item_id y los reconcilia todos.
 */
export const reconcileAllItems = (events) => {
    const items = {};
    events.forEach(event => {
        const itemId = event.payload?.item_id;
        if (!itemId) return;
        if (!items[itemId]) items[itemId] = [];
        items[itemId].push(event);
    });

    const results = {};
    for (const itemId in items) {
        results[itemId] = reconcileInventory(items[itemId]);
    }
    return results;
};
