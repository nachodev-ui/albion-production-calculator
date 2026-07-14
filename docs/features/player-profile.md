# Mi perfil de Albion

La ruta `/profile` permite a una cuenta autenticada vincular un personaje público de Albion Online.

- La vinculación se marca como no verificada y no demuestra propiedad del personaje.
- La búsqueda admite los servidores Americas, Europe y Asia.
- El resumen muestra kills, muertes, K/D y fama PvP.
- La actividad reciente utiliza el caché de la API central.
- La actualización manual respeta un cooldown y conserva los últimos datos disponibles ante fallos del proveedor.
- Desvincular elimina el vínculo y la actividad guardada para esa cuenta.

La interfaz usa rutas separadas para consultar, vincular, actualizar y desvincular el personaje, evitando ambigüedades en el contrato HTTP.
