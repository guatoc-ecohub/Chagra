# Auditoría funcional y de usabilidad campesina: agente y Araña

Fecha: 2026-06-08

## Veredicto ejecutivo

La Araña ya es una entrada comprensible para consultas concretas y sus modos
principales tienen contratos MCP determinísticos. El estado activo del modo,
la opción de cancelar y el corte explícito cuando falla una herramienta reducen
alucinaciones y errores silenciosos.

Todavía no debe presentarse como un asistente integral de trabajo para finca.
Hoy sirve principalmente para **consultar**; no guía ni registra un proceso
completo. Tampoco muestra si una fuente está disponible antes de elegirla. Las
funciones de El Niño, reforestación y silvopastoreo tienen datos o piezas
aisladas, pero no son recorridos visibles y accionables desde la Araña.

## Método

- Inspección del manifiesto único de capacidades, enrutador de intenciones,
  contratos MCP, interfaz de chat y protecciones de salida.
- Simulación de preguntas y necesidades frecuentes de una persona campesina.
- Revisión de contenido disponible y conexiones existentes para los tres temas.
- Ejecución de pruebas focalizadas de capacidades, flujo de usuario, MCP, ENSO
  y reforestación.

La auditoría distingue entre:

- **Conectado**: existe recorrido visible y una fuente ejecutable.
- **Parcial**: existen datos o servicios, pero no un recorrido completo.
- **No desarrollado**: falta modelo de dominio, herramienta o experiencia.

## Recorrido general de la Araña

### Lo que funciona bien

- Los nombres visibles evitan jerga técnica.
- Elegir un modo deja visible qué ayuda quedó activa para el próximo mensaje.
- El usuario puede cancelar el modo activo.
- Los modos explícitos fuerzan una herramienta concreta y no deben caer
  silenciosamente a una respuesta inventada.
- Cultivos, plagas, biopreparados, clima, precio y calendario declaran fuente.
- La foto ahora rechaza imágenes fuera del dominio agrícola antes del análisis.

### Riesgos transversales

| Severidad | Hallazgo | Efecto para el campesino |
|---|---|---|
| Alta | Las capacidades visibles no se filtran por salud real del MCP o fuente. | Puede elegir una ayuda que parece disponible y descubrir el fallo después de escribir. |
| Alta | La Araña ofrece consultas, pero no crea planes, tareas, observaciones ni seguimientos. | La recomendación se pierde y el trabajo debe organizarse fuera de Chagra. |
| Alta | `Consultar un precio` promete un precio puntual, pero el wrapper documenta que SIPSA entrega hoy metadata y URL de un ZIP federado. | Expectativa falsa y respuesta difícil de usar en campo. |
| Media | Inicio mezcla modos de consulta, foto y navegación en una lista heterogénea. | No queda claro qué opción responde, cuál abre otra pantalla y cuál requiere una foto. |
| Media | La fuente y los requisitos existen en el manifiesto, pero no se explican antes de activar la opción. | El usuario no sabe qué dato debe tener listo ni de dónde saldrá la respuesta. |
| Media | Voz y foto viven como accesos separados del recorrido de la Araña. | La misma necesidad puede comportarse distinto según el punto de entrada. |
| Media | Pruebas de experiencia quedaron desactualizadas tras cambiar etiquetas y activar precios. | Un cambio futuro puede romper o confundir el recorrido sin que CI lo represente correctamente. |
| Baja | “Investigación profunda” no anticipa tiempo de espera, fuentes ni costo/limitación Pro. | Puede parecer bloqueada o arbitrariamente restringida. |

## Experimentos por función

| Necesidad campesina simulada | Estado | Resultado y brecha |
|---|---|---|
| “Quiero saber cómo cuidar papa” | Conectado | `Consultar un cultivo` usa catálogo. Requiere nombre identificable; ante ambigüedad debe preguntar antes de responder. |
| “Las hojas están amarillas, ¿qué tiene?” | Parcial | `Tengo una plaga` espera nombre de plaga o enfermedad. Un síntoma no identificado necesita diálogo guiado o foto. |
| “¿Qué preparo para el pulgón?” | Conectado | Busca biopreparados. Falta convertir receta en lista de materiales, cantidades verificadas, advertencias y tarea. |
| “¿Va a llover en mi finca?” | Parcial | Hay clima histórico IDEAM y snapshot local. La etiqueta genérica no distingue pronóstico, histórico y alerta. |
| “¿A cómo está la papa?” | Parcial crítico | La interfaz promete último precio, pero la conexión actual puede devolver metadata/ZIP, no precio puntual utilizable. |
| “¿Qué puedo sembrar este mes?” | Conectado | Usa piso térmico/altitud. Es útil si la finca tiene altitud; debe explicar claramente cuando falta. |
| “Investigue por qué se seca mi café” | Parcial | Investigación profunda existe con flag/Pro, pero no comunica duración ni alcance antes de ejecutarse. |
| Adjuntar foto de planta enferma | Conectado parcial | Acepta dominio agrícola y rechaza mapas u otras imágenes. Sigue necesitando confirmación cuando la identificación es incierta. |
| Hablar en vez de escribir | Parcial | Abre ayuda por voz, pero no se evidencia paridad completa con todos los modos de la Araña. |
| Ver plantas registradas | Conectado | Es navegación a activos, no una función conversacional. La diferencia debe ser visible. |

## 1. Fenómeno de El Niño

**Estado: parcial avanzado, no visible como recorrido.**

Ya existe:

- Snapshot climático con fase ENSO, probabilidades, pronóstico y alertas.
- Wrappers `get_enso_status` y `get_alertas_clima_zona`.
- Inyección de contexto ENSO regional al agente.
- Visualización ENSO en análisis proactivo.
- Pruebas de contexto ENSO, clima y alertas.
- Contenido relacionado: 136 documentos coinciden con ENSO, Niño o sequía.

Falta conectar o desarrollar:

1. Capacidad visible `Prepararme para El Niño`, separada de clima histórico.
2. Enrutamiento determinístico a estado ENSO + alertas locales + datos de finca.
3. Diagnóstico de vulnerabilidad: agua disponible, cultivos, etapa, suelo,
   sombra, animales y horizonte de riesgo.
4. Plan accionable por semanas: almacenar agua, acolchar, ajustar siembra,
   sombra, forraje, cortafuegos y monitoreo.
5. Crear tareas confirmadas y alertas de seguimiento.
6. Explicar incertidumbre: probabilidad, fuente, fecha de actualización y qué
   cambia una decisión.

## 2. Reforestación

**Estado: conocimiento y seguridad disponibles; flujo productivo ausente.**

Ya existe:

- Protección de salida para evitar recomendaciones invasoras o combustibles.
- Recomendación de especies nativas por función: pionera, fijadora de nitrógeno,
  cortafuego y ancla posincendio.
- Onboarding contempla bosque, restauración y agroforestería.
- Contenido relacionado: 139 documentos coinciden con restauración,
  reforestación o especies nativas.
- Pruebas específicas de seguridad de reforestación.

Falta conectar o desarrollar:

1. Capacidad visible `Restaurar o sembrar árboles`.
2. Modelo de lote de restauración: objetivo, área, pendiente, agua, suelo,
   cobertura actual, presión de fuego/ganado y especies presentes.
3. Herramienta determinística que recomiende especies nativas por sitio, no
   solo una lista fija añadida a la respuesta.
4. Diseño por estratos, funciones, densidad, distancias y etapas sucesionales.
5. Lista de materiales, viveros/semillas verificables y calendario de siembra.
6. Registro de árboles/lotes, supervivencia, reposición y evidencia fotográfica.
7. Confirmación antes de convertir el plan en tareas.

## 3. Silvopastoreo

**Estado: contenido disponible; producto y modelo de dominio no desarrollados.**

Ya existe:

- Catálogo con especies forrajeras, cercas vivas y especies silvopastoriles.
- Recomendaciones climáticas regionales mencionan sombra silvopastoril.
- Activos pueden representar tierra/potrero.
- Contenido relacionado: 89 documentos coinciden con silvopastoreo, cercas
  vivas o forrajes.

Falta conectar o desarrollar:

1. Capacidad visible `Mejorar mi potrero con árboles y forraje`.
2. Modelo de animales: especie, cantidad, peso, etapa y necesidades.
3. Modelo de potrero: área, subdivisiones, agua, sombra, pendiente, suelo,
   forraje, descanso y carga actual.
4. Calculador de carga, oferta forrajera, rotación y déficit estacional.
5. Diseñador de cercas vivas, bancos forrajeros, árboles dispersos y corredores.
6. Guardas de toxicidad, consumo máximo y compatibilidad animal-especie.
7. Plan para sequía/El Niño integrado con agua, sombra y reserva forrajera.
8. Seguimiento de cobertura, recuperación, bienestar y productividad.

## Prioridad recomendada

### P0: corregir promesas y proteger el recorrido

1. Hacer que la Araña muestre disponibilidad de cada fuente antes de elegirla.
2. Corregir `Consultar un precio`: implementar consulta puntual real o renombrar
   honestamente a `Abrir datos de precios SIPSA`.
3. Actualizar la prueba campesina del recorrido y convertirla en contrato CI.
4. Crear una prueba de escenarios que recorra cada capacidad, éxito, dato
   faltante, herramienta caída, sin conexión y cancelación.

### P1: convertir recomendaciones en trabajo útil

5. Añadir acciones confirmadas: crear tarea, registrar observación y guardar
   plan, siempre mostrando exactamente qué se guardará.
6. Unificar foto y voz con las mismas capacidades y reglas de la Araña.
7. Añadir `Prepararme para El Niño` con plan de finca y seguimiento.
8. Añadir flujo de reforestación basado en sitio y especies nativas.

### P2: desarrollar silvopastoreo

9. Crear modelos de potrero, animales, rotación y oferta forrajera.
10. Construir el planificador silvopastoril con seguridad y seguimiento.

## Criterios de aceptación para una Araña campesina

- Una opción debe decir qué ayuda entrega, qué dato necesita y qué fuente usa.
- Si la fuente está caída, la opción debe verse no disponible antes de escribir.
- Si faltan datos, debe hacer una sola pregunta sencilla por turno.
- Nunca debe convertir una consulta en una acción sin confirmación explícita.
- Toda recomendación debe terminar con un siguiente paso concreto y opcional.
- Foto, voz y texto deben producir el mismo nivel de seguridad y trazabilidad.
- Cada modo debe tener pruebas de éxito, ambigüedad, desconexión y fallo MCP.

## Evidencia de pruebas

Ejecutadas con un solo worker para reducir interferencia con el bench activo:

- Capacidades + router: **43/43 pasan**.
- ENSO + guardas de reforestación: **28/28 pasan**.
- Sidecar tool-chain: pasa dentro del bloque MCP.
- Flujo de usuario: **7/12 pasan; 5 fallan** por contrato desactualizado de
  precio y cambio de etiqueta.
- Honestidad MCP: **44/47 pasan; 3 fallan** porque todavía esperan que precio
  sea un stub.

Una ejecución amplia en paralelo agotó memoria mientras corría el bench. La
validación funcional completa debe programarse sin competencia por RAM/VRAM o
con límites de workers explícitos.

