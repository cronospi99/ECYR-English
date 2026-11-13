# Texturas personalizadas

Coloca aquí tus archivos PNG y el juego los usará automáticamente en lugar de las texturas generadas por código:

- `board.png` — césped del tablero (ideal: patrón a cuadros, proporción 9:5)
- `dirt.png` — tierra del entorno (textura repetible)
- `stone.png` — camino de piedra de los zombies (repetible)
- `wood.png` — madera de cercas (repetible)
- `sky.png` — cielo de fondo (degradado vertical)

No hace falta tocar el código: `src/textures.js` intenta cargar cada archivo y, si no existe, usa la versión procedural.
