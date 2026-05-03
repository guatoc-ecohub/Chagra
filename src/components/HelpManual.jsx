import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, Sprout, Mic, Camera, MapPin, Bug, Apple, MessageCircle, AlertTriangle, Wrench } from 'lucide-react';

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
          Guía rápida para registrar tu finca o balcón en Chagra. Tap en cada
          sección para abrir/cerrar. Si algo no está aquí, usá el botón
          flotante 💬 para reportarlo.
        </p>

        {/* Sección Inicio Rápido */}
        <Section icon={Sprout} title="🌱 Inicio rápido — primera vez" defaultOpen={true}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Tap el botón <strong className="text-purple-400">+</strong> arriba (header) para registrar tu primera planta.</li>
            <li>Buscá la especie escribiendo (ej. &ldquo;gulpa&rdquo; encuentra Gulupa). El sistema autocompleta estrato, gremio y producción.</li>
            <li>Si tenés foto, subila desde la cámara o galería.</li>
            <li>Marcá la ubicación: tap mapa o &ldquo;Mi ubicación&rdquo;.</li>
            <li>Guardá. Aparece en <strong>Activos → Plantas</strong>.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500 italic">
            Sin red? La app funciona offline — los datos se sincronizan cuando vuelva la conexión.
          </p>
        </Section>

        {/* Sección Voz */}
        <Section icon={Mic} title="🎤 Registrar por voz">
          <p>Tap el <strong className="text-emerald-400">FAB micrófono</strong> abajo a la izquierda (siempre visible).</p>
          <p>Decí algo natural, ejemplos:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>&ldquo;Sembré 5 tomates en el invernadero&rdquo;</li>
            <li>&ldquo;Planté 100 cafés en la parcela tres&rdquo;</li>
            <li>&ldquo;Puse 10 fresas y 30 lechugas en la cama uno&rdquo; (multi-especie OK)</li>
          </ul>
          <p>El sistema transcribe + extrae <strong>cantidad, especie, ubicación</strong>. Antes de guardar te muestra una pantalla de revisión donde podés editar si algo salió mal.</p>
          <p className="text-xs text-slate-500 italic mt-2">
            Cantidad importa: 1 café = 1 planta individual. 100 cafés = 100 plantas individuales (cada una con su hoja de vida). 50 lechugas = 1 cama con 50 (agregado, las hortalizas se manejan en grupo).
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
          <p className="mt-2">En el formulario aparece un link sutil <em>&ldquo;Agrupar siembra&rdquo;</em> o <em>&ldquo;Registrar individualmente&rdquo;</em> si querés cambiar el default.</p>
        </Section>

        {/* Sección Foto */}
        <Section icon={Camera} title="📸 Foto: tomar y adjuntar">
          <p><strong>Al crear planta:</strong> el botón cámara abre tu cámara o galería. La foto queda en la hoja de vida de esa planta.</p>
          <p><strong>Adjuntar a evento existente</strong>: entrá al evento desde Bitácora/Historial → sección &ldquo;Adjuntar foto a este evento&rdquo;. Útil para documentar después de la siembra.</p>
          <p className="text-xs text-slate-500 italic mt-2">
            Las fotos se comprimen automáticamente a JPEG ≤500KB para no saturar el almacenamiento. La foto original con metadata se preserva localmente.
          </p>
        </Section>

        {/* Sección Zonas */}
        <Section icon={MapPin} title="📍 Zonas y ubicación">
          <p>Las plantas viven dentro de <strong>zonas</strong> (parcelas, camas, invernaderos). Antes de plantar muchas, creá las zonas:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Activos → tab <strong>&ldquo;Zonas&rdquo;</strong> (icono mapa) → +</li>
            <li>Nombre (ej. &ldquo;Casa los Sitios&rdquo;) + tipo (parcela / cama / invernadero)</li>
            <li>Definir el polígono en el mapa o capturar punto GPS</li>
          </ol>
          <p>Después al crear plantas, seleccioná esa zona como contenedor.</p>
          <p className="text-xs text-slate-500 italic mt-2">
            <strong>Brave + GPS</strong>: si el mapa abre &ldquo;desubicado&rdquo;, Brave Shields puede estar bloqueando GPS preciso. Tap el escudo en la barra → desactivá &ldquo;Block fingerprinting&rdquo; para chagra.guatoc.co.
          </p>
        </Section>

        {/* Sección Plagas */}
        <Section icon={Bug} title="🐛 Reportar plaga / invasora">
          <p>Tap menú principal → <strong>&ldquo;Plagas&rdquo;</strong>. Seleccioná la especie invasora del catálogo, capturá foto y geolocalización.</p>
          <p>Después de guardar, te aparece una pantalla con <strong>sugerencias de especies nativas para reemplazar</strong> — tap &ldquo;Sembrar aquí&rdquo; lleva al flow de siembra precargado con la nativa + las coords del invasor.</p>
        </Section>

        {/* Sección Cosechar */}
        <Section icon={Apple} title="🍎 Registrar cosecha">
          <p>Activos → seleccioná la planta → en la card aparece &ldquo;Registrar cosecha&rdquo;. Capturá cantidad cosechada (kg / unidades) + fecha. Se agrega como log--harvest a la hoja de vida.</p>
          <p>También por voz: &ldquo;coseché 5 kilos de gulupas&rdquo; con el FAB micrófono.</p>
        </Section>

        {/* Sección Feedback */}
        <Section icon={MessageCircle} title="💬 Reportar bug o sugerir mejora">
          <p>Botón flotante 💬 abajo a la <strong>derecha</strong> (siempre visible). Podés:</p>
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
              <p className="text-xs text-slate-400">El mapa centra automático al abrir el modal. Si tarda más de 15s o cae en error, tap &ldquo;Reintentar&rdquo;. En Brave: revisá Shields fingerprinting.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">🎤 Voz no transcribe</p>
              <p className="text-xs text-slate-400">Verificá permiso de micrófono (iOS: Ajustes → Safari → Micrófono → chagra.guatoc.co → Permitir). Necesita conexión activa al servidor de transcripción.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">📷 La foto no aparece tras adjuntarla</p>
              <p className="text-xs text-slate-400">Recargá la pantalla — IndexedDB puede tardar en flush. Si persiste, reportá via 💬.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">🌱 Creé planta y no aparece en la zona</p>
              <p className="text-xs text-slate-400">Verificá que la zona esté seleccionada como &ldquo;contenedora&rdquo; en el formulario. En vista &ldquo;Activos → Plantas → Todas&rdquo; aparecen sin filtro.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">⚠️ Sin red en campo</p>
              <p className="text-xs text-slate-400">Todo funciona offline. Los datos se sincronizan automáticamente cuando volvés a estar online. Indicador en la barra superior.</p>
            </div>
          </div>
        </Section>

        {/* Sección Tips Lili field test */}
        <Section icon={AlertTriangle} title="🧪 Casos de uso para validar (field test)">
          <p>Si estás en field test, probá estos casos puntuales y reportá via 💬:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
            <li>Crear zona &ldquo;Balcón&rdquo; + agregar planta &ldquo;Gulupa&rdquo; con foto + GPS</li>
            <li>Voz: &ldquo;Sembré 1 mata de albahaca en la cocina&rdquo;</li>
            <li>Reportar plaga simulada (ej. retamo) y ver sugerencia nativa</li>
            <li>Adjuntar foto a un registro pasado desde Bitácora</li>
            <li>Cosecha por voz: &ldquo;Coseché 3 frutos de fresa&rdquo;</li>
          </ul>
        </Section>

        <p className="text-xs text-slate-600 text-center mt-4 italic">
          Manual v1.0 — última actualización 2026-05-03
        </p>
      </div>
    </div>
  );
}
