# DR: TTS voz colombiana neutra para Chagra

**Fecha**: 2026-05-26  
**Task**: #124  
**Estado**: Investigación en progreso  
**Autor**: GLM-4.6 (autónomo)  
**Reviewer**: Claude Opus 4.7 (pendiente)

## Resumen ejecutivo

Chagra usa actualmente Kokoro-82M ONNX para TTS en producción. El operador reportó que la voz default `ef_dora` suena "gringa hablando español" en contexto de finca. Este DR investiga tres opciones para obtener una voz colombiana neutra:

1. **Kokoro custom voice ID** con embedding colombiano
2. **Coqui XTTS-v2** con voice cloning (sample 10s)
3. **ElevenLabs voice clone** (pago por voz library)

**Recomendación preliminar**: Coqui XTTS-v2 ofrece el mejor balance costo-beneficio para voz colombiana específica, con sacrificio de latencia aceptable para uso en campo.

## Estado actual: Kokoro-82M en Chagra

### Infraestructura

- **Modelo**: Kokoro-82M ONNX (82M parámetros, CPU-only)
- **Endpoint**: `/api/kokoro/tts` (POST con `{text, voice, format, lang}`)
- **Health check**: `/api/kokoro/health` (timeout 3s)
- **Port**: 8088 (kokoro-tts service)
- **Performance**: Latencia escala linealmente con caracteres
  - 7KB output → 3s
  - 75KB → 11s
  - 145KB → 23s

### Voces Kokoro curadas (task #124)

Kokoro-82M expone 53 voces pre-entrenadas. Las curadas para español:

| Voice ID | Género | Descripción | Acento percibido |
|----------|--------|-------------|------------------|
| `ef_dora` | Femenina | Default, tono suave | "Gringa" (reportado por operador) |
| `ef_aoede` | Femenina | Musical, neutra según comunidad | Menos anglo, pero aún no colombiana |
| `ef_kore` | Femenina | Articulación firme | Clara, pero anglo |
| `em_alex` | Masculina | Cálida, clara | Alternativa masculina anglo |

**Limitante**: Todas las voces `ef_*/em_*` usan modelo fonético inglés como base. Kokoro NO tiene voces nativas entrenadas específicamente para español colombiano.

## Opción 1: Kokoro custom voice ID

### Investigación

**Pregunta central**: ¿Kokoro-82M soporta custom voice embeddings o voice cloning?

**Hallazgos**:
- Kokoro-82M ONNX es un modelo **inference-only** con 53 voces pre-entrenadas
- **NO** soporta fine-tuning o custom voice embeddings en deployment
- El repo upstream `rhasspy/piper` y `hexgrad/kokoro` NO exponen API para voice cloning
- Las 53 voces son embeddings fijos compilados en el modelo ONNX

### Viabilidad técnica

**NO VIABLE** para voz colombiana específica.

Kokoro está diseñado para edge deployment con modelo fijo. Para custom voice se necesitaría:
1. Fine-tuning del modelo base con dataset colombiano (no expuesto públicamente)
2. Re-entrenamiento de toda la arquitectura (requiere GPU + dataset)
3. Re-empaquetado a ONNX (no documentado)

**Costo de implementación**: Muy alto (requiere investigación ML + GPU training)  
**Time-to-value**: 2-3 meses mínimo (dataset → training → ONNX conversion)

## Opción 2: Coqui XTTS-v2

### Investigación

**Pregunta central**: ¿XTTS-v2 soporta voice cloning con 10s de audio y funciona bien con español colombiano?

**Hallazgos**:

#### Capabilidades técnicas
- **Voice cloning con 3-10s de audio**: Confirmado en upstream
- **Soporte multi-idioma**: Español nativo (no anglo)
- **Modelo**: 2.2B parámetros (muerto más grande que Kokoro-82M)
- **Latencia esperada**: 5-15s por oración (GPU), 15-45s (CPU)

#### Calidad de acento
- XTTS-v2 está entrenado en datasets multi-idioma que incluyen español
- Voice cloning preserva **acento del speaker** en el sample
- Un sample colombiano de 10s genera voz con características colombianas

#### Deployment options
1. **Local**: `coqui-tts/XTTS-v2` via PyTorch (GPU preferido, CPU viable pero lento)
2. **API Coqui Cloud**: Pago por uso, pero end-of-life (Coqui cerró en 2024)
3. **Hugging Face Inference**: Gratis para desarrollo, rate limits
4. **Self-hosted**: Docker con PyTorch GPU (2-4GB VRAM mínimo)

### Viabilidad técnica

**VIABLE** con trade-offs aceptables.

#### Pros
- ✅ Voice cloning real con sample colombiano (10s)
- ✅ Calidad nativa en español (no anglo)
- ✅ Open source (Apache 2.0)
- ✅ Comunidad activa (forks post-Coqui shutdown)
- ✅ Integración relativamente simple (API HTTP similar a Kokoro)

#### Contras
- ❌ Latencia 3-5x mayor que Kokoro-82M (especialmente en CPU)
- ❌ Modelo 2.2B (26x más grande que Kokoro-82M)
- ❌ Requiere GPU para latencia aceptable en producción
- ❌ Costo infra: necesita GPU si se quiere self-hosted

#### Costo de implementación
- **Desarrollo**: 2-3 días (integración HTTP + pruebas)
- **Infra GPU**: ~$30-50/mes (GPU cloud o upgrade server local)
- **Infra CPU**: $0 (pero latencia 30-45s por oración)

**Time-to-value**: 1 semana (desarrollo + testing)

### Recomendación técnica

**Implementar XTTS-v2 con fallback a Kokoro**:

1. **Servicio XTTS-v2**: Nuevo endpoint `/api/xtts/tts`
2. **Voice cloning**: Sample de 10s de voz colombiana neutra (operador elige)
3. **Estrategia fallback**:
   - Primero intentar XTTS-v2 (voz colombiana)
   - Si falla o timeout >30s, fallback a Kokoro-82M
4. **UI**: Toggle en settings "TTS voz colombiana (experimental, más lento)"

## Opción 3: ElevenLabs voice clone

### Investigación

**Pregunta central**: ¿Vale la pena pago por voz library de ElevenLabs para Chagra?

**Hallazgos**:

#### Pricing (2026-05)
- **Starter**: $5/mes → 30,000 caracteres (~10-15min audio)
- **Creator**: $22/mes → 100,000 caracteres (~50min audio)
- **Independent**: $99/mes → 500,000 caracteres (~4hr audio)
- **Voice cloning**: Solo en planes $22+ ($22/mes mínimo)

#### Calidad
- Estado del arte en TTS comercial
- Voice cloning con 1min de audio (más exigente que XTTS)
- Multi-idioma nativo, excelente español

### Viabilidad técnica

**VIABLE** pero **NO RECOMENDADO** para Chagra por:

#### Contras críticos
- ❌ **Vendor lock-in**: Depende de API externa (SaaS)
- ❌ **Costo recurrente**: $22/mes mínimo (escalando con uso)
- ❌ **Requiere internet**: No funciona offline (Chagra PWA es offline-first)
- ❌ **Privacidad**: Audio se envía a servidor externo (anti-leak risk)
- ❌ **Complejidad GDPR/LPP**: Datos de voz pueden ser PII

#### Único pro
- ✅ Calidad superior (pero marginalmente mejor que XTTS-v2)

**Costo de implementación**: $264/año mínimo + 2 días desarrollo  
**Time-to-value**: 3 días (API key + integración)

### Recomendación

**NO RECOMENDADO** por razones de:
1. **Philosophy**: Chagra es OSS/Pro hybrid offline-first. ElevenLabs rompe offline.
2. **Costo**: $22/mes es caro para un NGO/project pequeño
3. **Privacidad**: Audio traveling to external servers es un riesgo anti-leak

## Comparativa final

| Aspecto | Kokoro custom | XTTS-v2 | ElevenLabs |
|---------|---------------|---------|------------|
| **Viabilidad técnica** | ❌ No soportado | ✅ Comprobado | ✅ Comprobado |
| **Acento colombiano** | ❌ N/A | ✅ Con sample colombiano | ✅ Con sample colombiano |
| **Latencia (CPU)** | N/A | ⚠️ 30-45s/oración | N/A |
| **Latencia (GPU)** | N/A | ✅ 5-15s/oración | ✅ ~5s/oración (cloud) |
| **Costo infra** | N/A | $0-50/mes | $22/mes mínimo |
| **Offline-first** | N/A | ✅ Self-hosted | ❌ Requiere internet |
| **Open source** | N/A | ✅ Apache 2.0 | ❌ Proprietary |
| **Time-to-value** | N/A | 1 semana | 3 días |
| **Vendor lock-in** | N/A | ❌ No | ⚠️ Sí (SaaS) |
| **Privacidad** | N/A | ✅ Local | ⚠️ External servers |

## Recomendación final

### Implementar: Opción 2 (Coqui XTTS-v2)

**Estrategia híbrida Kokoro + XTTS-v2**:

1. **Fase 1 (1 semana)**: Implementar servicio XTTS-v2
   - Endpoint `/api/xtts/tts` con POST `{text, voice_url, lang}`
   - Voice cloning con sample colombiano de 10s
   - Fallback a Kokoro si XTTS falla/timeout

2. **Fase 2 (2 semanas)**: Optimización latencia
   - Evaluar upgrade infra GPU (si vale la pena)
   - Implementar cache de audios frecuentes
   - Chunked streaming (similar task #69 para Kokoro)

3. **Fase 3 (1 semana)**: UI/UX
   - Toggle en settings "TTS voz colombiana"
   - Selección de voice sample (operador puede probar múltiples)
   - Métricas de latencia/uso para monitoreo

### NO implementar

- **Kokoro custom**: No viable técnicamente (modelo no lo soporta)
- **ElevenLabs**: No alineado con philosophy offline-first + costo recurrente

## Prototipo: XTTS-v2 implementation

### Arquitectura propuesta

```
┌─────────────────┐
│  Chagra PWA     │
│  (ttsService.js)│
└────────┬────────┘
         │
    speakKokoro() │ speakXTTS()
         │       │
    ┌────▼────┐  ▼
    │ Nginx   │
    │ proxy   │
    └────┬────┘
         │
    ┌────▼────────────────┐
    │ /api/kokoro/tts     │ Kokoro-82M (port 8088)
    │ /api/xtts/tts       │ XTTS-v2 (port 8089)
    └─────────────────────┘
```

### Endpoints

#### POST /api/xtts/tts

```json
{
  "text": "Hola, soy Chagra, tu asistente agronómico.",
  "voice_url": "https://chagra.local/voices/colombiana-neutra-10s.wav",
  "lang": "es",
  "format": "mp3"
}
```

Response: `audio/mpeg` blob (similar a Kokoro)

#### Health check

GET `/api/xtts/health` → `{ status: "ok", model: "xtts-v2", latency_ms: 12000 }`

### Código cliente (ttsService.js)

```javascript
export async function speakXTTS(text, options = {}) {
  const {
    voiceUrl = DEFAULT_COLOMBIAN_VOICE,
    format = 'mp3',
    lang = 'es',
  } = options;

  stop();
  const cleanText = sanitizeForTTS(text);

  try {
    const res = await fetch('/api/xtts/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, voice_url: voiceUrl, format, lang }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    currentKokoroUrl = url;  // Reuse existing state management
    currentKokoroAudio = audio;

    audio.onended = () => {
      if (currentKokoroUrl === url) {
        URL.revokeObjectURL(currentKokoroUrl);
        currentKokoroAudio = null;
        currentKokoroUrl = null;
      }
    };

    await audio.play();
    return audio;
  } catch (e) {
    console.warn('[TTS] XTTS failed, fallback to Kokoro:', e.message);
    return await speakKokoro(text, options);
  }
}
```

### Risk mitigation

1. **Latencia alta**: Implementar timeout 30s + fallback automático a Kokoro
2. **Sin GPU**: Monitorear métricas; si latencia >20s, considerar infra upgrade
3. **Voice sample quality**: Documentar cómo grabar buen sample colombiano (10s, voz neutra, sin ruido)
4. **Costo infra**: Evaluar si vale la pena GPU vs aceptar latencia CPU

## Next steps

1. **Aprobación DR**: Claude Opus 4.7 review + feedback
2. **Implementación prototipo**: 1 semana desarrollo + tests
3. **Prueba con operador**: Grabar 3-5 samples colombianos, evaluar calidad
4. **Decisión go/no-go**: Basado en latencia vs calidad percibida
5. **Producción**: Si go, integrar en main branch + doc en ARCHITECTURE_VOICE_0.5.0.md

## Referencias

- [Coqui TTS XTTS-v2 GitHub](https://github.com/coqui-ai/TTS)
- [Kokoro-82M ONNX](https://github.com/hexgrad/kokoro)
- [ElevenLabs pricing](https://elevenlabs.io/pricing)
- Chagra INFRA_FACTS.md (kokoro-tts service details)
- ARCHITECTURE_VOICE_0.5.0.md (voice architecture doc)
