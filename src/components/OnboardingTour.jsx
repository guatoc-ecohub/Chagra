/**
 * OnboardingTour.jsx — Tour guiado de primeros 5 minutos para nuevos campesinos.
 *
 * 3 pasos:
 *   1. "Este es su valle" — la cámara muestra el valle 3D, texto explicativo
 *   2. "Elija su espíritu guardián" — lo lleva a espiritu_pro
 *   3. "Siembre su primera planta" — lo lleva al registro de siembra
 *
 * Solo se muestra UNA vez (flag en localStorage: 'chagra:onboarding-visto').
 * Puede saltarse con "Ya sé cómo funciona".
 */
import { useState, useEffect, useCallback } from 'react';

const PASOS = [
  {
    titulo: 'Este es su valle',
    texto: 'Cada lugar que ve es un mundo de su finca. Toque un rótulo para entrar. La cámara vuela hasta el lugar y se abre.',
    emoji: '🏔️',
    accion: null, // se queda en el valle
  },
  {
    titulo: 'Elija su espíritu guardián',
    texto: 'Una criatura nativa de estas montañas cuida su finca. La abeja, el colibrí, el oso... escoja la que sienta suya.',
    emoji: '🦋',
    accion: 'espiritu_pro',
  },
  {
    titulo: 'Siembre su primera planta',
    texto: 'Registre su primer cultivo. Póngale nombre, elija la especie, la fecha. Así nace el corazón de su finca en Chagra.',
    emoji: '🌱',
    accion: 'sembrar',
  },
];

/**
 * @param {Object} props
 * @param {(ruta: string) => void} props.onNavigate
 * @param {() => void} props.onCerrar
 */
export default function OnboardingTour({ onNavigate, onCerrar }) {
  const [paso, setPaso] = useState(0);
  const [visible, setVisible] = useState(true);

  const avanzar = useCallback(() => {
    if (paso < PASOS.length - 1) {
      const siguiente = PASOS[paso + 1];
      if (siguiente.accion) {
        onNavigate(siguiente.accion);
      }
      setPaso(paso + 1);
    } else {
      setVisible(false);
      onCerrar();
      try { localStorage.setItem('chagra:onboarding-visto', '1'); } catch {}
    }
  }, [paso, onNavigate, onCerrar]);

  const saltar = useCallback(() => {
    setVisible(false);
    onCerrar();
    try { localStorage.setItem('chagra:onboarding-visto', '1'); } catch {}
  }, [onCerrar]);

  if (!visible) return null;

  const actual = PASOS[paso];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pb-8 px-4 pointer-events-none">
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-black/50">
        <div className="text-4xl mb-3" aria-hidden="true">{actual.emoji}</div>
        <h2 className="text-lg font-semibold text-slate-100 mb-2">{actual.titulo}</h2>
        <p className="text-sm text-slate-400 mb-5">{actual.texto}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={saltar}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Ya sé cómo funciona
          </button>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {PASOS.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === paso ? 'bg-emerald-400' : 'bg-slate-700'}`} />
              ))}
            </div>
            <button
              onClick={avanzar}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-emerald-100 text-sm hover:bg-emerald-600 transition-colors"
            >
              {paso < PASOS.length - 1 ? 'Siguiente' : 'Empezar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
