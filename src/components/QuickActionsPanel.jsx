import { useState, useEffect, useRef } from 'react';
import { Plus, Sprout, HelpCircle, ListTodo, X } from 'lucide-react';

export default function QuickActionsPanel({ onNavigate }) {
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        function onClickOutside(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        function onKey(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    function handleAction(view) {
        setOpen(false);
        onNavigate(view);
    }

    return (
        <div ref={panelRef}>
            <button
                type="button"
                aria-label={open ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="fixed right-[18px] flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95"
                style={{
                    bottom: 'calc(18px + env(safe-area-inset-bottom))',
                    width: 56,
                    height: 56,
                    background: 'linear-gradient(135deg, #65a30d 0%, #4d7c0f 100%)',
                    border: '2px solid #bef264',
                    color: '#0f172a',
                    zIndex: 50,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 14px #bef26455',
                }}
            >
                {open ? <X size={24} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Acciones rápidas"
                    className="fixed right-[18px] flex flex-col gap-2"
                    style={{
                        bottom: 'calc(90px + env(safe-area-inset-bottom))',
                        zIndex: 50,
                    }}
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction('sembrar')}
                        className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-slate-900 border-2 border-lime-700/50 text-lime-100 font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[52px]"
                    >
                        <Sprout size={20} className="text-lime-400" aria-hidden="true" />
                        <span>Agregar planta a mi finca</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction('task_log')}
                        className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-slate-900 border-2 border-rose-700/50 text-rose-100 font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[52px]"
                    >
                        <ListTodo size={20} className="text-rose-400" aria-hidden="true" />
                        <span>Cola de tareas</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleAction('help')}
                        className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-slate-900 border-2 border-amber-700/50 text-amber-100 font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[52px]"
                    >
                        <HelpCircle size={20} className="text-amber-400" aria-hidden="true" />
                        <span>Consultar ayuda</span>
                    </button>
                </div>
            )}
        </div>
    );
}
