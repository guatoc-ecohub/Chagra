import { useState } from 'react';
import { CloudSun, ChevronDown } from 'lucide-react';
import HoyEnFincaStrip from './HoyEnFincaStrip';
import ClimaStrip from './ClimaStrip';
import AnalisisProactivoIA from './AnalisisProactivoIA';

/**
 * EstadoDelDiaCard — UN solo card "estado del día" para el BLOQUE 1 del home
 * F2 ("Cómo va su finca hoy").
 *
 * Bug UX operador 2026-07-04 (captura): los 3 primeros elementos del home eran
 * redundantes y empujaban "Registrar en la finca" bajo el fold:
 *   1. "Hoy en finca" — resumen con el clima de HOY,
 *   2. "Clima en <municipio> · 7 días" — el pronóstico… que repetía HOY,
 *   3. "Análisis Chagra · IA local" — narrativa + chips + CTA agente.
 * Tres tarjetas, tres cáscaras, el clima DOS veces.
 *
 * Consolidación (solo capa visual — cero cambios de lógica de datos):
 *   - Cabecera: HoyEnFincaStrip `embedded` (fecha + cielo honesto de hoy +
 *     chips alertas/tareas + próximo evento). El clima de HOY sale AQUÍ y solo
 *     aquí. Sigue navegando a la vista 'hoy_finca'.
 *   - Tira de 7 días: ClimaStrip `embedded` COLAPSABLE (cerrada por defecto
 *     — hoy ya está arriba; un toque abre el pronóstico completo). El estado
 *     abierto/cerrado se recuerda en localStorage para quien la quiera fija.
 *   - Pie: AnalisisProactivoIA `embedded` (narrativa de la IA local + chips
 *     Cultivos/Alertas + "Habla con el agente"), sin cáscara propia.
 *
 * La cáscara del card la pone ESTE contenedor una sola vez, con las mismas
 * clases de gradiente (`from-emerald-950/60 to-slate-900/60`) que ya usaba
 * "Hoy en finca": así heredan sin tocar nada los overrides de contraste AA de
 * finca-viva-resto.css (`[class*="from-emerald-950"]`) y el comportamiento en
 * los 4 temas (biopunk nativo oscuro; nature/minimalista/verde-vivo conservan
 * la tarjeta navy intencional sobre la hoja crema con tinta subida a AA).
 * Chevron con `motion-reduce:transition-none`; el resto no anima.
 */

const OPEN_KEY = 'chagra:home:estado-dia:clima7d';

function initialOpen() {
    try {
        return localStorage.getItem(OPEN_KEY) === '1';
    } catch (_) {
        return false;
    }
}

export default function EstadoDelDiaCard({ onNavigate, sensors = [] }) {
    const [climaOpen, setClimaOpen] = useState(initialOpen);

    const toggleClima = () => {
        setClimaOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(OPEN_KEY, next ? '1' : '0');
            } catch (_) { /* privado/incognito — sin persistencia, no rompe */ }
            return next;
        });
    };

    return (
        <section
            data-testid="estado-del-dia"
            aria-label="Estado del día: hoy en finca, pronóstico y análisis de Chagra"
            className="rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900/60 backdrop-blur-xl border border-emerald-800/30 overflow-hidden divide-y divide-white/[0.06]"
        >
            {/* 1 · El día de hoy (única aparición del clima de HOY) */}
            <HoyEnFincaStrip embedded onNavigate={onNavigate} />

            {/* 2 · Pronóstico 7 días, colapsable (cerrado por defecto) */}
            <div>
                <button
                    type="button"
                    data-testid="estado-clima-toggle"
                    aria-expanded={climaOpen}
                    onClick={toggleClima}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors motion-reduce:transition-none"
                >
                    <CloudSun size={15} className="text-sky-300 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold text-slate-200">Pronóstico 7 días</span>
                    <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`ml-auto text-slate-400 transition-transform motion-reduce:transition-none ${climaOpen ? 'rotate-180' : ''}`}
                    />
                </button>
                {climaOpen && <ClimaStrip embedded onNavigate={onNavigate} />}
            </div>

            {/* 3 · El aviso de Chagra (IA local) + CTA al agente */}
            <AnalisisProactivoIA embedded onNavigate={onNavigate} sensors={sensors} />
        </section>
    );
}
