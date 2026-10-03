# Precios con conceptos complementarios

Implementación iniciada el 1 de octubre de 2026 e integrada con las etapas de conversación para la publicación de iOS.

Una oferta conserva su concepto principal y permite agregar conceptos complementarios con importe, base, cantidad y unidad propios. La interpretación usa la misma estructura para productos y servicios complementarios de cualquier categoría. Las alternativas siguen siendo ofertas independientes.

| Ejemplo | Principal | Complemento | Subtotal antes de envío |
| --- | --- | --- | --- |
| Cuatro llantas con alineado | 4 × 40.000 | 5.000 por el trabajo completo | 165.000 |
| Dos llantas, mismo alineado | 2 × 40.000 | 5.000 por el trabajo completo | 85.000 |
| Mueble con armado | 100.000 por el conjunto | 20.000 por el armado completo | 120.000 |
| Material por peso con corte | Cantidad fraccionaria × tarifa por kg | Cargo con alcance propio | Suma de ambos conceptos |

## Contrato

- Los campos existentes `price`, `price_basis` y `quantity_offered` continúan representando el principal. `unit_label` describe su unidad.
- `purchase_offer_component` guarda cada complemento publicado: UUID estable, descripción, `charge_mode`, importe, base, cantidad, unidad y orden.
- `EXTRA` suma su propio importe. `UNIT` multiplica su propia cantidad; `TOTAL` cobra su alcance completo. Cambiar la cantidad principal conserva un servicio fijo.
- `INCLUDED` agrega cero y se muestra como **Incluido**. No se inventa su precio independiente.
- `UNRESOLVED` existe solo en el borrador. Un importe o alcance pendiente conserva el subtotal desconocido e impide publicar la opción seleccionada. Un dato desconocido nunca se convierte en cero.
- Un paquete puede conservar un único precio principal total. La AI debe aclarar servicios opcionales y mantener alternativas separadas, sin sumar ni descomponer importes arbitrariamente.
- El envío continúa en `fulfillment`. Se suma una vez al subtotal completo cuando su costo está definido; un costo desconocido conserva el total de envío desconocido.

El RPC `get_seller_offer_pricing` valida el borrador con la categoría real de la solicitud y calcula el subtotal en PostgreSQL. La función AI consulta esta política y este cálculo con el cliente autenticado. La publicación vuelve a validar dentro de la transacción.

`offer_category_pricing_policy` permite restringir unidades, fracciones y cantidad de complementos. Sin una fila específica, admite unidades libres, fracciones y hasta 20 complementos. La política se aplica a la categoría exacta; no hereda reglas de categorías superiores. Esta implementación no agrega políticas específicas de llantas ni configura categorías en un entorno remoto.

## Revisión y acuerdos

El editor, su resumen y el popup reutilizan los componentes actuales para mostrar el principal, los cargos complementarios, los incluidos y el subtotal completo. Las tarjetas y los ordenamientos usan `offer_subtotal`; conservan la separación existente de monedas.

Los borradores y las aclaraciones conservan el UUID del concepto. Una respuesta breve como **Total** se asocia a la pregunta pendiente de ese concepto. En lotes, también conserva la opción a la que pertenece. Eliminar el concepto elimina esa asociación.

Proponer cambios conserva los términos publicados hasta la aprobación del comprador. El resumen general muestra los términos vigentes; la confirmación de cambios muestra los términos propuestos, incluyendo sus totales de entrega. Las propuestas y revisiones de acuerdo guardan el desglose completo. La aprobación y los reintentos no duplican conceptos ni acuerdos.

## Compatibilidad

El cliente nuevo declara capacidad con `X-Luppit-Pricing-Version: 2` en la función AI y `pricing_version: 2` en las acciones de conversación. La capacidad procede del código del cliente; no se entrega en los valores predeterminados del popup que un cliente antiguo podría reenviar.

La publicación, la aceptación y la aprobación de cambios con complementos o unidades nuevas requieren esa capacidad. Los clientes antiguos reciben `pricing_update_required` al intentar operar esos términos. Las ofertas simples mantienen el cálculo y el hash de revisión existentes, y las llamadas anteriores al RPC de publicación siguen funcionando con los parámetros nuevos opcionales.

Las tablas nuevas no admiten lectura o escritura directa de clientes. Los RPCs verifican propiedad y participación, y los helpers internos no tienen ejecución pública.

## Archivos principales

- DB: [migración](/Users/josedanielcr/Development/luppit-supabase/supabase/migrations/20261001145337_reusable_offer_pricing.sql), [pruebas del contrato](/Users/josedanielcr/Development/luppit-supabase/supabase/tests/database/reusable_offer_pricing.test.sql), [pruebas de lotes](/Users/josedanielcr/Development/luppit-supabase/supabase/tests/database/reusable_offer_pricing_batch.test.sql) y [pruebas de concurrencia](/Users/josedanielcr/Development/luppit-supabase/supabase/tests/concurrency/offer_ai_revisions.py).
- Edge: [interpretación y validación](/Users/josedanielcr/Development/ai-edge-functions/supabase/functions/ai-vendedor-completar/offerPricing.ts) y [flujo del asistente](/Users/josedanielcr/Development/ai-edge-functions/supabase/functions/ai-vendedor-completar/index.ts).
- App: [editor](/Users/josedanielcr/Development/Luppit/app/(modal)/offer.tsx), [presentación del precio](/Users/josedanielcr/Development/Luppit/src/utils/conversationOfferPrice.ts), [resumen](/Users/josedanielcr/Development/Luppit/src/utils/conversationOfferSummary.ts) y [tipos de DB](/Users/josedanielcr/Development/Luppit/src/types/database.types.ts).

## Verificación local

- App: 377 tests unitarios, TypeScript y ESLint del proyecto completos, sin errores.
- Edge: 103 tests con comprobación de tipos, sin fallos. Un test de evaluación con el modelo real queda omitido porque no hay credenciales de evaluación configuradas.
- DB: 777 comprobaciones pgTAP en 18 suites con conversaciones aplicadas antes de precios, sin fallos. La instalación desde cero y otras 243 comprobaciones del contrato de etapas/precios también pasaron en la base local aislada.
- Concurrencia: 17 escenarios en una copia desechable de esa base, incluyendo aprobación duplicada de términos complementarios y bloqueos del vendedor durante propuestas activas.
- `git diff --check` de los tres repositorios, sin errores.

Las pruebas cubren alcance independiente, incluidos, importes y bases pendientes, cantidades fraccionarias, políticas de unidades, rechazo de NaN/Infinity, envío desconocido, ordenamiento por subtotal, identidad y permisos, lotes atómicos, reintentos, cambios propuestos y términos vigentes separados, snapshots y regresiones del ciclo de compra.

Las salidas de AI se controlan en los tests del flujo. Esto verifica el contrato y la persistencia, pero no demuestra todavía la precisión de un modelo real ante todos los mensajes ni una interacción completa en iOS o Android. No se ejecutó QA nativo de esta implementación.

## Despliegue

1. Aplicar la migración en el repositorio DB y verificar los RPCs y permisos.
2. Desplegar `ai-vendedor-completar` desde el repositorio Edge.
3. Publicar la app con el desglose y la declaración explícita de capacidad. Verificar creación, aclaración, restauración, publicación y aprobación desde comprador y vendedor con el modelo real y dispositivos.

Los compradores con versiones antiguas deben actualizar para aceptar ofertas con el contrato ampliado. Al revertir una publicación de app o Edge, conservar los datos, los RPCs y las protecciones de capacidad necesarios para revisar ofertas ya creadas; ocultar los complementos alteraría los términos que el comprador revisa.

Esta implementación amplía los precios dentro del ciclo actual de ofertas. Conserva sus requisitos de fotos y entrega. Un flujo específico para servicios independientes sin entrega física, hitos, suscripciones, impuestos, pagos o un carrito de varios conceptos principales requiere una decisión de producto adicional.

La migración `20261001145337` está aplicada en el proyecto conectado. Mantiene atómicamente la presentación y el bloqueo del vendedor cuando las etapas de conversación se desplegaron antes. Los repositorios de DB y Edge están integrados y sincronizados en `main`; la publicación solicitada es únicamente para iOS/TestFlight.
