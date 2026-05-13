# Request #301

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/301
- Title: [feat] TelemetryAlerts: skeleton loader visual mientras fetch sensores HA
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: feat Scope: TelemetryAlerts Descripcion: src/components/TelemetryAlerts.jsx durante el primer fetch a /api/ha/states/sensor.* muestra un estado vacio o loading basico que se siente abrupto en mobile. Implementar skeleton loader con placeholders animados (motion-safe animate-pulse) que reservan el espacio de los cards de sensores (Invernadero Zona A + Matera Tabaco) con sus 4 metricas (humedad/temperatura cada uno) mientras data esta en null. Cuando llega la data del primer fetch, transition suave a los cards reales. Criterios: al cargar la app desde cero, el espacio de los sensores muestra cards skeleton grises pulsando en lugar de salto visual; tras data llegada, fade-in a contenido real. Restricciones: no modificar la logica de fetch ni los handlers de error existentes; solo agregar el render branch para data === null. Prioridad: media Contexto: demo 2026-05-19 — pulir percepcion visual de la app durante load.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
