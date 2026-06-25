/**
 * manoRamasReachable.test.js — anti-huérfana de la mano radial (auditoría UX
 * §7.4 P3): las ramas "Aprender" y "Vender" NO deben morir en un dead-end.
 *
 * Verifica el CABLEADO en su fuente normativa (el manifiesto) + el routing
 * (mapCapabilityPick): cada rama debe tener al menos UNA capacidad clickeable
 * (status 'live') que enrute a una superficie real alcanzable.
 *
 * El render de la mano se valida en AgentRedMenu.smoke + chromium en vivo; aquí
 * blindamos el contrato de datos/routing que hace que la rama tenga destino.
 */
import { describe, it, expect, vi } from 'vitest';
import { CAPABILITY_MANIFEST } from '../../services/agentCapabilities';
import { mapCapabilityPick } from './capabilityRouting';

function heroLiveLeavesForGroup(group) {
  return CAPABILITY_MANIFEST.filter(
    (e) => e.hero === true && e.group === group && e.status === 'live',
  );
}

describe('mano radial — ramas Aprender y Vender alcanzables (no dead-end)', () => {
  it('la rama "aprender" tiene una capacidad LIVE que navega a la vista "aprende"', () => {
    const leaves = heroLiveLeavesForGroup('aprender');
    expect(leaves.length).toBeGreaterThan(0);
    const navAprende = leaves.find(
      (c) => c.heroRoute?.kind === 'nav' && c.heroRoute?.view === 'aprende',
    );
    expect(navAprende).toBeTruthy();
  });

  it('la rama "vender" tiene una capacidad LIVE que navega a una superficie real (mercados)', () => {
    const leaves = heroLiveLeavesForGroup('vender');
    expect(leaves.length).toBeGreaterThan(0);
    const navMercados = leaves.find(
      (c) => c.heroRoute?.kind === 'nav' && c.heroRoute?.view === 'mercados',
    );
    expect(navMercados).toBeTruthy();
  });

  it('mapCapabilityPick enruta la rama "aprender" a onNav("aprende")', () => {
    const cap = heroLiveLeavesForGroup('aprender').find(
      (c) => c.heroRoute?.view === 'aprende',
    );
    const onNav = vi.fn();
    const acted = mapCapabilityPick(cap, { onNav });
    expect(acted).toBe(true);
    expect(onNav).toHaveBeenCalledWith('aprende');
  });

  it('mapCapabilityPick enruta la rama "vender" a onNav("mercados")', () => {
    const cap = heroLiveLeavesForGroup('vender').find(
      (c) => c.heroRoute?.view === 'mercados',
    );
    const onNav = vi.fn();
    const acted = mapCapabilityPick(cap, { onNav });
    expect(acted).toBe(true);
    expect(onNav).toHaveBeenCalledWith('mercados');
  });

  it('las capacidades de navegación de las ramas no son no-op (acted=true)', () => {
    for (const group of ['aprender', 'vender']) {
      const navCap = heroLiveLeavesForGroup(group).find(
        (c) => c.heroRoute?.kind === 'nav',
      );
      expect(navCap, `grupo ${group} sin capacidad nav live`).toBeTruthy();
      expect(mapCapabilityPick(navCap, { onNav: vi.fn() })).toBe(true);
    }
  });
});
