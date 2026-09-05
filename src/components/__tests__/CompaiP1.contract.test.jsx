/**
 * Contrato integrado P1 del elenco compai.
 *
 * Esta matriz cruza la selección persistida con el perfil, el adaptador y el
 * rig real. También comprueba que la entrada por portal y la guía de pantalla
 * conserven la especie elegida, y que una entrada inválida sea el único caso
 * que use Angelita como fallback.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChagraAgentAvatar from '../ChagraAgentAvatar.jsx';
import CompaiGuiaPantalla from '../CompaiGuiaPantalla.jsx';
import { AVATAR_NOMBRE, AVATAR_TYPES } from '../../hooks/useAgentAvatarType.js';
import { ESTADOS_DE_PERFIL } from '../../visual/agente/angelitaEstados.js';
import {
  COMPAI_ESPECIES,
  obtenerEspecieCompai,
} from '../../visual/agente/compaiEspecies.js';
import { IDLE_PERFILES } from '../../visual/creatures/creatureIdle.js';
import { PERFILES as PERFILES_CLIMA } from '../../visual/creatures/creatureClimaCuerpo.js';
import AbejaTransicion from '../../visual/creatures/AbejaTransicion.jsx';
import { cuerpoPortalDe } from '../../visual/mundo3d/escenas/CompaiTransicion.jsx';
import { resolverCompai } from '../../visual/mundo3d/escenas/compaiRegistry.js';

const CLIMA = 'lluvia';
const VISEMA = 'V3';
const ROSTER = [
  'angelita',
  'jaguar',
  'oso-baston',
  'zariguya',
  'luciernaga',
  'chivito-punk',
  'guacamaya',
];

function elegir(especie) {
  localStorage.setItem('compai:companero', especie);
  localStorage.setItem('chagra:agent-avatar-type', especie);
}

function rigDe(container) {
  return container.querySelector('[data-agt-estado][data-pose][data-creature]');
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('P1 contrato integrado del elenco compai', () => {
  it('mantiene roster, perfil, idle y capacidades alineados', () => {
    expect(new Set(AVATAR_TYPES)).toEqual(new Set(ROSTER));
    expect(AVATAR_TYPES).toHaveLength(ROSTER.length);

    for (const especie of AVATAR_TYPES) {
      const perfil = COMPAI_ESPECIES[especie];
      expect(perfil, `${especie} no tiene perfil`).toBeDefined();
      expect(Object.keys(perfil.posePorEstado)).toEqual(ESTADOS_DE_PERFIL);
      expect(perfil.posePorEstado.caminando).toBeTruthy();
      expect(IDLE_PERFILES[perfil.idlePerfil], `${especie} sin idle`).toBeTruthy();
      expect(PERFILES_CLIMA[perfil.climaPerfil], `${especie} sin clima`).toBeTruthy();
      expect(perfil.capacidades).toEqual(expect.objectContaining({
        visema: expect.objectContaining({ estrategia: expect.any(String) }),
        clima: expect.objectContaining({ estrategia: expect.any(String) }),
        guia: expect.objectContaining({ estrategia: expect.any(String) }),
        entrada: expect.objectContaining({ estrategia: expect.any(String) }),
        marcha: expect.objectContaining({ estrategia: expect.any(String) }),
      }));
    }
  });

  for (const especie of ROSTER) {
    it(`${especie} recibe los 10 estados ricos y caminando sin degradar el rig`, () => {
      elegir(especie);
      const perfil = COMPAI_ESPECIES[especie];

      for (const estado of ESTADOS_DE_PERFIL) {
        const { container, unmount } = render(
          <ChagraAgentAvatar
            estado={estado}
            visema={VISEMA}
            clima={CLIMA}
            reaccionaPresencia={false}
          />,
        );
        const rig = rigDe(container);

        expect(rig, `${especie} perdió el rig en ${estado}`).toBeInTheDocument();
        expect(rig).toHaveAttribute('data-agt-especie', especie);
        expect(rig).toHaveAttribute('data-creature', perfil.creatureSlug);
        expect(rig).toHaveAttribute('data-agt-estado', estado);
        expect(rig).toHaveAttribute('data-pose', perfil.posePorEstado[estado]);
        expect(rig).toHaveAttribute('data-visema', VISEMA);
        expect(rig).toHaveAttribute('data-clima', CLIMA);
        if (especie !== 'angelita') {
          expect(rig).not.toHaveAttribute('data-creature', 'abeja-angelita');
        }
        unmount();
      }
    });
  }

  it('conserva especie y nombre en la guía species-aware de pantalla', () => {
    // RECABLEADO 2026-09-03 (decisión del operador: la explicación de la
    // pantalla SALE EN LA PIZARRA SIEMPRE): el bloque ya no es una burbuja
    // auto-pop con demora — se renderiza dentro de la pizarra al abrirse el
    // panel "Ver", sin timers.
    for (const especie of ROSTER) {
      elegir(especie);
      const { container, unmount } = render(
        <CompaiGuiaPantalla pantalla="activos" onNavigate={() => {}} />,
      );

      const guia = container.querySelector('[role="region"]');
      expect(guia, `${especie} no presentó la guía`).toBeInTheDocument();
      expect(guia).toHaveAttribute('aria-label', `Guía de ${AVATAR_NOMBRE[especie]}`);
      expect(guia.querySelector('button')).toHaveAccessibleName(/Preguntar sobre/);
      unmount();
      sessionStorage.clear();
    }
  });

  it('conserva especie en entrada y vuelta por el portal propio', () => {
    for (const especie of ROSTER) {
      const compai = resolverCompai(especie);
      expect(cuerpoPortalDe(compai)).toBe(compai.PortalComponent);

      for (const sentido of ['entrar', 'volver']) {
        const { container, unmount } = render(
          <AbejaTransicion sentido={sentido} Cuerpo={cuerpoPortalDe(compai)} onFin={() => {}} />,
        );
        expect(
          container.querySelector(`[data-creature="${compai.especie}"]`),
          `${especie} perdió su cuerpo durante ${sentido}`,
        ).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('usa Angelita únicamente para una especie inválida', () => {
    const compai = resolverCompai('especie-invalida');
    expect(compai.avatarType).toBe('angelita');
    expect(compai.esFallback).toBe(true);
    expect(cuerpoPortalDe(compai)).toBe(compai.PortalComponent);
    expect(obtenerEspecieCompai('especie-invalida')).toBeNull();

    elegir('especie-invalida');
    const { container } = render(
      <ChagraAgentAvatar estado="respondiendo" visema={VISEMA} reaccionaPresencia={false} />,
    );
    expect(rigDe(container)).toHaveAttribute('data-creature', 'abeja-angelita');
  });
});
