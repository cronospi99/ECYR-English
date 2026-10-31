# Class Wars · Modo 2: «Pinta tu equipo» (plan)

Plataformas vistas de lado, por equipos. Pisar un bloque lo pinta del color de tu equipo; gana el equipo con más bloques
pintados al acabar el tiempo. Se basa en el modo del video 2 (barra de marcador dividida, sellos «TEAM …», gotas de pintura),
con arte y nombre propios.

## 1. Reglas propuestas

| Tema | Propuesta |
|---|---|
| Equipos | 2 equipos (opción de 3–4 en clases grandes). Reparto automático y equilibrado; el docente puede mover a alguien en el lobby. |
| Pintar | Al aterrizar o caminar sobre un bloque, queda de tu color. Los bloques del rival se re-pintan. |
| Energía | La misma regla del modo 1: empiezas con la energía del deslizador; caminar, saltar y lanzar gastan; con 0 te quedas quieto; cada acierto da 1.200. |
| Diamantes | Se cambian por **pintura especial** en la tienda (rodillo ancho, bomba de pintura, salto doble), no definen al ganador. |
| Poderes de los profes | Los 25 se adaptan a pintura: la laptop mancha un área al caer, la pelota arcoíris rebota pintando, los gatos corren pintando, el hacker congela la pintura rival 3 s, la tinta de Juan Pablo deja charcos permanentes, etc. |
| Choques | Sin daño: pisar a un rival desde arriba lo rebota y le quita 2 s de pintura (sin K.O.), para que siga siendo un juego de estudiar. |
| Final | Barra superior con el % de cada equipo, últimos 30 s con música intensa, podio por equipo y MVP (más bloques pintados y más aciertos). |

## 2. Arquitectura (reutilizar, no duplicar)

Hoy todo vive en `src/features/classwars/`. Antes de escribir el modo 2 se separa lo común:

```
classwars/
  core/        relay + sesión base (lobby, start, snapshots, reconexión), preguntas y energía, tienda, podio, audio, iconos
  modes/arena  modo 1 (lo actual: sim, map, renderer, bots)
  modes/paint  modo 2 (nuevo)
```

- **Red:** el mismo relay de Cloudflare y el mismo esquema anfitrión-autoritario (el navegador del docente simula a 30 Hz y envía
  ~10 instantáneas/s; los celulares mandan solo su entrada).
- **Contrato del modo:** cada modo implementa `createSim(seed, settings)`, `snapshot()`, `applyInput()`, `render(source)` y su
  HUD. El lobby, el código/QR, el selector de personaje, las preguntas, la tienda base y el podio son compartidos.
- **Configuración:** en «Nueva partida» se elige el modo (tarjetas con vista previa); los deslizadores de duración, energía y
  jugadores sirven para ambos.

## 3. Motor del modo 2

- **Mapa por baldosas** (≈ 160 × 48 bloques de 32 px), generado con semilla: plataformas a varias alturas, rampas, trampolines,
  muros y zonas de salida por equipo. Pintura = un `Uint8Array` con el dueño de cada bloque.
- **Física de plataformas** a paso fijo: gravedad, aceleración y frenado, salto con altura variable, *coyote time* y *jump
  buffer* (lo que hace que el control se sienta profesional). Predicción en el celular con la misma función que usa el anfitrión.
- **Red de la pintura:** solo viajan los cambios (índice de bloque + equipo, empaquetados), con un tope por instantánea; al entrar
  tarde se envía el mapa completo comprimido (codificación por tramos). Estimado: < 3 KB por instantánea con 40 jugadores.
- **Render:** fondo con capas en paralaje (cielo pintado, nubes, trazos de pincel), el mapa cacheado por bloques que solo se
  redibujan cuando cambian, gotas y salpicaduras de partículas, sellos animados «¡EQUIPO …!». Los profes se ven de frente
  rebotando, con una mancha de su color de equipo.
- **Controles:** teclado (← → / A D, espacio para saltar), y en celular dos flechas a la izquierda y botones de salto y poder a
  la derecha.
- **Bots** para la demo: siguen rutas por las plataformas, pintan las zonas del rival y responden preguntas cuando se cansan.

## 4. Fases

| # | Fase | Resultado |
|---|---|---|
| 1 | Separar `core/` sin cambiar el modo 1 | El modo 1 funciona igual; base lista para modos nuevos |
| 2 | Física + mapa + cámara (sin red) | Moverse y saltar a 60 fps en computador y celular |
| 3 | Pintura + equipos + marcador | Partida local contra bots |
| 4 | Red (anfitrión, deltas, unirse tarde) | Partida real con la clase |
| 5 | Energía, preguntas, tienda de pintura y poderes adaptados | Mismo ciclo de estudio que el modo 1 |
| 6 | Arte, sonido, podio por equipos, pruebas con 40 jugadores | Listo para clase |

## 5. Para decidir antes de empezar

1. ¿Solo 2 equipos o permitir 3–4?
2. ¿Pisar a un rival debe tener efecto (rebote) o nada de contacto?
3. ¿Los diamantes se usan en la tienda de pintura, como se propone, o prefieres que también cuenten para ganar?
4. ¿Un solo mapa grande o 2–3 escenarios (patio, biblioteca, azotea) para elegir?

## 6. Pruebas

- Unitarias de la física (mismo resultado en anfitrión y cliente con la misma entrada) y de la codificación de pintura.
- Playwright: demo con bots a 1280 × 800 y 390 × 844, sin errores en consola, fps y tamaño de instantáneas medidos.
- Partida con relay local y varios clientes simulados (40) antes de usarlo en clase.
