# ADR-001: contratos por marketKey y fallback escalonado

- **Estado:** aceptada
- **Fecha:** 2026-06-26

## Contexto

El frontend no debe conocer IDs numéricos internos de Albion o PostgreSQL. A la
vez, necesita seguir funcionando durante caídas parciales del pipeline.

## Decisión

Los contratos públicos usan `marketKey`. Los precios y el historial siguen la
prioridad:

```text
API central → receiver local → caché del navegador
```

Las consultas del optimizador se agrupan en batches centrales y solo las
combinaciones ausentes degradan al receiver.

## Consecuencias

- React queda desacoplado del catálogo numérico interno.
- La aplicación puede operar de forma degradada.
- La UI debe mostrar origen y frescura para evitar ocultar el fallback.
- Los contratos de los tres repositorios requieren pruebas coordinadas.
