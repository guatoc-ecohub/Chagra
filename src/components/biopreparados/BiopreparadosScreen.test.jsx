/**
 * BiopreparadosScreen.test.jsx — mundo "Biopreparados" (fichas photo-forward).
 *
 * Cubre:
 *   1. Render base: intro + link de toxicología + filtros por familia + fichas.
 *   2. Acordeón: abrir una ficha muestra dosis, precauciones y paso a paso.
 *   3. GROUNDING (cero fabricación): la dosis y la precaución mostradas salen
 *      TEXTUALES del catálogo (catalog/biopreparados-seed.json).
 *   4. Seguridad: EPP + veto (do_not_use_when) + semáforo de riesgo del caldo
 *      bordelés (safety_class alto).
 *   5. Filtro por categoría (tipo del catálogo).
 *   6. Puente al agente (onNavigate) + honestidad de fotos (créditos).
 *   7. Español de Colombia: ningún texto propio usa voseo argentino.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import seedRaw from '../../../catalog/biopreparados-seed.json';

// El catálogo real (sqlite en prod) se sirve desde el seed en el test: es la
// ÚNICA fuente de dosis/precauciones (cero fabricación).
vi.mock('../../db/catalogDB', () => ({
  getAllBiopreparados: vi.fn(() => Promise.resolve(seedRaw.biopreparados)),
}));

import BiopreparadosScreen from './BiopreparadosScreen.jsx';

const SEED = new Map(seedRaw.biopreparados.map((b) => [b.id, b]));

const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
const norm = (s) => String(s).toLowerCase().replace(/[áéíóúüñ]/g, (c) => ACENTOS[c]).replace(/\s+/g, '');

describe('BiopreparadosScreen — render base', () => {
  it('monta la pantalla, la intro, el link de toxicología y las fichas', async () => {
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByTestId('biopreparados-screen')).toBeInTheDocument();
    expect(screen.getByTestId('bio-toxicologia-link')).toBeInTheDocument();
    // Una ficha por cada biopreparado del catálogo
    const caldo = await screen.findByTestId('bio-card-caldo_bordeles');
    expect(caldo).toBeInTheDocument();
    expect(screen.getByTestId('bio-card-purin_ortiga')).toBeInTheDocument();
    expect(screen.getByTestId('bio-card-bocashi')).toBeInTheDocument();
  });
});

describe('BiopreparadosScreen — acordeón + grounding', () => {
  it('abre la ficha del caldo bordelés y muestra dosis y precaución TEXTUALES del catálogo', async () => {
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={() => {}} />);
    const toggle = await screen.findByTestId('bio-toggle-caldo_bordeles');
    fireEvent.click(toggle);

    const ficha = await screen.findByTestId('bio-ficha-caldo_bordeles');
    const card = screen.getByTestId('bio-card-caldo_bordeles');
    const seed = SEED.get('caldo_bordeles');

    // Dosis: provenance contra el catálogo (no inventada).
    const dosis = within(ficha).getByTestId('bio-dosis');
    expect(norm(dosis.textContent)).toContain(norm(seed.dosis));

    // Precaución: la prosa de seguridad del catálogo aparece íntegra.
    const prec = within(ficha).getByTestId('bio-precauciones');
    expect(norm(prec.textContent)).toContain(norm(seed.precaucion_seguridad));

    // EPP del catálogo (guantes/careta/gafas) como pastillas.
    const epp = within(ficha).getByTestId('bio-epp');
    expect(epp).toHaveTextContent(/Guantes/);
    expect(epp).toHaveTextContent(/Gafas/);

    // Semáforo de riesgo ALTO (safety_class del catálogo) — vive en la cabecera.
    expect(within(card).getByTestId('bio-safety-alto')).toBeInTheDocument();

    // Veto de floración (do_not_use_when) + tiempo de reingreso (21 días).
    expect(norm(prec.textContent)).toContain(norm('floración'));
    expect(prec).toHaveTextContent(/21 d[ií]as/);

    // Paso a paso presente.
    expect(within(ficha).getByTestId('bio-pasos')).toBeInTheDocument();
  });

  it('muestra la dosis del purín de ortiga incluyendo el objetivo groundeado (pulgón)', async () => {
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={() => {}} />);
    fireEvent.click(await screen.findByTestId('bio-toggle-purin_ortiga'));
    const ficha = await screen.findByTestId('bio-ficha-purin_ortiga');
    // "pulgón" aparece LITERAL en la dosis del catálogo → la glosa puede nombrarlo.
    expect(norm(ficha.textContent)).toContain('pulgon');
    expect(norm(within(ficha).getByTestId('bio-dosis').textContent)).toContain(norm(SEED.get('purin_ortiga').dosis));
  });
});

describe('BiopreparadosScreen — filtro por familia', () => {
  it('filtra a caldos y oculta los fermentados', async () => {
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={() => {}} />);
    await screen.findByTestId('bio-card-caldo_bordeles');
    fireEvent.click(screen.getByTestId('bio-filtro-caldo'));
    await waitFor(() => {
      expect(screen.getByTestId('bio-card-caldo_bordeles')).toBeInTheDocument();
      expect(screen.queryByTestId('bio-card-bocashi')).toBeNull();
    });
  });
});

describe('BiopreparadosScreen — puentes', () => {
  it('el link de toxicología navega a la pestaña de insumos', async () => {
    const onNavigate = vi.fn();
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByTestId('bio-toxicologia-link'));
    expect(onNavigate).toHaveBeenCalledWith('toxicologia', { tab: 'insumos' });
  });

  it('el puente al agente pasa un prompt precargado', async () => {
    const onNavigate = vi.fn();
    render(<BiopreparadosScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(await screen.findByTestId('bio-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({ prefilledPrompt: expect.any(String) }));
  });
});

describe('BiopreparadosScreen — español de Colombia (sin voseo)', () => {
  it('ningún texto propio usa voseo argentino', async () => {
    const { container } = render(<BiopreparadosScreen onBack={() => {}} onNavigate={() => {}} />);
    await screen.findByTestId('bio-card-caldo_bordeles');
    // Abrimos todas las fichas para barrer también el cuerpo.
    for (const b of seedRaw.biopreparados) {
      const t = screen.queryByTestId(`bio-toggle-${b.id}`);
      if (t) fireEvent.click(t);
    }
    const txt = container.textContent || '';
    // Imperativo voseante (raíz + á/ás final): lo rechazamos a favor del usted.
    expect(txt).not.toMatch(/\b(aplic|dilu|revolv|mir|us|ten|ac[ée]rc|prob)á[s]?\b/i);
    expect(txt).not.toMatch(/\bvos\b/i);
  });
});
