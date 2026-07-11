import { afterEach, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/serve-finetuned.sh');
const bash = process.env.BASH || process.env.SHELL || 'bash';
const temporaryDirectories = [];

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'serve-finetuned-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

function executable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('serve-finetuned.sh', () => {
  it('reporta juntas las herramientas faltantes antes de procesar el adapter', () => {
    const root = temporaryDirectory();
    const bin = join(root, 'bin');
    mkdirSync(bin);
    executable(join(bin, 'python-fixture'), '#!/bin/sh\nexit 0\n');
    const result = spawnSync(bash, [script, join(root, 'adapter'), 'modelo-prueba'], {
      encoding: 'utf8',
      env: {
        HOME: root,
        PATH: bin,
        LLAMA_CPP_DIR: join(root, 'llama.cpp'),
        PYTHON_BIN: 'python-fixture',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('convert_hf_to_gguf.py');
    expect(result.stderr).toContain('llama-quantize');
    expect(result.stderr).toContain('ollama en PATH');
    expect(existsSync(join(root, 'data'))).toBe(false);
  });

  it('fusiona, convierte, cuantiza y crea el modelo con temporales limpios', () => {
    const root = temporaryDirectory();
    const bin = join(root, 'bin');
    const llama = join(root, 'llama.cpp');
    const adapter = join(root, 'data', 'adapter');
    const output = join(root, 'salida');
    mkdirSync(bin, { recursive: true });
    mkdirSync(llama);
    mkdirSync(adapter, { recursive: true });

    writeFileSync(join(llama, 'convert_hf_to_gguf.py'), '# fixture\n');
    executable(join(bin, 'python-fixture'), `#!/usr/bin/env bash
if [ "$1" = "-" ]; then
  cat >/dev/null
  mkdir -p "$4"
  printf merged >"$4/config.json"
else
  printf f16 >"$4"
fi
`);
    executable(join(llama, 'llama-quantize'), `#!/usr/bin/env bash
printf q4 >"$2"
printf '%s\\n' "$3" >"${root}/quantization.txt"
`);
    executable(join(bin, 'ollama'), `#!/usr/bin/env bash
cp "$4" "${root}/captured.Modelfile"
printf '%s\\n' "$2" >"${root}/model-name.txt"
`);

    const result = spawnSync(bash, [script, adapter, 'chagra-g41:test'], {
      encoding: 'utf8',
      cwd: root,
      env: {
        HOME: root,
        PATH: `${bin}:${process.env.PATH}`,
        LLAMA_CPP_DIR: llama,
        PYTHON_BIN: 'python-fixture',
        FINETUNED_DIR: output,
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(output, 'chagra-g41-test-Q4_K_M.gguf'), 'utf8')).toBe('q4');
    expect(readFileSync(join(root, 'quantization.txt'), 'utf8').trim()).toBe('Q4_K_M');
    expect(readFileSync(join(root, 'model-name.txt'), 'utf8').trim()).toBe('chagra-g41:test');
    const modelfile = readFileSync(join(root, 'captured.Modelfile'), 'utf8');
    expect(modelfile).toContain(`FROM ${join(output, 'chagra-g41-test-Q4_K_M.gguf')}`);
    expect(modelfile).toContain('<|start_of_role|>assistant<|end_of_role|>');
    expect(modelfile).toContain('Eres el agente agroecológico Chagra para Colombia.');
    expect(readdirSync(output).some((name) => name.startsWith('.serve-finetuned.'))).toBe(false);
    expect(result.stdout).toContain('bench-contaminacion.mjs --local --model chagra-g41:test');
  });
});
