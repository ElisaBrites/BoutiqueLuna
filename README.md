# Boutique Luna 💗

Un juego de vestidos y amigas, en pixel art y para jugar solo con el mouse.

Luna atiende una boutique: recibe clientas, las acompaña a un probador, les lleva el
vestido que piden y cobra en la caja antes de que se les acabe la paciencia.

## Cómo jugar

1. Abrí `index.html` con doble clic (funciona sin internet) o serví la carpeta con
   `python3 -m http.server` y entrá a `http://localhost:8000`.
2. Tocá **Entrar a la boutique**, elegí un nivel y empezá.
3. Tocá a una clienta **y después** un probador libre. La clienta camina hasta el
   probador y se queda ahí.
4. El pedido se ve **solo como un ícono** arriba de su cabeza (vestido de lunares o
   de flores). Los números sobre los objetivos indican el próximo paso: **1** clienta,
   **2** probador, **3** vestido, **4** entrega, **5** caja y **6** bandeja.
5. Llevá el vestido desde el perchero hasta la clienta o su probador. Mientras se
   prueba, la cortina queda **cerrada** y la barra de la cortina marca el progreso.
6. Cuando termina de probarse el vestido, puede pedir otro. Repetí hasta completar
   su pedido.
7. Cuando esté lista, tocá la **caja registradora** para cobrar. Al terminar de
   cobrar, la clienta se va y suma monedas.
8. Llegá a la meta de monedas del nivel antes de que se te acaben las vidas.

No se usa el teclado: todo se juega con clics. La interfaz está en español.

## Reglas

- **Acciones secuenciales:** cada acción de Luna debe terminar antes de empezar la
  siguiente. Los números sobre los objetivos y en la tarjeta de pista marcan el orden.
  Mientras cobra, Luna **no puede dejar la caja** hasta terminar el cobro.
- **Paciencia:** cada pedido tiene un reloj de **20 segundos** que rodea el **ícono
  del pedido**, no a la clienta. El reloj se reinicia cuando llega al probador, cuando
  termina de probarse cada vestido y cuando llega a la caja. Mientras camina, se
  prueba un vestido o se cobra, el reloj se pausa.
- **Probador:** cada vestido tarda **5 segundos** en probarse. Durante la prueba la
  clienta se oculta detrás de la **cortina cerrada** y una barra sobre la cortina
  muestra el progreso. Al terminar, la cortina se abre y la clienta vuelve a pedir.
- **Pedidos de a uno:** la clienta pide un vestido por vez; el ícono muestra solo el
  pedido actual. Los precios de los vestidos **no se muestran** en pantalla; solo se
  ve el ícono de lo que piden.
- **Manos:** Luna puede llevar **2 vestidos como máximo**. Se ve en el contador
  **Manos 0/2**, abajo a la derecha.
- **Percheros:** si tenés las manos vacías, tocá un perchero para agarrar un vestido.
  Si llevás un vestido de otro tipo y te queda lugar, podés agarrar uno más. Si llevás
  el mismo tipo (o tenés las manos llenas), tocar el perchero cuelga los vestidos de
  ese tipo.
- **Bandeja:** los vestidos que llevás aparecen en la bandeja de la esquina inferior
  derecha. Tocá **cada vestido** para que Luna lo lleve directamente a su perchero.
  Ya no se tiran al piso.
- **Vestido equivocado:** si le llevás a una clienta un vestido que no pidió, lo
  rechaza y el vestido sigue en tu mano.
- **Clienta enojada:** si se acaba su paciencia, se va sin pagar. Eso **no** cuesta
  una vida.
- **Vidas:** tenés hasta **5 corazones**. Solo perdés **1 vida** cuando perdés el
  nivel (si ya no podés llegar a la meta). Las vidas se recuperan solas, una cada
  5 minutos, o se compran en la tienda.
- **Estrellas:** al ganar, las estrellas dependen de cuántas clientas se enojaron
  (3 estrellas si no se enojó ninguna; mínimo 1).
- **Meta:** cada nivel pide una cantidad de monedas. Completalo para desbloquear el
  siguiente. Hay 5 niveles.
- **Mejoras:** las monedas y las mejoras se guardan solas en el navegador. Las
  mejoras son permanentes:
  - **Zapatillas de ballet:** Luna camina más rápido.
  - **Té de manzanilla:** +4 segundos de paciencia por nivel de mejora.
  - **Caja exprés:** cobrar tarda 1 segundo menos por nivel (mínimo 3 segundos).
  - **Propina del corazón:** +1 moneda por clienta cobrada por nivel de mejora.

## Detalles técnicos

- Motor 2D en un canvas de **400 × 225 píxeles**, dibujado a **1600 × 900** y
  escalado para entrar en la pantalla, con `image-rendering: pixelated`.
- Los menús, el HUD, los modales y las pistas son HTML/CSS; el salón, las clientas,
  los vestidos, los relojes y los íconos se dibujan en el canvas.
- Tipografía pixel **Pixelify Sans** incluida en `assets/fonts/`.
- Sin dependencias, sin instalación y sin conexión a internet.

## Estructura

- `index.html` — pantallas, HUD y estructura del salón.
- `css/` — estilos pixel del salón, la casa, los botones y las ventanas.
- `js/data.js` — niveles, constantes, paletas y coordenadas del salón.
- `js/art.js` — sprites pixel, escenario, íconos y utilidades de dibujo.
- `js/play.js` — lógica del juego, pedidos, relojes, entregas, cobros y resultados.
- `js/state.js` — guardado, vidas, HUD y ajuste de escala de la pantalla.
- `js/ui.js` — inicio, tarjetas de nivel, cómo jugar, tienda, menú y modales.
- `assets/` — tipografía pixel e ícono.

Hecho con HTML, CSS y JavaScript, sin instalaciones ni dependencias.
