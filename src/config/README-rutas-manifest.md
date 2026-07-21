# Manifiesto de rutas — prod.chagra.app

> Archivo: `src/config/rutasProdChagraApp.js`
> Rama base: `rutas-manifest` (desde `origin/dev`)
> Basado en: `INVENTARIO-2D-PROD-CHAGRA-APP.md` (rama `audit/inventario-rutas`)

## Racional

`prod.chagra.app` es un frontend 3D-first LIMPIO con el valle 3D como vista principal. Este manifiesto declara qué rutas y componentes entran (NUCLEO), cuáles se excluyen explícitamente (con motivo documentado) y cuáles quedan pendientes de decisión del operador.

### Include

- **3D**: valle 3D (home), Sierra global, 15 mundos (mundoData.js), 14 criaturas SVG, dioramas autocontenidos (abejas, gallinero, páramo, agua, suelo, compost, fermentos, microfauna, subsuelo), cámara director, artesanía andina, efectos funcionales, catálogo infra, gemelos 2D, aliados, momentos, New Donk.
- **App núcleo**: auth (login/OAuth), dashboard, agente IA, perfil/avatar, onboarding, directorio de especies, gestión de finca (siembra/cosecha/insumos/observación), registro unificado/voz, activos/inventario, tareas, bitácora, clima/agua/suelo, 16 pantallas de cultivo, sanidad, ciclo del cultivo, calendario, semilla/poscosecha/almacenamiento, nutrición, 7 pantallas de animales, biopreparados/fermentos, biodiversidad/asociaciones, restauración, mapa, informes, glaciar, extensionista, casos de estudio, FAQ/ayuda/aprende/curso.

### Exclude (con motivo)

- **Dev tools**: VisualLib (storybook interno), UsageStatsDashboard (telemetría).
- **Temas viejos dashboard**: BiopunkBackground, SceneFinca*, PanelVitalidad, RelojFrailejon, ArbolDeMundos, ManoChagraGlyph — reemplazados por valle 3D como fondo principal.
- **Duplicados**: EntradaCampesina (→ EntradaValle3D), HomeCampesino (→ DashboardLive), MontanaMundos v1 y v3 (→ MontanaMundosCampesino).
- **Prototipos reemplazados**: BotonAnarquia (→ AgentFab), AvatarGame* (→ Espíritu Guardián), MapaAcuarela (→ FarmMap), ClimaAtmosfera (→ ClimaBoletinScreen), DiaEnFinca (→ HoyEnFincaScreen), SaludFinca, PrimerCultivo, Guardianes, HojaVidaMata, DiagnosticoSobreFoto, EvidenciaIlustrada.
- **Funcionalidad nicho**: WorkerDashboard "Javier", AuditoriaInventario.

### Pendiente decisión (Miguel)

Onboarding (Profile vs Siembra mockup), juegos (MiFincaViva, Defensores, Milpa, Metal Slug), red humana/mercado, voz experimental (IrisVoz, ConversacionVoz), almanaque lunar, CSS base (heredar biopunk o reconstruir), subset de criaturas inicial.

## Uso

```js
import { NUCLEO_3D, NUCLEO_APP, EXCLUIDO, PENDIENTE_DECISION, estaEnNucleo, getMapaNucleo } from './config/rutasProdChagraApp';
```

El shell de ruteo consumirá `getMapaNucleo()` para montar solo las rutas del núcleo. Las rutas excluidas se ignoran. Las pendientes quedan comentadas/inactivas hasta decisión.

## No se borra nada

Este manifiesto es solo una capa de configuración. Ningún archivo del repo se elimina. Las rutas excluidas simplemente no se montan en el shell de prod; el código fuente sigue intacto.
