# Remodelación visual y estructura de navegación

La aplicación ahora funciona sobre un `AppShell` reutilizable y una navegación por módulos.

## Módulos visibles

- **Crafteo:** calculadora actual con catálogo lateral.
- **Refinamiento:** página preparada para el futuro módulo.
- **Presets:** biblioteca local para revisar, aplicar, marcar como predeterminados o eliminar presets.

## Componentes globales añadidos

```text
src/app/
├─ AppHeader.tsx
├─ AppIcons.tsx
├─ AppShell.tsx
├─ MainNavigation.tsx
├─ ModuleHeader.tsx
└─ types.ts
```

## Mejoras de UX

- Identidad actualizada a **Albion Production Calculator**.
- Encabezado global con navegación, estado del catálogo y módulo activo.
- Encabezados contextuales para cada módulo.
- Estado vacío con onboarding, flujo recomendado y beneficios.
- Catálogo lateral convertido en drawer en pantallas pequeñas.
- Página funcional de administración rápida de presets.
- Página informativa de Refinamiento preparada para su implementación.
- Fondo y jerarquía visual renovados sin modificar la lógica de cálculo.
