La portada no recibía la cota del perfil y la llegada de tres tiempos solo existía con parámetros de captura. Ahora el mockup pasa piso y altitud; la navegación espera a «Continuar al piso» para que la llegada pueda leerse.

- Se retira la píldora. T1 muestra un solo rótulo de análisis actual, separado de la tiza.
- Portada y llegada reutilizan `MapaDeNivel`: curva a la altitud real, sin marcador representativo cuando falta altitud. La ayuda de ubicación aparece una vez por sesión.
- T0 aparece al terminar el viaje, T1 a +800 ms y T2 a +1600 ms mediante `setTimeout`. Reduced motion reúne los tiempos y deja cerrada la tiza. El compañero permanece pequeño junto a la pizarra; el visitante firma.
- La tiza elige helada, ficha de los cultivos del perfil, sed, hongo, ENSO por piso o silencio. Se reutilizan los evaluadores existentes; no se sustituye precipitación ni mojado ausentes por cero. Un current vacío o ENSO sin Open-Meteo no producen «ahora».

Validación: 93 pruebas del alcance verificadas en lotes, ESLint sin warnings y gate de tipos en 755 frente al baseline de 756, sin modificarlo. La suite completa terminó con 21 fallos y un error de teardown. Al repetir las diez suites fallidas con dos workers, la base `origin/dev` y esta rama presentan los mismos 15 fallos, sin casos adicionales en la rama.

Pendiente: el gate instalado rechaza headed y permite EGL headless, que no cumple el contrato solicitado. No hay capturas headed ni verificación visual del anclaje, del conteo en cuadro completo o de la legibilidad en móvil. No se aprueba el gate visual. La curva durante el viaje sigue pendiente: aquí se reutiliza al parar; el número del viaje continúa en DOM.

Día UTC/helada: no se modifica el selector del día. Las nuevas candidatas comprueban que la fecha del día seleccionado coincida con la fecha local expuesta por el hook. La interpretación de una mínima diaria como la próxima noche sigue dependiendo del contrato temporal del proveedor y requiere la revisión del carril correspondiente.

Borrador para revisión, sin merge.
