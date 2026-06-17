# ENTREGA PILOTOS — Status Track

**Fecha:** 2026-06-16
**Version:** 1.0.52
**App:** PWA en `chagra.guatoc.co`

---

## Estado por piloto

### Javier (cerdos, multifinca, carbono)

| Item | Status |
|------|--------|
| Perfil asignado | `extensionista` |
| Modulos visibles en home | Cerdos (seguimiento completo), Carbono (captura + proyeccion), Multifinca (selector) |
| Lo que ve en home | Tarjetas de cerdos con ciclo reproductivo, carbono acumulado, selector de finca activa |
| Screenshot ref | `SeguimientoProcesoScreen` (cerdos), `GlaciarReporteScreen` (carbono) |
| Pendiente | E2E spec completo (PR #1621 en draft). Validacion de flujo cerdos → carbono → reporte en simulacro de campo. |

### Carlos Rivera (cerdos, finca basica)

| Item | Status |
|------|--------|
| Perfil asignado | `campesino` (cerdos + cultivos basicos) |
| Modulos visibles en home | Cerdos (vista simplificada), Plantas (registro basico), Clima, Calendario siembra |
| Lo que ve en home | Cards de cerdos en formato campesino (sin jerga tecnica), calendario de siembra por piso termico, clima IDEAM |
| Screenshot ref | `SeguimientoProcesoScreen` (cerdos simplificado), `DashboardLive` con tiles basicos |
| Pendiente | Validar que el modo tecnico este OFF por defecto. Glosario regional Cauca aplicado a este perfil. |

### Ana Maria (biodiversidad, restauracion, carbono)

| Item | Status |
|------|--------|
| Perfil asignado | `academico` (biodiversidad + carbono) |
| Modulos visibles en home | Biodiversidad (catalogo completo), Carbono (follow-up + proyeccion), Restauracion |
| Lo que ve en home | Catalogo de 600 especies, graficos de captura de carbono, timeline de restauracion |
| Screenshot ref | `CatalogueScreen`, `GlaciarReporteScreen`, `CaseStudyScreen` |
| Pendiente | Catalogo de especies pendiente de completar a 450 meta (actual ~176 species docs). |

### Hollman (cerdos, clima, calendario)

| Item | Status |
|------|--------|
| Perfil asignado | `campesino` (cerdos + clima) |
| Modulos visibles en home | Cerdos, Clima IDEAM, Calendario siembra, Alertas clima |
| Lo que ve en home | Card de cerdos, clima actual + pronostico 3 dias, calendario de siembra, alertas de helada |
| Screenshot ref | `DashboardLive`, `NotificationsBell` con alertas clima |
| Pendiente | Validar alertas de clima critico (helada, sequia) en campo. |

### David (operador, vision completa)

| Item | Status |
|------|--------|
| Perfil asignado | Operador (ve TODO — sin gating) |
| Modulos visibles en home | TODOS: cerdos, carbono, biodiversidad, clima, calendario, plantas, insumos, bitacora, plagas, informes, restauracion, multifinca |
| Lo que ve en home | Dashboard completo con 8+ cards, switch de perfil rapido, todas las rutas sin restriccion |
| Screenshot ref | `DashboardLive` modo operador, `SwitchPerfil` |
| Pendiente | Fix del scroll infinito en Home (PR #1624). Evaluar UX de 8+ cards visibles simultaneamente. |

---

## Estado global de entrega

| Metrica | Valor |
|---------|-------|
| Perfiles funcionales | 5 (javier, carlos, ana, hollman, david) |
| Modulos activos | 8 (cerdos, carbono, clima, calendario, plantas, biodiversidad, restauracion, multifinca) |
| Switch de perfil | Funcional (PR #1623) |
| Tests | 5957 pass, 15 skip |
| Build | Verde (dist 5.2MB, 137 chunks) |
| PRs draft pendientes | 15+ (ver `gh pr list`) |

---

## Prioridad de cierre por piloto

1. **David** (operador) — Fix scroll infinito Home → PR #1624 merge. Prioridad maxima: bloquea la demo.
2. **Javier** — E2E spec cerdos + carbono (PR #1621). Validacion completa del flujo.
3. **Carlos Rivera** — Verificar modo tecnico OFF + glosario Cauca.
4. **Ana Maria** — Acelerar species docs (176/450). Validar catalogo en mobile.
5. **Hollman** — Validar alertas clima en campo (helada simulada en zona paramo).
