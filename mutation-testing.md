# Mutation Testing — Chagra Core Services

Stryker mutation testing framework for `agentIntentParser.js` and `externalAiPromptBuilder.js`.

## Status

Stryker is **not installed** in this repo. Install it before running mutation tests:

```bash
npm install --save-dev @stryker-mutator/core
```

## Configuration

Create `stryker.config.json` in the project root with the following:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "mutator": {
    "plugins": null
  },
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "testRunner_comment": "Chagra uses vitest for unit tests. Requires @stryker-mutator/vitest-runner plugin.",
  "vitest": {
    "configFile": "vitest.config.js"
  },
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/services/agentIntentParser.js",
    "src/services/externalAiPromptBuilder.js"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "timeoutMS": 30000,
  "ignoreStatic": true
}
```

### Required plugins

```bash
npm install --save-dev @stryker-mutator/vitest-runner
```

## Running

```bash
npx stryker run
```

This will:

1. Run the existing unit test suite to establish a baseline.
2. Inject mutants (e.g., `>` to `>=`, remove `if` branches, swap `&&` for `||`) into:
   - `src/services/agentIntentParser.js` — intent detection patterns, confidence scoring, format rendering
   - `src/services/externalAiPromptBuilder.js` — thermal zone derivation, prompt assembly, resolution logic
3. Re-run tests against each mutant.
4. Report mutants **killed** (test caught the mutation) and **survived** (no test failed).

## Interpreting Results

### Killed mutants
The test suite caught the mutation. These are documented automatically in the Stryker HTML report (`reports/mutation/html/index.html`). No action needed.

### Surviving mutants
A surviving mutant means the mutation did not cause any test to fail. This indicates a gap in test coverage.

**Common causes for these services:**

| Service | Likely Survivors | Mitigation |
|---|---|---|
| `agentIntentParser.js` | Boundary conditions on regex patterns, empty string input, `null` input | Add unit tests for edge cases |
| `externalAiPromptBuilder.js` | Thermal zone boundary values (exactly 1000, 2000, 3000), missing `thermalZones` array, `undefined` altitude | Add boundary-value tests |

### Action after surviving mutants

1. Open the HTML report: `open reports/mutation/html/index.html`
2. For each surviving mutant, write a unit test that kills it.
3. Re-run `npx stryker run` until the mutation score meets or exceeds the threshold.

## Target mutation score

- **High water mark**: >= 80% for both services.
- **Minimum acceptable**: >= 60%.

## Integration

After installing and running Stryker, add to CI:

```yaml
# In .github/workflows/mutation-test.yml or similar
- name: Run mutation tests
  run: npx stryker run
```

## Related files

- `tests/unit/` — unit tests (vitest) that Stryker exercises
- `vitest.config.js` — vitest configuration
- `src/services/agentIntentParser.js` — intent detection (134 lines, pure functions)
- `src/services/externalAiPromptBuilder.js` — prompt builder (184 lines, pure functions)
