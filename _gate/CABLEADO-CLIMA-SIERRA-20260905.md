# Cableado clima a SierraMonte3D

Fecha: 2026-09-05  
Rama: `feat/sierra-absorbe-clima-20260905`  
Base: `origin/dev`

## Qué cambió

- `SierraMonte3D` consume `useClima3DVivo` y deriva un perfil visual sin inventar fenómenos cuando no hay señal.
- La cobertura real modifica el cielo, la luz y las masas de nubes. Lluvia, niebla y helada reutilizan los componentes de clima existentes y reciben la altura real del terreno.
- Las nubes usan la textura procedural de masa ya existente. No se agregaron esferas facetadas.
- `MontanaMundosCampesino` dejó de mostrar el literal `13 °C · aguacero por la tarde`. Ahora usa el dato real; sin señal muestra `Clima de hoy: esperando el dato real`. Se eligió esta opción porque evita mostrar un número falso y conserva una indicación útil del estado de la lectura.

## Gate headed de la ruta alcanzable

Ruta comprobada: `#sierra_global`, mediante la entrada de producción local del proyecto.  
Canvas: `1280x800`, un canvas montado.  
Pantalla: `VIVO`.  
`chromium` antes de capturar: `0` procesos ajenos.  
Errores de página: `0`.  
Peticiones fallidas: `0`.

Capturas finales:

- `/home/kortux/Workspace/chagra/.worktrees/sierra-absorbe-clima-20260905/_gate/capturas-clima-sierra-20260905/01-despejado-a.png` — clima despejado, 3%, 22.5 °C. `tg-send msg_id=6619`.
- `/home/kortux/Workspace/chagra/.worktrees/sierra-absorbe-clima-20260905/_gate/capturas-clima-sierra-20260905/02-despejado-b.png` — repetición del control despejado. `tg-send msg_id=6620`.
- `/home/kortux/Workspace/chagra/.worktrees/sierra-absorbe-clima-20260905/_gate/capturas-clima-sierra-20260905/03-nublado-helada.png` — nubosidad 92% con helada probable. `tg-send msg_id=6621`.

En la captura despejada no se montan masas de nube y la iluminación conserva el tono cálido. En la captura nublada aparecen masas suaves en la bóveda superior izquierda, el cielo y la iluminación se enfrían y se apagan, y la señal de helada modifica el valle. La lectura observable es una Sierra con nubosidad fría y escarcha, no la misma escena despejada.

## Ruido y señal

Se recortó la franja de cielo `y=95..165`, tamaño `1280x70`, para no medir la órbita de la montaña.

Métrica ImageMagick `compare -metric AE`:

| Prueba | Resultado |
| --- | ---: |
| Control contra sí misma, cuadro completo | `0` píxeles distintos |
| Piso de ruido, despejado A contra despejado B | `994.367` AE promedio, `0.0110978` normalizado |
| Señal, despejado A contra nublado + helada | `9522.4` AE promedio, `0.106277` normalizado |
| Control de escenas conocidas distintas, misma franja | `9522.4` AE promedio |

La señal de cielo fue aproximadamente `9.57x` el ruido medido.

## FPS

Medición headed GPU local, pantalla encendida, tres pares intercalados de 2 segundos, con tres muestras iniciales descartadas por corrida:

- Despejado 3%: mediana `59.993 FPS`.
- Nublado 92% + helada probable: mediana `59.678 FPS`.
- Diferencia A/B: `-0.315 FPS`.

El mismo gate reportó `pageErrors=[]` y `requestFailures=[]`.

## Verificación de código

- `npx vitest run src/hooks/__tests__/useClima3DVivo.test.js src/visual/mundo3d/sierra/__tests__/climaSierra.test.js`: `6/6` pruebas pasaron.
- ESLint dirigido a los archivos modificados: pasó sin warnings.
- `npm run tsc:check`: pasó.
- `npx vite build`: pasó. El build conserva warnings preexistentes sobre imports dinámicos y tamaño de chunks.
- El literal fijo de Montana fue eliminado; la búsqueda de `13 °C|aguacero por la tarde` en ese archivo no devuelve coincidencias.
- `git diff --check`: pasó.

## lo que NO pude verificar

- No hubo un Pixel con Mali-G78 disponible. El resultado de FPS es de la GPU headed local y no certifica el rendimiento exacto en ese dispositivo.
- No ejecuté el gate de producción desplegada ni los checks remotos de CodeQL y E2E. La captura usa la entrada de producción del código local.
- No se usó un snapshot fresco del proveedor meteorológico. Para aislar el cableado se inyectaron dos payloads controlados mediante el evento local de clima: despejado 3% y nublado 92% con helada probable. Esto prueba la reacción de la escena, no la frescura del proveedor.
- No se completó un barrido de distancias cerca, plano medio y amplia, ni un barrido de 2 o 3 semillas. Las capturas corresponden a una cámara y a la semilla determinista usada por la escena.
- No se obtuvo una medición histórica del commit base en el mismo hardware. La cifra reportada es la comparación intercalada entre los dos estados climáticos en la rama de trabajo.

## Trazabilidad git

La rama se creó desde `origin/dev`; el PR debe apuntar a `dev`.
