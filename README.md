# Chagra — README bilingüe ES/EN

**Destino**: `guatoc-ecohub/Chagra/README.md` (reemplaza el README actual).
**Branch sugerida**: `docs/readme-bilingual-en-es`.
**Audiencia**: futuras aplicaciones USA W2 remote + visibilidad open-source internacional.
**Política**: side-by-side ES + EN, sin reemplazar el español original. La columna ES preserva el texto canónico actual; la columna EN es traducción técnica fiel.

---

```markdown
<!-- ============================================================ -->
<!-- BEGIN file: README.md (replace from line 1 to end-of-file)   -->
<!-- ============================================================ -->

# Chagra

> [Español](#chagra-es) · [English](#chagra-en)

---

<a id="chagra-es"></a>

## Chagra (Español)

Chagra es una Aplicación Web Progresiva (PWA) de arquitectura offline-first diseñada para la gestión operativa en campo bajo principios de agroecología, permacultura y agricultura orgánica. Actúa como una interfaz de captura de datos ágil e ininterrumpida, sincronizando transacciones de forma asíncrona con un backend de FarmOS.

<a id="chagra-en"></a>

## Chagra (English)

Chagra is an offline-first Progressive Web App (PWA) built for field operations under agroecology, permaculture, and organic farming principles. It serves as an uninterrupted, low-friction data capture interface that asynchronously synchronizes transactions with a FarmOS backend.

---

## Qué resuelve / What it solves

| Español                                                                                              | English                                                                                                |
|------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Operación continua sin red en zonas rurales colombianas.                                             | Continuous operation without network in rural Colombian regions.                                       |
| Captura de datos agroecológica respetando policultivos, estratos y biodiversidad.                    | Agroecological data capture that respects polyculture, strata, and biodiversity.                       |
| Idioma colombiano (sumercé, mijo, mi llave, panita) en lugar de español neutro de Madrid.            | Colombian Spanish vocabulary (regional greetings) instead of neutral peninsular Spanish.               |
| IA local con vocabulario rural — agente offline-friendly que no asume cobertura.                     | Local AI with rural vocabulary — offline-friendly agent that does not assume connectivity.             |
| Catálogo agroecológico Colombia validado (600 especies, 30 plagas, 20 biopreparados ICA/Agrosavia).  | Validated Colombian agroecological catalog (600 species, 30 pests, 20 ICA/Agrosavia bio-preparations). |

---

## Características principales / Key features

| Español                                                                                                                                                                          | English                                                                                                                                                                |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Arquitectura offline-first**: transacciones en IndexedDB despachadas por Service Worker al recuperar conectividad.                                                              | **Offline-first architecture**: transactions queued in IndexedDB and dispatched by the Service Worker upon reconnect.                                                  |
| **Integración nativa con FarmOS**: sincronización bidireccional vía JSON:API.                                                                                                     | **Native FarmOS integration**: bidirectional sync via JSON:API.                                                                                                        |
| **Dominio agroecológico**: gremios, estratos (emergente / medio / bajo / cobertura), policultivos.                                                                                | **Agroecological domain**: guilds, strata (emergent / mid / low / cover), polycultures.                                                                                |
| **Telemetría IoT**: sensores ambientales en finca (humedad, temperatura) integrados a la UI del operario.                                                                         | **IoT telemetry**: on-farm environmental sensors (humidity, temperature) integrated into the operator UI.                                                              |
| **Resiliencia de cola**: descarte automático en 4xx, reintento controlado en 5xx, sin bloqueo por transacciones malformadas.                                                      | **Queue resilience**: auto-discard on 4xx, controlled retry on 5xx, no blocking on malformed transactions.                                                             |

---

## Filosofía y origen / Philosophy and origin

| Español                                                                                                                                                                                                                                                                                                                                                                                                                                                                | English                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| El término "Chagra" hace referencia al sistema agroforestal tradicional andino-amazónico, fundamentado en el policultivo, la preservación de la biodiversidad y el respeto irrestricto por los ciclos termodinámicos y biológicos del suelo. Desde la iniciativa Guatoc, esta arquitectura de software se despliega con el propósito fundamental de parametrizar y optimizar los procesos de regeneración ecosistémica.                                                | "Chagra" refers to the traditional Andean-Amazonian agroforestry system, grounded in polyculture, biodiversity preservation, and strict respect for the thermodynamic and biological cycles of soil. From the Guatoc initiative, this software architecture is deployed to parameterize and optimize ecosystem regeneration processes.                                                                                                                                |
| El proyecto promueve la transición hacia modelos de agricultura orgánica y permacultura, priorizando la independencia de agroquímicos, el fomento de la microbiología local (trofobiosis) y la gestión eficiente de recursos hídricos y energéticos. Chagra actúa como la capa de telemetría y control de datos requerida para documentar, trazar y escalar estas operaciones, incluyendo la erradicación metódica de especies invasoras y la bioconstrucción rural. | The project actively promotes the transition toward organic farming and permaculture, prioritizing independence from agrochemicals, fostering local microbiology (trophobiosis), and efficient water and energy management. Chagra acts as the telemetry and data control layer required to document, trace, and scale these operations, including methodical eradication of invasive species and the integration of rural bioconstruction with the environment. |

---

## Pila tecnológica / Tech stack

| Capa / Layer            | Tecnología / Technology                                                                                                  |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Frontend                | React 19, Vite 8                                                                                                         |
| Estado / State          | Zustand (UI global), IndexedDB (`ChagraDB` v3: assets, taxonomy, sync_meta, pending_transactions, pending_tasks)        |
| PWA                     | Service Worker manual (Network-First para API, Cache-First para estáticos), Background Sync                              |
| Estilo / Styling        | TailwindCSS 3                                                                                                            |
| Backend soportado       | FarmOS v2.x (JSON:API + OAuth2 Bearer)                                                                                   |
| IA local / Local AI     | Ollama, llama3.2-vision:11b, granite3.1-dense:8b, gemma3:4b (NLU gate), Whisper STT, Kokoro TTS                          |
| Grafo / Graph DB        | PostgreSQL 15 + Apache AGE 1.5.0                                                                                         |

---

## Quick start

### Español

```bash
# 1. Clonar
git clone https://github.com/guatoc-ecohub/Chagra.git
cd Chagra

# 2. Configurar entorno
cp .env.example .env
# editar .env con la URL de tu FarmOS, client ID OAuth2 y location UUID

# 3. Instalar
npm install

# 4. Desarrollo
npm run dev

# 5. Producción
npm run build
# artefactos en dist/ — despliegue en Nginx / Apache / CDN
```

### English

```bash
# 1. Clone
git clone https://github.com/guatoc-ecohub/Chagra.git
cd Chagra

# 2. Configure environment
cp .env.example .env
# edit .env with your FarmOS URL, OAuth2 client ID, and location UUID

# 3. Install
npm install

# 4. Development
npm run dev

# 5. Production
npm run build
# artifacts in dist/ — deploy to Nginx / Apache / CDN
```

### Variables de entorno / Environment variables

```env
# Endpoint base de FarmOS (sin slash final) / FarmOS base URL (no trailing slash)
VITE_FARMOS_URL=https://farmos.example.com

# Client ID OAuth2 registrado en FarmOS / OAuth2 Client ID registered in FarmOS
VITE_FARMOS_CLIENT_ID=your_oauth_client_id_here

# UUID del activo "land" usado por defecto / Default "land" asset UUID
VITE_DEFAULT_LOCATION_ID=default_location_uuid

# Nombre legible de la finca / Human-readable farm name
VITE_DEFAULT_FARM_NAME=Main Farm
```

> **Nota de seguridad / Security note**: `.env` y `.env.local` están en `.gitignore`. Nunca se commitean al repositorio público. / `.env` and `.env.local` are gitignored. Never commit them to the public repository.

---

## Arquitectura offline-first / Offline-first architecture

```
[UI Component]
    │  operator action / acción del operario
    ▼
[Zustand store]  ──►  [IndexedDB · ChagraDB v3]
    │                       (assets, taxonomy_terms, sync_meta,
    │                        pending_transactions, pending_tasks)
    ▼
[syncManager.saveTransaction()]
    │
    ▼
[Service Worker] ── postMessage(SYNC_REQUESTED) ──► [syncManager.syncAll()]
                                                          │
                                                          ▼
                                                  [FarmOS JSON:API]
```

- **ES**: escrituras optimistas en Zustand + IndexedDB. `syncAll()` purga tras 2xx, descarta 4xx, reintenta hasta `MAX_RETRIES=3` ante 5xx. Eventos `syncComplete` / `syncError` consumidos por `NetworkStatusBar`.
- **EN**: optimistic writes in Zustand + IndexedDB. `syncAll()` purges on 2xx, discards on 4xx, retries up to `MAX_RETRIES=3` on 5xx. `syncComplete` / `syncError` events consumed by `NetworkStatusBar`.

---

## Principios de contribución / Contribution principles

| Español                                                                                                                                                                                                                                                                                                                                                                                                                                              | English                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| El desarrollo prioriza la eficiencia de recursos computacionales, emulando los ecosistemas naturales. En la UI se prioriza el bajo esfuerzo cognitivo para el operario de campo. Toda interacción de red debe pasar por `fetchFromFarmOS` / `sendToFarmOS` (`src/services/apiService.js`), que centraliza el control de timeout (`AbortController`) y la propagación de `error.status`.                                                              | Development prioritizes efficient use of computational resources, emulating natural ecosystems. The UI prioritizes low cognitive load for the field operator. All network interaction must go through `fetchFromFarmOS` / `sendToFarmOS` (`src/services/apiService.js`), which centralizes timeout control (`AbortController`) and `error.status` propagation.                                                                                     |
| Cualquier contribución al módulo `syncManager` debe asegurar la inmutabilidad de la cola local y el manejo estricto de excepciones (4xx/5xx) para evitar bloqueos por transacciones malformadas.                                                                                                                                                                                                                                                     | Any contribution to the `syncManager` module must ensure local-queue immutability and strict exception handling (4xx/5xx) to avoid blocking on malformed transactions.                                                                                                                                                                                                                                                                             |

---

## Licencia / License

**ES**: este proyecto está licenciado bajo **GNU AGPLv3**. Ver `LICENSE`.

**EN**: this project is licensed under **GNU AGPLv3**. See `LICENSE`.

---

For the next custodian.
She'll know which parts to keep.

Este código existe por una sola persona.
Lo demás es ingeniería y TDAH a tope.

<!-- ============================================================ -->
<!-- END file: README.md                                          -->
<!-- ============================================================ -->
```

---

## Notas de aplicación

1. **Branch**: `docs/readme-bilingual-en-es` desde `main`.
2. **Commit**: `docs(readme): bilingual ES/EN side-by-side for international visibility`.
3. **PR base**: `main`.
4. **No tocar**: `.env.example`, `LICENSE`, ni el footer "For the next custodian / Este código existe…" (lo preserva el bloque final).
5. **Validación visual**: GitHub renderiza correctamente los anchors `#chagra-es` y `#chagra-en` con TOC arriba.
6. **Anti-leak**: no menciona infraestructura privada, modelos no-públicos, ni decisiones de pricing.
