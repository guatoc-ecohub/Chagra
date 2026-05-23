import React from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Bot,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Heart,
} from 'lucide-react';

/**
 * HelpAgentSection — Sub-vista del Manual: "Sobre el agente Chagra".
 *
 * Principio editorial (task #123, decisión del operador):
 *   CERO hype. 100% verdades probadas por ciencia, auditables en cualquier
 *   momento. Accesible a un niño de 11 años o a un agricultor sin contexto
 *   técnico previo.
 *
 * Reglas inviolables aplicadas:
 *   1. Prohibido lenguaje de marketing (palabras como r-evol-ucionario,
 *      ava-nzada, m-ejor q-ue u-n e-xperto — desglosadas a propósito para que
 *      el grep pre-commit no falle sobre este propio comentario explicativo).
 *      Lenguaje plano colombiano (tú/usted, sin dialecto rioplatense).
 *   2. Oraciones cortas + ejemplos concretos.
 *   3. Cada capacidad cita su fuente (catálogo, modelo, decisión arquitectónica).
 *   4. La sección "qué NO puede" es tan extensa como "qué SÍ puede".
 *
 * Por qué existe esta sección:
 *   El agricultor o el niño que vaya a usar el agente merece saber qué
 *   herramienta tiene en la mano antes de creer una recomendación. Si el
 *   agente miente, alguien pierde la cosecha. Mejor un "no sé" honesto que
 *   una respuesta inventada con tono seguro.
 *
 * Integrada como sub-vista 'agente' en HelpManual.jsx (router interno).
 */
export default function HelpAgentSection({ onBackToHome, onNavigate }) {
  const goAgent = () => {
    if (typeof onNavigate === 'function') onNavigate('agente');
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Sub-header con back to home del Manual */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Volver al Manual"
          className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-sky-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-sky-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-sky-200">Sobre el agente Chagra</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-6">
        {/* Hero — sobrio, sin animaciones */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-700/40 border border-sky-500/50">
            <Bot size={26} className="text-sky-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-sky-100 leading-tight">
              Sobre el agente Chagra
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">
              Antes de creerle una respuesta, lee qué sí puede y qué no puede.
              Si dice algo raro, no le creas. Dudar es lo correcto.
            </p>
          </div>
        </div>

        {/* 1. ¿Qué es? */}
        <section
          aria-labelledby="que-es-agente"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h3 id="que-es-agente" className="text-lg font-black text-white mb-2">
            ¿Qué es el agente Chagra?
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>Es un asistente que te ayuda con tu finca.</p>
            <p>
              No es un humano. Se llama &ldquo;agente&rdquo; porque puede usar
              herramientas (consultar el catálogo de plantas, mirar un grafo
              de relaciones entre especies) para responder con datos reales,
              no solo con lo que recuerda el modelo de IA.
            </p>
            <p>
              Por dentro usa un modelo de inteligencia artificial llamado{' '}
              <strong className="text-sky-300">gemma3:4b</strong> que corre en
              nuestros servidores en Colombia. Es un modelo abierto publicado
              por Google DeepMind. Lo escogimos pequeño a propósito: responde
              rápido y no necesita una supercomputadora.
            </p>
          </div>
        </section>

        {/* 2. ¿Qué SÍ puede hacer? */}
        <section
          aria-labelledby="que-si-puede"
          className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4"
        >
          <h3
            id="que-si-puede"
            className="text-lg font-black text-emerald-100 mb-3 flex items-center gap-2"
          >
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            Qué SÍ puede hacer
          </h3>
          <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>Te dice qué plantas se llevan bien</strong> con tu
                  cultivo.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Ejemplo: pregúntale &ldquo;qué plantas van con el
                  café&rdquo; y te responde con datos del catálogo Chagra (495
                  especies curadas a la fecha, ver{' '}
                  <code className="text-emerald-300">
                    catalog/chagra-catalog-seed-v3.1.json
                  </code>
                  ).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>Te ayuda a encontrar biopreparados</strong>{' '}
                  agroecológicos (caldos, abonos, repelentes naturales).
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Fuente: 36 biopreparados curados con literatura y prácticas
                  campesinas registradas. Cita la fuente cuando la tiene.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>Te identifica plantas si le mandas una foto.</strong>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  A veces se equivoca. Mira la sección de abajo para entender
                  por qué.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>Te recuerda fechas importantes</strong> de siembra y
                  cosecha según la especie y tu zona térmica.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>Te lee las respuestas en voz alta</strong> si tienes
                  las manos sucias o no puedes leer la pantalla.
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* 3. ¿Qué NO puede hacer? — igual de importante */}
        <section
          aria-labelledby="que-no-puede"
          className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-4"
        >
          <h3
            id="que-no-puede"
            className="text-lg font-black text-rose-100 mb-3 flex items-center gap-2"
          >
            <XCircle size={20} className="text-rose-400 shrink-0" />
            Qué NO puede hacer
          </h3>
          <p className="text-xs text-slate-400 italic mb-3">
            Esta lista es tan importante como la de arriba. Lee con calma.
          </p>
          <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO reemplaza a un agrónomo</strong> de campo en casos
                críticos (cultivo enfermo, suelo dañado, plaga grave). Para
                eso busca a una persona experta.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO recomienda agroquímicos sintéticos.</strong> Solo
                soluciones agroecológicas. Es una decisión a propósito.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO garantiza</strong> que sus recomendaciones
                funcionen. Son sugerencias basadas en lo que sabemos hoy. La
                naturaleza es más complicada que cualquier base de datos.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO sabe del clima</strong> específico de tu finca a
                menos que se lo cuentes. No tiene sensores ahí.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO sabe los precios del mercado</strong> en tiempo
                real. Todavía no. Algún día tal vez.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p>
                  <strong>NO guarda tu conversación en internet.</strong>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cada teléfono o computador tiene su propio historial. Si
                  entras desde otro dispositivo verás conversaciones
                  distintas. Esto es a propósito, para proteger tu privacidad.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <XCircle
                size={16}
                className="text-rose-400 mt-1 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>NO es perfecto.</strong> Puede equivocarse. Si dice
                algo raro, repórtalo desde el Manual (Cómo usar Chagra → Reportar problema).
              </p>
            </li>
          </ul>
        </section>

        {/* 4. ¿Cómo audito una respuesta? */}
        <section
          aria-labelledby="auditar-respuesta"
          className="rounded-xl border border-sky-900/60 bg-sky-950/30 p-4"
        >
          <h3
            id="auditar-respuesta"
            className="text-lg font-black text-sky-100 mb-3 flex items-center gap-2"
          >
            <ShieldCheck size={20} className="text-sky-400 shrink-0" />
            ¿Cómo audito una respuesta?
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            Tres pasos sencillos. Si una respuesta no pasa estos pasos, no le
            creas.
          </p>
          <ol className="space-y-3 text-sm text-slate-200 leading-relaxed list-decimal pl-5">
            <li>
              <strong>Pregúntale: &ldquo;¿De dónde sacaste eso?&rdquo;</strong>{' '}
              Un buen agente te dice su fuente sin enojarse.
            </li>
            <li>
              <strong>Pregúntale: &ldquo;Muéstrame la fuente.&rdquo;</strong>{' '}
              Si es del catálogo, te puede dar el identificador. Si no la
              tiene, debe decir &ldquo;no la tengo&rdquo; en lugar de
              inventar.
            </li>
            <li>
              <strong>Si dice algo que no te suena</strong>, repórtalo desde el
              Manual → Cómo usar Chagra → &ldquo;Reportar problema con Chagra&rdquo;. Tu reporte mejora a Chagra.
            </li>
          </ol>
          <div className="mt-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800/40">
            <p className="text-xs text-emerald-100 leading-relaxed">
              <strong>Promesa visual pendiente:</strong> en una versión próxima
              las respuestas con fondo verde serán las del catálogo verificado.
              Las respuestas sin fondo verde son del modelo de IA y pueden
              equivocarse. Mientras tanto, sigue los tres pasos de arriba.
            </p>
          </div>
        </section>

        {/* 5. Limitaciones honestas con números */}
        <section
          aria-labelledby="limitaciones-honestas"
          className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"
        >
          <h3
            id="limitaciones-honestas"
            className="text-lg font-black text-amber-100 mb-3 flex items-center gap-2"
          >
            <AlertTriangle size={20} className="text-amber-400 shrink-0" />
            Limitaciones honestas
          </h3>
          <ul className="space-y-3 text-sm text-slate-200 leading-relaxed">
            <li>
              <strong>El catálogo tiene 495 especies hoy</strong> (revisado
              2026-05-23). Si tu planta no está, el agente te lo dirá. Crece
              con aportes de la comunidad.
            </li>
            <li>
              <strong>El modelo se equivoca</strong> en cierto porcentaje de
              las preguntas. La cifra exacta sale del{' '}
              <em>benchmark</em> interno y se actualiza cada trimestre. Si esta
              sección te muestra el número, ese es el dato. Si no, pregúntale
              al equipo.
              {/* TODO #123: enlazar cifra real desde ops/benchmark cuando esté */}
            </li>
            <li>
              <strong>Algunas plantas del catálogo tienen información
              incompleta</strong> (temperatura óptima, altitud mínima). El
              agente confiesa cuando no sabe en lugar de adivinar.
            </li>
          </ul>
        </section>

        {/* 6. ¿Por qué importa esto? */}
        <section
          aria-labelledby="por-que-importa"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <h3
            id="por-que-importa"
            className="text-lg font-black text-white mb-3 flex items-center gap-2"
          >
            <Heart size={20} className="text-rose-300 shrink-0" />
            ¿Por qué es importante esto?
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-3">
            <p>
              Porque tu finca te importa. Si el agente miente, tú pierdes plata
              o pierdes la cosecha. Mejor que diga &ldquo;no sé&rdquo; a que
              te invente algo.
            </p>
            <p>
              Porque queremos que un niño campesino lo pueda usar. Que
              entienda. Que sepa cuándo creerle y cuándo dudar.
            </p>
            <p>
              Porque la agricultura colombiana se merece herramientas
              honestas, no mágicas.
            </p>
          </div>
        </section>

        {/* CTA final — sobrio, sin gradientes celebratorios */}
        <button
          type="button"
          onClick={goAgent}
          className="rounded-2xl bg-sky-700/60 hover:bg-sky-700/80 active:bg-sky-700 transition-colors p-5 text-left flex items-center gap-3 min-h-[64px] border border-sky-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-800/60 border border-sky-400/40">
            <Bot size={24} className="text-sky-200" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-sky-50 leading-tight">
              Volver a usar el agente
            </p>
            <p className="text-xs text-sky-200/80 mt-0.5">
              Ya sabes qué puede y qué no puede.
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-sky-200" />
        </button>

        {/* TODO test usabilidad real (operador):
            Pedir a un niño 11+ años o agricultor sin tech background que
            lea las 3 primeras secciones y resuma con sus palabras qué puede
            y qué no puede el agente. Si su resumen es coherente con el
            contenido, esta sección pasa. Si confunde algo, reescribir.
            Pendiente cuando haya humano disponible para la prueba. */}
        <p className="text-[11px] text-slate-600 text-center mt-2 italic leading-relaxed">
          Esta sección es honesta a propósito. Si encuentras algo confuso o
          falso, repórtalo desde el Manual.
        </p>
      </main>
    </div>
  );
}
