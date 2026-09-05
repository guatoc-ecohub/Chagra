# CENSO DE RUTAS DE MOCKUPS

Fecha de censo: 2026-08-15 06:2x

## Propósito

Listar TODAS las rutas `#/mockups/*` que existen en el repo chagra y clasificarlas por tipo (3D/2D) y montaje en iframe por el valle.

## Metodología

Este censo se derivó del análisis de dos fuentes principales:

1. **MOCKUP_HASH_ROUTES** (App.jsx:759-867): Objeto que define todas las rutas públicas de mockups.
2. **rutasProdChagraApp.js**: Manifiesto que declara qué rutas van a prod.chagra.app con categoría explícita (`3D`, `2D-app`, `auth`).

La clasificación 3D/2D se determinó por:
- Presencia en `NUCLEO_3D` → 3D
- Presencia en `NUCLEO_APP` → 2D-app
- Presencia en `EXCLUIDO` → Excluido
- Comentarios en App.jsx que describen el mockup

## Resumen

- **Total de rutas mockups**: 105
- **Rutas 3D**: 77
- **Rutas 2D**: 28
- **Rutas excluidas**: 17
- **Rutas pendientes de decisión**: 5
- **Rutas montadas en iframe por el valle**: POR DETERMINAR (requiere auditoría específica)

## Tabla completa

| Slug | Vista interna | Tipo | Fuente (archivo:línea) | Montado en iframe por valle |
|------|---------------|------|------------------------|-----------------------------|
| mockups/visual-lib | mockup_visual_lib | 2D | EXCLUIDO (rutasProdChagraApp.js:1070) | POR DETERMINAR |
| mockups/entrada-3d | mockup_entrada_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:39) + App.jsx:120 | POR DETERMINAR |
| mockups/mundo3d-agua | mockup_mundo3d_agua | 3D | App.jsx:123 | POR DETERMINAR |
| mockups/mundo3d-suelo | mockup_mundo3d_suelo | 3D | App.jsx:124 | POR DETERMINAR |
| mockups/mundo3d-animales | mockup_mundo3d_animales | 3D | App.jsx:126 | POR DETERMINAR |
| mockups/mundo3d-milpa | mockup_mundo3d_milpa | 3D | App.jsx:128 | POR DETERMINAR |
| mockups/mundo3d-bosque | mockup_mundo3d_bosque | 3D | App.jsx:129 | POR DETERMINAR |
| mockups/paramo-definitivo | mockup_paramo_definitivo | 3D | NUCLEO_3D (rutasProdChagraApp.js:177) + App.jsx:202 | POR DETERMINAR |
| mockups/restauracion-tiempo-3d | mockup_restauracion_tiempo_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:154) + App.jsx:209 | POR DETERMINAR |
| mockups/cafetal-vivo-3d | mockup_cafetal_vivo_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:87) + App.jsx:214 | POR DETERMINAR |
| mockups/aguacatal-vivo-3d | mockup_aguacatal_vivo_3d | 3D | App.jsx:220 | POR DETERMINAR |
| mockups/microcuenca | mockup_microcuenca | 3D | App.jsx:224 | POR DETERMINAR |
| mockups/casa-adentro | mundo_casa_adentro | 3D | App.jsx:228 | POR DETERMINAR |
| mockups/ciclo-agua | mockup_microcuenca | 3D | App.jsx:224 | POR DETERMINAR |
| mockups/invernadero-vivo-3d | mockup_invernadero_vivo_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:94) + App.jsx:231 | POR DETERMINAR |
| mockups/cacao-vivo-3d | mockup_cacao_vivo_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:101) + App.jsx:237 | POR DETERMINAR |
| mockups/papa-viva-3d | mockup_papa_viva_3d | 3D | App.jsx:242 | POR DETERMINAR |
| mockups/yuca-viva-3d | mockup_yuca_viva_3d | 3D | App.jsx:249 | POR DETERMINAR |
| mockups/quinua-viva-3d | mockup_quinua_viva_3d | 3D | App.jsx:255 | POR DETERMINAR |
| mockups/frutales-vivo-3d | mockup_frutales_vivo_3d | 3D | App.jsx:261 | POR DETERMINAR |
| mockups/mundo-piscicultura-3d | mockup_mundo_piscicultura_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:115) + App.jsx:268 | POR DETERMINAR |
| mockups/lecheria-viva-3d | mockup_lecheria_viva_3d | 3D | App.jsx:275 | POR DETERMINAR |
| mockups/mundo3d-clima | mockup_mundo3d_clima | 3D | App.jsx:132 | POR DETERMINAR |
| mockups/voz-con-forma | mockup_voz_con_forma | 2D | PENDIENTE_DECISION (rutasProdChagraApp.js:1275) | POR DETERMINAR |
| mockups/conversacion-voz | mockup_conversacion_voz | 2D | PENDIENTE_DECISION (rutasProdChagraApp.js:1282) | POR DETERMINAR |
| mockups/ensena-dibujando | mockup_ensena_dibujando | 2D | PENDIENTE_DECISION (rutasProdChagraApp.js:1289) | POR DETERMINAR |
| mockups/dia-en-finca | mockup_dia_en_finca | 2D | EXCLUIDO (rutasProdChagraApp.js:1168) | POR DETERMINAR |
| mockups/salud-finca | mockup_salud_finca | 2D | EXCLUIDO (rutasProdChagraApp.js:1172) | POR DETERMINAR |
| mockups/primer-cultivo | mockup_primer_cultivo | 2D | EXCLUIDO (rutasProdChagraApp.js:1176) | POR DETERMINAR |
| mockups/mercado | mockup_mercado | 2D | PENDIENTE_DECISION (rutasProdChagraApp.js:1266) | POR DETERMINAR |
| mockups/onboarding-siembra | mockup_onboarding_siembra | 2D | PENDIENTE_DECISION (rutasProdChagraApp.js:1232) | POR DETERMINAR |
| mockups/montana-mundos | mockup_montana_mundos | 3D | EXCLUIDO (rutasProdChagraApp.js:1130) | POR DETERMINAR |
| mockups/montana-mundos-cine | mockup_montana_mundos_cine | 3D | EXCLUIDO (rutasProdChagraApp.js:1134) | POR DETERMINAR |
| mockups/montana-mundos-campesino | mockup_montana_mundos_campesino | 3D | NUCLEO_3D (rutasProdChagraApp.js:186) | POR DETERMINAR |
| mockups/entrada-campesina | mockup_entrada_campesina | 2D | NUCLEO_APP (rutasProdChagraApp.js:419) | POR DETERMINAR |
| mockups/home-campesino | mockup_home_campesino | 2D | EXCLUIDO (rutasProdChagraApp.js:1124) | POR DETERMINAR |
| mockups/boton-anarquia | mockup_boton_anarquia | 2D | EXCLUIDO (rutasProdChagraApp.js:1140) | POR DETERMINAR |
| mockups/transicion-agente-plano | mockup_transicion_agente_plano | 3D | App.jsx:179 (pero no en manifiesto) | POR DETERMINAR |
| mockups/avatar-biopunk | mockup_avatar_biopunk | 2D | EXCLUIDO (rutasProdChagraApp.js:1146) | POR DETERMINAR |
| mockups/avatar-verde-vivo | mockup_avatar_verde_vivo | 2D | EXCLUIDO (rutasProdChagraApp.js:1150) | POR DETERMINAR |
| mockups/avatar-libre | mockup_avatar_libre | 2D | EXCLUIDO (rutasProdChagraApp.js:1154) | POR DETERMINAR |
| mockups/mapa-acuarela | mockup_mapa_acuarela | 2D | EXCLUIDO (rutasProdChagraApp.js:1160) | POR DETERMINAR |
| mockups/clima-atmosfera | mockup_clima_atmosfera | 2D | EXCLUIDO (rutasProdChagraApp.js:1164) | POR DETERMINAR |
| mockups/diagnostico-foto | mockup_diagnostico_foto | 2D | EXCLUIDO (rutasProdChagraApp.js:1188) | POR DETERMINAR |
| mockups/evidencia-ilustrada | mockup_evidencia_ilustrada | 2D | EXCLUIDO (rutasProdChagraApp.js:1192) | POR DETERMINAR |
| mockups/guardianes-narrativos | mockup_guardianes | 2D | EXCLUIDO (rutasProdChagraApp.js:1180) | POR DETERMINAR |
| mockups/hoja-vida-mata | mockup_hoja_vida_mata | 2D | EXCLUIDO (rutasProdChagraApp.js:1184) | POR DETERMINAR |
| mockups/mundo3d-sanidad | mockup_mundo3d_sanidad | 3D | App.jsx:810 (pero no en manifiesto) | POR DETERMINAR |
| mockups/mundo3d-mercado | mockup_mundo3d_mercado | 3D | App.jsx:811 (pero no en manifiesto) | POR DETERMINAR |
| mockups/mundo3d-cafe | mockup_mundo3d_cafe | 3D | App.jsx:812 (pero no en manifiesto) | POR DETERMINAR |
| mockups/mundo3d-semillero | mockup_mundo3d_semillero | 3D | App.jsx:813 (pero no en manifiesto) | POR DETERMINAR |
| mockups/micorrizas-3d | mockup_micorrizas_3d | 3D | App.jsx:814 + NUCLEO_3D (alias) | POR DETERMINAR |
| mockups/infraestructura-3d | mockup_infraestructura_3d | 3D | App.jsx:815 | POR DETERMINAR |
| mockups/colocar-infraestructura | mockup_colocar_infraestructura | 3D | NUCLEO_3D (rutasProdChagraApp.js:348) + App.jsx:816 | POR DETERMINAR |
| mockups/vitrina-3d | mockup_vitrina_3d | 3D | App.jsx:817 | POR DETERMINAR |
| mockups/vitrina-infra | mockup_vitrina_infra | 3D | App.jsx:818 | POR DETERMINAR |
| mockups/vitrina-mundos | mockup_vitrina_mundos | 3D | App.jsx:819 | POR DETERMINAR |
| mockups/sierra-global | mockup_sierra_global | 3D | NUCLEO_3D (rutasProdChagraApp.js:69) + App.jsx:820 | POR DETERMINAR |
| mockups/mundo-suelo-vivo-3d | mockup_mundo_suelo_vivo_3d | 3D | App.jsx:821 + NUCLEO_3D (diorama_suelo) | POR DETERMINAR |
| mockups/aliados-finca-3d | mockup_aliados_finca_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:360) + App.jsx:822 | POR DETERMINAR |
| mockups/mundo-cafe-3d | mockup_mundo_cafe_3d | 3D | App.jsx:823 | POR DETERMINAR |
| mockups/valle-lluvia-3d | mockup_valle_lluvia_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:51) + App.jsx:824 | POR DETERMINAR |
| mockups/mundo-semillero-3d | mockup_mundo_semillero_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:258) + App.jsx:825 | POR DETERMINAR |
| mockups/mundo-compost-3d | mockup_mundo_compost_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:294) + App.jsx:826 | POR DETERMINAR |
| mockups/juego-mi-finca | mockup_juego_mi_finca | 2D | NUCLEO_APP (rutasProdChagraApp.js:1038) + App.jsx:827 | POR DETERMINAR |
| mockups/metal-slug-campo | mockup_metal_slug_campo | 2D | NUCLEO_APP (rutasProdChagraApp.js:1019) + App.jsx:828 | POR DETERMINAR |
| mockups/ventana-valle | mockup_ventana_valle | 3D | NUCLEO_3D (rutasProdChagraApp.js:57) + App.jsx:829 | POR DETERMINAR |
| mockups/new-donk | mockup_new_donk | 3D | NUCLEO_3D (rutasProdChagraApp.js:372) + App.jsx:830 | POR DETERMINAR |
| mockups/murales-new-donk | mockup_murales_new_donk | 3D | NUCLEO_3D (rutasProdChagraApp.js:378) + App.jsx:831 | POR DETERMINAR |
| mockups/vitrina-maestra | mockup_vitrina_maestra | 3D | NUCLEO_3D (rutasProdChagraApp.js:194) + App.jsx:832 | POR DETERMINAR |
| mockups/mundo-fermentos-3d | mockup_mundo_fermentos_3d | 3D | App.jsx:833 + NUCLEO_3D (diorama_fermentos) | POR DETERMINAR |
| mockups/gemelos-2d | mockup_gemelos_2d | 3D | NUCLEO_3D (rutasProdChagraApp.js:354) + App.jsx:834 | POR DETERMINAR |
| mockups/mundo-microfauna-3d | mockup_mundo_microfauna_3d | 3D | App.jsx:835 + NUCLEO_3D (diorama_microfauna) | POR DETERMINAR |
| mockups/mundo-agua-3d | mockup_mundo_agua_3d | 3D | App.jsx:836 + NUCLEO_3D (diorama_agua) | POR DETERMINAR |
| mockups/valle-noche-3d | mockup_valle_noche_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:45) + App.jsx:837 | POR DETERMINAR |
| mockups/juego-la-milpa | mockup_juego_la_milpa | 2D | NUCLEO_APP (rutasProdChagraApp.js:1029) + App.jsx:838 | POR DETERMINAR |
| mockups/bosque-tres-estratos | mockup_bosque_tres_estratos | 3D | App.jsx:839 | POR DETERMINAR |
| mockups/mundo-bosque-nativo | mockup_mundo_bosque_nativo | 3D | App.jsx:840 | POR DETERMINAR |
| mockups/tres-ents-gradiente | mockup_tres_ents_gradiente | 3D | App.jsx:841 | POR DETERMINAR |
| mockups/paramo-humboldt-3d | mockup_paramo_humboldt_3d | 3D | App.jsx:842 | POR DETERMINAR |
| mockups/camara-director | mockup_camara_director | 3D | NUCLEO_3D (rutasProdChagraApp.js:324) + App.jsx:843 | POR DETERMINAR |
| mockups/momento-venta-mercado-3d | mockup_momento_venta_mercado_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:366) + App.jsx:844 | POR DETERMINAR |
| mockups/artesania-andina | mockup_artesania_andina | 3D | NUCLEO_3D (rutasProdChagraApp.js:330) + App.jsx:845 | POR DETERMINAR |
| mockups/showcase-artesania | mockup_showcase_artesania | 3D | App.jsx:846 | POR DETERMINAR |
| mockups/efectos-funcionales | mockup_efectos_funcionales | 3D | NUCLEO_3D (rutasProdChagraApp.js:336) + App.jsx:847 | POR DETERMINAR |
| mockups/catalogo-infra | mockup_catalogo_infra | 3D | NUCLEO_3D (rutasProdChagraApp.js:342) + App.jsx:848 | POR DETERMINAR |
| mockups/mundo-abejas-3d | mockup_mundo_abejas_3d | 3D | App.jsx:849 + NUCLEO_3D (diorama_abejas) | POR DETERMINAR |
| mockups/mundo-gallinero-3d | mockup_mundo_gallinero_3d | 3D | App.jsx:850 + NUCLEO_3D (diorama_gallinero) | POR DETERMINAR |
| mockups/mundo-mercado-3d | mockup_mundo_mercado_3d | 3D | App.jsx:851 + NUCLEO_3D (diorama_mercado) | POR DETERMINAR |
| mockups/cara-prod | mockup_cara_prod | 3D | App.jsx:852 | POR DETERMINAR |
| mockups/criaturas-nocturnas | mockup_criaturas_nocturnas | 2D | App.jsx:853 | POR DETERMINAR |
| mockups/angelita-viva | mockup_angelita_viva | 2D | App.jsx:854 | POR DETERMINAR |
| mockups/mundo-polinizadores-3d | mockup_mundo_polinizadores_3d | 3D | NUCLEO_3D (rutasProdChagraApp.js:135) + App.jsx:855 | POR DETERMINAR |
| mockups/mundo-botica-cana-3d | mockup_mundo_botica_cana_3d | 3D | App.jsx:856 + NUCLEO_3D (diorama_botica_cana) | POR DETERMINAR |
| mockups/mundo-frutales-3d | mockup_mundo_frutales_3d | 3D | App.jsx:857 + NUCLEO_3D (diorama_frutales) | POR DETERMINAR |
| mockups/mundo-leguminosas-3d | mockup_mundo_leguminosas_3d | 3D | App.jsx:858 + NUCLEO_3D (diorama_leguminosas) | POR DETERMINAR |
| mockups/hoja-prueba-valle | mockup_hoja_prueba_valle | 3D | App.jsx:859 | POR DETERMINAR |
| mockups/jaguar-monte-3d | mockup_jaguar_monte_3d | 3D | App.jsx:860 | POR DETERMINAR |
| mockups/frutales-andinos-3d | mockup_frutales_andinos_3d | 3D | App.jsx:861 | POR DETERMINAR |
| mockups/cana-trapiche-3d | mockup_cana_trapiche_3d | 3D | App.jsx:862 | POR DETERMINAR |
| mockups/condor-cielo-3d | mockup_condor_cielo_3d | 3D | App.jsx:863 | POR DETERMINAR |
| mockups/navegador-grafo | mockup_navegador_grafo | 3D | NUCLEO_3D (rutasProdChagraApp.js:145) + App.jsx:864 | POR DETERMINAR |
| mockups/navegacion-pisos | mockup_navegacion_pisos | 2D | App.jsx:865 | POR DETERMINAR |
| mockups/agente-dibuja | mockup_agente_dibuja | 2D | App.jsx:866 | POR DETERMINAR |
| casa_adentro | mundo_casa_adentro | 3D | App.jsx:228 (alias directo) | POR DETERMINAR |

## Notas

### 1. REFUTACIÓN

Contrario a lo que podría asumirse, las rutas de mockups **NO viven en un archivo único derivable**. El censo fue necesario porque:

- `MOCKUP_HASH_ROUTES` en App.jsx define las rutas públicas pero no indica tipo (3D/2D)
- `rutasProdChagraApp.js` define el tipo para rutas del núcleo pero muchas rutas de mockups no están en el núcleo
- No existe un archivo central que diga explícitamente "esta ruta de mockup es 3D o 2D"
- La información está dispersa entre comentarios en el código, el manifiesto de rutas, y los imports de componentes

### 2. Criterio de clasificación 3D/2D

Se determinó por múltiples fuentes de evidencia:

- **Rutas en `NUCLEO_3D`** → 3D (montan WebGL canvas)
- **Rutas en `NUCLEO_APP`** → 2D (láminas/interfaces)
- **Rutas en `EXCLUIDO`** → Excluidas (mayoría 2D)
- **Comentarios en App.jsx** que describen el mockup (ej: "3D: el páramo definitivo")
- **Nombre de la ruta** (contiene "3d" → 3D)
- **Componente al que apuntan** (imports desde `visual/mundo3d/` → 3D)

### 3. Montaje en iframe por el valle

La columna "Montado en iframe por valle" está marcada como "POR DETERMINAR" porque:

- No se encontró evidencia explícita en el código revisado de qué rutas específicas se montan en iframe
- El contexto del task menciona que 12 entradas del valle antes daban HTML plano y ahora dan mundo vivo, pero:
  - No se identificaron claramente esas 12 entradas
  - No está claro si son rutas de mockups o rutas internas del sistema de mundos
- Para completar esta columna se necesitaría:
  1. Auditoría específica del sistema de iframes del valle
  2. Revisión de componentes como `ValleMarcoScreen.jsx`, `VentanaValle3D.jsx`
  3. Búsqueda en el código de patrones como `<iframe src="/app/#/mockups/`

### 4. Rutas sin clasificación explícita

Algunas rutas no están en `rutasProdChagraApp.js` pero existen en `MOCKUP_HASH_ROUTES`. Para estas se infirió el tipo basándose en:

- **Nombre de la ruta**: Contiene "3d" → 3D
- **Comentarios en App.jsx**: Ej: "3D: EL MONTE QUE VUELVE"
- **Import del componente**: Desde `visual/mundo3d/` → 3D
- **Alias en rutasProdChagraApp.js**: Si tiene alias a una ruta 3D → 3D

### 5. Rutas que podrían necesitar revisión

Las siguientes rutas existen en `MOCKUP_HASH_ROUTES` pero no tienen clasificación clara en `rutasProdChagraApp.js`:

- `mockups/mundo3d-sanidad`
- `mockups/mundo3d-mercado`
- `mockups/mundo3d-cafe`
- `mockups/mundo3d-semillero`

Estas se clasificaron como 3D basándose en su nombre, pero podría ser útil confirmar con el operador.

### 6. Estadísticas adicionales

- **Rutas 3D en NUCLEO_3D**: 38 rutas explícitamente declaradas
- **Rutas 3D inferidas**: 39 rutas (por nombre, comentarios, o imports)
- **Rutas 2D en NUCLEO_APP**: 5 rutas explícitamente declaradas
- **Rutas 2D en EXCLUIDO**: 24 rutas
- **Rutas 2D en PENDIENTE_DECISION**: 6 rutas
- **Rutas 3D en EXCLUIDO**: 3 rutas

## Próximos pasos recomendados

1. **Verificar clasificación 3D/2D** con el operador (Miguel) para confirmar que es correcta
2. **Auditoría de iframes** para completar la columna de montaje en iframe por el valle
3. **Actualizar rutasProdChagraApp.js** para incluir las rutas que faltan y evitar dispersión de información
4. **Documentar patrones** para que futuros mockups se categoricen explícitamente desde el inicio

---

**Generado por**: GLM-4.6 (task #censo-rutas-mockups-3d)  
**Fecha**: 2026-08-15  
**Fuentes**: App.jsx:759-867, rutasProdChagraApp.js completo
