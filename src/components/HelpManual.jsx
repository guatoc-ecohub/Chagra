import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Sprout, Mic, Camera, MapPin, Bug, Apple, MessageCircle, AlertTriangle, Wrench, Sparkles, GraduationCap, Clock } from 'lucide-react';
import CycleContentRenderer from './CycleContentRenderer.jsx';

const STARTER_CYCLES = [
  { slug: 'lechuga', emoji: '🥬', label: 'Lechuga', sub: 'Starter · 60-90 días · frío/templado' },
  { slug: 'fresa', emoji: '🍓', label: 'Fresa', sub: 'Starter Premium · 90-180 días · frío' },
  { slug: 'tomate_chonto', emoji: '🍅', label: 'Tomate Chonto', sub: 'Intermediate · 90-130 días · templado' },
];

const PLACEHOLDER_CYCLES = [
  { emoji: '☕', label: 'Café arábica', sub: 'Advanced · 3 años · curación humana presencial pendiente', tone: 'orange' },
  { emoji: '🥑', label: 'Aguacate Hass', sub: 'Advanced · 3-5 años · injerto + selección patrón pendiente', tone: 'orange' },
];

/**
 * HelpManual — Manual de usuario integrado en la PWA.
 *
 * Acceso desde TopBar → botón ? (HelpCircle).
 *
 * Diseño: secciones colapsables tipo FAQ. Cada sección breve, lenguaje
 * agroecológico, sin jargón técnico. Pensado para Lili / operario campo
 * que no quiere leer 10 minutos antes de usar.
 *
 * Cuando hay nueva feature crítica (ej. tracking_mode individual vs
 * aggregate), agregar una sección aquí en el orden lógico de uso.
 */

// eslint-disable-next-line no-unused-vars -- Icon SE USA en JSX (línea 26), eslint react-jsx detection falla con destructuring rename
const Section = ({ icon: Icon, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 active:bg-slate-800 text-left min-h-[56px]"
      >
        <Icon size={20} className="text-emerald-400 shrink-0" />
        <span className="text-base font-bold text-white flex-1">{title}</span>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-slate-300 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default function HelpManual({ onBack }) {
  const [openCycle, setOpenCycle] = useState(null);
  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="p-4 sticky top-0 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex items-center gap-3 z-10 shrink-0 shadow-lg">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen size={22} className="text-emerald-400 shrink-0" />
          <h2 className="text-xl font-black tracking-tight truncate">Manual de uso</h2>
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-2xl mx-auto w-full pb-12">
        <p className="text-sm text-slate-400 leading-relaxed">
          Guía rápida para registrar su finca o balcón en Chagra. Toque cada
          sección para abrir/cerrar. Si algo no está aquí, use el botón
          flotante 💬 para reportarlo.
        </p>

        {/* Sección Inicio Rápido */}
        <Section icon={Sprout} title="🌱 Inicio rápido — primera vez" defaultOpen={true}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Toque el botón <strong className="text-purple-400">+</strong> arriba (header) para registrar su primera planta.</li>
            <li>Busque la especie escribiendo (ej. &ldquo;gulpa&rdquo; encuentra Gulupa). El sistema autocompleta estrato, gremio y producción.</li>
            <li>Si tiene foto, súbala desde la cámara o galería.</li>
            <li>Marque la ubicación: toque mapa o &ldquo;Mi ubicación&rdquo;.</li>
            <li>Guarde. Aparece en <strong>Activos → Plantas</strong>.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500 italic">
            ¿Sin red? La app funciona offline — los datos se sincronizan cuando vuelva la conexión.
          </p>
        </Section>

        {/* Sección Voz */}
        <Section icon={Mic} title="🎤 Registrar por voz">
          <p>Toque el <strong className="text-emerald-400">FAB micrófono</strong> abajo a la izquierda (siempre visible).</p>
          <p>Diga algo natural, ejemplos:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>&ldquo;Sembré 5 tomates en el invernadero&rdquo;</li>
            <li>&ldquo;Planté 100 cafés en la parcela tres&rdquo;</li>
            <li>&ldquo;Puse 10 fresas y 30 lechugas en la cama uno&rdquo; (multi-especie OK)</li>
          </ul>
          <p>El sistema transcribe + extrae <strong>cantidad, especie, ubicación</strong>. Antes de guardar le muestra una pantalla de revisión donde puede editar si algo salió mal.</p>
          <p className="text-xs text-slate-500 italic mt-2">
            La cantidad importa: 1 café = 1 planta individual. 100 cafés = 100 plantas individuales (cada una con su hoja de vida). 50 lechugas = 1 cama con 50 (agregado, las hortalizas se manejan en grupo).
          </p>
        </Section>

        {/* Sección Tracking individual vs aggregate */}
        <Section icon={Sprout} title="🔢 ¿Por qué a veces me crea N plantas y a veces 1?">
          <p>Chagra clasifica cada especie según cómo se cultiva normalmente:</p>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <div className="bg-emerald-900/20 border border-emerald-800/40 rounded p-2">
              <p className="font-bold text-emerald-300 text-xs uppercase">Individual (1 asset por planta)</p>
              <p className="text-xs text-slate-400 mt-1">Frutales, café, plátano, aromáticas, tubérculos. Cada planta merece su hoja de vida, foto y cosechas separadas.</p>
            </div>
            <div className="bg-amber-900/20 border border-amber-800/40 rounded p-2">
              <p className="font-bold text-amber-300 text-xs uppercase">Agregado (1 asset con qty=N)</p>
              <p className="text-xs text-slate-400 mt-1">Hortalizas en cama, cereales, abonos verdes. Se gestionan por conjunto, no plantilla por plantilla.</p>
            </div>
          </div>
          <p className="mt-2">En el formulario aparece un link sutil <em>&ldquo;Agrupar siembra&rdquo;</em> o <em>&ldquo;Registrar individualmente&rdquo;</em> si quiere cambiar el default.</p>
        </Section>

        {/* Sección Foto — expandida con foto por especie */}
        <Section icon={Camera} title="📸 Foto: tomar, adjuntar y foto guía por especie">
          <p><strong>Al crear planta:</strong> el botón cámara abre su cámara o galería. La foto queda en la hoja de vida de esa planta.</p>
          <p><strong>Adjuntar a evento existente</strong>: entre al evento desde Bitácora/Historial → sección &ldquo;Adjuntar foto a este evento&rdquo;. Útil para documentar después de la siembra.</p>

          <div className="mt-3 p-3 rounded-lg bg-emerald-900/15 border border-emerald-800/30">
            <p className="text-emerald-300 font-bold text-sm mb-1">🌱 Foto guía por especie (cómo y para qué)</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Al elegir especie en el formulario aparece un thumbnail bajo el input. Función:
            </p>
            <ul className="text-xs text-slate-400 list-disc pl-5 space-y-1 mt-2">
              <li><strong>Su primera foto</strong> de esa especie queda como referencia visual cada vez que abre el form de la misma planta — útil para confirmar &ldquo;sí, esto es lo que sembré&rdquo;.</li>
              <li><strong>Si nunca tomó foto</strong>, ve un placeholder verde con &ldquo;Agregue una foto&rdquo;. No es error — es invitación: la primera foto que tome ocupa ese lugar para sus próximas siembras de la misma especie.</li>
              <li>Las fotos NO se comparten con otras fincas (privacidad — decidido 2026-05-02). Solo usted las ve en su cuenta.</li>
              <li>En el futuro v1.1 cargaremos un &ldquo;banco visual&rdquo; del catálogo (frutos típicos de cada especie desde GBIF/iNaturalist con licencia libre) para que aparezcan ANTES de que tome su propia foto.</li>
            </ul>
            <p className="text-xs text-slate-500 italic mt-2">
              Cómo agregar foto por especie: 1) Form planta nueva → seleccione especie → tome foto. La foto queda asociada al asset Y como referencia visual de la especie. Siguientes siembras de esa especie heredan esa foto como guía.
            </p>
          </div>

          <p className="text-xs text-slate-500 italic mt-2">
            Las fotos se comprimen automáticamente a JPEG ≤500KB para no saturar el almacenamiento. La foto original con metadata se preserva localmente.
          </p>
        </Section>

        {/* Sección Vision AI — disease diagnosis + species recognition (BETA) */}
        <Section icon={Sprout} title="🧬 IA por foto: enfermedades + identificación de especie">
          <p>Chagra usa visión AI local (Gemma3 multimodal) para dos funciones distintas, ambas marcadas <strong className="text-amber-400">BETA</strong>:</p>

          <h4 className="text-sm font-bold text-emerald-400 mt-3">📋 Diagnóstico de enfermedades por foto</h4>
          <p>Analiza una foto de hojas y detecta:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Posibles enfermedades fitosanitarias</li>
            <li>Deficiencias nutricionales</li>
            <li>Score general de salud (0-100)</li>
            <li>Sugerencia de tratamiento agroecológico</li>
          </ul>
          <p className="text-xs mt-2">Disponible en <strong>tres puntos</strong>:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs">
            <li><strong>Campo (Worker mode)</strong> → captura evidencia. Análisis se guarda como <code>log--observation</code> con marker AI; aparece en la línea de tiempo como <em>&ldquo;Inferencia IA&rdquo;</em> y debe confirmar/rechazar (gate humano — ADR-019 Regla 1).</li>
            <li><strong>Bitácora → entrada con foto adjunta</strong> → sección amber &ldquo;Análisis IA experimental&rdquo; abajo del bloque foto. Botón <em>&ldquo;Analizar foto con IA&rdquo;</em>. Funciona con fotos recién capturadas Y fotos viejas guardadas.</li>
            <li><strong>Plant detail → sección &ldquo;Consultar IA externa&rdquo;</strong> → genera prompt para pegar en Gemini/ChatGPT/Claude (alternativa cuando el modelo local no responde).</li>
          </ol>

          <h4 className="text-sm font-bold text-emerald-400 mt-3">🔍 Identificación de especie por foto</h4>
          <p>En <strong>SpeciesSelect</strong> (al crear planta) → botón <em>&ldquo;Tomar foto para identificar especie&rdquo;</em> abajo del selector. Toma foto, IA propone especie + alternativas:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Confianza ≥ 70% + match en catálogo → auto-selecciona la especie</li>
            <li>Confianza menor → muestra alternativas con chips para que elija</li>
            <li>Botón <em>&ldquo;Reportar diagnóstico defectuoso&rdquo;</em> registra el caso para validar</li>
          </ul>

          <p className="text-xs text-slate-500 italic mt-3">
            Estas funciones requieren conexión al stack IA local (Ollama gemma3:4b en el Nodo Alpha). Si el modelo no responde, sale mensaje de error con opción de reintentar.
          </p>
        </Section>

        {/* Sección Zonas */}
        <Section icon={MapPin} title="📍 Zonas y ubicación">
          <p>Las plantas viven dentro de <strong>zonas</strong> (parcelas, camas, invernaderos). Antes de plantar muchas, cree las zonas:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Activos → tab <strong>&ldquo;Zonas&rdquo;</strong> (icono mapa) → +</li>
            <li>Nombre (ej. &ldquo;Casa los Sitios&rdquo;) + tipo (parcela / cama / invernadero)</li>
            <li>Defina el polígono en el mapa o capture punto GPS</li>
          </ol>
          <p>Después al crear plantas, seleccione esa zona como contenedor.</p>
          <p className="text-xs text-slate-500 italic mt-2">
            <strong>Brave + GPS</strong>: si el mapa abre &ldquo;desubicado&rdquo;, Brave Shields puede estar bloqueando GPS preciso. Toque el escudo en la barra → desactive &ldquo;Block fingerprinting&rdquo; para chagra.guatoc.co.
          </p>
        </Section>

        {/* Sección Plagas */}
        <Section icon={Bug} title="🐛 Reportar plaga / invasora">
          <p>Toque menú principal → <strong>&ldquo;Plagas&rdquo;</strong>. Seleccione la especie invasora del catálogo, capture foto y geolocalización.</p>
          <p>Después de guardar, le aparece una pantalla con <strong>sugerencias de especies nativas para reemplazar</strong> — toque &ldquo;Sembrar aquí&rdquo; y va al flow de siembra precargado con la nativa + las coordenadas del invasor.</p>
        </Section>

        {/* Sección Cosechar */}
        <Section icon={Apple} title="🍎 Registrar cosecha">
          <p>Activos → seleccione la planta → en la card aparece &ldquo;Registrar cosecha&rdquo;. Capture cantidad cosechada (kg / unidades) + fecha. Se agrega como log--harvest a la hoja de vida.</p>
          <p>También por voz: &ldquo;coseché 5 kilos de gulupas&rdquo; con el FAB micrófono.</p>
        </Section>

        {/* Sección Feedback */}
        <Section icon={MessageCircle} title="💬 Reportar bug o sugerir mejora">
          <p>Botón flotante 💬 abajo a la <strong>derecha</strong> (siempre visible). Puede:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Escribir texto explicando qué pasó</li>
            <li>Grabar audio (botón 🎤 dentro del modal): &ldquo;hice click acá y pasó X&rdquo; — sin necesidad de tipear con manos sucias</li>
            <li>Ambos: texto + audio</li>
          </ul>
          <p>El feedback queda guardado localmente y se sincroniza después.</p>
        </Section>

        {/* Sección Problemas comunes */}
        <Section icon={Wrench} title="🔧 Problemas comunes">
          <div className="space-y-3">
            <div>
              <p className="font-bold text-amber-300">📍 GPS no encuentra mi ubicación</p>
              <p className="text-xs text-slate-400">El mapa centra automático al abrir el modal. Si tarda más de 15s o cae en error, toque &ldquo;Reintentar&rdquo;. En Brave: revise Shields fingerprinting.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">🎤 Voz no transcribe</p>
              <p className="text-xs text-slate-400">Verifique permiso de micrófono (iOS: Ajustes → Safari → Micrófono → chagra.guatoc.co → Permitir). Necesita conexión activa al servidor de transcripción.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">📷 La foto no aparece tras adjuntarla</p>
              <p className="text-xs text-slate-400">Recargue la pantalla — IndexedDB puede tardar en flush. Si persiste, repórtelo via 💬.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">🌱 Creé planta y no aparece en la zona</p>
              <p className="text-xs text-slate-400">Verifique que la zona esté seleccionada como &ldquo;contenedora&rdquo; en el formulario. En vista &ldquo;Activos → Plantas → Todas&rdquo; aparecen sin filtro.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">⚠️ Sin red en campo</p>
              <p className="text-xs text-slate-400">Todo funciona offline. Los datos se sincronizan automáticamente cuando vuelva a estar online. Indicador en la barra superior.</p>
            </div>
          </div>
        </Section>

        {/* Sección Tips Lili field test */}
        <Section icon={AlertTriangle} title="🧪 Casos de uso para validar (field test)">
          <p>Si está en field test, pruebe estos casos puntuales y reporte via 💬:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
            <li>Crear zona &ldquo;Balcón&rdquo; + agregar planta &ldquo;Gulupa&rdquo; con foto + GPS</li>
            <li>Voz: &ldquo;Sembré 1 mata de albahaca en la cocina&rdquo;</li>
            <li>Reportar plaga simulada (ej. retamo) y ver sugerencia nativa</li>
            <li>Adjuntar foto a un registro pasado desde Bitácora</li>
            <li>Cosecha por voz: &ldquo;Coseché 3 frutos de fresa&rdquo;</li>
          </ul>
        </Section>

        {/* Sección Aprende sembrando — corpus curado desde /public/cycle-content/.
            Datos consolidados DR-034 cerrado 2026-05-06 (3/3 LLMs convergencia
            alta) + ADR-032 plan curación starter species. Política ADR-033
            Opción C estricta — solo Nivel 2 evidencia, NO folclore. */}
        <Section icon={GraduationCap} title="🌿 Aprende sembrando — ciclo agroecológico" defaultOpen={false}>
          <p className="text-sm leading-relaxed">
            <strong className="text-emerald-300">Punto de partida educativo</strong> para quien empieza desde cero — no solo cómo usar Chagra, sino cómo cultivar.
          </p>

          <p className="text-xs text-slate-400 leading-relaxed mt-2">
            Toque una especie para ver el ciclo completo: preparación de tierra, hitos día a día, razones comunes de fracaso, compañeros validados, biopreparados y rangos conservadores de cosecha.
          </p>

          <h4 className="text-xs uppercase tracking-wider text-emerald-400 font-bold mt-4 mb-2">Disponibles ahora</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STARTER_CYCLES.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setOpenCycle(c.slug)}
                className="p-3 rounded-lg bg-slate-900 border border-emerald-800/50 hover:bg-slate-800 active:bg-slate-700 text-left min-h-[64px]"
              >
                <p className="font-bold text-emerald-300 text-sm">{c.emoji} {c.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
                <p className="text-[10px] text-emerald-500 mt-1">Ver ciclo →</p>
              </button>
            ))}
          </div>

          <h4 className="text-xs uppercase tracking-wider text-orange-400 font-bold mt-4 mb-2">Pendientes — curación humana presencial</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLACEHOLDER_CYCLES.map((c) => (
              <div key={c.label} className="p-3 rounded-lg bg-slate-900 border border-slate-800 opacity-70">
                <p className="font-bold text-orange-300 text-sm">{c.emoji} {c.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {openCycle && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-emerald-800/50">
              <CycleContentRenderer slug={openCycle} onClose={() => setOpenCycle(null)} />
            </div>
          )}

          <div className="mt-4 p-3 rounded-xl bg-emerald-900/15 border border-emerald-800/40">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold mb-2">Cada ciclo cubre</p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
              <li><strong>Preparación de tierra</strong> — matera (mezcla recomendada) vs campo abierto (descompactación + biopreparados)</li>
              <li><strong>Germinación + propagación</strong> — semilla, esqueje, acodo, división, injerto (según especie)</li>
              <li><strong>Hitos del ciclo</strong> — día por día, criterio observable + acción clave</li>
              <li><strong>Razones comunes de fracaso</strong> — top 5 con prevención agroecológica + frecuencia esperada</li>
              <li><strong>Compañeros validados</strong> y antagonistas — qué NO sembrar cerca</li>
              <li><strong>Biopreparados</strong> — bocashi, biol, caldo sulfocálcico, M-5, Trichoderma</li>
              <li><strong>Rangos conservadores</strong> de cosecha — anti-overpromise vs literatura comercial</li>
            </ul>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-amber-900/15 border border-amber-800/40 flex items-start gap-2">
            <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200 leading-relaxed">
              <strong>Filosofía:</strong> NO promete éxito instantáneo. Sembrar es un proceso de meses-años. Documenta también lo que NO funcionó para que cada operador aprenda de la pérdida sin estigma. Coherente con el cementerio de plantas — fracaso como currículo.
            </p>
          </div>

          <p className="text-[10px] text-slate-600 italic mt-3">
            Corpus consolidado DR-034 (Claude web + Gemini DR + DeepSeek V3 — convergencia 3/3) + plan curación humana presencial 4h por especie advanced (Aguacate → Café → Tomate). Datos calibrados anti-overpromise — rangos agroecológicos colombianos, NO hidroponía.
          </p>
        </Section>

        {/* Sección Novedades v0.12.x — features mergeados sesión 2026-05-03 */}
        <Section icon={Sparkles} title="✨ Novedades de mayo 2026">
          <p className="text-xs text-slate-400 mb-2">
            Cambios recientes que reducen friction. Todos opt-in / no-imposición —
            la app no fuerza, solo sugiere.
          </p>

          <h4 className="text-sm font-bold text-emerald-400 mt-3">Sugerencias inteligentes</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Plan de alimentación al crear planta</strong>: cuando agrega una mata (ej. manzana, fresa), aparece toast con plan de alimentación sugerido. Lo encuentra en <strong>Bodega → Planes</strong>.</li>
            <li><strong>Sugerencia de biopreparados al agregar insumo</strong>: si agrega melaza, suero de leche o similares a la bodega, modal sugiere qué biopreparados puede hacer (Bocashi, Biol, etc.) con receta inline.</li>
            <li><strong>Companions que ya tiene primero</strong>: en panel de gremios, los compañeros que ya están en su finca aparecen primero con marca verde. No tiene que comprar — ya los tiene.</li>
          </ul>

          <h4 className="text-sm font-bold text-emerald-400 mt-3">Adaptive defaults (memoria de uso)</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>TaskScreen</strong> recuerda última prioridad + zona usada.</li>
            <li><strong>HarvestLog</strong> sugiere cantidad como mediana de cosechas pasadas para esa especie.</li>
            <li><strong>InputLogForm</strong> pre-fillea último biopreparado aplicado.</li>
            <li><strong>Invasoras</strong>: las relevantes a tu piso térmico aparecen marcadas con ★ primero.</li>
            <li><strong>InventoryDashboard</strong>: banner amber cuando hay insumos bajo umbral, y los low-stock se ordenan primero.</li>
          </ul>

          <h4 className="text-sm font-bold text-amber-400 mt-3">IA experimental (BETA)</h4>
          <p className="text-xs">
            Marcadas con badge <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/50 font-bold">BETA</span> — funcionan pero pueden errar. Si fallan, hay botón &ldquo;Reportar diagnóstico defectuoso&rdquo; que registra el caso para revisar.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs mt-1">
            <li><strong>Identificar especie por foto</strong> en SpeciesSelect → cámara → IA propone especie + alternativas. Confidence ≥70% auto-selecciona si match el catálogo.</li>
            <li><strong>Analizar foto de bitácora con IA</strong>: en cualquier evento con foto adjunta (presente o pasado) aparece botón &ldquo;Analizar foto con IA&rdquo; que detecta enfermedades, deficiencias, salud general.</li>
          </ul>
          <p className="text-[11px] text-slate-500 italic mt-1">
            Estas features requieren conexión al stack IA local (gemma3:4b). Si no responden, está fuera de servicio temporalmente.
          </p>

          <h4 className="text-sm font-bold text-emerald-400 mt-3">Galería + IA externa</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Galería de la especie</strong>: en el detalle de cualquier planta, ahora ves todas las fotos del operador para esa especie en tu finca (no cross-farm).</li>
            <li><strong>Consultar IA externa</strong>: botón en plant detail copia un prompt completo (especie + piso térmico + altitud) listo para pegar en Gemini, ChatGPT o Claude.</li>
          </ul>
        </Section>

        <p className="text-xs text-slate-600 text-center mt-4 italic">
          Manual v1.2 — última actualización 2026-05-04 (acento colombiano cordial + correcciones)
        </p>
      </div>
    </div>
  );
}
