import React from 'react';
import { BookOpen } from 'lucide-react';
import { parsePedagogicalText } from '../../utils/pedagogicalText.js';

/**
 * PedagogicalText — pinta prosa curada del catálogo (que se guarda como UN
 * bloque densísimo sin saltos de línea) de forma LEGIBLE: intro en párrafos
 * cortos, secciones con subtítulo, viñetas cuando el cuerpo enumera y las
 * fuentes citadas como pie discreto.
 *
 * `parsePedagogicalText` hace todo el trabajo de sanear + estructurar (y NO
 * inventa ni añade contenido); este componente es solo presentación. Reutilizado
 * por la ficha de especie ("Manejo y saberes") y por la receta de biopreparado
 * ("Proceso"), con dos tonos de acento.
 *
 * @param {object} props
 * @param {string} props.texto — bloque crudo (`valor_pedagogico`, `proceso_resumen`…).
 * @param {'indigo'|'slate'} [props.tone='indigo'] - color de acento de subtítulos/viñetas.
 * @param {string} [props.testId]
 */
export default function PedagogicalText({ texto, tone = 'indigo', testId }) {
  const { intro, sections, sources } = parsePedagogicalText(texto);
  const hasBody = intro.length > 0 || sections.length > 0 || (sources && sources.length > 0);
  if (!hasBody) return null;

  const T = TONES[tone] || TONES.indigo;

  return (
    <div className="space-y-3.5" data-testid={testId}>
      {intro.length > 0 && (
        <div className="space-y-2.5">
          {intro.map((p, i) => (
            <p key={`in-${i}`} className="text-sm text-slate-200 leading-relaxed">{p}</p>
          ))}
        </div>
      )}

      {sections.map((sec, si) => (
        <section key={`sec-${si}`} className="space-y-1.5">
          <h4 className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${T.heading}`}>
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-[3px] bg-gradient-to-br ${T.chip}`} />
            {sec.title}
          </h4>
          {sec.bullets ? (
            <ul className="space-y-1.5">
              {sec.bullets.map((b, bi) => (
                <li key={`b-${si}-${bi}`} className="flex gap-2 text-sm text-slate-200 leading-relaxed">
                  <span aria-hidden="true" className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${T.dot}`} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2.5">
              {sec.paragraphs.map((p, pi) => (
                <p key={`p-${si}-${pi}`} className="text-sm text-slate-200 leading-relaxed">{p}</p>
              ))}
            </div>
          )}
        </section>
      ))}

      {sources && sources.length > 0 && (
        <div className={`pt-2.5 border-t ${T.divider}`}>
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-slate-500">
            <span className={`inline-flex items-center gap-1 font-black uppercase tracking-wide ${T.sources}`}>
              <BookOpen size={11} aria-hidden="true" /> Fuentes
            </span>
            {sources.map((s, i) => (
              <React.Fragment key={`src-${i}`}>
                {i > 0 && <span aria-hidden="true" className="text-slate-700">·</span>}
                <span className="text-slate-400">{s}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

const TONES = {
  indigo: {
    heading: 'text-indigo-300/90',
    chip: 'from-indigo-400 to-violet-400',
    dot: 'bg-indigo-400/70',
    divider: 'border-indigo-800/25',
    sources: 'text-indigo-400/80',
  },
  slate: {
    heading: 'text-slate-300',
    chip: 'from-slate-400 to-slate-500',
    dot: 'bg-slate-400/70',
    divider: 'border-slate-700/40',
    sources: 'text-slate-400',
  },
};
