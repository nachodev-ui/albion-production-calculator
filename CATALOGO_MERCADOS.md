# Catálogo de mercados

El servicio local es la única fuente de mercados. React consulta `/markets` y
usa las claves recibidas en todos sus selectores y peticiones.

Mercados regulares esperados:

- Bridgewatch
- Martlock
- Lymhurst
- Fort Sterling
- Thetford
- Caerleon
- Brecilien

Black Market existe en el contrato, pero no se muestra mientras el backend lo
mantenga deshabilitado o sin `marketLocationId`.
