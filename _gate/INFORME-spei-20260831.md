# Informe SPEI, 2026-08-31

## Resultado

Se agregó `spei()` como índice nombrado de Chagra. Acumula una serie de
balances hídricos y estandariza el acumulado contra la media y desviación de
la misma ventana. Acepta balances ya calculados o días con precipitación y
ETc, reutilizando `balanceHidricoDia()`.

Las normales del archivo ahora incluyen balance de referencia (`ETc = ETo ×
Kc`, con `Kc = 1.0`) para que el boletín pueda calcular el SPEI de hoy. La
versión de cache de normales subió a v3 para no conservar payloads sin esos
campos.

## Medición

- Vitest focalizado: 2 archivos, 42 tests, todos pasan.
- ESLint focalizado sobre los cinco archivos modificados: pasa sin errores.
- El test de `ClimaBoletinScreen` verifica el tile `clima-indice-spei` junto al
  tile SPI, incluyendo valor y fuente.

## No verificado

- No se hizo captura visual ni medición de FPS: es un cambio de cálculo y UI
  2D, validado mediante render unitario.
- No se verificó una respuesta viva del archivo histórico Open-Meteo; el
  cálculo del transporte queda cubierto por la forma de datos existente y el
  fallback honesto a `null`.
- No se creó PR en este turno.

## Commits

Implementación: `61dbdd1ae feat(clima): agregar indice SPEI de balance hidrico`.

