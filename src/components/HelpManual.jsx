import React, { useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import HelpTipCard from './HelpTipCard.jsx';
import HelpHomeScreen from './HelpHomeScreen.jsx';
import HelpVozScreen from './HelpVozScreen.jsx';
import HelpUsoScreen from './HelpUsoScreen.jsx';
import HelpCicloScreen from './HelpCicloScreen.jsx';

/**
 * HelpManual — Manual de usuario integrado en la PWA.
 *
 * Acceso: TopBar → botón ? (HelpCircle).
 *
 * Rediseño 2026-05-08 (queue/039 + UX feedback): router interno con 3
 * sub-vistas grandes en lugar de 12 secciones planas apiladas.
 *
 *   Home  → 3 botones grandes (voz / uso / ciclo)
 *   Voz   → tutorial híbrido + CTA "Probar voz ahora"
 *   Uso   → FAQs reorganizadas en 6 temas (incluye Reportar bug)
 *   Ciclo → wrapper de HelpCycleSection (accordion por especie, PR #201)
 *
 * Principios aplicados (Workspace/Chagra-strategy/ops/chagra-ux-principles.md):
 *   P1 tono "tú" cercano (anti-ladrillo)
 *   P2 densidad — pantalla en campo, tap targets ≥48px (≥80px en home CTAs)
 *   P3 offline-first sin disculpas
 *   P4 conversacional pero verificable
 *   P5 ayuda discoverable, no monolítica
 *   P6 identidad sin postureo
 *
 * Movimientos:
 *   - "Field test cases para Lili" → Workspace/Chagra-strategy/ops/field-test-cases.md
 *   - "Novedades mayo 2026"        → Chagra/CHANGELOG.md (root)
 */
export default function HelpManual({ onBack, onNavigate }) {
  // 'home' | 'voz' | 'uso' | 'ciclo'
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

      {/* Tip del día siempre visible bajo el header */}
      <HelpTipCard />

      {/* Sub-vistas */}
      {section === 'home' && (
        <HelpHomeScreen onSelect={setSection} />
      )}
      {section === 'voz' && (
        <HelpVozScreen onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'uso' && (
        <HelpUsoScreen onBackToHome={goHome} onNavigate={closeAndNavigate} />
      )}
      {section === 'ciclo' && (
        <HelpCicloScreen onBackToHome={goHome} />
      )}
    </div>
  );
}
