# Política de documentación

## Fuente de verdad

- `README.md`: presentación y arranque rápido.
- `docs/`: comportamiento vigente y operación.
- `docs/decisions/`: decisiones arquitectónicas duraderas.
- `docs/archive/`: contexto histórico, no normativo.

## Regla para cambios futuros

No se deben crear nuevos `.md` de entrega en la raíz. Cuando una funcionalidad
cambia:

1. actualiza la página vigente correspondiente;
2. añade un ADR solo si la decisión afecta contratos o varias capas;
3. usa Git y el changelog de releases para el detalle cronológico;
4. evita duplicar la misma explicación en varios documentos.

## Calidad mínima

Cada página debe responder una responsabilidad concreta, incluir comandos
verificables cuando corresponda y evitar describir código que ya no existe. La
compilación de VitePress forma parte de la puerta de validación.
