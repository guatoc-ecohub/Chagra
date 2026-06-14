# ADR-048: Modo extensionista — panel supervisor multi-finca (MVP cliente)

**Status:** Accepted (MVP) — backend de delegación pendiente (follow-up)
**Date:** 2026-06-14
**Deciders:** Operator (Miguel) + Claude Opus 4.8
**Related:** ADR-036 (multi-finca / federación de células — sub-i identidad, sub-iv asesores externos), ADR-002 (boundary OSS/Pro vía moduleRegistry), `src/services/tenantContext.js` (ADR-036 MVP tenant scoping), `src/config/glaciarAccess.js` (precedente de gate por whitelist + feature)

## Contexto

Chagra hoy modela **un agricultor con una o más fincas PROPIAS**: `tenantContext.js` (MVP de ADR-036) resuelve "quién soy yo" a partir del username del login OAuth2 y scopea los assets de farmOS con `filter[uid.name]`. Eso cubre al campesino dueño de su(s) finca(s).

Pero la visión SENA-FAO / Agrosavia / IPPTA (extensión rural) introduce un actor distinto: el **extensionista** — el asesor de extensión (EPSEA/SENA), el técnico de Agrosavia/IPPTA, el líder de una asociación campesina — que **acompaña varias fincas de OTROS agricultores**. Este actor no opera su propia finca: supervisa las ajenas, necesita un panel con el estado de cada una de un vistazo, y prioriza dónde poner su tiempo (visitas, llamadas).

ADR-036 ya previó este rol en **sub-iv ("Asesores externos read+comment")**: la delegación correcta es una **capability UCAN** firmada por el dueño de la finca, con `redact_pii` y TTL, validada server-side por un módulo Drupal `farm_did_auth`. Ese es el destino. El problema: **ese backend no existe hoy** (UCAN + did:key + farm_did_auth son Fase 1+ de ADR-036, ~USD 14-18k, Q3-Q4 2026). No podemos bloquear la validación de producto del panel supervisor esperando el stack criptográfico completo.

Necesitamos un **MVP cliente** que:
1. Detecte el rol "extensionista" sin backend nuevo.
2. Muestre un selector / dashboard de las fincas que ese extensionista acompaña.
3. No mienta: que un piloto entienda que es una **vista previa con datos de ejemplo**, no un permiso verificado.
4. Quede **apagado por defecto** en producción hasta que el backend lo respalde.
5. No duplique `tenantContext` ni rompa el scoping existente.

## Decisión

Implementar el modo extensionista como una **capa de ROL client-side, gateada por feature flag**, encima de `tenantContext`. Cero backend nuevo en este MVP.

### Modelo

- **Rol ≠ tenant.** `tenantContext` sigue respondiendo "qué finca propia scopeo". El nuevo `extensionistaAccess` responde "¿este usuario es un supervisor que puede VER fincas ajenas?". Son ortogonales: un usuario puede ser ambas cosas, pero el rol no toca el scoping de assets.

- **Doble candado** (igual filosofía que `glaciarAccess.js` / La Cordada):
  1. **Feature flag global** `VITE_FEATURE_EXTENSIONISTA` (kill-switch, default `false`). Apagado → el modo no existe para nadie: ni ruta `#extensionista`, ni entrada en Perfil, ni panel. Permite shippear el código *dark* a producción.
  2. **Whitelist** `EXTENSIONISTA_WHITELIST` (Set de usernames). Aun con la flag ON, solo estos usuarios entran.

- **Fuente de fincas delegadas = MOCK estático** `src/data/extensionista-fincas.json`. Cada delegación es `{ extensionista, fincas: [{ slug, nombre, operador, vereda, municipio, biocultural_zone, estado, ultima_sync_iso, pendientes, alertas }] }`. La forma del registro de finca reusa la convención de `fincaActiveStore` (`slug` / `nombre` / `biocultural_zone`) + el estado de supervisión.

- **Offline-first.** Todo (rol + lista) sale de localStorage (tenant) + un JSON bundleado. Funciona idéntico sin red, como el resto de Chagra.

### Componentes (scaffold cliente)

| Pieza | Archivo | Rol |
|---|---|---|
| Gate de rol | `src/config/extensionistaAccess.js` | `esExtensionista()`, `esExtensionistaActual()`, `featureExtensionistaActivo()`, `EXTENSIONISTA_WHITELIST` |
| Mock delegación | `src/data/extensionista-fincas.json` | fincas de ejemplo por extensionista (NO autorización) |
| Servicio tablero | `src/services/extensionistaService.js` | `getFincasDelegadas()`, `clasificarEstadoFinca()`, `construirTableroExtensionista()` (orden por urgencia + contadores) |
| Pantalla supervisor | `src/components/ExtensionistaScreen.jsx` | panel `#extensionista`: resumen + tarjeta por finca + aviso de frontera MVP |
| Wiring | `src/App.jsx` | ruta `#extensionista` + guard de rol en los efectos de ruta + `case` en el switch |
| Entrada UI | `src/components/ProfileScreen.jsx` | sección "Acompañamiento" (solo se renderiza con rol) que navega vía `chagra:nav` |

### Por qué client-side es aceptable para ESTE MVP

Es **defense-in-depth de UX + scaffold de producto**, no autorización dura — exactamente el mismo encuadre que `glaciarAccess` y que el propio `tenantContext` MVP. La whitelist vive en el bundle y un usuario técnico puede inspeccionarla; eso es conocido y aceptado mientras el panel solo lee datos de ejemplo. El gate real se aplica server-side cuando el módulo toque backend.

## MVP vs Follow-up (backend)

**En el MVP (este ADR, ships ahora, flag off):**
- Detección de rol por whitelist + feature flag.
- Selector / dashboard de fincas delegadas leyendo del mock.
- Estado por finca (al día / con pendientes / sin sync reciente), orden por urgencia, contadores agregados.
- Aviso explícito de "vista previa, no autorización verificada".

**Follow-up backend (NO en este ADR — documentado para ejecutar después):**
- **Delegación real vía UCAN** (ADR-036 sub-i + sub-iv): el dueño de la finca firma una capability `supervise`/`read` (con `redact_pii: true`, TTL) al `did:key` del extensionista. `getFincasDelegadas()` consultaría esas delegaciones verificadas en vez del JSON estático.
- **Módulo Drupal `farm_did_auth`** que valida el challenge UCAN contra `simple_oauth` de farmOS y entrega solo las fincas autorizadas.
- **Datos en vivo por finca** desde farmOS JSON:API (estado real, última sync, pendientes, alertas) con scoping por finca + anonimización de `operator_id` (Ley 1581 / ADR-020) — el extensionista ve pseudónimo, no el `operator_id` plaintext.
- **Revocación** (`cap_revoked` append-only) y **audit log** de accesos del asesor.
- **Detalle de finca** navegable (drill-down read-only) — el MVP solo lista; "ver detalle" queda como próximo paso.

La **forma del modelo de tablero** (`construirTableroExtensionista`) se diseñó para sobrevivir ese cambio de fuente: cuando la data venga de UCAN+farmOS, la UI no se reescribe.

## Articulación con la visión (SENA-FAO / Agrosavia / IPPTA)

El extensionista es la unidad de **escalamiento institucional** de Chagra: un asesor SENA o un técnico Agrosavia/IPPTA acompaña decenas de fincas. ADR-036 lo lista como vector de adopción ("onboarding masivo SENA / universidades campesinas / Agrosavia regional") y como línea de ingreso ("consultoría agronómica: asesores certificados en directorio Guatoc"). Este MVP permite **demostrar el flujo de acompañamiento multi-finca a esos aliados ya**, con datos de ejemplo, sin esperar el stack UCAN — y abre la puerta a co-diseñar la UX del panel con extensionistas reales antes de invertir en el backend criptográfico.

## Consecuencias

**Positivas:**
- Producto demostrable a SENA/Agrosavia/IPPTA sin backend nuevo.
- Cero deuda sobre `tenantContext` (rol ortogonal al scoping).
- Apagado por defecto → riesgo de prod nulo; se enciende por build-env cuando convenga.
- El contrato del servicio sobrevive a la migración a UCAN.

**Negativas / deuda asumida:**
- La whitelist y el mock viven en el bundle público (visible). Aceptable mientras sea vista previa con datos de ejemplo.
- No hay autorización real: NO exponer datos sensibles de fincas reales por esta vía hasta el follow-up backend. El mock no debe poblarse con `operator_id` plaintext ni datos productivos reales.
- Editar accesos requiere commit + deploy (igual que glaciar). Aceptable para el set inicial de extensionistas piloto.

## Alternativas consideradas

1. **Esperar al backend UCAN completo (ADR-036 Fase 1).** Rechazada: bloquea meses la validación de producto del panel supervisor con aliados institucionales.
2. **Extender `tenantContext` para "ver varias fincas".** Rechazada: confunde dos conceptos (mi finca vs fincas ajenas que superviso) y arriesga el scoping de assets existente.
3. **Rol persistido en perfil de farmOS (campo custom) en vez de whitelist.** Rechazada para el MVP: requiere cambios server-side; la whitelist es consistente con el precedente glaciar y suficiente para el set piloto. Migra naturalmente a UCAN en el follow-up.
