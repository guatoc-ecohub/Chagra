# Auditoría CRM agroecológico y hard-test David/Cata

Fecha: 2026-09-06  
Base de auditoría: PR #2859, ref `095218f5d`, ejecutada en una rama nueva basada en `origin/dev` (`0afe6f0af`).  
Estado de la decisión: no se mergeó #2859 ni se modificó `dev` o `main`.

## Veredicto ejecutivo

El PR entrega una maqueta navegable y un servicio de persistencia local, pero no los conecta. La maqueta muestra tres contactos y cuatro interacciones constantes; `crmService.js` sí puede escribir un `asset--person` y un `log--activity` en IndexedDB, pero ninguna pantalla del CRM lo invoca.

El hard-test lo demuestra con evidencia:

- puerta natural: no expone CRM (`crmTextCount=0`, `crmActionCount=0`);
- ruta directa por hash: carga y permite lectura y filtros;
- controles de escritura: `Nuevo Contacto=0`, `Nueva Interacción=0`, edición=0;
- IndexedDB antes y después: `ChagraDB.assets=0`, `ChagraDB.logs=0`, `ChagraDB.pending_transactions=0`;
- assets y logs CRM antes y después: `[]`;
- escrituras backend observadas: `[]`;
- enums CRM: todos los valores son singulares y no aparece el BUG-10 de plural contra enum singular.

Por eso el test termina rojo por contrato, con el mensaje `El contrato CRM requiere alta de contacto desde la ruta real`. Es un fallo medido del producto, no un falso verde del instrumento.

## Parte 1. Auditoría

### Qué cubre hoy

| Superficie | Evidencia | Estado real |
|---|---|---|
| Contactos | `src/components/crm/ContactosPanel.jsx` | Lista, búsqueda visual por nombre/vereda, filtro por tipo y estado, selección de contacto. |
| Historial | `src/components/crm/InteractionHistory.jsx` | Render de fecha, tipo, resultado, notas y detalles de venta/intercambio recibidos por props. |
| Red | `src/components/crm/RedView.jsx` | Conteos y pestañas derivados del objeto `networkStats` recibido por props. |
| Servicio | `src/services/crmService.js` | Crear, leer, buscar y actualizar contactos; crear y consultar interacciones; calcular estadísticas. |
| Persistencia prevista | `src/services/crmService.js`, `src/db/assetCache.js`, `src/db/logCache.js` | Usa los stores existentes, `_pending` y las colas generales. No crea una base paralela. |
| Tipos y enums | `src/types/crm.js`, `src/constants/crmConstants.js` | Tres tipos de contacto, seis tipos de interacción, dos estados de contacto. |
| Ruta | `src/App.jsx`, `src/mockups/CrmAgroecologico.jsx` | Vitrina pública por hash, antes del control de sesión. |
| Unit tests | `src/components/crm/__tests__/`, `src/services/__tests__/crmService.test.js` | 20/20 pasan, pero prueban componentes aislados y mocks del cache. |

### Qué no cubre

- No hay formulario ni acción de alta, edición o archivo de contactos desde la ruta.
- No hay formulario ni acción de alta de interacción desde la ruta.
- La maqueta usa arrays constantes locales (`CONTACTS`, `INTERACTIONS`, `NETWORK_STATS`) y no llama `crmService`.
- No existe enlace CRM desde la navegación natural. La ruta solo está declarada en `MOCKUP_HASH_ROUTES` como `mockups/crm-agroecologico`.
- No hay vínculo estructurado con cultivo/producto, lote, cosecha, cantidad, precio o temporada. `details` es un objeto libre sin validación de dominio.
- No hay control de roles, permisos o tenant específico en las superficies CRM. La ruta pública puede abrirse sin sesión.
- No hay política CRM para consentimiento, minimización, visibilidad o retención de teléfono, correo y notas.
- La búsqueda de UI es más estrecha que la del servicio: la UI busca nombre y vereda; el servicio también contempla municipio, pero no hay búsqueda visible por teléfono, correo, producto o temporada.
- No hay prueba E2E de alta, relectura tras recarga, sincronización de assets/logs, conflicto, deduplicación o backend.

### Alcanzabilidad desde la interfaz real

Se comprobó con Playwright, no solo leyendo el router.

1. En la raíz pública local, no apareció texto ni botón CRM: `crmTextCount=0`, `crmActionCount=0`.
2. Al navegar directamente a `#/mockups/crm-agroecologico`, el heading `CRM agroecológico`, el panel `Contactos` y la red sí fueron visibles.
3. La captura de la puerta natural muestra una pantalla sin entrada CRM. La captura de la ruta muestra el mockup, no un flujo de producción.

Conclusión: es alcanzable por deep-link conocido, no por la puerta que usaría una persona campesina.

### ¿Persiste de verdad?

El servicio contiene escrituras teóricas válidas:

- `createContact()` llama `assetCache.put('person', contact)`;
- `createInteraction()` llama `logCache.put(interaction)`;
- ambos marcan `_pending: true`.

Eso no basta para afirmar persistencia de producto. La UI visible no llama esas funciones. El hard-test hizo el volcado de IndexedDB en el navegador antes y después de la interacción offline de lectura:

```json
{
  "ChagraDB.assets": { "before": 0, "after": 0 },
  "ChagraDB.logs": { "before": 0, "after": 0 },
  "ChagraDB.pending_transactions": { "before": 0, "after": 0 },
  "crmAssetsBefore": [],
  "crmAssetsAfter": [],
  "crmLogsBefore": [],
  "crmLogsAfter": [],
  "backendWritesObserved": []
}
```

El volcado sanitizado completo está en `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/crm-hard-test-evidence.json`.

### CRM técnicamente necesario para una finca

| Capacidad | Confirmación | Estado del PR |
|---|---|---|
| Tipos comprador, proveedor, vecino de intercambio, técnico, cooperativa y mercado campesino | El PR solo declara `campesino`, `tecnico` y `proveedor`; `intercambio` es tipo de interacción, no tipo de contacto. | Insuficiente. |
| Historial con fecha, tipo y resultado | El servicio y el componente tienen esos campos. | Lectura de demo; escritura no alcanzable. |
| Vínculo con dominio de finca | La relación actual solo apunta contacto ↔ log de actividad. | Falta producto/cultivo/lote/cantidad/precio/temporada. |
| Búsqueda y filtros | Servicio: tipo, estado, nombre, vereda y municipio. UI: nombre/vereda, tipo y estado. | Parcial. |
| Offline-first | Los caches generales y `_pending` existen. | La maqueta funciona como lectura estática offline; no hay alta CRM visible para probar cola y relectura. |
| Roles y permisos | No hay guard CRM. La ruta pública se resuelve antes de sesión. | No cubierto. |
| Datos personales | Se almacenan teléfono, correo y notas en atributos del asset. | Sin consentimiento, minimización, máscara, auditoría o política de acceso CRM. |

### Cruce con lo que ya existe

- Persistencia: la elección de `asset--person` y `log--activity` respeta las primitivas existentes. No inventa stores CRM nuevos. El servicio se apoya correctamente en `assetCache` y `logCache`.
- Inventario: el inventario ya tiene event sourcing en `inventory_events`, `InventoryPage` y `RecountDrawer`. El CRM no duplica inventario, pero tampoco relaciona una venta o intercambio con el producto y el evento de inventario que ya existen.
- Mercado: `src/db/marketplaceOfertas.js` y `MercadosScreen` ya persisten ofertas offline, con producto, cantidad, unidad, precio y contacto directo. CRM debería referenciar esa oferta o el trato, no copiar esos campos sin contrato. El PR no integra ninguno.
- Red social: `src/store/useRedStore.js`, `src/services/red` y `src/db/redTransactions.js` ya derivan reputación y grafo social a partir de tratos. `RedView` del CRM calcula otra red independiente desde contactos y actividades. Hay solapamiento semántico y no existe un adaptador entre ambas fuentes.
- Grafo agronómico: `public/grafo-relations.json` y sus consumidores sirven especies, manejo, asociaciones y sanidad. El CRM no consulta ese grafo. Eso evita duplicar conocimiento agronómico, pero también significa que una interacción CRM no queda enlazada a una recomendación o cultivo grounded.

### Anti-leak encontrado

Hay datos con apariencia de identidad personal y teléfono en fixtures públicos del PR. Se reportan sin transcribir:

- `src/mockups/CrmAgroecologico.jsx`: nombres de personas de muestra y número telefónico en el array de contactos.
- `src/components/crm/__tests__/ContactosPanel.test.jsx`: nombres de personas en fixtures unitarios.

Las capturas entregadas no muestran la lista de contactos ni esos valores. El test nuevo solo usa identificadores ficticios para la búsqueda negativa y no agrega nombres personales.

## Parte 2. Hard-test David/Cata

### Suite entregada

Archivo: `/home/kortux/Workspace/chagra-crm-hard-test/tests/crm-hard-test.spec.js`

El caso usa GIVEN/WHEN/THEN y cubre:

- puerta natural versus deep-link;
- visibilidad real del mockup;
- presencia o ausencia de acciones de escritura;
- conteo y valores de IndexedDB antes y después;
- escrituras no-GET observadas en API/OAuth;
- lectura y filtros con `context.setOffline(true)`;
- control de enums contra `crmConstants.js`;
- capturas de evidencia y errores de consola, página y red.

La suite se ejecuta con la URL configurable por `PLAYWRIGHT_BASE_URL`. Para el resultado reproducible de esta auditoría se ejecutó contra el servidor Vite local de la rama, con Chromium `/home/kortux/.local/bin/chromium`.

### Resultado de ejecución

```text
Unitarias CRM: 5 archivos, 20 tests, todos pasan.
Build Vite: pasa.
ESLint del hard-test: pasa.
Playwright hard-test: 1 test, 1 failure medido.
Fallo: createContactButtonCount=0, se esperaba > 0.
```

El test no acepta un toast o un contador demo como éxito. El veredicto de persistencia depende del IndexedDB y de las escrituras de red observadas.

### BUG-01, BUG-08, BUG-10 y BUG-05

| Caso | Evidencia | Veredicto |
|---|---|---|
| BUG-01, “dijo registré pero no persistió” | No existe acción de registro. Conteos de assets/logs/pendientes quedan en cero y no hay escrituras backend. | Detectado como flujo inexistente, no certificable. |
| BUG-08, puerta lateral | La ruta CRM solo aparece como hash público; la raíz no expone CRM. | Detectado. |
| BUG-10, plural contra singular | Valores observados: `campesino`, `tecnico`, `proveedor`, `visita`, `llamada`, `mensaje`, `intercambio`, `venta`, `asesoria`. | No reproducido en este PR. |
| BUG-05, cargar pero no servir | La maqueta carga datos locales constantes y el servicio no tiene consumidores de producción. | Detectado: la lectura no alcanza los datos persistidos. |

### Offline

Con la ruta ya cargada, al cortar red el filtro y la lectura del mockup siguen funcionando. Eso prueba continuidad de una vista estática, no el contrato completo offline-first. No hubo escritura que pudiera dejar una transacción pendiente ni recarga en frío del CRM para verificar rehidratación.

### Roles

El acceso directo al mockup no pide sesión y no contiene un guard de rol CRM. Por lo tanto, hoy no hay diferencia observable entre dueña, trabajador, niña o visitante en esta superficie. El hard-test no inventa una matriz de roles que el producto no implementa.

### Capturas y envío al operador

Todas las capturas fueron inspeccionadas visualmente. No muestran nombres de contactos ni teléfonos.

| Evidencia | Ruta absoluta | `msg_id` |
|---|---|---:|
| Puerta natural | `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/crm-natural-door.png` | 6648 |
| Ruta CRM | `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/crm-route-header.png` | 6650 |
| Resumen de red | `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/crm-network-overview.png` | 6649 |
| Lectura offline | `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/crm-offline-read.png` | 6651 |
| Sonda del entorno dev | `/home/kortux/Workspace/chagra-crm-hard-test/_gate/crm-hard-test/dev-crm-route.png` | 6652 |

### Entorno dev

La sonda Playwright contra `dev` redirigió a HTTPS, no encontró el heading CRM (`crmHeading=0`) y mostró la pantalla de error de carga. Hubo fallos de recursos estáticos antes de montar la app. Esto se reporta como **NO PUDE LEER la ruta CRM en dev**, no como prueba de que el PR no exista allí.

## Parte 3. Huecos priorizados para codear después

Costos aproximados en días de desarrollo y prueba, suponiendo que se mantiene Asset+Log y que no se cambia el modelo de sincronización general.

| Prioridad | Qué falta | Por qué importa para el campesino | Costo aprox. | Propuesta concreta |
|---:|---|---|---:|---|
| 1 | La ruta visible no consume `crmService` y no tiene escritura | Si la libreta dice que guardó pero al volver no está, se pierde la relación comercial y la confianza. | 4 a 7 días | Crear formularios accesibles de contacto e interacción, conectar `createContact`/`createInteraction`, hidratar desde caches al montar, recargar desde IndexedDB después de guardar y mostrar estado pending/sincronizado. |
| 2 | No hay vínculo con cultivo, producto, cosecha, cantidad, precio ni temporada | Permite saber qué se vendió o intercambió, cuánto y en qué ciclo, en vez de guardar una conversación aislada. | 5 a 8 días | Definir `details` versionado o relaciones a assets/logs existentes; referenciar oferta de `marketplace_ofertas`, lotes/cultivos y eventos de inventario sin copiar fuentes de verdad. |
| 3 | No hay puerta natural desde Vender, Inventario o la red existente | Un usuario rural no debe conocer un hash ni buscar una pantalla escondida. | 1 a 3 días | Añadir una entrada CRM en la rama real de Vender/Red y deep-links desde oferta, trato e inventario; probar el camino con click, no solo con hash. |
| 4 | No hay roles ni alcance por finca para CRM | Los datos de contacto y precios no deben quedar abiertos a una niña o a otra finca del dispositivo. | 5 a 10 días | Reusar el contexto de tenant y el servicio de perfiles; definir permisos de lectura/crear/editar/exportar, aplicar guard en UI y servicio, y probar una matriz admin, trabajador, lectura y visitante. |
| 5 | PII sin política de consentimiento y minimización | Teléfono, correo y notas son datos personales; una fuga afecta al contacto y a la finca. | 3 a 6 días | Separar campos necesarios de opcionales, consentimiento y fecha, enmascarar por rol, evitar PII en logs/telemetría y documentar retención/borrado. |
| 6 | Offline parcial, sin prueba de cold reload y sync del CRM | En zona rural la señal puede volver horas después; el dato debe sobrevivir cierre y reintentos. | 3 a 6 días | E2E: crear offline, comprobar `assets`/`logs`/`pending_transactions`, cerrar/abrir, reconectar, deduplicar por id y verificar respuesta backend sin dar por válido el toast. |
| 7 | Tipos de contacto incompletos | Cooperativa, comprador y mercado campesino tienen decisiones y datos distintos a un proveedor. | 2 a 4 días | Ampliar enum con nomenclatura singular estable, migrar etiquetas y validar usos contra constantes para evitar BUG-10. |
| 8 | Búsqueda y filtros incompletos | Encontrar un contacto por municipio, teléfono, oferta o temporada ahorra tiempo en campo. | 2 a 4 días | Selector y búsqueda por nombre, tipo, municipio/vereda, estado, producto y rango temporal, con índices o selectores derivados sin persistir vistas. |
| 9 | Red CRM paralela a `useRedStore` | Dos redes con conteos distintos hacen que el usuario no sepa cuál es la verdad. | 3 a 6 días | Definir contrato entre contacto, trato y reputación; `RedView` debe proyectar la fuente elegida y enlazar al historial, sin duplicar `redTransactions`. |
| 10 | Pruebas solo unitarias del servicio | Un mock puede pasar aunque el botón real jamás lo llame. | 2 a 4 días | Mantener unitarias y añadir E2E de puerta natural, persistencia IDB, backend, offline, recarga, enums, accesibilidad y roles. |

## Lo que NO pude verificar

- No pude verificar una escritura CRM real contra backend porque la UI no ofrece una acción de escritura.
- No pude verificar sincronización, reintento, deduplicación o conflicto de un contacto/interacción real.
- No pude verificar una matriz de permisos CRM porque la ruta es pública y no tiene guard de rol.
- No pude verificar el enlace a cultivo/producto/cosecha/inventario porque el PR no define esa relación.
- No pude verificar una recarga en frío offline de un dato CRM creado, porque no hay creación desde la UI.
- No pude leer la ruta CRM en el entorno `dev`: la pantalla de error apareció después de fallos de assets. No lo convierto en una afirmación de ausencia del PR.
- No se verificó producción ni se realizó merge o promoción de #2859.
