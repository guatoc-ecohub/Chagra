import { Check } from 'lucide-react';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
  getBackgroundSrc,
} from '../../store/useThemeBackgroundStore';

/**
 * BackgroundSelector — selector visual del fondo de biodiversidad.
 *
 * El operador elige entre los fondos curados por la diseñadora (Lili)
 * desde su Perfil. 4 opciones en grid 2x2: Páramo completo, Colibrí tech,
 * Bosque ilustrado y el Clásico (default = comportamiento actual).
 *
 * Persiste vía useThemeBackgroundStore (localStorage `chagra:background:v1`).
 * El cambio aplica de inmediato (App.jsx escribe --app-bg-image en el body)
 * y se preserva el overlay/blur biopunk para legibilidad.
 *
 * Thumbnails: el mismo JPG con object-fit cover (no se generan miniaturas).
 * Lazy-load nativo (`loading="lazy"`) para no penalizar el primer paint del
 * Perfil; el full del seleccionado lo precarga App.jsx.
 */
export default function BackgroundSelector() {
  const selected = useThemeBackgroundStore((s) => s.selected);
  const setBackground = useThemeBackgroundStore((s) => s.setBackground);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-200">Fondo de la app</h4>
        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
          Elige el fondo de biodiversidad. Cambio inmediato en toda la app.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {BACKGROUND_CATALOG.map((opt) => {
          const isSelected = selected === opt.id;
          const thumbSrc = getBackgroundSrc(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBackground(opt.id)}
              aria-pressed={isSelected}
              aria-label={`Fondo ${opt.label}`}
              className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden">
                <img
                  src={thumbSrc}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isSelected && (
                  <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="text-center px-2 py-2 bg-slate-900">
                <p className="text-sm font-bold text-slate-100">{opt.label}</p>
                <p className="text-2xs text-slate-500 mt-0.5">{opt.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
