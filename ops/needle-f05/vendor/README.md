---
library_name: cactus-needle
pipeline_tag: text-generation
license: apache-2.0
tags:
  - tool-calling
  - function-calling
  - on-device
  - edge
  - quantization
  - webassembly
---

![Needle 2](assets/banner.png)

# Needle 2

Needle 2 is an open 45M-parameter model for tool calling, device use and structured extraction. The whole model is a single 14MB binary that runs a full session in 28MB of RAM. It is built on our Simple Attention Network findings, compressed to CQ2-bit with Cactus Quants, and baked into its own engine. On the benchmarks below, Needle 2 trades wins with other small models like FunctionGemma 270M, LFM2.5 230M and Apple FM, at 5x to 70x smaller, and 2 bits against their f16. Needle hits 500 tokens/sec decode speed on a Raspberry Pi 5, between 400-1,500 tokens/sec on VR devices like Meta Quest 3S and Apple Vision Pro, and ranges 300-700 on sub-$200 phones such as the Samsung A-Series. With a peak session RAM around 28MB, Needle reaches microcontrollers like the ESP32-P4; others have reported running it on an ESP32-S3 in about 11MB.

- **Self-contained**: model baked into the binary, no runtime, no downloads, no network.
- **Runs everywhere**: ARM64, x86-64, ARMv7, RISC-V, and WebAssembly, on Apple, Windows, Linux, Android, Raspberry Pi.
- **Simple contract**: tool calls come back as structured data, text in, JSON out; a byte-level grammar compiled from your schemas constrains every token.
- **Confidence-gated**: every response carries a calibrated confidence score from a learned head; set a threshold, act above it, escalate below it.
- **Tool retrieval**: declare a large catalogue and a built-in retrieval head renders only the top five tools per turn, with the grammar constrained to that subset.
- **Bounded memory**: a 256-token sliding window with the tools pinned as KV sinks, so total memory stays near 28MB no matter how long the conversation runs.

Source, engine, and training code: [github.com/cactus-compute/needle](https://github.com/cactus-compute/needle).

![Size-quality frontier: mobile-class and below](assets/frontier.png)

## Simple Attention Network

Needle 2 is a Simple Attention Network, our dense small-model recipe: a Hadamard MLP in place of the FFN, GQA attention, engram key-value memory, and multi-lane hyper-connections. See the paper for the design and ablations: [arXiv:2607.18363](https://arxiv.org/abs/2607.18363).

![Simple Attention Network architecture](assets/architecture.png)

Each block carries its update rule. Here x̂ is the RMS-normalised flattening of the four residual streams, H the orthonormal Walsh-Hadamard transform (a fixed matrix, applied in n log n time with no weights to read), (kₜ, vₜ) rows gathered from hashed n-gram tables, and P the doubly-stochastic normalisation of the routing logits A, computed by Sinkhorn iteration; a, b, g and all σ-gates are learned and input-dependent. Both attention and MLP residuals are sandwich-normed and gated, the engram sites fire at two layers, and decoding is constrained by a byte-level grammar compiled from the declared schemas.

## Quickstart with Python

```sh
pip install cactus-needle
```

Needle reads your tool descriptions to decide what to call and how to fill arguments, so describing them well is the whole game. You can do it three ways, from least to most control.

**Simple**: decorate a function. The signature gives the argument types, the docstring is the tool description, and `run()` completes the loop: model picks the call, Needle executes your function, feeds the result back, and returns the model's final answer.

```python
import needle

@needle.tool
def get_weather(city: str):
    "Get the current weather for a city."
    return {"city": city, "temp_c": 27, "sky": "clear"}

agent = needle.Needle(tools=[get_weather])
print(agent.run("what's it like in Lagos right now?")["reasoning"])
```

**Medium**: describe each argument and offer choices. Needle reads a Google-style `Args:` block for per-parameter descriptions; a default makes an argument optional; a `Literal` becomes a fixed set the model must choose from (it cannot emit anything else).

```python
from typing import Literal

@needle.tool
def set_thermostat(temperature: int, mode: Literal["heat", "cool", "auto"] = "auto"):
    """Set the thermostat.

    Args:
        temperature: target temperature in Celsius
        mode: heating strategy to use
    """
    return {"temperature": temperature, "mode": mode}

agent = needle.Needle(tools=[set_thermostat])
agent.run("make it 21 and cool the room")
```

**Advanced**: constrain the values with `needle.Field`, attached inline via `Annotated`. Ranges, patterns, lengths, and item counts are compiled into the decode grammar, so the model can only ever emit values that satisfy them.

```python
from typing import Annotated

@needle.tool
def send_money(
    amount: Annotated[float, needle.Field(gt=0, le=10000, description="USD, up to 10,000")],
    to:     Annotated[str,   needle.Field(pattern=r"^@[a-z0-9_]+$", description="recipient handle")],
    memo:   Annotated[str,   needle.Field(max_length=80)] = "",
):
    "Send money to a handle."
    return {"sent": amount, "to": to}
```

`Field` supports `description`, `enum`, `const`, `ge`/`le`/`gt`/`lt`, `multiple_of`, `min_length`/`max_length`, `pattern`, `format`, `min_items`/`max_items`, and `unique_items`.

**Extraction**: to pull structured data out of text, declare the shape and call `extract()`. Pass a Pydantic model and you get a typed object back.

```python
from pydantic import BaseModel

class Invoice(BaseModel):
    vendor: str
    total: float
    due_date: str

invoice = needle.extract("Invoice from Acme Corp, $1,200.00, due 2026-09-01", Invoice)
print(invoice.vendor, invoice.total)   # -> Acme Corp 1200.0
```

**By hand** - the decorator just builds a JSON schema; you can pass that schema directly, which is exactly what Needle consumes. This is how you set descriptions and constraints without the decorator (and `tools.json` for the CLI is the same shape):

```python
tools = [{
    "name": "set_lights",
    "description": "Turn a room's lights on or off and set brightness",
    "parameters": {
        "type": "object",
        "properties": {
            "room": {"type": "string", "description": "which room to control"},
            "on": {"type": "boolean"},
            "brightness": {"type": "integer", "minimum": 0, "maximum": 100},
        },
        "required": ["room", "on"],
    },
}]
agent = needle.Needle(tools=tools)
```

Prefer to drive the loop yourself instead of `run()`? `complete()` returns the raw call and you execute it:

```python
import json
response = agent.complete("dim the living room to 30")
if response["type"] == "call":
    result = set_lights(**response["function_calls"][0]["arguments"])
    response = agent.complete(json.dumps(result))   # feed the result back
```

With a large catalogue, persist tool embeddings across runs with `needle.Needle(tools=..., tool_index_path="tools.idx")`. Every turn returns one JSON object:

```json
{
  "type": "call",
  "success": true,
  "error": null,
  "error_code": null,
  "function_calls": [ { "name": "set_lights", "arguments": { "room": "living room", "on": true, "brightness": 30 } } ],
  "reasoning": "'living room' -> room; 'dim' -> on true, brightness 30",
  "confidence": 0.94,
  "prefill_tps": 4300.0,
  "decode_tps": 850.0,
  "peak_ram_mb": 28.0
}
```

## Behaviour

Needle solves every problem as a function call. The context declares what may be called; the model answers with calls. Performing an action and extracting structured data are the same operation, the only difference is what you declare.

- A request no declared tool can serve is refused with the empty call `[]`. That is the whole contract for off-topic input; there is no free-text fallback.
- Arguments contain only values evidenced by the input. An optional field with no evidence is omitted, not guessed; omission is the field-level `[]`.
- `reasoning` is the model's short derivation of each argument from its source span (`'ten minutes' -> minutes 10`). It is generated unconstrained; only the call itself is grammar-constrained, so the JSON cannot be malformed while the derivation stays legible.
- After you execute a call, pass the result back as the next `complete()`. The model continues from it, and later arguments may depend on earlier results: `search_for_contact` first, then `send_instant_message` with the returned `contact_id`. A final step may answer in plain text from the results: `"type": "respond"` with empty `function_calls`.
- A session shares one toolset. Later turns are bare queries against the same tools; `reset()` rewinds the conversation and keeps the tools loaded.

## System facts

An optional system turn carries environment state as facts, never instructions:

```
date: 2026-07-21 Tue 14:30; locale: en-US; device: phone; battery: 62%
```

Recognized keys are `date`, `locale`, `device`, `battery`, `network`, `location`, `user`, and `assistant`. The model resolves relative language against them: "tomorrow at 7" becomes an absolute time only when a `date:` fact licenses it, otherwise the human phrase passes through verbatim. `assistant:` declares the identity the model binds to. Pass the turn with `--system system.txt` on the CLI or `needle.Needle(tools=tools, system="date: ...")` in Python. Needle trains with and without the turn, so omitting it is safe; instructions placed there do not steer the model.

## Deploy Needle

Download the folder for your platform from the release:

| your device | folder | command-line | library |
| --- | --- | --- | --- |
| Mac (Apple Silicon) | `macos-arm64` | `needle` | `libneedle.a` |
| Linux x86-64 (PC, server, AMD) | `linux-x86_64` | `needle` | `libneedle.a` |
| Linux ARM64 (Raspberry Pi, server) | `linux-arm64` | `needle` | `libneedle.a` |
| Linux ARMv7 (32-bit) | `linux-armv7` | `needle` | `libneedle.a` |
| Linux RISC-V | `linux-riscv64` | `needle` | `libneedle.a` |
| Linux MIPS32el (Ingenic cameras, routers) | `linux-mipsel` | `needle` | `libneedle.a` |
| Windows x64 | `windows-x86_64` | `needle.exe` | `libneedle.a` |
| Windows ARM | `windows-arm64` | `needle.exe` | `libneedle.a` |
| Android | `android-arm64` / `android-armv7` / `android-riscv64` | `needle` | `libneedle.a` |
| iOS / watchOS / tvOS | `ios-arm64` / `watchos-arm64` / `tvos-arm64` | - | `libneedle.a` |
| Browser / Node (WebAssembly) | `wasm` | - | `needle.js` + `needle.wasm` |

To run it, use the command-line binary. On macOS, Linux, or Android:

```sh
# answer one query and exit
./needle --tools tools.json --prompt "dim the living room to 30"

# or an HTTP server on localhost:8080 (POST /complete {"input": "..."})
./needle --tools tools.json --serve

# with a large tool catalogue, persist tool embeddings across runs
./needle --tools tools.json --tool-index tools.idx --serve
```

`tools.json` is a JSON array of the functions the assistant may call:

```json
[
  {
    "name": "set_lights",
    "description": "Turn a room's lights on or off and set brightness",
    "parameters": {
      "type": "object",
      "properties": {
        "room": { "type": "string" },
        "on": { "type": "boolean" },
        "brightness": { "type": "integer", "description": "0 to 100" }
      },
      "required": ["room", "on"]
    }
  },
  {
    "name": "play_music",
    "description": "Play music matching a mood, genre, or artist",
    "parameters": {
      "type": "object",
      "properties": { "query": { "type": "string" } },
      "required": ["query"]
    }
  },
  {
    "name": "send_message",
    "description": "Text a contact",
    "parameters": {
      "type": "object",
      "properties": {
        "to": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["to", "body"]
    }
  }
]
```

## Tool retrieval

Five or fewer declared tools render directly. Above that, retrieval engages: at init every tool schema is embedded once by a built-in contrastive head, each turn embeds the query, and only the five highest-scoring tools enter the context, with the grammar rebuilt over just that subset. An unselected tool is unreachable, not merely unlikely. `--tool-index <path>` (CLI) or `tool_index_path` (Python) persists the embeddings on disk, keyed by a fingerprint over the schemas and the model; a matching fingerprint loads instantly, a changed schema re-embeds only what changed.

## Confidence

The `confidence` field is the minimum of two signals: a calibrated post-hoc head that scores the full prompt plus the call the model just produced, and the decoding probability of the call tokens. A call is accepted only when both agree, so the failure mode is escalation, not wrong execution. The contract: pick a threshold for your product, act at or above it, re-ask or route to a bigger model below it. Off-topic requests return the empty call `[]`.

## Fine-tuning

Needle is open and trainable end to end. Fine-tune it on your own tools and domains, then export to a `.cact` and ship it like the base model. See the [needle repo](https://github.com/cactus-compute/needle) for training and export.

## Extraction

Extraction is the same exchange as tool calling: declare the record schema as the only tool and pass the content as the prompt; the passage sits where the query sits, and the returned call's `arguments` are the extracted fields. With one declared tool the grammar admits exactly one call of that name, the `tool_choice` equivalent, so schema conformance is guaranteed rather than requested. There is no separate JSON mode.

`schema.json` describes the record to extract:

```json
[
  {
    "name": "receipt",
    "description": "A purchase receipt shared as text",
    "parameters": {
      "type": "object",
      "properties": {
        "merchant": { "type": "string" },
        "total": { "type": "number" },
        "currency": { "type": "string" },
        "line_items": { "type": "array", "items": { "type": "object" } }
      },
      "required": ["merchant", "total"]
    }
  }
]
```

```sh
./needle --tools schema.json --prompt "GreenMart receipt: oat milk 3.50, total 7.75 paid by visa"
```

```json
{ "type": "call", "function_calls": [ { "name": "receipt", "arguments": { "merchant": "GreenMart", "total": 7.75 } } ] }
```

## Citation

Needle 2 is built by the Cactus Compute team. If you use it in your work, please cite:

```bibtex
@misc{needle2_2026,
  title        = {Needle 2: A 45M-Parameter Foundation Tool-Calling Model for Tiny Devices},
  author       = {Ndubuaku, Henry and Mosoyan, Karen and Mroz, Jakub and Cylich, Noah and
                  Kumar, Satyajit and Sandhu, Parkirat and Shemet, Roman and Lee, Justin H.},
  year         = {2026},
  organization = {Cactus Compute, Inc.},
  howpublished = {\url{https://github.com/cactus-compute/needle}}
}
```

Reach out on founders@cactuscompute.com for partnerships, collaborations, synergies and deploying Needle2 in your product.