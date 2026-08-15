import { readFileSync } from 'node:fs';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return {
      format: 'json',
      source: readFileSync(new URL(url), 'utf8'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
