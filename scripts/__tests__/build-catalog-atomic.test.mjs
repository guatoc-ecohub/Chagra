import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve('scripts/build-catalog-sqlite.mjs'), 'utf8');

describe('build catalog atomic publish', () => {
  it('builds in a temporary database before replacing the public catalog', () => {
    expect(source).toContain('new Database(TEMP_DB_PATH)');
    expect(source).toContain('fs.renameSync(TEMP_DB_PATH, DB_PATH)');
    expect(source.indexOf('new Database(TEMP_DB_PATH)'))
      .toBeLessThan(source.indexOf('fs.renameSync(TEMP_DB_PATH, DB_PATH)'));
  });

  it('does not delete the current public catalog before the build succeeds', () => {
    expect(source).not.toContain('fs.unlinkSync(DB_PATH)');
  });
});
