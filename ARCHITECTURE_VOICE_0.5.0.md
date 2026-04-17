# ARCHITECTURE — Ingreso Acústico de Datos (v0.5.0)

**Target release:** 0.5.0 (minor bump, funcionalidad principal).
**Objetivo:** Permitir registro de inventario mediante lenguaje natural hablado.

> Ejemplo de uso:
> **Operador dice:** _"Sembré 10 fresas y 20 lechugas verdes en el invernadero 1."_
> **Sistema produce:** `[{"crop": "fresa", "quantity": 10, "location": "invernadero 1"}, {"crop": "lechuga verde", "quantity": 20, "location": "invernadero 1"}]`
> **Estado final:** dos transacciones `asset--plant` encoladas en `pending_transactions` listas para sincronizar con FarmOS.

---

## 1. Pipeline de Alto Nivel

```
┌─────────────────┐   audio/webm    ┌──────────────────┐   text   ┌─────────────────┐   JSON   ┌───────────────────┐
│  PWA (Browser)  │  ────────────▶  │  Whisper (local) │  ──────▶ │  qwen3.5:4b     │  ──────▶ │ IndexedDB         │
│  Web Audio API  │                 │  :10300 on alpha │          │  (Ollama :11434)│          │ pending_transactions│
└─────────────────┘                 └──────────────────┘          └─────────────────┘          └───────────────────┘
        │                                                                                              │
        │                                                                                              ▼
        │                                                                                     ┌───────────────────┐
        └─────────────────────────  offline queue fallback  ─────────────────────────────────▶│ SyncManager → FarmOS│
                                                                                              └───────────────────┘
```

Todas las rutas externas se consumen a través del proxy Nginx existente (`/api/whisper/`, `/api/ollama/`) — **nunca** hardcodear `10.88.x.x` ni `alpha:10300` en el código cliente (ver `AI_PIPELINE_SOP.md §2`).

---

## 2. Frontend — Captura de Audio (Web Audio API)

**Módulo:** `src/components/VoiceCapture.jsx` (nuevo)
**Hook auxiliar:** `src/hooks/useVoiceRecorder.js` (nuevo)

### Responsabilidades

- Solicitar permiso `navigator.mediaDevices.getUserMedia({ audio: true })` una sola vez por sesión.
- Grabar con `MediaRecorder` en formato `audio/webm;codecs=opus` (compatible con Whisper).
- Visualización de volumen en tiempo real vía `AudioContext` + `AnalyserNode` (sparkline de amplitud, reutiliza el componente `Sparkline` introducido en `TelemetryAlerts.jsx` v0.4.6).
- Detección de fin de habla (VAD simple por umbral de amplitud + timeout de silencio 1.5s), con botón manual de "Detener" siempre disponible.
- Límite duro de 30s por grabación para evitar payloads excesivos.

### Contrato del hook

```js
const {
  isRecording,      // bool
  isProcessing,     // bool — true mientras sube y espera transcripción
  audioLevel,       // float 0..1 para UI
  error,            // string | null
  start,            // () => Promise<void>
  stop,             // () => Promise<Blob>
  reset             // () => void
} = useVoiceRecorder();
```

### Cleanup obligatorio (referencia `AUDIT_0.4.6.md §3`)

- `useEffect` con cleanup que llama a `stream.getTracks().forEach(t => t.stop())` al desmontar.
- `AudioContext.close()` al finalizar sesión.
- `AbortController` para cancelar uploads en curso si el usuario navega fuera.

---

## 3. Middleware — Transcripción (Whisper local)

**Servicio:** Whisper `:10300` en Nodo Alpha (ya desplegado vía `modules/ai/whisper.nix` del repo `guatoc-nixos-stable`).
**Proxy Nginx:** nueva ruta `/api/whisper/` → `alpha:10300`.
**Endpoint cliente:** `POST /api/whisper/inference` con `multipart/form-data`.

### Request

```js
const form = new FormData();
form.append('audio_file', blob, 'recording.webm');
form.append('language', 'es');
form.append('response_format', 'json');

const ctrl = new AbortController();
const timeout = setTimeout(() => ctrl.abort(), 15000);
const res = await fetch('/api/whisper/inference', {
  method: 'POST', body: form, signal: ctrl.signal
});
clearTimeout(timeout);
```

### Response esperada

```json
{ "text": "Sembré 10 fresas y 20 lechugas verdes en el invernadero 1." }
```

### Degradación offline

Si la red está caída o Whisper responde 5xx:

- El `Blob` de audio se persiste en `ChagraDB.pending_voice_recordings` (nuevo store v4).
- Se muestra toast "Audio guardado — se procesará al reconectar".
- `SyncManager` detecta el evento `online` y reintenta transcripción antes de parsear entidades.

---

## 4. Inferencia Local — Extracción de Entidades (qwen3.5:4b)

**Servicio:** Ollama `:11434` en Nodo Alpha (ya activo).
**Endpoint cliente:** `POST /api/ollama/api/chat`.
**Modelo:** `qwen3.5:4b` (pull previo requerido en el host; documentar en `guatoc-nixos-stable/modules/ai/ollama.nix` como `preload`).

### System prompt (inmutable, versionado)

```
Eres un extractor de entidades agrícolas. Recibes una transcripción en español
de un operador agroecológico. Devuelves EXCLUSIVAMENTE un array JSON válido,
sin texto adicional, sin markdown, sin explicación.

Schema estricto:
[
  {
    "crop": "<nombre del cultivo en minúsculas, singular>",
    "quantity": <entero positivo>,
    "location": "<nombre del lugar tal como lo dice el operador>"
  }
]

Si no puedes extraer ninguna entidad válida, devuelve [].
Nunca inventes datos. Si la cantidad no se menciona, omite la entrada.
```

### Request

```js
const body = {
  model: 'qwen3.5:4b',
  stream: false,
  format: 'json',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: transcribedText }
  ],
  options: { temperature: 0.1, num_predict: 512 }
};

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 20000);
const res = await fetch('/api/ollama/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal: ctrl.signal
});
```

### Validación de salida (cliente)

- `JSON.parse` envuelto en `try/catch` — si falla → mostrar transcripción al usuario para edición manual.
- Validar contra schema mínimo: `Array.isArray(result) && result.every(e => typeof e.crop === 'string' && Number.isInteger(e.quantity) && e.quantity > 0 && typeof e.location === 'string')`.
- Entradas que no validen se descartan silenciosamente; si el array queda vacío → UI permite edición manual.

### Resolución de `location` → `asset_id`

El modelo devuelve el lugar en lenguaje natural ("invernadero 1"). Se resuelve localmente contra el store Zustand de activos:

```js
const locationAsset = useAssetStore.getState()
  .assets.structure
  .find(a => a.name.toLowerCase().includes(entity.location.toLowerCase()));
```

Si no hay match → fallback al `DEFAULT_LOCATION_ID` (hoy hardcoded a `72156273-6be8-4d20-9816-a370256dd22a` — **candidato a mover a `import.meta.env.VITE_DEFAULT_LOCATION_ID` como parte de este sprint**).

---

## 5. Integración de Estado — `pending_transactions`

**Store destino:** `ChagraDB.pending_transactions` (ya existente, sin cambios de schema).

### Payload por entidad

Cada entrada del array extraído se traduce en una transacción FarmOS `asset--plant`:

```js
{
  id: crypto.randomUUID(),
  type: 'asset--plant',
  attributes: {
    name: `${entity.crop} (voz)`,
    status: 'active',
    notes: {
      value: `Registrado por voz: "${transcribedText}"`,
      format: 'plain_text'
    }
  },
  relationships: {
    location: { data: { type: 'asset--structure', id: locationAssetId } }
  },
  _meta: {
    source: 'voice',
    quantity: entity.quantity,
    transcription: transcribedText,
    created_at: new Date().toISOString()
  }
}
```

### Flujo de confirmación

1. Tras extracción exitosa, la PWA muestra **pantalla de confirmación** con lista editable de entidades detectadas (crop, quantity, location).
2. Usuario confirma → `syncManager.saveTransaction(payload)` por cada entidad → `SyncManager` las procesa en el próximo evento `online`.
3. Usuario rechaza → descartar sin escribir a IndexedDB.

La confirmación es **obligatoria** — nunca se escribe a `pending_transactions` sin revisión humana, dado el riesgo de alucinación del modelo.

---

## 6. Nuevos Módulos a Crear

| Ruta | Propósito |
|---|---|
| `src/components/VoiceCapture.jsx` | UI de grabación (botón mic, waveform, timer). |
| `src/components/VoiceConfirmation.jsx` | Pantalla de revisión de entidades extraídas. |
| `src/hooks/useVoiceRecorder.js` | Hook de captura + MediaRecorder + cleanup. |
| `src/services/voiceService.js` | Orquestador: audio → Whisper → qwen → validación → payload. |
| `src/services/entityExtractor.js` | Wrapper específico de Ollama con el system prompt versionado. |

## 7. Modificaciones a Módulos Existentes

| Archivo | Cambio |
|---|---|
| `public/sw.js` | Bump `CACHE_NAME` a `chagra-v7`. Pre-cache nuevos assets. |
| `src/App.jsx` | Nueva ruta hash `#voz` y tile en dashboard. |
| `src/db/dbCore.js` | Upgrade `ChagraDB` a v4: nuevo store `pending_voice_recordings`. |
| `src/db/syncManager.js` | Manejo de cola `pending_voice_recordings` en evento `online`. |
| Nginx (`hosts/alpha/default.nix` en `guatoc-nixos-stable`) | Nueva `location /api/whisper/` con proxy a `alpha:10300` + CORS idéntico al bloque de Ollama. |

## 8. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alucinación de entidades (modelo inventa cultivos o cantidades). | Confirmación humana obligatoria antes de escribir a `pending_transactions`. |
| Audio bloqueado por permisos del navegador. | Fallback a formulario manual; mensaje claro de permiso denegado. |
| Whisper u Ollama caídos. | Cola offline `pending_voice_recordings` + reintento en `online`. |
| Latencia alta de inferencia en qwen3.5:4b. | Timeout 20s con `AbortController`; degradar a input manual si excede. |
| Ambigüedad de `location` ("invernadero 1" vs "inv 1"). | Matching case-insensitive + substring; en empate, preguntar al usuario. |
| Transcripción incorrecta en dialectos regionales. | Permitir editar transcripción antes de extracción; guardar texto original en `_meta.transcription`. |
| Exposición de audio sensible. | Nunca persistir audio tras transcripción exitosa; borrar `Blob` del store tras procesar. |

## 9. Criterios de Aceptación para v0.5.0

- [ ] Captura de audio funcional en Chromium y Firefox móviles.
- [ ] Whisper transcribe >90% correcto en muestras de prueba en español neutro.
- [ ] qwen3.5:4b devuelve JSON válido en >95% de los inputs de prueba (suite de 30 frases).
- [ ] Pantalla de confirmación permite editar todos los campos antes de commit.
- [ ] Modo offline persiste audio y reintenta al volver a línea.
- [ ] Cero URLs/IPs/tokens hardcodeados (ver `AI_PIPELINE_SOP.md §2`).
- [ ] Bump correcto: `package.json` → `0.5.0`, `sw.js` → `chagra-v7`.
- [ ] Todos los `fetch` nuevos tienen `AbortController` con timeout (lección de `AUDIT_0.4.6.md §1`).

---

**Referencias:**
- SOP del pipeline: `AI_PIPELINE_SOP.md`
- Deuda técnica previa: `AUDIT_0.4.6.md`
- Contexto global: `~/.claude/CLAUDE.md`
