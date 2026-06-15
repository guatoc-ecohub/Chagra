import { beforeEach } from 'vitest';
import { resetOutputGuardTelemetry } from '../services/outputGuards.js';

export function installOutputGuardTestReset() {
  beforeEach(() => resetOutputGuardTelemetry());
}
