# Inventario de cobertura de escucha 2D + 3D

## Criterio

El gesto largo del compai usa el trigger desacoplado `activarEscucha({ fuente: 'hold' })` y el umbral vigente de 1600 ms. El kart queda fuera. Los componentes bajo `src/mockups/*` no son superficies de aceptación independientes.

## Superficies 2D ya cubiertas

| Superficie | Ubicación | Estado |
| --- | --- | --- |
| Shell PWA 2D | `src/App.jsx` monta un `AgentFab` para cada `currentView` no vacío | Ya cableado en `src/components/AgentFab.jsx` |
| Shell productivo | `src/prodApp/ProdChagraApp.jsx` monta `AgentFab` en login y vistas autenticadas | Ya cableado en `src/components/AgentFab.jsx` |
| FAB dedicado de escucha | `src/components/escucha/EscuchaFab.jsx` | Ya llama `activarEscucha({ fuente: 'tap' })` |

No se modificaron `EscuchaOverlay.jsx` ni `escuchaService.js`.

## Superficies 3D cableadas

| Superficie | Ubicación | Implementación |
| --- | --- | --- |
| Mundos 3D del framework | `src/visual/mundo3d/escenas/EscenaBase3D.jsx` | Host Canvas común para `.mundo-abeja` y escenas de compai registradas |
| Valle 3D del framework | `src/visual/mundo3d/escenas/EscenaValle.jsx` | Host DOM del adaptador, detecta `.valle-abeja` sin editar el mockup subyacente |
| Valle en calma | `src/visual/mundo3d/ValleEnCalma.jsx` | Host común para el espejo 2D y el diorama 3D |
| Ventana 3D del valle | `src/components/VentanaValle3D.jsx` | Host de la viñeta `.vv-abeja` |

El hook compartido solo acepta las clases de superficie conocidas (`mundo-abeja`, `valle-abeja`, `vcalma-abeja`, `vv-abeja`), por lo que un gesto sobre el resto del canvas no abre escucha.

## Fuera de alcance

- `public/valle/juegos/chagra-kart`: excluido explícitamente.
- `src/mockups/*`: no se usa como evidencia de cobertura ni se modifica en este cambio.
- `EscuchaOverlay` y `escuchaService`: infraestructura existente, sin rediseño ni cambio de contrato.
