import React, { useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import HelpTipCard from './HelpTipCard.jsx';
import HelpHomeScreen from './HelpHomeScreen.jsx';
import HelpVozScreen from './HelpVozScreen.jsx';
import HelpUsoScreen from './HelpUsoScreen.jsx';
import HelpCicloScreen from './HelpCicloScreen.jsx';
import HelpDictionary from './HelpDictionary.jsx';
import HelpVoiceRegionalDemo from './HelpVoiceRegionalDemo.jsx';
import HelpAgentSection from './HelpAgentSection.jsx';
import HelpDatosScreen from './HelpDatosScreen.jsx';
import HelpFuncionesScreen from './help/HelpFuncionesScreen.jsx';
import { CosturaDivider } from './help/HelpIllustrations.jsx';

/**
 * HelpManual — Manual de usuario integrado en la PWA.
 *
 * Acceso: TopBar → botón ? (HelpCircle).
 *
 * Rediseño 2026-05-08 (queue/039 + UX feedback): router interno con 3
 * sub-vistas grandes en lugar de 12 secciones planas apiladas.
 *
 *   Home        → cuatro lugares de Chagra + atajos a pantallas nuevas
 *                 (especies/calendario/mercados/faq) + 6 temas guía
 *   Voz         → tutorial híbrido + CTA "Probar voz ahora"
 *   Uso         → FAQs reorganizadas en temas (incluye Reportar problema)
 *   Ciclo       → wrapper de HelpCycleSection (accordion por especie, PR #201)
 *   Diccionario → ~70 términos curados (identidad/microorg/biopreparados/...)
 *   Agente      → "Sobre el agente Chagra" cero hype, qué SÍ y qué NO puede (task #123)
 *
 * Actualización ola 1.1.0 (2026-06-25): el home se reorganizó en cuatro
 * lugares (Gestionar/Aprender/Jugar/Agente) y se estrenaron directorio de
 * especies, calendario de finca, mercado y FAQ groundeado (#1849, #1853-#1856).
 * El Manual ahora apunta a esas pantallas y describe el agente real
 * (granite3.3, catálogo grande, voz y foto en el chat).
 *
 * Principios aplicados (UX guidelines internos del proyecto):
 *   P1 tono "tú" cercano (anti-ladrillo)
 *   P2 densidad — pantalla en campo, tap targets ≥48px (≥80px en home CTAs)
 *   P3 sin disculpas — cuando no hay red no se nota, todo sigue funcionando igual
 *   P4 cercano pero chevereable — cada dato tiene fuente, nada inventado
 *   P5 ayuda discoverable, no monolítica
 *   P6 identidad sin postureo — somos campo, no startup
 *
 * Movimientos:
 *   - "Field test cases operadora piloto" → docs operativos internos
 *   - "Novedades mayo 2026"        → Chagra/CHANGELOG.md (root)
 */
export default function HelpManual({ onBack, onNavigate }) {
  // 'home' | 'funciones' | 'voz' | 'uso' | 'ciclo' | 'diccionario' | 'agente' | 'datos' | 'voz-regional-demo'
  const [section, setSection] = useState('home');

  // CTAs híbridas (P5): cierran el manual y navegan al flow real.
  const closeAndNavigate = (route) => {
    if (typeof onNavigate === 'function') onNavigate(route);
    else if (typeof onBack === 'function') onBack();
  };

  const goHome = () => setSection('home');

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-y-auto">
      {/* Header global del Manual: back cierra el manual entero */}
      <header className="p-4 sticky top-0 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex items-center gap-3 z-10 shrink-0 shadow-lg">
        <button
          type="button"
          onClick={onBack}
          aria-label="Cerrar manual"
          className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen size={22} className="text-emerald-400 shrink-0" />
          <h2 className="text-xl font-black tracking-tight truncate">Manual de uso</h2>
        </div>
      </header>

      {/* Dobladillo cosido bajo el header: LA COSTURA de la marca (misma
          puntada del dobladillo de la mochila del agente) — el Manual es
          contenido curado, cosido al cuaderno de campo. */}
      <CosturaDivider className="mx-4 mt-2" />

      {/* Tip del día siempre visible bajo el header */}
      <HelpTipCard />

      {/* Sub-vistas */}
      {section === 'home' && (
        // @ts-ignore TS sees HelpHomeScreen as Function type
        <HelpHomeScreen onSelect={setSection} onNavigate={closeAndNavigate} />
      )}
      {section === 'funciones' && (
        <HelpFuncionesScreen onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'voz' && (
        <HelpVozScreen onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'uso' && (
        <HelpUsoScreen onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'voz-regional-demo' && (
        <HelpVoiceRegionalDemo onBackToHome={goHome} />
      )}
      {section === 'ciclo' && (
        <HelpCicloScreen onBackToHome={goHome} />
      )}
      {section === 'diccionario' && (
        <HelpDictionary onBackToHome={goHome} />
      )}
      {section === 'agente' && (
        <HelpAgentSection onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'datos' && (
        <HelpDatosScreen
          onBackToHome={goHome}
          onNavigate={(route) => {
            // 'agente' navega DENTRO del manual a la sección del agente
            // (task #123), no cierra el manual. Otras rutas siguen el
            // comportamiento de CTA híbrida (cerrar + navegar la app).
            if (route === 'agente') setSection('agente');
            else closeAndNavigate(route);
          }}
        />
      )}
    </div>
  );
}
