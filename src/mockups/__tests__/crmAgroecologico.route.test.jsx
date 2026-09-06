import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import appSource from '../../App.jsx?raw';
import CrmAgroecologico from '../CrmAgroecologico.jsx';

describe('CRM agroecológico mockup route', () => {
  it('is reachable from the public mockup hash route and lazy-loads its entry', () => {
    expect(appSource).toContain("'mockups/crm-agroecologico': 'mockup_crm_agroecologico'");
    expect(appSource).toContain("lazy(() => import('./mockups/CrmAgroecologico'))");
    expect(appSource).toContain("case 'mockup_crm_agroecologico':");
    expect(appSource).toContain('<CrmAgroecologicoMockup onBack={() => navigate(\'dashboard\')} />');
  });

  it('connects contact selection, interaction history, and network summary', async () => {
    const user = userEvent.setup();
    render(<CrmAgroecologico />);

    expect(screen.getByRole('heading', { name: 'CRM agroecológico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Historial de Ana Cuaran' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver historial de Diego Ramos' }));
    expect(screen.getByRole('heading', { name: 'Historial de Diego Ramos' })).toBeInTheDocument();
    expect(screen.getByText('Tu Red de Contactos')).toBeInTheDocument();
  });
});
