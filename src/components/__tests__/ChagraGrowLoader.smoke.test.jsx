import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../services/agroecologyJourney', () => ({ getJourneyForProfile: vi.fn(() => null) }));
vi.mock('../../services/fincaGameStateService', () => ({ getGameState: vi.fn(() => null) }));

import ChagraGrowLoader from '../ChagraGrowLoader.jsx';

describe('ChagraGrowLoader — smoke', () => {
  it('monta sin crashear', () => {
    const { container } = render(<ChagraGrowLoader />);
    expect(container).toBeTruthy();
  });
});
