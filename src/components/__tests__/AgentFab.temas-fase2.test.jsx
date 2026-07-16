/**
 * AgentFab.temas-fase2.test.jsx — Fase 2 de la integración de temas.
 *
 * El FAB del agente (colibrí flotante) debe adoptar la PIEL del tema activo
 * SOLO con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (dev): el botón recibe la
 * clase `fvh-skin chagra-fab`, bajo la cual `agent-fab-skin.css` retiñe el
 * plinto/borde/glow con los tokens del tema, conservando el AVATAR que el
 * usuario eligió. Con la flag OFF (prod), el FAB queda EXACTO como hoy.
 *
 * Español de Colombia (tú/usted), sin voseo.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let flagOn = false;
vi.mock('../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

// El avatar (Angelita, 2026-07-16: "jubila el colibrí") arrastra el kit
// rubber-hose completo. Lo stubbeamos: solo nos importa la CHROME del botón
// (piel por tema), no el contenido del avatar.
vi.mock('../../visual/agente/Angelita', () => ({
  default: () => <span data-testid="avatar-stub" />,
  Angelita: () => <span data-testid="avatar-stub" />,
}));

import AgentFab from '../AgentFab';

beforeEach(() => {
  flagOn = false;
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
});

describe('Fase 2 — AgentFab adopta la piel del tema (gated)', () => {
  it('flag OFF (prod): el FAB NO lleva fvh-skin (foto fija como hoy)', () => {
    flagOn = false;
    render(<AgentFab onNavigate={() => {}} />);
    const fab = screen.getByRole('button', { name: /Chagra IA/i });
    // El marcador chagra-fab es inerte sin fvh-skin (el CSS solo matchea
    // `.fvh-skin.chagra-fab`); sin fvh-skin el FAB usa sus estilos inline de
    // hoy → prod EXACTO como hoy.
    expect(fab).toHaveClass('chagra-fab');
    expect(fab).not.toHaveClass('fvh-skin');
    // El avatar (preferencia del usuario) sigue presente intacto.
    expect(screen.getByTestId('avatar-stub')).toBeInTheDocument();
  });

  it('flag ON (dev): el FAB toma fvh-skin + chagra-fab (piel por tema)', () => {
    flagOn = true;
    render(<AgentFab onNavigate={() => {}} />);
    const fab = screen.getByRole('button', { name: /Chagra IA/i });
    expect(fab).toHaveClass('chagra-fab');
    expect(fab).toHaveClass('fvh-skin');
    // El avatar del usuario NO se toca: la piel es solo la chrome del botón.
    expect(screen.getByTestId('avatar-stub')).toBeInTheDocument();
  });
});
