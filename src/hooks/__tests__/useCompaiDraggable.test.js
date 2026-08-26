import { describe, expect, it } from 'vitest';
import { clampPosition } from '../useCompaiDraggable.js';

describe('clampPosition', () => {
  it('usa el desborde medido y mantiene la huella en los cuatro bordes', () => {
    const result = clampPosition(
      { right: 0, bottom: 0 },
      { width: 640, height: 480 },
      {
        width: 84,
        height: 84,
        overflowLeft: 10,
        overflowTop: 5,
        overflowRight: 20,
        overflowBottom: 30,
      },
    );

    expect(result).toEqual({ right: 34, bottom: 44 });
  });

  it('también corrige una posición persistida en la esquina opuesta', () => {
    const result = clampPosition(
      { right: 999, bottom: 999 },
      { width: 640, height: 480 },
      {
        width: 84,
        height: 84,
        overflowLeft: 10,
        overflowTop: 5,
        overflowRight: 20,
        overflowBottom: 30,
      },
    );

    expect(result).toEqual({ right: 532, bottom: 377 });
  });
});
