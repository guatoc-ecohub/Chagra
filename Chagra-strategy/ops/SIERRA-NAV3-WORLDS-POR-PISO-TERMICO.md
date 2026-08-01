# Sierra nav3: mundos por piso termico

## Alcance

Esta preparacion conecta el registro de mundos con el modelo puro de pisos termicos. No agrega geometria, escenas, iconos, materiales ni cambios de arte. La proyeccion se calcula en memoria y no se persiste en Asset, Log ni IndexedDB.

## Modelo de datos

Cada entrada de `MUNDO` declara `pisoTermico`, el piso que sirve como anclaje de su puerta en la Sierra. El valor debe ser uno de los ids de `PISOS_TERMICOS`: `calido`, `templado`, `frio`, `paramo`, `superparamo` o `nival`.

`mundosPorPisoTermico(pisoUsuario)` combina tres fuentes:

1. `mundoData.js`: identidad, escena, rutas y piso de anclaje.
2. `pisosTermicos.js`: rangos altitudinales y `compatibilidadPiso`.
3. El piso de la finca aportado por `useFincaViva`: primero `profile.piso_termico`, luego `profile.finca_altitud` o el alias historico `profile.altitud`.

La salida conserva dos lecturas del mismo catalogo:

- `mundos`: lista plana para busqueda y navegacion.
- `pisos`: pisos de menor a mayor altitud, cada uno con su arreglo `mundos`.

Cada mundo derivado incluye `altitudM`, `altitudFraccion`, `compatible`, `estadoCompatibilidad` y `explorable`. `altitudM` es el punto medio del rango y solo funciona como coordenada logica. La escena puede resolver una coordenada de terreno distinta sin cambiar el dato fuente.

## Semantica de compatibilidad

`compatible` es verdadero solo cuando el piso de anclaje coincide con el piso confirmado de la finca. Un piso vecino queda como `colindante`. Todos los mundos mantienen `explorable: true`; la compatibilidad orienta el contexto y nunca bloquea `viajarAlMundo`.

Si el perfil no aporta piso ni altitud valida, `pisoUsuarioId` queda en `null`, todos los estados quedan `neutro` y no se resalta nada.

## Puntos de integracion para VistaGlobalSierra

1. El host llama `useFincaViva()` y pasa `estadoFinca.pisoTermico` tanto a `VistaGlobalSierra` como a `useNavegacionMundos({ pisoUsuario })`.
2. El host itera `nav.catalogoPisos.pisos` y sus `mundos`. No debe volver a unir `MUNDO` con `PISOS_TERMICOS` dentro de la escena.
3. Para colocar una puerta por altitud, el host usa `mundo.altitudFraccion` como entrada al resolver de ladera. La posicion X/Z, separacion entre puertas y ajuste a la superficie pertenecen a una tarea visual posterior.
4. Al activar una puerta, el host llama `nav.viajarAlMundo(mundo.id)`. El estado de compatibilidad solo modifica copy o enfasis futuro, no la posibilidad de entrar.
5. `VistaGlobalSierra` ya acepta `pisoUsuario`; debe conservar el estado neutro cuando el dato no exista.

## Decisiones diferidas

- Distribucion horizontal y prevencion de solapamientos entre puertas del mismo piso.
- Componentes r3f o DOM para puertas, rotulos y estados de compatibilidad.
- Copy visible para mundo propio, colindante u otro.
- Reubicacion de anclajes cuando investigacion agronomica indique que un mundo requiere otro piso principal.

Estas decisiones incluyen arte o interaccion y quedan fuera de esta preparacion.
