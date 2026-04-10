# Chagra

Chagra es una Aplicación Web Progresiva (PWA) de arquitectura offline-first diseñada para la gestión operativa en campo bajo principios de agroecología, permacultura y agricultura orgánica. Actúa como una interfaz de captura de datos ágil e ininterrumpida, sincronizando transacciones de forma asíncrona con un backend de FarmOS.

## Características Principales

* **Arquitectura Offline-First:** Operatividad continua en zonas rurales sin cobertura de red. Las transacciones (siembras, cosechas, mantenimientos) se encolan en IndexedDB y se despachan automáticamente a través del Service Worker al recuperar la conectividad.
* **Integración Nativa con FarmOS:** Sincronización bidireccional mediante JSON:API para la gestión de activos, registros (logs) y taxonomías.
* **Diseño de Dominio Agroecológico:** Modelado de datos orientado a gremios, estratos (emergente, medio, bajo, cobertura) y manejo de cultivos orgánicos priorizando la biodiversidad (Berries, Passifloras, Frutales, Ciclo Corto).
* **Telemetría IoT:** Observabilidad de sensores ambientales de campo (humedad, temperatura) integrados directamente en la interfaz del operario para la toma de decisiones basada en datos.
* **Resiliencia de Cola:** Política de descarte automática para errores HTTP 4xx en `SyncManager`, evitando bloqueos por transacciones malformadas, y reintento controlado para fallos transitorios de red o backend (5xx).

## Filosofía y Origen

El término "Chagra" hace referencia al sistema agroforestal tradicional andino-amazónico, fundamentado en el policultivo, la preservación de la biodiversidad y el respeto irrestricto por los ciclos termodinámicos y biológicos del suelo. Desde la iniciativa Guatoc, esta arquitectura de software se despliega con el propósito fundamental de parametrizar y optimizar los procesos de regeneración ecosistémica.

El proyecto promueve activamente la transición hacia modelos de agricultura orgánica y permacultura, priorizando la independencia de agroquímicos, el fomento de la microbiología local (alineado con los principios de la trofobiosis) y la gestión eficiente de recursos hídricos y energéticos. Chagra actúa como la capa de telemetría y control de datos requerida para documentar, trazar y escalar estas operaciones de sostenibilidad, incluyendo los planes de erradicación metódica de especies invasoras y la integración armónica de la bioconstrucción con el entorno rural.

## Pila Tecnológica

* **Frontend:** React 19, Vite 8
* **Gestión de Estado:** Zustand (estado global de UI), IndexedDB (`ChagraDB` v3, persistencia local de transacciones, activos y taxonomías)
* **PWA:** Service Worker manual con estrategias *Network-First* (API) y *Cache-First* (estáticos); Background Sync para despacho diferido de la cola
* **Estilo:** TailwindCSS 3
* **Backend Soportado:** FarmOS v2.x (vía JSON:API y OAuth2 Bearer)

## Requisitos Previos

* Node.js (v18 LTS o superior)
* Gestor de paquetes (`npm`, `yarn` o `pnpm`)
* Instancia operativa de FarmOS v2.x. Se recomienda su despliegue detrás de un proxy inverso que resuelva políticas de CORS y manejo de autenticación.

## Configuración de Entorno

Para garantizar la neutralidad del repositorio público y evitar la exposición de infraestructura específica, copie `.env.example` a `.env` en la raíz del proyecto y ajuste los valores a su instancia:

```env
# Endpoint base de FarmOS (sin barra final)
VITE_FARMOS_URL=https://farmos.ejemplo.com

# Client ID OAuth2 registrado en FarmOS
VITE_FARMOS_CLIENT_ID=tu_oauth_client_id_aqui

# UUID del activo "land" usado por defecto como ubicación principal
VITE_DEFAULT_LOCATION_ID=uuid_de_ubicacion_principal

# Nombre legible de la finca, mostrado en la UI
VITE_DEFAULT_FARM_NAME=Granja Principal
```

> **Nota de seguridad:** los archivos `.env` y `.env.local` están incluidos en `.gitignore`. Nunca los commitee al repositorio público.

## Instalación y Ejecución Local

Clonar el repositorio:

```bash
git clone https://github.com/tu-usuario/chagra.git
cd chagra
```

Instalar dependencias:

```bash
npm install
```

Ejecutar el servidor de desarrollo:

```bash
npm run dev
```

## Construcción para Producción

Para compilar los artefactos estáticos y generar los manifiestos de registro del Service Worker:

```bash
npm run build
```

El directorio `dist/` resultante contendrá los recursos optimizados, listos para ser desplegados en Nginx, Apache o infraestructuras de tipología Edge/CDN.

## Arquitectura Offline-First (resumen)

```
[Componente UI]
    │  acción del operario
    ▼
[Zustand store]  ──►  [IndexedDB · ChagraDB v3]
    │                       (assets, taxonomy_terms, sync_meta,
    │                        pending_transactions, pending_tasks)
    ▼
[syncManager.saveTransaction()]
    │
    ▼
[Service Worker]  ── postMessage(SYNC_REQUESTED) ──►  [syncManager.syncAll()]
                                                          │
                                                          ▼
                                                  [FarmOS JSON:API]
```

* Escrituras optimistas en Zustand + IndexedDB.
* `syncAll()` purga transacciones tras 2xx, descarta ante 4xx (no recuperables) y reintenta hasta `MAX_RETRIES=3` ante errores transitorios.
* Eventos `syncComplete` / `syncError` consumidos por `NetworkStatusBar` para feedback global.

## Principios de Contribución

El desarrollo de Chagra prioriza la eficiencia de recursos computacionales, emulando la eficiencia de los ecosistemas naturales. En el ámbito de la interfaz de usuario, se prioriza el bajo esfuerzo cognitivo para el operario de campo.

Cualquier contribución al módulo de sincronización (`syncManager`) debe asegurar la inmutabilidad de la cola local de datos y el manejo estricto de excepciones (códigos HTTP 4xx/5xx) para evitar bloqueos por transacciones malformadas. Toda interacción de red debe pasar por `fetchFromFarmOS` / `sendToFarmOS` (`src/services/apiService.js`), que centraliza el control de timeout (`AbortController`) y la propagación de `error.status`.

## Licencia

Este proyecto está licenciado bajo los términos de la licencia **GNU AGPLv3**.
