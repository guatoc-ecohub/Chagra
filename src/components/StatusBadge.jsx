import React from 'react';
import { PLANT_STATUSES, TASK_STATUSES, PEST_STATUSES, STATUS_MAP } from '../constants/assetStatuses';

const StatusBadge = ({ status, type, editable = false, onChange, className = "" }) => {
    // Backward compatibility: map "active" to "growing" for plants
    const effectiveStatus = (status === 'active' && type === 'plant') ? 'growing' : (status || 'unknown');

    const statuses = STATUS_MAP[type] || PLANT_STATUSES;
    const current = statuses.find(s => s.id === effectiveStatus) || statuses.find(s => s.id === 'unknown') || statuses[0];

    if (editable) {
        return (
            <div className={`relative inline-block ${className}`}>
                <select
                    value={effectiveStatus}
                    onChange={(e) => onChange?.(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    aria-label="Cambiar estado"
                >
                    {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                </select>
                <div
                    className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: current.color, color: current.textColor }}
                >
                    {current.label}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center justify-center border border-white/10 ${className}`}
            style={{ backgroundColor: current.color, color: current.textColor }}
        >
            {current.label}
        </div>
    );
};

export default StatusBadge;
