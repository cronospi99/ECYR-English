# Taxi Rush v2: spec visual "Crazy Taxi costero" (three.js)

Base de código: rejilla en `world.ts` (VX=15+21k, HZ=13+19j, ROAD_W=6 tiles, SW=3, CURB=0.16, autopista sur de 6 carriles). Tone mapping actual ACES y sol 2.4 / hemi 0.5 en `mode.ts` L299-315. Escala: 1 tile = 1 m. Las medidas son objetivo; adaptarlas a la rejilla y mantener las colisiones (`avenueColumn`, `HWY_*`).
Referencia objetivo: images/23.jpg (concept art). Estilo: semirrealista "cartoon" saturado y soleado; colores planos con ligera variación por vértice (±6 %), sin texturas grandes. Sombras suaves solo en el taxi y su entorno cercano.

## A. Ciudad costera
**Trazado (norte arriba, +z hacia el sur)**
- Costa en el borde norte (z < MIN_Z+30): agua → playa → boardwalk → avenida costera. La autopista sur pasa a ser la "Coast Highway" inland, sin cambiar sus datos.
- Agua: 120 m de ancho, plano a y=-0.35, olas por UV scroll.
- Playa: 26 m de fondo, pendiente y=0.0 → -0.3.
- Boardwalk: 8 m, madera #b98a5a, tablones cada 0.6 m (atlas). Barandilla #f4efe6 h 1.0 m, postes cada 4 m. Bancos, papeleras, puestos de surf.
- Pier: 6 × 70 m a 1.2 m sobre el agua, pilotes cada 5 m (14, instanciados). Plaza final 18×18 con noria de 14 m y cartel "PIER ARCADE" (letras 2.2 m, #ff4fa3 sobre #2a1b4d). Transitable en coche (dead-end con barreras de madera).
- 3 plazas 30×30 (fuente, adoquín #e6d3b0, 8 palmeras en anillo). Hitos: faro rojo/blanco 28 m, cartel "SURF SHOP", torre-reloj 24 m, anfiteatro de arena.

**Viales**
- Avenida costera: 3 carriles por sentido × 3.6 m + mediana doble amarilla 0.5 m = 22.7 m; curva amplia (r ≥ 40 m) en la esquina del pier.
- Avenidas principales (cada 2 columnas VX): 2 por sentido × 3.6 m + mediana = 15.5 m (ROAD_W 6 → 12 solo ahí).
- Secundarias: 1 por sentido, 3.4 m, ancho 7.5 m.
- Cruces: esquinas r 6 m (chaflán 8 tiles), cebras 0.5 m cada 0.9 m, semáforos con brazo.
- Aceras 3 m, bordillo 0.16 m; franja roja/blanca #d94a4a/#f4f4f4 en tramos de la costera.
- Marcas: centrales dobles #f2c200; discontinuas #f4f4f4 (3 m / 6 m, 0.15 m).

**Paleta**
- Cielo #3f9bff (cenit) → #bfe4ff (horizonte); 8 nubes cúmulo #ffffff.
- Mar #1fa6c9 cerca, #0f6fa8 lejos; espuma #eafcff (1.5 m).
- Arena #f0d9a0, mojada #d9bd82. Asfalto #4a4d55 (desgaste #3d3f46). Aceras #c9c6bd. Hierba #5fae4a.
- Fachadas: #f6e3b8, #ff8a65, #4fc3d9, #f2c94c, #e8588a, #8bd17c. Toldos #e8384f/#f4f4f4 y #2bb6a0/#f4f4f4. Ventanas #2b3f5c, reflejo #9bd3ff. Neón en bajos. Texto en carteles ≥ 4.5:1.

**Vegetación (InstancedMesh)**
- Palmera alta: tronco #a67b52, 9–12 m, 8 segmentos; 9–11 hojas (planos curvados, 2.6 m). 220 uds (costera y avenidas cada 12 m).
- Cocotero inclinado 5–6 m: 60 (playa, plazas). Arbustos #3f9a3d 150 (0.8–1.2 m). Macetas #ff5d8f/#ffd23f 80. Hierba de duna #9bbf5a 120.
- 1 draw call por tipo (2 con alpha-test). Sombras solo palmeras a < 60 m.

**Edificios**: costa 1–2 plantas (tiendas, café, surf shop, arcade); centro 5–9 plantas, torres 40–60 m en 4–5 puntos; residencial 3–4 plantas con tejado #c0583a; almacenes junto a la autopista. Reutilizar `emitBuilding`/Mesher y `cityMaterial`; 1 material ciudad + 1 agua + 1 follaje.

**Iluminación**: sol #fff1d6, 3.0, dir (-0.5, 0.75, 0.4); sombras 2048 (móvil 1024), ortográfica ±70 m siguiendo al coche, bias -0.0005. Hemisférica #bfe4ff / #e3cf9e, 0.9. ACES, exposición 1.05 (PC) / 1.0 (móvil), sRGB. Niebla lineal #cfe8fb 120–520 m (móvil 90–380), fondo = gradiente del cielo. Bloom solo PC opcional (0.25, umbral 0.9).

**Presupuesto**: PC ≤ 420 draw calls, ≤ 700 k tris, atlas ≤ 2048²; móvil ≤ 210, ≤ 350 k, ≤ 1024². mergeByCell; culling 260 m (móvil 180 m).

## B. Taxi clásico arcade (convertible años 50, procedural)
- 4.6 × 1.9 × 1.45 m, batalla 2.7 m, ruedas Ø 0.74 × 0.24 m, voladizos 0.95 m, altura libre 0.18 m, cintura 0.95 m, parabrisas hasta 1.35 m (28°), capota bajada, arco del letrero sobre asientos traseros.
- Carrocería: capó/habitáculo/maletero redondeados (bisel 0.06 m), capó abombado con 2 nervios.
- Aletas traseras cola de pez 0.35 m, 18° atrás, piloto rojo #d3202b en lágrima y aleta cromada.
- Parachoques tubo cromado 0.14 m con "balas" (conos 0.18 m) delante; parrilla de 7 barras.
- 4 faros redondos (0.26 y 0.18 m) con aro cromado. Moldura lateral 0.05 m. Neumáticos de banda blanca #f4f4f4.
- Damero 0.28 m en flanco (cuadros 0.14 m #14151a/#f4f4f4, un CanvasTexture 64×16) y franja central de capó 0.4 m.
- Letrero TAXI 0.9 × 0.28 × 0.22 m sobre arco de 2 postes cromados 0.04 m; cara #ffd21a, texto negro "TAXI", emisivo 0.4. Matrícula trasera #ffd21a.
- Interior: asientos corridos rojos #c0272d (rough 0.75), respaldos 0.55 m, volante 0.38 m, salpicadero #e8d9b0.
- Conductor: humano realista sentado con manos al volante. Pasajeros 1–2 atrás, medio cuerpo visible, mano levantada al llegar (0.6 s); aparición con escala 0→1 en 0.25 s.
- Humo de derrape: smoke.ts, #e9e7e1 alpha 0.5.
- Materiales: pintura #ffcc1a MeshPhysical (metal 0.15, rough 0.35, clearcoat 0.6/0.2); cromo #e8edf2 (metal 1, rough 0.12, envMap PMREM 128 px); neumático #1b1c20 rough 0.9; cristal #9bd3ff opacidad 0.35; luces emisivas 0.8/0.6. ≤ 18 k tris, ≤ 8 draw calls, 5 materiales, proxy de sombra. Fallback cromo plano #cfd6dc.
- Feedback (lerp 0.12): roll ±5° en curva, ±9° en derrape; pitch -3° frenando, +2.5° acelerando, +4° al caer de rampa con rebote 0.4 s; suspensión por rueda ±0.06 m; dirección delantera hasta 28°; FOV 62° → 74° con la velocidad. Sin vibración parado.

## C. HUD de juego
Estilo cómic arcade: itálica (skew -8°), Russo One / Racing Sans One, trazo negro 3 px (paint-order: stroke fill) + sombra dura 3 px #0b0b0c (como `.tr-logo`). Colores: #ffd21a info, #ffffff, #ff3fa4 flecha, #e8384f peligro, #3ddc84 ganancias.

**Escritorio (≥ 1024 px)**, márgenes 24 px
- Sup. izq.: flecha rosa 96×96 (giro 0.15 s, pulso ±6 % a 1.5 Hz); "DESTINATION" 14 px amarillo, destino 32 px blanco, "FARE $3.50" 22 px.
- Sup. centro: minimapa 220×150, borde 4 px #0b0b0c + 2 px #ffd21a, fondo #2b4a6b, calles blancas, parques #5fae4a, agua #1fa6c9, jugador amarillo centrado, ruta cian #38d6ff 4 px, pin de damero en destino.
- Sup. der.: tiempo 36 px amarillo (0'58"37; rojo y parpadeo 2 Hz a ≤ 10 s), "EARNED" 22 px verde; debajo frase GPS 40 px amarilla en mayúsculas, máx. 2 líneas, ancho ≤ 36 %, slide 0.2 s; línea de apoyo 20 px blanca.
- Burbuja del pasajero anclada sobre él (+70 px), blanca, borde 3 px, radio 14, cola 14 px, texto 20 px, max 260 px, 2.5 s con fade 0.2 s ("LET'S GO!", "KEEP THE CHANGE!").

**Móvil horizontal (≥ 640×360)**, márgenes 12 px + safe-area
- Flecha 64 px; destino 18 px, tarifa 14 px; minimapa 140×96 (borde 3 px); tiempo 24, ganancias 16, GPS 24 px (ancho 40 %), apoyo 14 px (oculto si no cabe); burbuja 15 px, max 180 px.
- Controles: flechas/volante abajo izq., REVERSE (#f07a1f, 84 px) y DRIVE (#ffd21a, 96 px) abajo der., separación 12 px, táctil ≥ 48 px.
- HUD con pointer-events: none salvo controles; nada en la zona central (40 % ancho × 35 % alto).

**Estados**: botones reposo 0.9 / pulsado escala 0.94 brillo +15 % / deshabilitado 0.4. Tiempo +bonus destello verde "+5s". Ganancias conteo 0.6 s con pop 1.15. Flecha amarilla hacia el pasajero, rosa hacia el destino.

## Criterios de aceptación
1. Captura 16:9 de arranque: mar, playa, boardwalk, ≥ 6 palmeras altas y el taxi, composición similar a 23.jpg.
2. Costera 3 carriles por sentido; curvas sin aristas (r ≥ 40 m).
3. Taxi reconocible como clásico de los 50 desde la cámara trasera (aletas, cromados, damero, TAXI, asientos rojos, conductor).
4. PC ≤ 420 draw calls / 700 k tris; móvil ≤ 210 / 350 k; 0 errores de consola.
5. HUD legible: texto ≥ 24 px (escritorio 32–40), contraste ≥ 4.5:1, sin solapes a 640×360 y 1920×1080.
6. Roll/pitch dentro de los grados; sin vibración parado.
7. Fallback sin PMREM: cromo plano sin romper nada.
