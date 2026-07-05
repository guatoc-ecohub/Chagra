import React, { useState, useCallback, useMemo } from 'react';
import {
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  BookOpen,
  PlayCircle,
} from 'lucide-react';

import { ScreenShell } from '../common/ScreenShell';
import VideoManual from './VideoManual.jsx';
import {
  CURSO_MODULOS,
  CURSO_TOTAL,
  leerProgresoCurso,
  guardarProgresoCurso,
} from '../../data/cursoChagra.js';
import lecciones from '../../data/agro-lecciones.json';

/**
 * CursoChagra — el CURSO auto-guiado "Aprende a usar Chagra".
 *
 * Un solo camino, en 5 pasos con sentido campesino (del primer registro a la
 * venta), para que alguien SIN ayuda se vuelva autónomo con la app. Cada módulo
 * junta: video(s)-manual + lección(es) del mundo Aprender + "Pruébalo en tu
 * finca" (deep-link a la función real). El progreso se ve y se guarda
 * (localStorage), así el usuario sabe por dónde va.
 *
 * Estructura y contenido: src/data/cursoChagra.js. Las lecciones se abren en el
 * mundo Aprender (navigate('aprende', { leccion: slug })), que ya renderiza los
 * bloques verificados con fuente — el curso NO reimplementa esa vista.
 *
 * @param {object} props
 * @param {() => void} [props.onBack] Volver al dashboard.
 * @param {(view: string, data?: any) => void} [props.onNavigate] Deep-links
 *   (pruébalo + abrir lección) y navegación real de la app.
 * @param {string} [props.initialModulo] id de módulo para abrir de una (deep-link).
 */
export default function CursoChagra({ onBack, onNavigate, initialModulo }) {
  const [completados, setCompletados] = useState(() => leerProgresoCurso());
  const [moduloAbiertoId, setModuloAbiertoId] = useState(
    () => (initialModulo && CURSO_MODULOS.some((m) => m.id === initialModulo) ? initialModulo : null)
  );

  const tituloPorSlug = useMemo(() => {
    const map = {};
    for (const l of lecciones) map[l.slug] = l.titulo;
    return map;
  }, []);

  const marcarCompletado = useCallback((id) => {
    setCompletados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      guardarProgresoCurso(next);
      return next;
    });
  }, []);

  const nCompletados = completados.size;
  const pct = Math.round((nCompletados / CURSO_TOTAL) * 100);

  const moduloAbierto = CURSO_MODULOS.find((m) => m.id === moduloAbiertoId) || null;

  // ── Detalle de un módulo ─────────────────────────────────────────────────
  if (moduloAbierto) {
    const m = moduloAbierto;
    const idx = CURSO_MODULOS.findIndex((x) => x.id === m.id);
    const siguiente = CURSO_MODULOS[idx + 1] || null;
    const hecho = completados.has(m.id);

    return (
      <ScreenShell title={`Módulo ${m.numero}`} icon={GraduationCap} onBack={() => setModuloAbiertoId(null)}>
        <div
          data-testid="curso-modulo-detalle"
          className="max-w-2xl mx-auto px-4 py-4 space-y-5"
        >
          {/* Encabezado del módulo */}
          <header className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-bold text-emerald-400/80">
              Paso {m.numero} de {CURSO_TOTAL} · {m.tag}
            </p>
            <h2 className="text-2xl font-black text-white leading-tight">
              <span aria-hidden="true" className="mr-2">{m.emoji}</span>
              {m.titulo}
            </h2>
            <p className="text-sm text-emerald-200/80 font-medium">{m.lema}</p>
          </header>

          <p className="text-sm text-slate-300 leading-relaxed">{m.resumen}</p>

          {/* Videos del módulo */}
          {m.videos.length > 0 && (
            <section aria-label="Videos del módulo" className="space-y-2">
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <PlayCircle size={14} className="text-emerald-400" /> Míralo en video
              </p>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                {m.videos.map((v) => (
                  <VideoManual
                    key={v.src}
                    src={v.src}
                    titulo={v.titulo}
                    subtitulo={v.subtitulo}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Los videos se reproducen solos, como se verá en la app.
              </p>
            </section>
          )}

          {/* Lecciones del módulo */}
          {m.lecciones.length > 0 && (
            <section aria-label="Lecciones del módulo" className="space-y-2">
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-400" /> Aprende el porqué
              </p>
              <div className="space-y-2">
                {m.lecciones.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    data-testid={`curso-leccion-${slug}`}
                    onClick={() => onNavigate?.('aprende', { leccion: slug })}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/70 border border-slate-700 hover:border-emerald-500/60 hover:bg-slate-800/60 active:scale-[0.99] transition-all text-left min-h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  >
                    <BookOpen size={18} className="shrink-0 text-emerald-300" />
                    <span className="flex-1 text-sm font-bold text-slate-100">
                      {tituloPorSlug[slug] || slug}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-slate-500" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {m.fuente && (
            <p className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-800/40 pt-2">
              <strong className="text-slate-500">Fuente:</strong> {m.fuente}
            </p>
          )}

          {/* Pruébalo en tu finca (deep-links a la función real) */}
          <section aria-label="Pruébalo en tu finca" className="space-y-2">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              👉 Pruébalo en tu finca
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {m.pruebas.map((p) => (
                <button
                  key={p.view + p.label}
                  type="button"
                  data-testid={`curso-prueba-${p.view}`}
                  onClick={() => onNavigate?.(p.view, p.data)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/12 border border-emerald-700/50 hover:bg-emerald-500/22 hover:border-emerald-400/70 active:scale-[0.99] transition-all text-left min-h-[52px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  <span aria-hidden="true" className="text-lg shrink-0">{p.emoji}</span>
                  <span className="flex-1 text-sm font-bold text-emerald-100">{p.label}</span>
                  <ChevronRight size={16} className="shrink-0 text-emerald-400/70" />
                </button>
              ))}
            </div>
          </section>

          {/* Marcar como visto + avanzar */}
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              data-testid="curso-marcar-modulo"
              onClick={() => marcarCompletado(m.id)}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                hecho
                  ? 'bg-emerald-700/40 border border-emerald-500/60 text-emerald-100'
                  : 'bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {hecho ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              {hecho ? 'Módulo completado' : 'Marcar como visto'}
            </button>

            {siguiente ? (
              <button
                type="button"
                data-testid="curso-siguiente-modulo"
                onClick={() => setModuloAbiertoId(siguiente.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-emerald-50 font-bold text-sm transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Siguiente: {siguiente.titulo}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModuloAbiertoId(null)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 font-bold text-sm transition-colors min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <ChevronLeft size={16} /> Volver al curso
              </button>
            )}
          </div>
        </div>
      </ScreenShell>
    );
  }

  // ── Listado del curso ────────────────────────────────────────────────────
  return (
    <ScreenShell title="Curso: usar Chagra" icon={GraduationCap} onBack={onBack}>
      <div data-testid="curso-chagra" className="max-w-2xl mx-auto px-4 py-4 space-y-5">
        {/* Intro + progreso */}
        <header className="space-y-3">
          <h2 className="text-2xl font-black text-white leading-tight">
            Aprende a usar Chagra, paso a paso
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Un camino de 5 pasos, del primer registro a la venta. Sigue el orden o
            salta al que necesites. Cada módulo trae un video corto, la explicación
            del porqué y algo para probar en tu finca de una vez.
          </p>

          <div
            data-testid="curso-progreso"
            className="rounded-xl bg-slate-900/70 border border-slate-700 p-3"
            aria-label={`Progreso: ${nCompletados} de ${CURSO_TOTAL} módulos completados`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-300">Tu progreso</span>
              <span className="text-xs font-bold text-slate-300">
                {nCompletados} de {CURSO_TOTAL}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </header>

        {/* Módulos */}
        <ol className="space-y-3 list-none p-0 m-0">
          {CURSO_MODULOS.map((m) => {
            const hecho = completados.has(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  data-testid={`curso-modulo-${m.id}`}
                  onClick={() => setModuloAbiertoId(m.id)}
                  className={`w-full rounded-2xl border p-4 text-left flex items-start gap-3 min-h-[92px] shadow-lg active:scale-[0.99] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                    hecho
                      ? 'bg-gradient-to-br from-emerald-900/50 to-slate-950/80 border-emerald-600/50'
                      : 'bg-slate-900/60 border-slate-700 hover:border-emerald-500/50'
                  }`}
                >
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl border text-xl font-black ${
                      hecho
                        ? 'bg-emerald-600/40 border-emerald-400/60 text-emerald-100'
                        : 'bg-slate-800 border-slate-600 text-slate-200'
                    }`}
                    aria-hidden="true"
                  >
                    {hecho ? <CheckCircle2 size={24} className="text-emerald-200" /> : m.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black leading-tight text-white">
                      <span aria-hidden="true" className="mr-1.5">{m.emoji}</span>
                      {m.titulo}
                    </p>
                    <p className="text-xs mt-1 leading-snug text-slate-300/80">{m.lema}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 font-medium">
                      {m.videos.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <PlayCircle size={12} /> {m.videos.length} video{m.videos.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {m.lecciones.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={12} /> {m.lecciones.length} lección{m.lecciones.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-emerald-500/80">
                        👉 {m.pruebas.length} para probar
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-slate-500 self-center" />
                </button>
              </li>
            );
          })}
        </ol>

        <p className="text-[11px] text-slate-600 leading-relaxed text-center pt-2">
          Tu progreso se guarda en este celular. Chagra funciona sin internet:
          registra, aprende y consulta aunque no haya señal.
        </p>
      </div>
    </ScreenShell>
  );
}

/**
 * CursoEntryCard — tarjeta de entrada al curso (para el Manual / mundo Aprender).
 * onNavigate recibe 'curso'.
 *
 * @param {object} props
 * @param {(view: string) => void} props.onNavigate
 */
export function CursoEntryCard({ onNavigate }) {
  return (
    <button
      type="button"
      data-testid="curso-entry-card"
      onClick={() => onNavigate('curso')}
      className="w-full rounded-2xl bg-gradient-to-br from-cyan-900/60 to-emerald-950/80 border border-cyan-600/50 hover:border-cyan-400/70 active:scale-[0.99] transition-all p-5 text-left flex items-start gap-4 min-h-[112px] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
    >
      <span className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-cyan-700/40 border border-cyan-500/50">
        <GraduationCap size={28} className="text-cyan-200" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-black leading-tight text-cyan-50">
          Curso: aprende a usar Chagra
        </p>
        <p className="text-xs mt-1.5 leading-relaxed text-cyan-100/70">
          5 pasos con video, del primer registro a la venta. Videos cortos + algo
          para probar en tu finca. Hazte autónomo con la app.
        </p>
      </div>
      <ChevronRight size={20} className="shrink-0 text-slate-400 self-center" />
    </button>
  );
}
