/**
 * ExitosChagra.jsx — Éxitos efímeros compartidos entre vecinos de la red.
 *
 * "Éxitos Chagra" — el espíritu es COMPARTIR como ejemplo e inspiración
 * entre vecinos, NUNCA como comparación, humillación o competencia.
 *
 * Sin likes, sin puntos, sin ranking, sin contador de "quién tiene más".
 * Efímeros: se auto-eliminan a los 30 días.
 * Tono campesino, en usted.
 *
 * Refuerza la red sin volverse red social.
 */
import { useState, useCallback } from 'react';

/** @typedef {{ id: string, texto: string, emoji: string, ts: string, autor: string }} Exito */

const EXITOS_SUGERIDOS = [
  { texto: 'Nació un animal en la finca', emoji: '🐄' },
  { texto: 'Primera cosecha de la temporada', emoji: '🌽' },
  { texto: 'Terminé de sembrar una era completa', emoji: '🌱' },
  { texto: 'El compost ya está listo', emoji: '🍂' },
  { texto: 'Instalé un nuevo tanque de agua', emoji: '💧' },
  { texto: 'Aprendí a hacer un biopreparado nuevo', emoji: '🧪' },
];

/**
 * @param {Object} props
 * @param {Exito[]} props.exitos — éxitos existentes
 * @param {(exito: Exito) => void} props.onPublicar
 * @param {string} props.autorNombre
 */
export default function ExitosChagra({ exitos = [], onPublicar, autorNombre }) {
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('🌟');

  const publicar = useCallback(() => {
    if (!nuevoTexto.trim()) return;
    onPublicar({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      texto: nuevoTexto.trim(),
      emoji: nuevoEmoji,
      ts: new Date().toISOString(),
      autor: autorNombre || 'Un vecino',
    });
    setNuevoTexto('');
  }, [nuevoTexto, autorNombre, onPublicar]);

  return (
    <div className="space-y-3 text-slate-200 text-sm">
      <div className="text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2">
        Estos éxitos son para celebrar el trabajo del campo. No hay competencia ni comparación entre vecinos. Comparta lo que pasó hoy en su finca.
      </div>

      {exitos.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {[...exitos].sort((a, b) => b.ts.localeCompare(a.ts)).map((e) => (
            <div key={e.id} className="bg-slate-800/50 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="text-lg" aria-hidden="true">{e.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-slate-300 truncate">{e.texto}</div>
                <div className="text-xs text-slate-600">{e.autor} · {_hace(e.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-800 pt-3">
        <div className="text-xs text-slate-500 mb-2">Sugerencias (toque para elegir):</div>
        <div className="flex gap-2 mb-2 flex-wrap">
          {EXITOS_SUGERIDOS.map((s, i) => (
            <button key={i} type="button"
              onClick={() => { setNuevoTexto(s.texto); setNuevoEmoji(s.emoji); }}
              className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors">
              {s.emoji} {s.texto}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
            placeholder="Comparta lo que pasó hoy en su finca..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600"
            maxLength={120} />
          <button onClick={publicar} disabled={!nuevoTexto.trim()}
            className="px-3 py-2 rounded-lg bg-emerald-700 text-emerald-100 text-sm hover:bg-emerald-600 disabled:opacity-40 transition-colors">
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
}

function _hace(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}
