import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const agentScreenPath = resolve(
  'src/components/AgentScreen/AgentScreen.jsx',
);
const source = readFileSync(agentScreenPath, 'utf8');

describe('AgentScreen photo pipeline architecture', () => {
  it('keeps one inline photo input and the domain-filtered processing path', () => {
    expect(source.match(/accept="image\/\*"/g)).toHaveLength(1);
    expect(source).toContain('processPhotoItem(item');
    expect(source).toContain('isAnalyzableImageAttachment');
  });

  it('does not restore the superseded parallel photo pipeline', () => {
    for (const legacySymbol of [
      'attachedPhoto',
      'analyzingPhoto',
      'handlePhotoAnalysis',
      'buildPhotoAnalysisMessage',
      'recognizeSpeciesGrounded',
    ]) {
      expect(source).not.toContain(legacySymbol);
    }
  });
});
