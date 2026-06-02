/**
 * scripts/__tests__/bench-checkout-guard.test.mjs
 *
 * Cubre la guarda ANTI-STALE de los benches (2026-05-31). El bench corrió 3
 * veces sobre código viejo y reportó un "10% AH" que era artefacto del bug
 * stale (#1240 ausente). La guarda aborta (o hace git pull) cuando el HEAD local
 * está atrás de origin/main, así NINGÚN bench vuelve a medir código que el
 * usuario ya no ve.
 *
 * `assertCheckoutCurrent` recibe el runner de git INYECTADO → el test no toca el
 * repo real ni la red.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  computeStaleDecision,
  assertCheckoutCurrent,
} from '../lib/bench-checkout-guard.mjs';

describe('computeStaleDecision (lógica pura)', () => {
  it('HEAD == origin → current/continue', () => {
    const d = computeStaleDecision({
      localHead: 'abc', remoteHead: 'abc',
      localIsAncestorOfRemote: true, remoteIsAncestorOfLocal: true,
      workingTreeClean: true, autoPull: false,
    });
    expect(d.state).toBe('current');
    expect(d.action).toBe('continue');
  });

  it('local adelantado a origin → ahead/continue (no stale)', () => {
    const d = computeStaleDecision({
      localHead: 'new', remoteHead: 'old',
      localIsAncestorOfRemote: false, remoteIsAncestorOfLocal: true,
      workingTreeClean: true, autoPull: false,
    });
    expect(d.state).toBe('ahead');
    expect(d.action).toBe('continue');
  });

  it('local ATRÁS de origin + autoPull off → behind/abort', () => {
    const d = computeStaleDecision({
      localHead: 'old', remoteHead: 'new',
      localIsAncestorOfRemote: true, remoteIsAncestorOfLocal: false,
      workingTreeClean: true, autoPull: false,
    });
    expect(d.state).toBe('behind');
    expect(d.action).toBe('abort');
    expect(d.reason).toMatch(/STALE/i);
  });

  it('local ATRÁS + limpio + autoPull on → behind/pull', () => {
    const d = computeStaleDecision({
      localHead: 'old', remoteHead: 'new',
      localIsAncestorOfRemote: true, remoteIsAncestorOfLocal: false,
      workingTreeClean: true, autoPull: true,
    });
    expect(d.state).toBe('behind');
    expect(d.action).toBe('pull');
  });

  it('local ATRÁS + working tree sucio → abort aunque autoPull on', () => {
    const d = computeStaleDecision({
      localHead: 'old', remoteHead: 'new',
      localIsAncestorOfRemote: true, remoteIsAncestorOfLocal: false,
      workingTreeClean: false, autoPull: true,
    });
    expect(d.action).toBe('abort');
    expect(d.reason).toMatch(/working tree/i);
  });

  it('divergido (ni ancestro ni descendiente) → diverged/abort', () => {
    const d = computeStaleDecision({
      localHead: 'x', remoteHead: 'y',
      localIsAncestorOfRemote: false, remoteIsAncestorOfLocal: false,
      workingTreeClean: true, autoPull: false,
    });
    expect(d.state).toBe('diverged');
    expect(d.action).toBe('abort');
  });
});

describe('assertCheckoutCurrent (con runner git inyectado)', () => {
  /** Fabrica un runner de git fake a partir de un mapa cmd→respuesta. */
  function fakeGit(map, sucio = false) {
    return (cmd) => {
      if (cmd.startsWith('git fetch')) return '';
      if (cmd === 'git rev-parse HEAD') return map.HEAD;
      if (cmd.includes('rev-parse origin/main')) return map.REMOTE;
      if (cmd.startsWith('git merge-base --is-ancestor')) {
        const [, , , a, b] = cmd.split(' ');
        // ancestro si está declarado en map.ancestors "a<b"
        if ((map.ancestors || []).includes(`${a}<${b}`)) return '';
        const e = new Error('not ancestor');
        throw e;
      }
      if (cmd === 'git status --porcelain') return sucio ? ' M file.js' : '';
      if (cmd.startsWith('git pull')) return 'Updating';
      throw new Error(`unexpected cmd: ${cmd}`);
    };
  }

  it('no aborta cuando el checkout está current', () => {
    const git = fakeGit({ HEAD: 'abc', REMOTE: 'abc', ancestors: ['abc<abc'] });
    const res = assertCheckoutCurrent({ git, log: () => {} });
    expect(res.action).toBe('continue');
    expect(res.state).toBe('current');
  });

  it('ABORTA cuando el HEAD local está atrás de origin', () => {
    // old es ancestro de new, new NO es ancestro de old → behind.
    const git = fakeGit({ HEAD: 'old', REMOTE: 'new', ancestors: ['old<new'] });
    expect(() => assertCheckoutCurrent({ git, log: () => {} })).toThrow(/STALE/i);
  });

  it('hace git pull cuando está atrás, limpio y autoPull=true', () => {
    let pulled = false;
    const base = fakeGit({ HEAD: 'old', REMOTE: 'new', ancestors: ['old<new'] });
    let head = 'old';
    const git = (cmd) => {
      if (cmd.startsWith('git pull')) { pulled = true; head = 'new'; return 'ok'; }
      if (cmd === 'git rev-parse HEAD') return head;
      return base(cmd);
    };
    const res = assertCheckoutCurrent({ git, autoPull: true, log: () => {} });
    expect(pulled).toBe(true);
    expect(res.localHead).toBe('new');
  });

  it('respeta skip y no llama a git', () => {
    const git = vi.fn();
    const res = assertCheckoutCurrent({ skip: true, git, log: () => {} });
    expect(res.state).toBe('skipped');
    expect(git).not.toHaveBeenCalled();
  });
});
