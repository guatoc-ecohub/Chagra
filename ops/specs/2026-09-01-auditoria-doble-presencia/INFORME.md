# Auditoría de doble presencia, 2D y 3D

Fecha: 2026-09-01  
Alcance: `src/components/`, `src/mockups/`, `src/visual/` y composición del router en `src/App.jsx`.  
Prioridad solicitada: login primero.

## Resultado ejecutivo

La auditoría estática encuentra **5 superficies con doble presencia estable** del
agente cuando la identidad por defecto es Angelita:

1. login;
2. dashboard legacy, flag `VITE_FINCA_VIVA_HOME_PERFIL` apagada;
3. pantalla del agente;
4. valle 3D de primera clase, ruta `valle3d`;
5. `finca_odyssey`.

También quedan registrados:

- el overlay de primera bienvenida del dashboard, que se monta sobre otra
  Angelita;
- el solapamiento transitorio del cruce 2D→3D en `valle3d`,
  `mockup_entrada_3d` y la familia de mundos basada en `Mundo`;
- dos vitrinas que repiten Angelita por diseño: `mockup_angelita_viva` y
  `mockup_mundo_abejas_3d`.

El router tiene **201 casos únicos**, de los cuales **87 son rutas `mockup_*`**.
La lista de fixes priorizada está al final.

## Criterio de conteo

Se contó cada instancia montada de la identidad viva del agente. `ChagraAgentAvatar`
cuenta como Angelita porque su fallback actual es `ChagraAgentAvatarAngelita`
(`src/components/ChagraAgentAvatar.jsx:26-30`). Las cifras de abajo describen el
default Angelita; si el operador cambia a maíz, un wrapper puede dejar de ser la
misma criatura, pero sigue existiendo más de una superficie del agente.

No se contaron plantas, iconos, productores, fauna incidental ni estados
mutuamente excluyentes como duplicados. Las galerías y los enjambres se dejan
señalados aparte porque repiten el componente intencionalmente.

## Hallazgos confirmados

| Prioridad | Pantalla / ruta | Ser y conteo | Dónde se monta | Fix propuesto |
|---|---|---:|---|---|
| P0 | Login | **Angelita ×2** | Primera instancia en `src/components/LoginScreen.jsx:199`. Segunda ruta: `src/components/LoginScreen.jsx:353` monta `WelcomeStatsHero`; su chip está en `src/components/WelcomeStatsHero.jsx:455` y termina en `src/components/WelcomeStatsHero.jsx:276`. | Dejar una sola identidad en la entrada. Recomendación: conservar la Angelita protagonista de `LoginScreen.jsx:199` y convertir el chip del hero pre-login en icono estático, texto o control sin criatura. |
| P1 | Dashboard legacy, flag F2 apagada | **Angelita ×3** | Escena principal en `src/components/dashboard/AgentHero.jsx:1706`; botón superior en `src/components/dashboard/AgentHero.jsx:1739`; botón de envío en `src/components/dashboard/AgentHero.jsx:2106`. `DashboardLive` monta el hero en `src/components/dashboard/DashboardLive.jsx:754`. | Escoger una única superficie canónica. Quitar la criatura del botón superior y del envío, o sustituir una de ellas por un icono neutral. La escena puede conservar el acompañante. |
| P1 | Pantalla del agente, estado vacío | **Angelita ×3** | Avatar persistente del encabezado en `src/components/AgentScreen/AgentScreen.jsx:3596`; estado vacío grande en `src/components/AgentScreen/ChatHistory.jsx:131`; compositor en `src/components/AgentScreen/AgentScreen.jsx:4098`. | Mantener un solo avatar persistente, preferiblemente encabezado o estado vacío. El compositor debe usar un icono de enviar. En conversación, cada respuesta suma otra instancia en `src/components/AgentScreen/ChatBubble.jsx:478`; por tanto el conteo pasa a `2 + N` avatares de respuestas. El indicador de pensamiento transitorio está en `src/components/AgentScreen/ChatHistory.jsx:282`. |
| P1 | Valle 3D, ruta `valle3d` | **Angelita ×2 estable; ×3 durante el cruce** | La ruta monta `EntradaValle3D` en `src/App.jsx:3521-3538`. La escena/fallback tiene una Angelita en `src/mockups/valle/Valle3D.jsx:1755` o, sin WebGL, en `src/mockups/valle/Valle2DFallback.jsx:135`. El FAB global siempre entra para esta vista por la condición de `src/App.jsx:3924` y pinta otra en `src/components/AgentFab.jsx:174`. El cruce agrega `AbejaTransicion` en `src/mockups/EntradaValle3D.jsx:565`. | Excluir `valle3d` del `AgentFab` y dejar que el valle sea dueño de su acompañante. Revisar el handoff para que la transición no agregue una tercera presencia visible. |
| P1 | `finca_odyssey` | **Angelita ×2 estable** | El router monta la misma implementación en `src/App.jsx:2666-2673`. La vista propia monta Angelita en `src/mockups/JuegoMiFincaOdyssey.jsx:1304` en la portada y en `src/mockups/JuegoMiFincaOdyssey.jsx:791` en el plano 2D. La condición global de `src/App.jsx:3924` deja activo el `AgentFab`, que la monta en `src/components/AgentFab.jsx:174`. | Excluir `finca_odyssey` del `AgentFab`, o retirar la instancia propia del route. La ruta ya tiene una guía contextual, así que debe quedar una sola dueña de la presencia. |

### Variantes del dashboard

Con F2 encendida, `src/components/dashboard/DashboardLive.jsx:716` monta
`FincaVivaHero` en lugar de `AgentHero`; esa variante tiene una sola Angelita en
`src/components/dashboard/FincaVivaHero.jsx:648`. Por sí sola no es un hallazgo
estable.

Hay, sin embargo, un hallazgo condicional de primer uso: `showBienvenida` monta
`BienvenidaFinca` sobre cualquiera de las dos portadas en
`src/components/dashboard/DashboardLive.jsx:678`. El overlay trae otra Angelita
en `src/components/BienvenidaFinca.jsx:263`.

- dashboard legacy + bienvenida: **Angelita ×4** montadas;
- F2 + bienvenida: **Angelita ×2** montadas.

Aunque el overlay tapa buena parte de la portada, ambas instancias existen en el
árbol y pueden hacerse visibles durante el cambio o la animación. El fix es
ocultar o desmontar la presencia del hero subyacente mientras vive la bienvenida,
o convertir la criatura de bienvenida en una señal no duplicada.

## Repeticiones transitorias 2D→3D

Estas no son presencias estables, pero sí son dos instancias del mismo personaje
durante el handoff. Deben quedar explícitas en el siguiente gate visual:

- `mockup_entrada_3d`: una Angelita en el valle/fallback y otra en
  `src/mockups/EntradaValle3D.jsx:565` durante el cruce.
- Familia `Mundo`: las rutas `mockup_mundo3d_agua`, `mockup_mundo3d_suelo`,
  `mockup_mundo3d_animales`, `mockup_mundo3d_milpa`,
  `mockup_mundo3d_bosque`, `mockup_mundo3d_clima`,
  `mockup_mundo3d_sanidad`, `mockup_mundo3d_mercado`,
  `mockup_mundo3d_cafe` y `mockup_mundo3d_semillero` montan la criatura de la
  escena desde `src/visual/mundo3d/escenas/EscenaBase3D.jsx:218` y agregan
  `AbejaTransicion` desde `src/visual/mundo3d/Mundo.jsx:232`.
- El contrato de `src/mockups/valle/AcompananteMundo.jsx:20-32` no agrega una
  tercera criatura: solo pinta burbuja y controles.
- `mockup_vitrina_maestra` también crea un clon en
  `src/mockups/VitrinaMaestraMundos.jsx:1322`, pero el avatar original queda con
  `opacity: 0` durante el viaje por `src/mockups/VitrinaMaestraMundos.jsx:865-866`.
  Es una duplicación de DOM controlada, no una doble presencia visual confirmada.

Fix común propuesto: hacer el handoff mediante una única instancia que cambie de
contenedor, o asegurar explícitamente que la instancia saliente queda desmontada
antes de montar la entrante. Si se conserva el efecto, debe quedar como excepción
visual documentada y cubierta por captura de entrada, cruce y llegada.

## Vitrinas repetidas intencionalmente

| Pantalla | Conteo | Evidencia | Dictamen |
|---|---:|---|---|
| `mockup_angelita_viva` | 1 en `solo=entrada`; 11 en `solo=estados`; **12 en la vista completa** | Entrada en `src/mockups/AngelitaViva.jsx:109`; diez estados más el bonus en `src/mockups/AngelitaViva.jsx:164` y `src/mockups/AngelitaViva.jsx:186`. | Repetición intencional de una galería. Si la regla final es “una sola Angelita por pantalla”, dejar un solo estado grande y convertir el resto en miniaturas sin cuerpo vivo. |
| `mockup_mundo_abejas_3d` | **4 / 7 / 10** según tier bajo / medio / alto | `src/mockups/MundoAbejas3D.jsx:191-209`; cada miembro monta `AbejaAngelita` en `src/mockups/MundoAbejas3D.jsx:184`. | Es un enjambre intencional, no el mismo individuo duplicado. Si se exige una sola identidad Angelita, usar una criatura de abeja de enjambre distinta y reservar Angelita para la guía. |

## Pantallas revisadas sin doble presencia estable

- `mockup_ventana_valle`: una criatura en el espejo 2D o una en la escena 3D,
  nunca ambas porque son fallback y contenido alternativo en
  `src/components/VentanaValle3D.jsx:89` y
  `src/components/VentanaValle3DEscena.jsx:133`.
- `mockup_valle_noche_3d`: una Angelita dormida en
  `src/mockups/ValleNoche3D.jsx:437`.
- `mockup_dia_en_finca`: una guía condicional en
  `src/mockups/DiaEnFinca.jsx:460`.
- `mockup_mercado`: un solo producto de miel muestra Angelita en
  `src/mockups/Mercado.jsx:198`; las demás tarjetas no la duplican.
- `mockup_new_donk`, `mockup_murales_new_donk`, `mockup_metal_slug_campo`,
  `mockup_cara_prod`, `mockup_entrada_campesina` y `mockup_vitrina_3d`: una
  instancia propia, sin `AgentFab` global por ser rutas `mockup_*`.
- `onboarding-perfil`: las instancias de `OnboardingCondensado` en
  `src/components/OnboardingCondensado.jsx:553` y `:937` pertenecen a pasos
  mutuamente excluyentes, por lo que el conteo por estado es 1.
- La familia de mundos usa una sola Angelita en la escena; el acompañante no
  vuelve a pintar el cuerpo. El enjambre de `mockup_mundo_abejas_3d` es la
  excepción intencional descrita arriba.

## Evidencia GPU / headed

**NO PUDE VERIFICAR captura headed.** Este checkout no contiene
`./_gate/herramientas/gate-x-estado.sh`, `gate-pantalla.mjs` ni
`medir-ab-fps.mjs`; por lo tanto no era posible cumplir la sonda GPU exigida sin
inventar evidencia. En la comprobación realizada, `pgrep -c chromium` devolvió
`0`. No se afirma aquí que una captura haya confirmado o descartado visualmente
ningún hallazgo.

La medición que debe citarse en la siguiente pasada es una captura headed por
pantalla, con el gate activo, después de descartar las primeras capturas de
recompilación. Debe cubrir login, dashboard legacy/F2, agente, `valle3d`,
`finca_odyssey` y los handoffs 2D→3D.

## Lista de fixes priorizada

1. **P0, login:** retirar la instancia secundaria de `WelcomeStatsHero` en modo
   pre-login o reemplazarla por un elemento no vivo.
2. **P1, dashboard legacy:** dejar una sola Angelita entre escena, botón de
   encabezado y botón de envío.
3. **P1, agente:** eliminar la repetición entre encabezado, estado vacío,
   compositor y bylines de respuesta; definir una sola regla de identidad.
4. **P1, rutas de primera clase:** excluir `valle3d` y `finca_odyssey` del
   `AgentFab` global cuando la vista ya posee su propio acompañante.
5. **P1, bienvenida:** coordinar el overlay para que no monte una segunda
   presencia sobre el dashboard.
6. **P2, transiciones:** decidir si el personaje de cruce es una excepción
   narrativa. Si no lo es, convertir el cruce en handoff de instancia única.
7. **P2, vitrinas:** declarar explícitamente la excepción de galería/enjambre o
   separar la criatura guía de las criaturas ilustrativas.
