import { describe, it, expect, vi } from 'vitest';
import { reloadPage } from '../pageReload.js';

describe('reloadPage', () => {
  it('invoca window.location.reload()', () => {
    const reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });
    reloadPage();
    expect(reloadMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('es una funcion exportada', () => {
    expect(typeof reloadPage).toBe('function');
  });
});
