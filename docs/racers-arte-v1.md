# English Racers — especificación visual v1 (director de arte)

Base: estilo toon/flat, borde azul marino #10204A; UI en cápsulas, botón amarillo #FFD23F con sombra
inferior sólida #C79A00; fondo de menú degradado #10204A → #3B1D7A → #FF3D6E; acentos #7DFF9A, #FF8A8A,
#3B82F6, #8B5CF6; Inter 900 cursiva (3D) / Inter 900 (HUD). Conservar `sky`, `fogNear`, `fogFar` de
`tracks/index.ts` salvo lo indicado. Reutilizar el decorado instanciado existente (`scenery.ts`,
`trackside.ts`, `tracks/city.ts`).

## A. Mapas 3D

### Reglas globales (≤ 150 draw calls y ≤ 60 000 triángulos extra por pista)
- Todo `InstancedMesh`; un material toon/Lambert compartido por familia con `instanceColor`.
- Presupuesto: gradas ≤ 30, árboles ≤ 24, siluetas de fondo ≤ 12, partículas ≤ 6, props ≤ 60, reserva ≥ 18.
- Gradas, árboles y siluetas sin sombra. Sin transparencias salvo nieve (1 draw call).
- Chunks de ~250 m por familia con bounding sphere y `frustumCulled`.
- Animación solo en GPU (`onBeforeCompile`, `uTime`, atributo `aPhase`); cero matrices por frame.
- Móvil: cantidades ×0.5, distancia de dibujo 350 m.

### Público (común)
Gradas de 3 escalones (6 m ancho, 2.5 m alto) a 14–18 m del borde, en rectas y salidas de curva.
Espectador: caja 0.5×0.9×0.3 m. 600–900 por pista (~12 tramos de ~60). Bote vertical 0.15 m con
`sin(uTime*6 + aPhase)`, amplitud ×2 cuando un kart pasa cerca. 6 tonos por pista + 15 % blanco.
Solo a < 300 m del trazado.

### Por pista
1. **campus** (mediodía primavera): #2FD27A, #8CC6FF, #F4E6C8, #B5483A. Robles (cilindro 6 lados + 2
   icosaedros) ×120, 5–9 m, #3FAE5A–#7BD86A. Colinas en 3 capas #6FC48A/#8FD3A2/#B5E0BE a 700–900 m.
   Gradas azul y blanco. Banderines en postes, 2 edificios de ladrillo en silueta.
2. **beach** (mediodía cálido): #36C2FF, #FFE6A8, #FF7A59, #2FB57A. Palmeras (tronco curvo 5 segmentos,
   6 hojas quad doble) ×90, 7–10 m, balanceo por shader. Isla y faro en silueta #5CA9A0 a 900 m; brillo
   del mar por UV. Gradas con toldos de rayas.
3. **roofs** (atardecer): #3B4FA8, #F0A070, #FFD2A0, siluetas #2A2F4A, ventanas #FFB347. Macetas/arbustos
   cónicos ×60 (1.5–3 m, #4E8F5A). Skyline 2 capas (#4A4A7A, #6A5F92) con ventanas emisivas, 150 prismas
   a 500–900 m; chimeneas y depósitos de agua. Público pequeño en azoteas.
4. **neon** (noche): #0A0624, #FF2BD6, #19E3FF, #7B2CFF, #FFE14A. Árboles holográficos (cono de líneas,
   aditivo) ×40. Skyline con bandas emisivas (200 prismas, 2 capas) y 2 anillos de luz girando en el
   cielo. Público en silueta con barras de luz que parpadean. Niebla #2A0F44.
5. **london** (mañana nublada): #4F7FB8, #D3DDE6, #C8102E, #7A6A5A. Plátanos de sombra otoñales ×100
   (#8FA83A/#C9892B). Siluetas Big Ben, London Eye (anillo + 16 cabinas) y Tower Bridge en #8C9AAA a
   600–900 m (1 draw call). Niebla +15 %. Paraguas de colores (conos) y banderas en gradas.
6. **newyork** (tarde dorada): #3F6FC0, #F0B884, #FFE0B8, #1F2A44, #FFC61A. Arces de otoño ×80
   (#E0742B/#F0B83A). Skyline Manhattan 250 prismas, 2 capas (#3A4A6E/#5B6C90), ventanas cálidas.
7. **tokyo** (crepúsculo): #2A2A78, #B8609A, #FFB48A, #FF4D8D. Cerezos ×110 (#FFB7D0/#FF8FB8) con
   pétalos cayendo (1 Points, 300). Fuji (cono truncado, cima blanca) a 1200 m, pagoda, farolillos rojos
   emisivos ×80 en cuerdas.
8. **rio** (mediodía tropical): #009C3B, #FFDF00, #002776, #1A86E0. Palmeras y árboles tropicales ×130
   (#1F9F4A/#0E7A3A). Pan de Azúcar y Cristo Redentor en silueta (#4C8F6A, #FFFFFF) a 900–1200 m; morros
   con favelas de cajas de colores. Público de carnaval, 900–1100.
9. **splash** (parque acuático): #00D2FF, #1786E6, #FFE14A, #FF5A9E. Palmeras, flotadores y 40
   sombrillas. Toboganes tubulares y noria acuática de fondo. Salpicaduras (1 Points, 400).
10. **canyon** (mediodía seco): #FF7A1A, #C85A2A, #8A3A1E, #FFE0B0. Saguaros ×70 (#4E9A5A), arbustos
    secos y rocas. Mesetas 3 capas (#B0522A/#C86A3A/#D98A5A) a 900–1200 m. Polvo (1 Points, 200).
    Pocos palcos de madera. Niebla #F0D2A8.
11. **snow** (mañana fría): #3F7FD8, #F2F8FF, #A8D0F4, abeto #1F5A3A. Abetos de 3 conos con cubierta
    blanca ×160 (6–12 m) y rocas nevadas. **Nieve cayendo**: 1 Points de 1500 (700 móvil) en un cubo de
    120 m que sigue a la cámara, reciclado con `mod` en el vertex shader, 3–5 m/s, deriva lateral
    sinusoidal, 2.5 px, opacidad 0.85, sin depth write. **Nieve acumulada**: bancos en bordes (cápsulas
    aplastadas ×200, #FFFFFF con sombra #DCEBFA) y montículos de 0.6–1.2 m a 4–8 m del borde. Cordillera
    3 capas (#8FB0D8/#6F94C4/#9DBBE0, cumbres blancas) a 800–1400 m. Niebla #E4EEF8 algo más densa.

## B. Carrocerías de kart (sobre `KartView`)
Ids (los define la física en `karts.ts`): `balanced | speedster | drifter | tank | rocket | offroad`.
Escala y offsets sobre la estructura actual; anclas de ruedas, escape, cola y `wingTip` siguen la escala.
Pintura, llantas, alerón y llama del garaje se aplican sobre cualquier carrocería (llama anclada a
`exhaust`). Sin texturas nuevas; triángulos ≤ actual +15 %. Distinguibles a 64 px de ancho.

| Id | Largo | Ancho | Alto | Rasgos |
|---|---|---|---|---|
| balanced | 1.00 | 1.00 | 1.00 | El actual. |
| speedster | 1.18 | 0.92 | 0.82 | Cuña larga y baja, morro afilado, cabina retrasada, aleta dorsal, ruedas finas (r ×0.9). |
| drifter | 1.00 | 1.18 | 0.95 | Ancho, aletas marcadas, alerón grande obligatorio (×1.25), splitter, ruedas traseras anchas. |
| tank | 1.05 | 1.15 | 1.12 | Robusto, defensas cuadradas, barra antivuelco, escapes dobles gruesos, ruedas ×1.1. |
| rocket | 0.85 | 0.90 | 0.95 | Compacto, escapes grandes tipo cohete, chasis a la vista, alerón doble. |
| offroad | 1.05 | 1.10 | 1.20 | Alto, ruedas ×1.25 con taco, faros en el techo, protectores y guardabarros. |

## C. Pantalla de selección de kart (estilo Blur)
- Panel oscuro tipo cristal con bordes en ángulo y acento de neón por kart; fondo = degradado del menú con viñeta.
- Paleta: fondo #10204A; panel #141A55 al 92 %; borde rgba(255,255,255,.14); texto #FFFFFF y
  secundario #C9D2F0; acento #FFD23F (texto #2A1D00); barra actual #4AA3FF; mejora #7DFF9A; sin monedas
  #FF8A8A; bloqueado #5A6390; seleccionado borde blanco 3 px + halo del color del kart.
- Tipografía: título Inter 900 cursiva 28/22 px; etiquetas Inter 800 mayúsculas 12–13 px (0.06em);
  números Inter 900 tabular 16 px; mínimo 12 px.
- Escritorio (≥ 1024): 60 % vista 3D / 40 % ficha; carrusel inferior de 6 tarjetas 120×88 (central ×1.15).
- Móvil horizontal (alto ≤ 520): 3D izquierda 50 %, ficha derecha con scroll; puntos y flechas de 48 px; barras de 10 px.
- Móvil vertical: 3D arriba (40vh), ficha debajo, botón fijo con `safe-area-inset-bottom`; carrusel con swipe y snap.
- Vista 3D: un único canvas/renderer; giro 0.6 rad/s, arrastre para rotar y vuelta al giro tras 2 s;
  cámara ¾; luz clave #FFE6B8 + relleno #4A7FFF; disco de suelo con anillo del color de pintura; sin
  giro con `prefers-reduced-motion`.
- Barras (Aceleración, Velocidad, Agarre/Derrape, Control): 10 segmentos 14×10 px (8×10 móvil), 3 px de
  separación; actual #4AA3FF, vista previa de mejora #7DFF9A con rayado diagonal; valor y "+N".
- Botón mejorar: "Mejorar · Nivel N/5" + moneda y coste, 52 px de alto; activo #FFD23F/sombra #C79A00;
  pulsado baja 3 px; sin monedas #3A4272 + coste #FF8A8A (enfocable, anuncia el motivo); 5/5 "Máximo"
  #7DFF9A deshabilitado; al comprar, segmentos en cascada 60 ms y destello.
- Tarjetas: bloqueado (silueta #1A2150, candado, precio, 60 %, abre vista previa "Desbloquear · coste");
  comprado (✓); seleccionado (borde 3 px, ×1.08, "En uso"); hover (eleva 4 px); foco (anillo blanco 3 px).
- Transiciones: carrusel 280 ms `cubic-bezier(.2,.8,.2,1)`; barras 350 ms escalonadas; entrada 240 ms;
  reduced-motion → fundido 120 ms.
- Accesibilidad: objetivos ≥ 44×44 px; contraste ≥ 4.5:1; carrusel `role="listbox"` con flechas y
  `aria-selected`; barras `role="meter"`; estados no dependen solo del color.

## Criterios de aceptación (capturas)
1. Una captura por pista a 1280×720 y 390×844: gradas de colores, árboles del bioma, silueta de fondo; calls extra ≤ 150.
2. Snow: nieve cayendo (2 capturas distintas), bancos en bordes, abetos nevados.
3. Público animado (2 capturas a 1 s).
4. Hoja de contacto de las 6 carrocerías (lateral y ¾), y cada una con otra pintura, llanta y llama.
5. Selección en 1440×900, 844×390 y 390×844 con estados bloqueado, comprado, seleccionado y sin monedas.
6. Vista previa de mejora en verde con rayado y "+N".
7. Botones ≥ 44 px, contraste ≥ 4.5:1, navegación por teclado con foco visible.
8. 0 errores de consola/WebGL; un solo contexto WebGL en la pantalla de selección.
