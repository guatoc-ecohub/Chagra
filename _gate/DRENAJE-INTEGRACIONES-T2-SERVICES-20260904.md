# Drenaje de integraciones no consumidas, Tanda 2: servicios

Fecha: 2026-09-04

## Resultado

El auditor pasó de **196** a **172** capacidades sin declarar, una reducción de
**24**. Terminó con `exit 1` porque permanecen 172 hallazgos fuera de esta tanda.
Ese es el resultado que se debe citar como medición.

Las 24 piezas aparecen en la sección de alcance simbólico como módulos de apoyo
sin ruta viva. Por eso quedaron en `orphan_components`, que es la clave que el
auditor consulta para ese tipo de hallazgo. `same_repo` solo se aplica a los tres
exports explícitos de `SAME_REPO_TARGETS`; añadir estas rutas allí no cambiaría
el veredicto ni el conteo.

| archivo | decisión | razón |
| --- | --- | --- |
| agentTelemetryFlywheel.js | DECLARAR | Captura local-first recuperada en #2668; la pantalla de métricas y el registro de interacciones no alcanzan una ruta viva. |
| biodiversidadMonitor.js | DECLARAR | Adaptador del catálogo de indicadores de #1451, usado solo por pruebas, sin presentación ni recomendador vivo. |
| compaiExplicaPantallas.js | DECLARAR | Lo consume un hook, pero ni el hook ni su componente de guía están montados en una ruta de producto. |
| compaiParadasPorPantalla.js | DECLARAR | Contrato de la Ola 2 (#2820); sus hooks consumidores no son alcanzables y requiere montaje/desmontaje real por pantalla. |
| compaiPaseoPlanificador.js | DECLARAR | Lógica pura de #2820 consumida únicamente por el hook de paseo no alcanzable. |
| datosAbiertos.js | DECLARAR | Referencia SIPSA; faltan proxy CORS y caché, y MercadoScreen no consume el normalizador. |
| ensoModulador.js | DECLARAR | Necesita una recomendación base y fase ENSO actuales; ningún recomendador vivo entrega esas entradas. |
| fenologyRecommendations.js | DECLARAR | Motor offline-first sin pantalla que construya su solicitud ni inyecte pronóstico. |
| fincaScope.js | DECLARAR | Fundación MF-1 protegida por flag; cablearla requiere migración coordinada de persistencia y stores. |
| fotoOfflineService.js | DECLARAR | Cola IDB rescatada que compite con mediaCache/photoService; falta decidir la fuente de verdad de medios. |
| glaciarCaaml.js | DECLARAR | Exportador CAAML sin ruta viva de reportes glaciares. |
| glaciarZenodoMeta.js | DECLARAR | Metadatos de exportación sin flujo de publicación alcanzable en la PWA. |
| hojaVidaMataService.js | DECLARAR | Sin consumidor; una futura UI debe derivar el timeline desde logs, no persistir una hoja de vida. |
| iotCostCalculator.js | DECLARAR | Calculadora sin pantalla que recoja configuración ni muestre un resultado contextual. |
| iotValeLaPena.js | DECLARAR | Heurística sin formulario o asesor vivo que reciba sus señales de entrada. |
| lunarPestService.js | DECLARAR | PestMonitoringWindow lo importa, pero ese componente no pertenece a una ruta viva. |
| networkRetry.js | DECLARAR | Helper probado sin cliente de red consumidor; aplicarlo globalmente cambiaría la degradación por endpoint. |
| ragWithPhotos.js | DECLARAR | Join RAG-fotos sin consumidor que presente y libere URLs de Blob. |
| recorridoService.js | DECLARAR | useRecorridoStore lo usa, pero el store no llega a una ruta viva; GPS, resumen y TTS siguen inactivos. |
| redService.js | DECLARAR | Andamiaje sidecar de #2792 sin pantallas de Fase 1; el módulo local `services/red/redService.js` es otro camino. |
| restauracionRecetaFormatter.js | DECLARAR | Formateador sin fuente de diagnóstico ni superficie viva de lectura. |
| socialPrefiltro.js | DECLARAR | Política de un flujo social que aún no existe; conectarla fuera de ese flujo cambiaría su propósito. |
| subgrafoToText.js | DECLARAR | Adaptador AGE sin respuesta de agente o pantalla viva que exponga ese formato. |
| vitalidadEspirituService.js | DECLARAR | El panel consumidor está archivado; no se debe sustituir sus métricas derivadas por estado persistido al reactivarlo. |

## Verificación

Comandos ejecutados:

```text
node -e "JSON.parse(require('node:fs').readFileSync('ops/integraciones-no-consumidas.json','utf8')); console.log('JSON válido')"
node scripts/audit-integraciones.mjs
git diff --check
```

Resultado observado:

```text
JSON válido
✗ 172 capacidad(es) construida(s) y no conectada(s), sin declarar
```

No se ejecutó una prueba visual: este cambio altera exclusivamente la declaración
del auditor y no una superficie renderizada. No se cableó ni borró ninguna pieza;
la investigación mostró 24 decisiones de producto o persistencia que no caben en
esta tanda, no 24 imports de bajo riesgo.
