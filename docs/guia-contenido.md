# Guía de generación de contenido (lecturas, listening, writing)

Reglas obligatorias para el `director-contenido-pedagogico` al crear contenido nuevo, extraídas de la auditoría del piloto A1 (corrector-evaluador-ingles). Validar siempre con `node scripts/validate-content.mjs`.

## C. Patrones sistemáticos que hay que corregir en las instrucciones antes de escalar (lo más importante)

1. **Futuro en presente simple para no usar going to o will.** Produce inglés antinatural en unos 12 textos: Cusco, Mexico City, violinist, birthday-chat, pancakes, class-photo, plant-a-tree, voicemail ("We have cake…"), entre otros.
   Regla:
   - Para planes y citas, usar present continuous ("we're visiting").
   - Para ofertas y decisiones al momento, "Let's… / I can… / I'll…" como fórmulas fijas.
   - "Going to" se permite en comprensión.
   - El presente simple con valor de futuro solo para horarios ("The bus leaves at 10").

2. **Modelos de writing que no cumplen sus propios criterios ni la longitud.** Fallan unos 25 de 100 (criterios, número de preguntas, palabras).
   Regla: tras escribir el modelo, el generador debe devolver una autocomprobación con evidencias (criterio → cita del modelo; número de palabras; número de preguntas o ítems).
   Además:
   - Definir cómo se cuentan las palabras (sin etiquetas de hablante A:/B: ni firma).
   - Prohibir criterios absolutos ("in every sentence").
   - Para listas de preguntas y chats, usar el rango "30–50 words".
   - Añadir un validador automático (lo puede ejecutar auditor-qa).

3. **Tareas casi duplicadas dentro de la misma unidad** (unas 25). Ejemplos:
   - "Then and now" ×2
   - Room for rent ×2
   - Hotel review ×2
   - Borrow ×2
   - Class party ×2
   - School uniforms ×2
   - Phone message ×2
   - Running late ×2
   - Quiz ×2
   - Never done ×2
   - Trip checklist / Ready for the trip

   Regla: pasar al generador los títulos, géneros y situaciones existentes de la unidad y exigir un género y una situación nuevos. Prohibir repetir título o tarea comunicativa.

4. **Público y persona incoherentes.** Las lecturas A1 existentes y los writings originales son de adultos (compañera de piso, enfermera, jefe, "my wife"). Lo nuevo es casi todo de niños y adolescentes (Grade 6, colegio, unos 10 de 48 textos escolares). En la unidad 16 conviven "my wife" y "I'm in Grade 8".
   Regla: definir por nivel la proporción de contextos adulto/joven y declararla en cada lote.

5. **Moneda frente a país.** Hay "dollars" en Colombia (bus a Medellín, campamento en Medellín $300) y la unidad 3 mezcla "pesos" con "$".
   Regla: precios en dólares solo en países dolarizados (Ecuador, Panamá, El Salvador, Puerto Rico, EE. UU.) o sin ciudad nombrada; si se nombra otro país, usar su moneda con importes realistas.
   La ambientación latinoamericana es un acierto. Conviene diversificar fuera de Colombia y rotar nombres: Sofía, Mateo, Lucía, Tomás, Leo y Pablo se repiten mucho.

6. **Calidad de los ítems.**
   - El 70 % de las TF son False (106 de unas 152). Al escalar, el alumno aprende a adivinar.
   - Reglas:
     - TF equilibradas (50 ± 10 %).
     - Opciones paralelas en forma gramatical y longitud.
     - Ningún ítem respondible sin el texto o audio (animal-quiz).
     - No dos ítems sobre la misma frase, y ningún enunciado que delate otra respuesta (favourite-season).
     - Las preguntas deben coincidir con lo que piden sus opciones ("What colour" con "Long and black").
     - En A1–A2, toda clave debe tener apoyo literal: sin inferencias (Cusco, farm, house-tour).
   - En B1+ las inferencias se pueden admitir, pero deben marcarse y explicarse en explain_es.
   - explain_es debe citar literalmente.

7. **Glosario.**
   - El término debe aparecer tal cual en el texto.
   - Se glosa el sentido en contexto: water fountain = bebedero; "I can't wait" no es "no puedo esperar".
   - Forma base.
   - Sin cognados obvios.
   - Español neutro con variante regional entre paréntesis.

8. **Inglés de los modelos que el alumno va a copiar.**
   - Prohibir comas empalmadas (5 casos).
   - Prohibir calcos: "I'm sending you a big hug", "Please answer me", "I'm sorry for the problem", "I'm medium", "Here are five dollars", "My best holiday is…", "Lunch of the day".
   - Saludos y despedidas en línea o párrafo propio (\n), como en los modelos originales. Hoy aparecen "Dear Pablo, We visited…" y "Hi everyone, Join us…".

9. **Norma ortográfica.** Hay mezcla de británico y americano (Maths, rubbish, crisps, torch frente a tryouts, movie, soda, Grade).
   Regla: fijar una norma (el banco es mayoritariamente británico), aceptar las variantes en `accept` y evitar léxico solo americano o solo británico ambiguo ("rubber").

10. **TTS.** Los listenings están bien en general: números y precios escritos con letra, teléfonos dígito a dígito.
    Regla explícita:
    - Deletreo con comas ("R, O, J, A, S"), no con guiones.
    - Años en palabras.
    - Sin "$", "%", "&" ni dígitos en `lines`.

11. **Deriva léxica sobre el nivel en las unidades finales.** Ejemplos: benefits, appreciate, carries diseases, even if, subtitles, stay curious, give up, shallow end, sour.
    Regla: lista de vocabulario por nivel (English Vocabulary Profile o Cambridge YLE), con glosa obligatoria para lo que quede fuera.

---

## D. Respuesta a las dudas de los autores

- **going to, comparativos y superlativos en A1:** aceptables.
  - El currículo de la plataforma ya los incluye en A1: level-a1.json tiene "THIS, THAT AND BETTER" (comparativos), "BIGGEST AND FARTHEST" y "PLANS AND MESSAGES". Las lecturas A1 existentes también los usan ("Be going to for plans", "Comparatives").
  - Encajan en un A1 alto (Cambridge Movers).
  - Uso: en comprensión, en cualquier texto y con moderación; en producción, solo en la unidad que los trabaja.
- **Lo que sí excede A1** en los writings nuevos (aunque sigue al currículo): present perfect (unidad 10), "used to", "looking forward to + -ing" y "decided to stop + -ing" (unidad 16). Recomiendo etiquetar esas unidades como "A1+ / puente a A2" y bajar el léxico.
- **Ambientación:** es adecuada y motivadora. El único problema real es la coherencia de la moneda (patrón 5).
- **Distractores y modelos:**
  - Los distractores son en general plausibles y del mismo tipo; los fallos están listados.
  - La gramática de los modelos es correcta, pero cerca de un 25 % no cumple su propio criterio o la longitud (patrón 2). Es el punto crítico para escalar.

## Reglas añadidas tras la auditoría A2

12. **Posición de la clave.** Tras generar, ejecutar `node scripts/shuffle-options.mjs "/-more\.json$/"`
    (baraja opciones de forma determinista y reescribe `answer`). Nunca dejar la clave siempre en la misma posición.
13. **Datos factuales y lógica interna.** Todo dato histórico, científico o geográfico debe ser verificable
    y exacto; si hay duda, reformular sin el dato. Revisar la coherencia interna de cada historia
    (quién tiene qué, días y fechas, cuentas de precios).
14. **Autocomprobación obligatoria del writing (patrón 2).** Cada `model` se revisa contra cada criterio
    (cita del modelo que lo cumple) y contra el rango de palabras antes de entregar.
15. **Etiquetado de nivel.** Si una unidad del currículo exige estructuras del nivel siguiente, la tarea
    se marca en `brief`/`briefEs` como «A2+ / puente a B1» (análogo en otros niveles).
