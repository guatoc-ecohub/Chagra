# Gate durable de compais, 7 componentes

Fecha de corrida: 2026-08-22.

## Resultado

El harness ahora registra siete componentes: las cinco láminas, `jaguar`, `guacamaya` y `maiz`. El inventario explícito de cinco láminas más guacamaya suma seis, por lo que `maiz` se incorporó como el séptimo compai existente en `origin/dev`.

La prueba de colores superó el umbral de 100 en las 21 combinaciones de componente y distancia. La inspección visual encontró un defecto que el conteo barato no detecta: las cuatro láminas sin asset servido se leen como rectángulo vacío con icono de imagen rota. El gate las marca como fallidas mediante `brokenImages`.

| Componente | Cerca 420 | Plano medio 300 | Amplia 180 | Veredicto visual |
| --- | ---: | ---: | ---: | --- |
| zariguya | 176 | 179 | 178 | FALLA, `/compai/laminas/zariguya.png` roto |
| luciernaga | 174 | 179 | 176 | FALLA, `/compai/laminas/luciernaga.png` roto |
| oso | 168 | 157 | 153 | FALLA, `/compai/laminas/oso.png` roto |
| chivito | 178 | 176 | 176 | FALLA, `/compai/laminas/chivito-punk.png` roto |
| jaguar | 44247 | 23747 | 8891 | PASA |
| guacamaya | 5004 | 3759 | 2077 | PASA |
| maiz | 20957 | 15173 | 8406 | PASA |

Los valores son colores únicos RGBA contados con `sharp-fallback`. `identify -format '%k'` no está instalado en esta máquina, por lo que no se presenta esa medición como si hubiera ocurrido.

## Controles ejecutados

- `gate-x-estado.sh`: `VIVO`.
- Calentamiento de Vite: tres respuestas GET `200` antes de capturar.
- Chromium: se observaron 8 procesos ajenos. El capturador esperó 5 segundos y dejó `maquinaSola: false`; la corrida queda marcada como contaminada por carga ajena.
- Semillas: `20260807`, `20260808`, `20260809`. Las tres muestras de cada combinación superaron 100 colores. Las cuatro láminas con asset roto fallaron además por `brokenImages` en las tres semillas.
- La respuesta HTTP `200` de los assets no fue tomada como prueba: el cuerpo era HTML de fallback de Vite y el DOM confirmó las imágenes rotas.

## Lo que no quedó verificado

- No se pudo ejecutar `identify`, porque el binario no existe en el entorno.
- No se obtuvo una corrida aislada de Chromium, porque los 8 procesos ajenos siguieron vivos.
- No se corrigieron los cuatro assets faltantes en esta tarea. El hallazgo queda visible en el gate para la pasada que restaure esos archivos.
