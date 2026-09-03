# Gate login abejita Fase 2, cierre de gaps

Fecha: 2026-08-30 20:34 COT  
Rama: `feat/login-abejita-fase2-20260830`  
Base de la tarea: `ab5181030`

## Resultado

Se cerraron los dos gaps solicitados:

1. La misma entidad React de Angelita conserva el portal y pasa a estado
   `asentada` al terminar la animación. Su puesto final comparte el ancla
   natural del FAB: `right: 14px`, `bottom: max(90px, safe-area + 90px)`.
2. La milpa del círculo tiene escala explícita `1.3` y tres frutos vectoriales
   visibles, marcados `maiz`, `frijol` y `calabaza`. No se agregó ningún asset
   raster ni se inventó un arte externo para Fable.

## Gate headed real

Guard previo: `VIVO :0 /tmp/xauth_ICXMso`  
Chromium ajeno antes de capturar: `0`  
Viewport: `1280 × 720`  
Capturas: `./_gate/login-abejita-fase2-20260830/`

```json
{
  "angelita": "asentada",
  "bbox": { "x": 1167, "y": 546, "width": 84, "height": 84 },
  "bottomGap": 90,
  "rightGapFromLayoutViewport": 14,
  "crm": "activa",
  "triada": true,
  "frutosVisibles": 3,
  "fab": 0,
  "errors": [],
  "maquinaSola": true
}
```

Las tres cajas de fruto tuvieron opacidad `1` y dimensiones no vacías. La
captura viewport fue inspeccionada visualmente: Angelita reposa abajo a la
derecha y el orbe muestra una milpa ampliada con tres acentos frutales claros.

## Verificaciones adicionales

- `npx vitest run src/components/__tests__/LoginScreen.test.jsx`: 7/7.
- `npx vitest run src/components/__tests__/LoginScreen.test.jsx src/visual/creatures/__tests__/AbejaAngelita.render.test.jsx`: 22/22.
- `npx eslint src/components/LoginScreen.jsx src/visual/agente/AngelitaVueloLogin.jsx src/visual/effects/CirculoRotoMilpa.jsx`: OK.
- `npx vite build`: OK.

## No verificado

- No se midió FPS: el login es una superficie 2D y no hay una métrica GPU
  pertinente para este cambio.
- No aplica un barrido de semillas: la animación y el SVG son deterministas,
  sin semilla procedural.
- No se envió un formulario con credenciales reales; el gate cubre el estado
  visual de la puerta de login, no la autenticación contra el servidor.
- La captura full-page no se usó para juzgar la coordenada del aterrizaje,
  porque los elementos `position: fixed` se representan respecto al viewport.
