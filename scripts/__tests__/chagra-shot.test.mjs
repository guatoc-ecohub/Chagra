import { describe, it, expect } from 'vitest';
import {
  CHAGRA_SHOT_VIEWPORT,
  parseShotArgs,
  resolveShotScreen,
  sanitizeBranchName,
} from '../chagra-shot.mjs';

describe('chagra-shot.mjs', () => {
  it('parsea los argumentos requeridos y opcionales', () => {
    const args = parseShotArgs([
      'node',
      'scripts/chagra-shot.mjs',
      '--branch',
      'codex/chagra-shot-harness',
      '--screen=home',
      '--out',
      '/tmp/home.png',
      '--theme',
      'minimalista',
    ]);

    expect(args).toEqual({
      branch: 'codex/chagra-shot-harness',
      screen: 'home',
      out: '/tmp/home.png',
      theme: 'minimalista',
    });
  });

  it('acepta el formato equals para branch y out', () => {
    const args = parseShotArgs([
      'node',
      'scripts/chagra-shot.mjs',
      '--branch=main',
      '--screen',
      'perfil',
      '--out=/tmp/perfil.png',
    ]);

    expect(args.branch).toBe('main');
    expect(args.screen).toBe('perfil');
    expect(args.out).toBe('/tmp/perfil.png');
    expect(args.theme).toBeNull();
  });

  it('rechaza pantallas desconocidas', () => {
    expect(() => resolveShotScreen('no-existe')).toThrow(/Pantalla desconocida/);
  });

  it('resuelve una pantalla conocida', () => {
    const screen = resolveShotScreen('home');
    expect(screen.id).toBe('home');
  });

  it('sanitiza nombres de rama para carpetas', () => {
    expect(sanitizeBranchName('feat/chagra-shot-harness')).toBe('feat-chagra-shot-harness');
    expect(sanitizeBranchName('  codex branch  ')).toBe('codex-branch');
  });

  it('expone el viewport iPhone 12 esperado', () => {
    expect(CHAGRA_SHOT_VIEWPORT).toEqual({ width: 390, height: 844 });
  });
});
