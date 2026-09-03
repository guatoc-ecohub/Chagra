/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Harness de test: strings fijas intencionales, solo para verificacion manual. */
/**
 * compai-gate-harness.jsx — verificacion visual manual del fix "el compAI
 * elegido aparece en toda la app" (2026-07-25).
 *
 * Monta AgentAvatarSelector (Perfil → Apariencia, real, 3 opciones desde el
 * merge de la zarigüeya #2783) y AgentFab (el boton flotante, real) uno
 * junto al otro. Antes del fix, AgentFab importaba `Angelita` cruda
 * (visual/agente/Angelita.jsx) y punto — elegir maiz o zarigüeya en el
 * selector no cambiaba nada en el FAB. Con el fix, ambos leen
 * useAgentAvatarType() (via el dispatcher ChagraAgentAvatar), asi que un
 * clic en la tarjeta de la zarigüeya debe cambiar el FAB al instante (mismo
 * evento 'chagra:agent-avatar-changed').
 *
 * Temporal — no se importa desde ningun otro archivo del repo ni de ningun
 * spec.js con snapshots (a diferencia de component-harness.html/.jsx).
 */
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import AgentAvatarSelector from '../../src/components/Settings/AgentAvatarSelector.jsx';
import AgentFab from '../../src/components/AgentFab.jsx';

function Gate() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1 className="text-xl font-black text-white mb-1">
        Verificación — el compAI elegido aparece en toda la app
      </h1>
      <p className="text-xs text-slate-400 mb-6">
        Elija una tarjeta abajo. El botón flotante (esquina inferior derecha
        de la ventana) debe cambiar al instante.
      </p>
      <AgentAvatarSelector />
      <AgentFab onNavigate={() => {}} />
    </div>
  );
}

createRoot(document.getElementById('gate-root')).render(<Gate />);
