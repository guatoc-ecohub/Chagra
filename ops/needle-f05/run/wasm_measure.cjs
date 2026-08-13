// Measure the OFFICIAL Needle 2 WASM engine in Node.
// needle.wasm (308K) is the engine only; the 14MB model is loaded from
// needle2.cact via needle_load(). Fully local, no network.
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.resolve(__dirname, "..");
const createNeedle = require(path.join(DIR, "vendor", "needle.js"));

const tools = JSON.stringify(JSON.parse(fs.readFileSync(path.join(DIR, "run", "tools.json"), "utf8")));

async function main() {
  const M = await createNeedle();

  // --- load the model weights (.cact) into wasm memory ---
  const cact = fs.readFileSync(path.join(DIR, "models", "needle2.cact"));
  const cactPtr = M._malloc(cact.length);
  M.HEAPU8.set(cact, cactPtr);
  const loadRc = M._needle_load(cactPtr, BigInt(cact.length));
  console.log(`needle_load(${cact.length} bytes) -> rc=${loadRc}`);

  // --- init tools (ccall handles string marshalling) ---
  const initRc = M.ccall("needle_init", "number", ["string", "string", "number"], ["", tools, 0]);
  console.log(`needle_init -> rc=${initRc}`);
  if (initRc < 0) throw new Error("needle_init failed");

  const OUTCAP = 65536;
  const outPtr = M._malloc(OUTCAP);

  function complete(input) {
    const t0 = process.hrtime.bigint();
    M.ccall("needle_complete", "number", ["string", "number", "number", "number"],
            [input, 256, outPtr, OUTCAP]);
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6;
    return { ms, resp: JSON.parse(M.UTF8ToString(outPtr)) };
  }

  const cases = [
    ["COSECHA", "registrar 3 kilos de tomate"],
    ["PLAGA", "qué biopreparado para la mosca blanca"],
  ];

  for (const [label, prompt] of cases) {
    M._needle_reset();
    complete(prompt); // warmup
    const runs = [];
    for (let i = 0; i < 3; i++) {
      M._needle_reset();
      runs.push(complete(prompt));
    }
    const last = runs[runs.length - 1];
    const times = runs.map((r) => r.ms.toFixed(1)).join(", ");
    console.log(`\n=== ${label}: "${prompt}" ===`);
    console.log(`  latency ms (3 warm runs, w/ reset): ${times}`);
    console.log(`  response: ${JSON.stringify(last.resp)}`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
