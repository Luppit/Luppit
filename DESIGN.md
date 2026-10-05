---
version: alpha
name: Luppit
description: Conversaciones de compra con estado claro y listas tranquilas para volver a lo pendiente.
colors:
  primary: "#83A31E"
  primaryLight: "#DBE4D0"
  background: "#F9FAFB"
  surface: "#FFFFFF"
  text: "#1C1C1C"
  secondaryText: "#333333"
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

Verde oliva para la acción primaria y los contadores de acciones, con números blancos. Los contadores no se muestran cuando su cantidad es cero. Superficies blancas sobre el fondo casi blanco. Texto principal oscuro y texto de apoyo `textMedium`; el color de peligro acompaña resultados negativos, sin convertirlos en compras exitosas. Reutilizar los roles semánticos del tema.

## Typography

Usar las variantes de `Text`: títulos y subtítulos para la pantalla; `body` para filas y formularios; `small` para fechas, cantidades y apoyo. La escala y altura de línea viven en el tema. Permitir salto de línea y crecimiento de texto; no reducir la fuente para acomodar nombres largos.

## Layout

Espaciado del tema y áreas seguras nativas. Filas de ajustes con `GroupedListRow`, listas con desplazamiento propio y carga paginada. Una fila con descripción necesita más aire que una opción breve. Un único propietario de teclado por contenedor.

## Elevation & Depth

El vidrio pertenece a `GlassSurface`, con materiales de `src/themes/glass.ts`: chrome para cabecera, nav para navegación y sheet para popups. Los controles dentro de la hoja permanecen planos. Las filas de cuenta son superficies blancas sin recetas locales de blur o sombra.

## Shapes

`createRoundedSurfaceStyle` define las superficies de listas y tarjetas. Usar los radios de controles existentes; evitar tarjetas anidadas y contenedores decorativos redundantes.

## Components

`GroupedList`, `GroupedListRow` y `GroupedListCountPill` son los propietarios de opciones de cuenta, contadores y avisos discretos. `Button` admite énfasis oscuro, blanco, primario y deshabilitado. `GlobalPopupHost`, `RatingInput` y `useConversationActions` poseen formulario, validación y envío de calificación. `LoadingState`, `StandaloneListEmptyState` y el servicio de toast poseen estados y feedback.

Los accesos de Inicio, incluidas las calificaciones pendientes, reutilizan `HomeShortcut`: mismos márgenes, círculo de icono, texto de apoyo y chevron. Las compras por calificar reutilizan `MarketplaceCardFrame`, como las solicitudes y ofertas: título completo, contexto discreto, material `surface` y acción de ancho completo separada por un divisor.

## Do's and Don'ts

- Mantener etiquetas y elegibilidad de acciones en RPCs y metadatos del servidor.
- Mostrar contraparte, compra y resultado real al calificar; conservar el historial.
- Mostrar un recordatorio de cierre una vez por perfil, conversación y evento en el dispositivo. El contador siempre se vuelve a consultar al servidor.
- Cerrar hojas propias al cambiar de perfil o salir de la pantalla; conservar los valores del formulario ante errores de envío.
- Evitar nuevos tabs, decoración de marketing, badges globales y textos técnicos en el recorrido de compra.
