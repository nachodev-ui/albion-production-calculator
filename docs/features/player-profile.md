# Mi perfil de Albion

La ruta `/profile` permite a una cuenta autenticada vincular un personaje público de Albion Online.

- La vinculación se marca como no verificada y no demuestra propiedad del personaje.
- La búsqueda admite los servidores Americas, Europe y Asia y muestra el avatar público del resultado.
- La cabecera utiliza el avatar, gremio, alianza, servidor, estado de verificación y arma destacada del personaje.
- El resumen muestra victorias, derrotas, K/D, combates analizados y fama PvP mediante tarjetas visuales.
- La build más utilizada y el arma principal se calculan a partir de la actividad reciente guardada.
- Cada enfrentamiento muestra el equipamiento conocido de ambos jugadores, IP, fama, fecha y tamaño aproximado de la pelea.
- Los iconos se cargan desde el servicio de render público de Albion y conservan placeholders cuando una imagen no está disponible.
- La actividad reciente utiliza el caché de la API central y mantiene compatibilidad con eventos antiguos que solo incluían `weaponType`.
- La actualización manual respeta un cooldown y conserva los últimos datos disponibles ante fallos del proveedor.
- Desvincular elimina el vínculo y la actividad guardada para esa cuenta.

La interfaz usa rutas separadas para consultar, vincular, actualizar y desvincular el personaje, evitando ambigüedades en el contrato HTTP.
