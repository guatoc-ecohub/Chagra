# Integration Gateway para fuentes agro vía MCP

## Alcance

Este diseño adapta el patrón `IntegrationGateway → CapabilityGateway → Connector / Importer / ExternalReferencer` de `home-information` al cliente OSS de Chagra.

El punto de integración actual es `src/services/sidecarClient.js`. El gateway no implementa otro cliente HTTP ni conoce URLs de infraestructura. Cada adapter llama un wrapper explícito ya permitido por el sidecar:

| Gateway | Capability | Connector | Importer | ExternalReferencer |
| --- | --- | --- | --- | --- |
| `ideam` | `climate-series`, `climate-snapshot` | series o snapshot climático | candidatos de observación | preparado para búsquedas de fuente |
| `sipsa` | `market-prices` | precios mayoristas | candidatos de precio | referencias de precio |
| `ica` | `agrochemical-registry` | registros normativos | candidatos regulatorios | búsqueda y enlace de registros |

El registro público es `integrationManager`, un singleton de módulo. También se puede crear un `IntegrationManager` aislado para pruebas o para una futura superficie de servidor.

## Contrato operativo

```js
import { integrationManager, CAPABILITY_IDS } from './integrationGateway.js';

const importer = integrationManager
  .get('sipsa')
  .getImporter(CAPABILITY_IDS.SIPSA_PRICES);

const result = await importer.import({ producto: 'papa' });
// { ok, source, capability, records, ... }
```

Los adapters respetan el contrato `T | null` del sidecar y lo convierten en un resultado observable `{ ok: false, reason }`. Así la UI puede distinguir una fuente no configurada, una caída de red o una respuesta no disponible sin lanzar una excepción al flujo conversacional.

El monitor opcional usa una cadena `setTimeout`, por lo que no solapa polls. Un watchdog reinicia el ciclo si un adapter queda pendiente más tiempo que su ventana. No se inicia automáticamente: el consumidor decide cuándo una pantalla o un servicio necesita polling y debe detener el monitor al desmontarse.

## Límite de datos y modelo Asset + Log

`IntegrationImporter` solo normaliza candidatos en memoria. No escribe IndexedDB, FarmOS, Assets ni Logs. Una futura importación persistente debe pasar por una decisión explícita de dominio:

1. una lectura externa se presenta con fuente, fecha y payload;
2. una persona confirma qué dato se adopta;
3. la escritura usa el servicio de dominio correspondiente;
4. una inferencia de IA entra como `log--observation` con `metadata.ai` y no modifica un Asset directamente.

El gateway tampoco convierte una zona, sensor o fuente externa en padre estructural de una planta. Las referencias de navegación y cualquier asociación de finca deben seguir las reglas públicas de `AGENTS.md`.

## Seguridad y degradación

- Los adapters no interpolan nombres de tools ni paths de input libre.
- La allow-list, feature flag, timeout, auth y condición offline siguen centralizados en `sidecarClient.js`.
- Las credenciales siguen siendo configuración `VITE_*` y no aparecen en logs ni en este contrato.
- El gateway falla cerrado: `null`, errores de adapter y respuestas `_error` quedan como `ok: false`.
- No se añade persistencia ni telemetría nueva en esta fase.

## Próximo paso para servidor MCP

Si Chagra incorpora un servicio Node para ejecutar gateways en servidor, se puede reutilizar el contrato de clases y reemplazar los `read` por clientes MCP inyectados. La capa de dominio debe conservar la misma frontera: Connector para lectura, Importer para normalización y un comando separado, con revisión y autorización, para persistir.
