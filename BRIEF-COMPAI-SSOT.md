Implementar el COMPORTAMIENTO del compai según el SSOT DEFINITIVO. NO inventar — leé y seguí EXACTO:
`/home/kortux/.claude/projects/-home-kortux-Workspace/memory/feedback_compai_comportamiento_ssot_definitivo.md`

Resumen del contrato (transversal a los 7 compais, 2D y 3D = MISMO patrón):
1. VISIBLE 100%, nunca desaparece por interacción/offline (solo en el místico).
2. UNO solo en pantalla, al máximo de actuación.
3. GUARDA la posición (vuelve donde lo dejó el usuario).
4. NO da vueltas → aparece/desaparece MÍSTICAMENTE (teletransporte fade). Reemplazar TODO scaleX/flip/giro en JaguarBillboard, ClaroDelJaguar, OsoBastonCompaiEscena, y cualquier escena/overlay.
5. 70% del tiempo SE DESPLAZA por la pantalla actual (content-aware) según su especie (jaguar camina, guacamaya vuela…), místico/vivo.
6. Ícono notificación solo al clic/toque.
7. Presencia hover/touch → estado natural.
8. Hereda TODOS los comportamientos de Angelita EXCEPTO la vuelta: entrada/salida místico, guía (vuela a un elemento real), burbuja, estados, hablar/lip-sync, caminar. Componentes en src/visual/agente/ (Angelita*, useAngelitaPresencia, AngelitaGuia, BurbujaAngelita).

CLAVE ARQUITECTÓNICA: el comportamiento debe vivir en un motor COMPARTIDO (CompaiOverlay + un hook común tipo useComportamientoCompai) que los 7 hereden — NO cablear 7 veces. Cada compai conserva su ARTE aprobado (jaguar=Trazado, zarigüeya=Gemini raster, oso=musculoso, etc.); NUNCA montar arte DESCARTADO (la JaguarLaminaViva vieja "fea" debe salir del valle — el operador ve DOS jaguares en chagra-dev, dejá SOLO el trazado).

Superficies (integral): avatar 2D FAB/chat/header, CompaiOverlay (roam), selector, valle 3D, kart.
Repo chagra, rama feat/compai-comportamiento-ssot. Tests verdes, build, lint. NO merge. La GPU-verificación la hago YO (vos no alcanzás el display). Reportá qué tocaste y por compai/superficie qué quedó.

ADICIÓN (operador): TODOS hablan/escuchan/ven/caminan-o-vuelan según especie. Angelita = referencia TOTAL; los demás adoptan la MAYOR cantidad de comportamientos, no el mínimo.
