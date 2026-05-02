import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * DateField — Wrapper de <input type="date"> optimizado para iOS Safari.
 * Asegura formato YYYY-MM-DD y área táctil de 44px.
 *
 * @param {Object} props
 * @param {string} props.value - Fecha en formato YYYY-MM-DD
 * @param {Function} props.onChange - callback(newDate)
 * @param {string} props.label - Etiqueta
 * @param {boolean} props.required - Obligatorio
 * @param {string} props.className - Estilos extra
 * @param {string} props.min - Fecha mínima
 * @param {string} props.max - Fecha máxima
 */
const DateField = ({
    value,
    onChange,
    label = "Fecha",
    required = false,
    className = "",
    min = "",
    max = ""
}) => {
    // ISO Date (YYYY-MM-DD) es el único formato que iOS Safari acepta para .value
    const today = new Date().toISOString().split('T')[0];
    const currentValue = value || today;

    const handleDateChange = (e) => {
        onChange(e.target.value);
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <label className="text-xl font-bold text-slate-400 flex items-center gap-2">
                    <Calendar size={18} />
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    type="date"
                    value={currentValue}
                    onChange={handleDateChange}
                    required={required}
                    min={min}
                    max={max}
                    lang="es-CO"
                    className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-2xl text-white min-h-[64px] appearance-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all outline-none"
                />
                {/* En iOS Safari, a veces el icono nativo no es claro. Lucide ayuda visualmente. */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-purple-400 transition-colors">
                    <Calendar size={24} />
                </div>
            </div>
            {required && !value && (
                <p className="text-sm text-red-400 mt-1">Este campo es obligatorio</p>
            )}
        </div>
    );
};

export default DateField;
