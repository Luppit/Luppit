---
version: alpha
name: Luppit
description: Conversaciones de compra con estado claro y listas tranquilas para volver a lo pendiente.
colors:
  primary: "#52670F"
  primaryLight: "#DBE4D0"
  background: "#F9FAFB"
  surface: "#FFFFFF"
  text: "#1C1C1C"
  secondaryText: "#333333"
  mutedText: "#62665D"
  border: "#DDDDDD"
  danger: "#A52100"
typography:
  body:
    fontFamily: Poppins_400Regular
  emphasis:
    fontFamily: Poppins_600SemiBold
rounded:
  surface: 28px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Luppit

## Overview

Producto móvil para compradores y vendedores. La referencia es la conversación de compra existente: estado actual visible, condiciones canónicas consultables y controles discretos. Mi cuenta permite volver a tareas del perfil sin devolver compras cerradas al Inicio activo. Copia en español; importes y resultados proceden del servidor.

Este documento registra el diseño existente. Los propietarios de los valores siguen siendo `src/themes/colors.ts`, `typography.ts`, `fontScale.ts`, `spacing.ts`, `borders.ts` y `glass.ts`; `ThemeProvider` los lleva a los componentes. No se generan tokens desde este archivo. Las reglas de comportamiento vigentes están en los `AGENTS.md` de cada superficie y en `docs/conversation-stages.md`.

## Colors

Verde oliva para la acción primaria y los contadores de acciones, con números de alto contraste. Los contadores no se muestran cuando su cantidad es cero. Texto principal `textDark`, apoyo `textMedium` y metadatos legibles `textMuted`; no reutilizar colores de estados para texto de apoyo. El color de peligro acompaña resultados negativos, sin convertirlos en compras exitosas. Reutilizar los roles semánticos del tema. La apariencia oscura usa una base carbón casi neutra, superficies de contenido más claras y hojas elevadas un nivel adicional; reserva el oliva para acciones y selección.

`ThemeProvider` permite Claro, Oscuro o Sistema desde Configuración → Apariencia. Claro es la opción inicial cuando no hay una preferencia válida guardada; se respetan las selecciones existentes. La preferencia se guarda en el dispositivo y se comparte entre perfiles. La apariencia resuelta controla colores, vidrio, barra de estado y controles nativos de la app. `colors`/`darkColors` y `glass`/`darkGlass` mantienen los mismos roles para superficies claras y oscuras. `backgroudWhite` conserva su nombre por compatibilidad con la configuración existente, pero representa la superficie del tema. `white` es tinta blanca invariable para controles sobre fotos o fondos negros. El logotipo conserva su oliva original; los controles usan un oliva más oscuro en modo claro y más luminoso en modo oscuro para mantener contraste.

## Typography

Usar las variantes de `Text`: títulos y subtítulos para la pantalla; `body` para filas y formularios; `small` para fechas, cantidades y apoyo. La escala y altura de línea viven en el tema. Permitir salto de línea y crecimiento de texto; no reducir la fuente para acomodar nombres largos.

El límite compartido de ampliación es 2×. El espejo y el campo del compositor usan el mismo límite. Las etiquetas compactas de navegación conservan un límite explícito de 1.3× dentro de la barra de cinco destinos; su nombre accesible permanece completo. Filas, botones, pestañas internas y contadores crecen verticalmente con su texto. Con ampliación mayor a 1.3×, las etapas del inicio usan filas completas y los metadatos del chat apilan contraparte y hora para conservar palabras y cantidades completas.

## Layout

Espaciado del tema y áreas seguras nativas. Filas de ajustes con `GroupedListRow`, listas con desplazamiento propio y carga paginada. Una fila con descripción necesita más aire que una opción breve. Un único propietario de teclado por contenedor.

La cabecera de Inicio participa en el flujo del layout y posee su área segura superior; el contenido no calcula una copia de su altura. Un solo resultado usa el ancho disponible; varios conservan el carrusel. Las tarjetas y los textos siguen siendo genéricos para cualquier categoría del servidor. Chats muestra el título completo, contraparte y fecha alineadas, estado completo y una vista previa de dos líneas. Copiar y compartir mensajes se agrupan en el menú de cada mensaje; reintentar sigue visible ante fallos.

## Elevation & Depth

El vidrio pertenece a `GlassSurface`, con materiales de `src/themes/glass.ts`: chrome para cabecera, nav para navegación y sheet para popups. Los controles dentro de la hoja permanecen planos. Las filas de cuenta son superficies blancas sin recetas locales de blur o sombra.

## Shapes

`createRoundedSurfaceStyle` define las superficies de listas y tarjetas. Usar los radios de controles existentes; evitar tarjetas anidadas y contenedores decorativos redundantes.

## Components

`GroupedList`, `GroupedListRow` y `GroupedListCountPill` son los propietarios de opciones de cuenta, contadores y avisos discretos. `Button` admite énfasis oscuro, blanco, primario y deshabilitado. `GlobalPopupHost`, `RatingInput` y `useConversationActions` poseen formulario, validación y envío de calificación. `LoadingState`, `StandaloneListEmptyState` y el servicio de toast poseen estados y feedback.

Los accesos de Inicio, incluidas las calificaciones pendientes, reutilizan `HomeShortcut`: mismos márgenes, círculo de icono, texto de apoyo y chevron. Las compras por calificar reutilizan `MarketplaceCardFrame`, como las solicitudes y ofertas: título completo, contexto discreto, material `surface` y acción de ancho completo separada por un divisor.

Las vistas de Inicio usan la variante `homeStage` de `LuppitChip` dentro de un control unido, sin desplazamiento horizontal. Las tres opciones conservan el orden del servidor y siguen visibles con cero resultados. Comprador: Activas, Atención e Historial; vendedor: Para ti, Atención y En curso. En vendedor, las opciones en línea se dimensionan según su contenido; comprador y presentación apilada conservan anchos iguales. Etiquetas, cantidades y pertenencia proceden de `home_hub_section` y los RPCs del hub; el filtro explícito de canceladas usa una etiqueta contextual del servidor. En pantallas estrechas o con texto ampliado, los contadores se colocan debajo de las etiquetas. Estos contadores de vistas sí muestran cero para mantener las opciones reconocibles.

La conversación conserva el contenido de `ConversationStageCard` en una tarjeta expandida blanca y opaca, con sus acciones al final y en el orden del servidor. `ConversationFloatingCard` mantiene una superficie blanca opaca también en la versión compacta y un chevron independiente sin contador. La acción compacta prioriza el estilo positivo/primario del servidor, después una acción no destructiva; si no existe ninguna, muestra el estado pasivo. El contenedor flotante es transparente; el historial reserva esa altura compacta con padding y puede desplazarse detrás de la tarjeta. El acceso canónico a Resumen permanece bajo la cabecera, usa una superficie blanca opaca y reutiliza su popup existente. Los controles de contexto de crear/modificar oferta siguen el mismo material blanco. La expansión es estado visual local; etiquetas, plazos, elegibilidad y acciones siguen siendo del servidor.

Las tarjetas de Ofertas agrupan vendedor, provincia y calificación en la cabecera. El total en carbón precede a la descripción completa; las ofertas para comparar muestran cantidad y precio unitario a su derecha cuando hay espacio. La oferta seleccionada separa cotización y estado de entrega, con Generar código junto a Ver chat cuando el servidor habilita esa acción. En pantallas estrechas o con texto ampliado los bloques se apilan. El historial permanece desplegable dentro de la misma tarjeta, con su contador debajo del título. Los datos, textos, acciones y popups existentes conservan sus propietarios.

Los resúmenes separan precio, descripción, fotos y entrega mediante ritmo vertical y divisores, sin anidar una tarjeta por sección. El detalle de ofertas del vendedor presenta el total con la misma jerarquía tipográfica que el comprador, antes de la descripción. Las confirmaciones de salida enfatizan seguir editando y conservan sus acciones y semántica de borrador.

## Do's and Don'ts

- Mantener etiquetas y elegibilidad de acciones en RPCs y metadatos del servidor.
- Mostrar contraparte, compra y resultado real al calificar; conservar el historial.
- Mostrar un recordatorio de cierre una vez por perfil, conversación y evento en el dispositivo. El contador siempre se vuelve a consultar al servidor.
- Cerrar hojas propias al cambiar de perfil o salir de la pantalla; conservar los valores del formulario ante errores de envío.
- Evitar nuevos tabs, decoración de marketing, badges globales y textos técnicos en el recorrido de compra.
