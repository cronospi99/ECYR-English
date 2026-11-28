# Plan futuro: actividades de evento estilo "Clue Hunt" y "Bingo"

Estado: **guardado para después**. Primera actividad construida: Diwali (noviembre 2026), en `/hunt/diwali`.

## Qué existe ya (reutilizable)

El motor **no depende del Diwali**. Una actividad nueva es solo un paquete de datos.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Paquete de contenido | `src/content/clue-hunts/<id>.json` | Checkpoints, tarjetas EN/FR, respuestas, pistas, datos curiosos, enlaces de apoyo, pendientes |
| Casos de prueba | `src/content/clue-hunts/<id>.cases.json` | Respuestas que deben aceptarse (`ok`), rechazarse (`no`) o recibir el aviso de idioma (`nudge`) |
| Validador único | `src/lib/clueHunt/match.ts` | Normaliza, corrige un error de tipeo (`fuzzy`) y aplica `accept` / `reject` / `nudge` |
| Registro de paquetes | `src/lib/clueHunt/packs.ts` | Carga por glob todos los JSON de la carpeta y les añade extras (p. ej. un modo bingo) |
| Host / cliente QR | `src/features/cluehunt/` (`live.ts`, `Host.tsx`, `Client.tsx`) | Sala por el relay (igual que English Racers), marcador en vivo, reconexión, modo sin sala |
| Pósters | `/hunt/<id>/print` | Un póster A4 por checkpoint con su palabra secreta, más tarjetas recortables |
| QR fijo | `node scripts/make-hunt-qr.mjs --url <URL>` | Genera `public/modules/diwali/qr-join.svg` / `.png` apuntando a `<URL>/hunt/join` |
| Pruebas | `npm run test:hunt` | Valida el esquema y todos los casos de todos los paquetes |

## Cómo crear la próxima actividad (p. ej. Halloween, Thanksgiving, Christmas, Carnaval, Día del Idioma)

1. **Contenido** (`director-contenido-pedagogico`): crear `<id>.json` y `<id>.cases.json` con el mismo esquema. Para cada tarjeta:
   - `prompt` es el texto literal del material del profesor.
   - `answer` es lo que se muestra al resolverla.
   - `accept` / `reject` / `nudge` (las respuestas en español no puntúan).
   - `fuzzy`, `hint`, `funFact` y `shortLabel`.
   - Los acertijos nuevos van con `enabled:false` y `needsConfirmation:true`.
2. **Revisión** (`corrector-evaluador-ingles`): idioma, nivel, falsos positivos y negativos.
3. `npm run test:hunt` al 100 %.
4. **Opcional, arte:** imágenes propias en `public/modules/<id>/img/`, con el emblema e icono de cada checkpoint.
5. **Opcional, segundo modo de pantalla grande:** un HTML autónomo como el bingo, en `public/modules/<id>/`, enlazado desde el hub.

## Ideas para fases siguientes

- **Temas visuales por paquete:** hoy la identidad visual (noche morada, dorado, Fraunces + Barlow) es la del Diwali. Habría que separar los colores, las fuentes y la música en un bloque `theme` del JSON.
- **Idiomas por paquete:** hoy es EN + FR. Permitir solo EN o EN + otro idioma con la misma UI de pares.
- **Bingo genérico:** convertir el bingo del Diwali en un motor de bingo con su propia lista de palabras e imágenes por paquete, para no copiar un HTML por evento.
- **Más tipos de tarjeta:**
  - opción múltiple;
  - foto o dibujo (por ejemplo, "dibuja un rangoli");
  - audio para escuchar y responder;
  - ordenar palabras;
  - tarjeta de equipo que se valida a mano.
- **Tarjetas en orden de ruta** ("encuentra la siguiente pista") en vez de checkpoints libres.
- **Resultados:** exportar el marcador final a CSV o guardarlo en Supabase (preguntar antes: implica registrar grupos en el servidor).
- **Editor en la app:** un profesor crea o edita un paquete sin tocar JSON. Se guardaría en Supabase, con aprobación del profesor antes de activar tarjetas borrador.
