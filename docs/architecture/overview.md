# Arquitectura de la aplicación

## Capas principales

```text
src/core       dominio y casos de uso puros
src/data       catálogos, datasets y repositorios
src/features   UI, stores y adaptadores por funcionalidad
src/shared     componentes y tema compartidos
```

La interfaz está construida con React y TypeScript. Zustand conserva el estado
de configuración, precios, historial, presets y navegación. Las reglas de
cálculo que pueden probarse sin navegador permanecen fuera de los componentes.

## Flujo de cálculo

```text
selección de objeto
  → receta y cantidades
  → configuración de producción
  → precios manuales o automáticos
  → retorno de recursos y tarifas
  → resultado económico
  → comparación y recomendación de mercado
```

## Persistencia en navegador

Se persisten de forma versionada:

- precios manuales;
- configuración de mercado;
- ciudades individuales por material;
- presets;
- snapshots de precios actuales;
- snapshots de historial.

Las claves cambian de versión cuando cambia el contrato. Los lectores pueden
migrar formatos anteriores, pero la escritura siempre utiliza la versión vigente.
