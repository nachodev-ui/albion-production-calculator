# Pruebas y calidad

## Puerta de validación

Todo cambio debe pasar:

```bash
pnpm test
pnpm lint
pnpm build
pnpm docs:build
```

## Contratos cubiertos

Las pruebas de mercado verifican:

- solicitudes centrales por `marketKey` sin `location_id`;
- fallback de API central a receiver;
- restauración desde caché cuando ambas fuentes fallan;
- batching histórico de múltiples candidatos;
- mapeo de precio, volumen, calidad y timestamps;
- cálculos de liquidez y rentabilidad.

## Criterio para nuevos tests

Las reglas de negocio deben probarse en módulos puros. Los clientes HTTP deben
probar el cuerpo de la solicitud y el mapeo de respuesta. Los stores deben
concentrarse en orquestación y estados de carga, error y degradación.

## Integración viva

La validación completa de API central, receiver, PostgreSQL y fallback del
frontend se ejecuta mediante el arnés descrito en
[Prueba end-to-end](./end-to-end.md). La suite normal continúa siendo la puerta
rápida y determinista para cada cambio.
