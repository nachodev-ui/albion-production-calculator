# Exportar a PDF

La exportación no genera un PDF mediante una librería externa. En su lugar, crea una página imprimible dedicada y utiliza el sistema de impresión del navegador.

## Flujo

1. El usuario presiona **Exportar PDF**.
2. La calculadora crea una instantánea serializable del cálculo actual.
3. Se abre una pestaña independiente con el informe limpio.
4. El diálogo de impresión se abre automáticamente.
5. El usuario elige **Guardar como PDF**.

## Archivos principales

- `CalculationPrintPage.tsx`: carga la instantánea y controla la impresión.
- `CalculationPrintView.tsx`: diseña el informe.
- `printSummaryStorage.ts`: comparte temporalmente los datos entre pestañas.
- `calculationSummary.ts`: define la estructura serializable común.
- `index.css`: contiene los estilos A4 y reglas `@media print`.

Este enfoque evita dependencias adicionales, reutiliza los cálculos existentes y permite imprimir físicamente el informe si el usuario lo necesita.
