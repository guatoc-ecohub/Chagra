import React, { useState } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronRight, Sprout, Camera, MapPin, Bug, Apple,
  MessageCircle, Wrench,
} from 'lucide-react';
import FieldFeedback from './FieldFeedback';

/**
 * Sub-vista del Manual: cómo usar Chagra (FAQs reorganizadas).
 *
 * Reorganización 2026-05-08: 6 temas en lugar de 12 secciones planas.
 * Tono migrado a "tú" cercano (P1). "Reportar bug" dentro de FAQs (no
 * cuarto botón). "Field test cases" + "Novedades mayo 2026" salieron
 * del Manual público (movidos a docs operativos internos + CHANGELOG.md).
 */

// eslint-disable-next-line no-unused-vars -- Icon SE USA en JSX, eslint react-jsx detection falla con destructuring rename
const Section = ({ icon: Icon, title, children, defaultOpen = false, isNew = false, action = null }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl bg-slate-900/60 overflow-hidden transition-all ${isNew ? 'border-emerald-700/60 shadow-[0_0_18px_rgba(16,185,129,0.18)]' : 'border-slate-800'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full p-3 flex items-center gap-3 hover:bg-slate-800/60 active:bg-slate-800 text-left min-h-[56px]"
      >
        <span className={`shrink-0 inline-flex items-center justify-center ${open ? 'animate-pulse' : ''}`}>
          <Icon size={20} className="text-emerald-400" />
        </span>
        <span className="text-base font-bold text-white flex-1">{title}</span>
        {isNew && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-600/40 animate-pulse">
            ✨ NUEVO
          </span>
        )}
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-slate-300 leading-relaxed space-y-2">
          {children}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-300 hover:text-emerald-100 border border-emerald-700/50 font-bold text-sm transition-colors min-h-[44px]"
            >
              {action.label} <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function HelpUsoScreen({ onBackToHome, onNavigate }) {
  // Helper que cierra el manual y navega al flow real (CTA híbrida).
  const quickAction = (label, route) => ({
    label,
    onClick: () => {
      if (typeof onNavigate === 'function') onNavigate(route);
    },
  });

  // Si hay 0 plantas activas, abrir "Inicio rápido" por default. Si ya tiene
  // plantas, todo cerrado para no abrumar (P2 anti-ladrillo).
  // Sin acceso al store aquí — usamos defaultOpen=false simple, el operador
  // expande lo que necesite. Si queremos heurística first-time user en el
  // futuro, pasar `plantsCount` como prop.

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
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-amber-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-amber-200">Cómo usar Chagra</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          Toca cada tema para abrir o cerrar. Si algo no está aquí, usa el botón flotante 💬 para reportarlo.
        </p>

        {/* 1. Inicio rápido */}
        <Section icon={Sprout} title="🌱 Inicio rápido (primera vez)" action={quickAction('Crear primera planta', 'plant_asset')}>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Toca el botón <strong className="text-purple-400">+</strong> arriba (header) para registrar tu primera planta.</li>
            <li>Busca la especie escribiendo (ej. &ldquo;gulpa&rdquo; encuentra Gulupa). Chagra autocompleta estrato, gremio y producción.</li>
            <li>Si tienes foto, súbela desde la cámara o galería.</li>
            <li>Marca la ubicación: toca mapa o &ldquo;Mi ubicación&rdquo;.</li>
            <li>Guarda. Aparece en <strong>Activos → Plantas</strong>.</li>
          </ol>
          <div className="mt-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/40">
            <p className="text-[11px] font-bold text-emerald-300 uppercase mb-1">Por qué a veces crea N plantas y a veces 1</p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4 leading-relaxed">
              <li><strong className="text-emerald-300">Individual</strong>: frutales, café, plátano, aromáticas, tubérculos. Cada planta merece hoja de vida propia.</li>
              <li><strong className="text-amber-300">Agregado</strong>: hortalizas en cama, cereales, abonos verdes. Se manejan por conjunto.</li>
            </ul>
            <p className="text-[11px] text-slate-400 italic mt-2">En el formulario aparece &ldquo;Agrupar siembra&rdquo; o &ldquo;Registrar individualmente&rdquo; si quieres cambiar el default.</p>
          </div>
          <p className="text-xs text-slate-500 italic mt-2">
            ¿Sin red? La app funciona offline. Tus datos se sincronizan cuando vuelva la conexión.
          </p>
        </Section>

        {/* 2. Foto + IA */}
        <Section icon={Camera} title="📸 Foto + IA por foto" action={quickAction('Crear planta con foto', 'plant_asset')}>
          <p><strong>Al crear planta:</strong> el botón cámara abre tu cámara o galería. La foto queda en la hoja de vida de esa planta.</p>
          <p><strong>Adjuntar a evento existente</strong>: entra al evento desde Bitácora → sección &ldquo;Adjuntar foto a este evento&rdquo;. Útil para documentar después.</p>

          <div className="mt-3 p-3 rounded-lg bg-emerald-900/15 border border-emerald-800/30">
            <p className="text-emerald-300 font-bold text-sm mb-1">🌱 Foto guía por especie</p>
            <ul className="text-xs text-slate-300 list-disc pl-5 space-y-1 leading-relaxed">
              <li>Tu primera foto de cada especie queda como referencia visual cada vez que abras el form de la misma especie.</li>
              <li>Si nunca tomaste foto, ves un placeholder verde con &ldquo;Agrega una foto&rdquo;. No es error: es invitación.</li>
              <li>Las fotos NO se comparten con otras fincas (privacidad). Solo tú las ves en tu cuenta.</li>
              <li>Las fotos se comprimen automáticamente a JPEG ≤500KB para no saturar el almacenamiento.</li>
            </ul>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-amber-900/15 border border-amber-800/30">
            <p className="text-amber-300 font-bold text-sm mb-1">🧬 IA por foto (PRUEBA)</p>
            <p className="text-xs text-slate-300 leading-relaxed">Dos funciones, ambas marcadas <strong className="text-amber-300">PRUEBA</strong>:</p>
            <ul className="text-xs text-slate-300 list-disc pl-5 space-y-1 mt-2 leading-relaxed">
              <li><strong>Diagnóstico de enfermedades</strong>: en Bitácora → entrada con foto → botón &ldquo;Analizar foto con IA&rdquo;. Detecta enfermedades, deficiencias, score de salud.</li>
              <li><strong>Identificar especie por foto</strong>: en SpeciesSelect → cámara. IA propone especie + alternativas. Confianza ≥70% auto-selecciona.</li>
              <li>Si el modelo local no responde, usa <strong>Consultar IA externa</strong> en plant detail (genera prompt para Gemini/ChatGPT/Claude).</li>
            </ul>
            <p className="text-[11px] text-slate-400 italic mt-2">
              Necesita internet. Si no se conecta, te跳 opciones para reintentar.
            </p>
          </div>
        </Section>

        {/* 3. Zonas y ubicación */}
        <Section icon={MapPin} title="📍 Zonas y ubicación" action={quickAction('Ver mapa de la finca', 'mapa')}>
          <p>Tus plantas viven dentro de <strong>zonas</strong> (parcelas, camas, invernaderos). Antes de plantar muchas, crea las zonas:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Activos → tab <strong>&ldquo;Zonas&rdquo;</strong> (icono mapa) → +</li>
            <li>Nombre (ej. &ldquo;Casa los Sitios&rdquo;) + tipo (parcela / cama / invernadero)</li>
            <li>Define el polígono en el mapa o captura punto GPS</li>
          </ol>
          <p>Después al crear plantas, selecciona esa zona como contenedor.</p>
            <p className="text-xs text-slate-500 italic mt-2">
              <strong>Brave + GPS</strong>: si el mapa muestra tu ubicación incorrectamente, el navegador podría estar bloqueando el acceso preciso a tu ubicación. Para solucionarlo, toca el icono del escudo en la barra de direcciones del navegador y desactiva la opción de bloqueo de huellas digitales para chagra.guatoc.co.
            </p>
        </Section>

        {/* 4. Plagas y cosechas */}
        <Section icon={Bug} title="🐛 Plagas y 🍎 cosecha">
          <p className="font-bold text-emerald-200">Reportar plaga / invasora</p>
          <p>Toca menú principal → <strong>&ldquo;Plagas&rdquo;</strong>. Selecciona la especie invasora del catálogo, captura foto y geolocalización.</p>
          <p>Después de guardar te aparece una pantalla con <strong>sugerencias de especies nativas para reemplazar</strong>. Toca &ldquo;Sembrar aquí&rdquo; y vas al flow de siembra precargado con la nativa + las coordenadas del invasor.</p>

          <p className="font-bold text-emerald-200 mt-3">Registrar cosecha</p>
          <p>Activos → selecciona la planta → en la card aparece &ldquo;Registrar cosecha&rdquo;. Captura cantidad cosechada (kg / unidades) + fecha. Se agrega como log de cosecha a la hoja de vida.</p>
          <p>También por voz: &ldquo;coseché 5 kilos de gulupas&rdquo; con el botón micrófono.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={quickAction('Reportar plaga', 'reportar_invasora').onClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-700/50 font-bold text-xs min-h-[40px]"
            >
              <Bug size={14} /> Reportar plaga
            </button>
            <button
              type="button"
              onClick={quickAction('Registrar cosecha', 'cosechar').onClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-700/50 font-bold text-xs min-h-[40px]"
            >
              <Apple size={14} /> Registrar cosecha
            </button>
          </div>
        </Section>

        {/* 5. Reportar problema / sugerir mejora — embed del FieldFeedback
            form. Antes vivía como FAB flotante 💬 global; movido acá
            2026-05-21 por feedback usuario (más discoverable + no tapa
            contenido). isNew=true para resaltar la nueva ubicación. */}
        <Section
          icon={MessageCircle}
          title="💬 Reportar problema con Chagra"
          isNew
          defaultOpen
        >
          <div className="bg-slate-950/50 border border-cyan-800/40 rounded-lg p-4">
            <FieldFeedback embedded />
          </div>
        </Section>

        {/* 6. Problemas comunes */}
        <Section icon={Wrench} title="🔧 Problemas comunes">
          <div className="space-y-3">
            <div>
              <p className="font-bold text-amber-300">📍 GPS no encuentra mi ubicación</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                El mapa centra automático al abrir el modal. Si tarda más
                de 15s o cae en error, toca &ldquo;Reintentar&rdquo;.
              </p>
              <details className="text-xs text-slate-400 leading-relaxed">
                <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300 font-bold mb-1">
                  📱 En iPhone (iOS Safari)
                </summary>
                <ol className="list-decimal pl-5 space-y-1 mt-1">
                  <li>
                    Ajustes (la app del engranaje gris) → busca &ldquo;Safari&rdquo;
                    en la lista de apps → entra ahí.
                  </li>
                  <li>
                    Baja hasta encontrar <strong>&ldquo;Ubicación&rdquo;</strong> y
                    toca. Si dice &ldquo;Denegar&rdquo;, cámbialo a
                    &ldquo;Preguntar&rdquo; o &ldquo;Permitir&rdquo;.
                  </li>
                  <li>
                    Vuelve a Ajustes → &ldquo;Privacidad y seguridad&rdquo; →
                    &ldquo;Localización&rdquo; → confirma que la
                    <strong> localización general esté activada</strong> (al
                    principio de la pantalla).
                  </li>
                  <li>
                    Vuelve a Chagra, recarga la página (cierra la pestaña en
                    Safari y vuelve a entrar), y acepta el popup de permiso
                    cuando aparezca.
                  </li>
                </ol>
                <p className="mt-2 text-slate-500 italic">
                  Si instalaste Chagra como app desde &ldquo;Añadir a pantalla
                  de inicio&rdquo;, la primera vez te va a preguntar de nuevo
                  el permiso — es esperado, acepta.
                </p>
              </details>
              <details className="text-xs text-slate-400 leading-relaxed mt-2">
                <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300 font-bold mb-1">
                  🤖 En Android (Chrome o Brave)
                </summary>
                <ol className="list-decimal pl-5 space-y-1 mt-1">
                  <li>
                    En Chrome: barra de URL → ícono del candado o tres
                    puntos → &ldquo;Configuración del sitio&rdquo; o
                    &ldquo;Permisos&rdquo; → &ldquo;Ubicación&rdquo; → permitir
                    para chagra.guatoc.co.
                  </li>
                  <li>
                    En Brave: lo mismo + revisar que la opción de
                    <strong> bloqueo de huellas digitales esté desactivada</strong>
                    {' '}solo para este sitio (Brave bloquea geolocation por defecto).
                  </li>
                  <li>
                    A nivel sistema: Ajustes Android → Ubicación → activada
                    + el navegador con permiso en &ldquo;Permitir todo el
                    tiempo&rdquo; o &ldquo;Solo mientras se usa&rdquo;.
                  </li>
                </ol>
              </details>
            </div>
            <div>
              <p className="font-bold text-amber-300">🎤 Voz no transcribe</p>
              <p className="text-xs text-slate-400 leading-relaxed">Verifica permiso de micrófono (iOS: Ajustes → Safari → Micrófono → chagra.guatoc.co → Permitir). Necesita conexión activa al servidor de transcripción.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">📷 La foto no aparece tras adjuntarla</p>
              <p className="text-xs text-slate-400 leading-relaxed">Recarga la pantalla, IndexedDB puede tardar en flush. Si persiste, repórtalo via 💬.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">🌱 Creé planta y no aparece en la zona</p>
              <p className="text-xs text-slate-400 leading-relaxed">Verifica que la zona esté seleccionada como &ldquo;contenedora&rdquo; en el formulario. En vista &ldquo;Activos → Plantas → Todas&rdquo; aparecen sin filtro.</p>
            </div>
            <div>
              <p className="font-bold text-amber-300">⚠️ Sin red en campo</p>
              <p className="text-xs text-slate-400 leading-relaxed">Todo funciona offline. Tus datos se sincronizan automáticamente cuando vuelvas a estar online. Indicador en la barra superior.</p>
            </div>
          </div>
        </Section>

        <p className="text-[11px] text-slate-600 text-center mt-4 italic leading-relaxed">
          Manual v2.0 · Rediseño 2026-05-08 · Colombia es el país de la belleza.
        </p>
      </main>
    </div>
  );
}
