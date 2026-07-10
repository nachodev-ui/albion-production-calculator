# ADR-002: distribución hosted-first

- **Estado:** aceptada
- **Fecha:** 2026-07-09

## Contexto

El sistema se construyó inicialmente con frontend, API central, PostgreSQL y
receiver ejecutándose en el mismo equipo para facilitar desarrollo y pruebas.
Ese entorno podía interpretarse erróneamente como el modelo de distribución
final.

Exigir un receiver a cada usuario haría inviable una aplicación pública y
acoplaría el navegador a servicios locales, permisos de red privada y diferencias
entre navegadores.

## Decisión

El frontend público utiliza `albion-market-api` hosteada mediante HTTPS como
única fuente de red requerida. La caché del navegador es su degradación temporal.

`albion-market-data-platform` se distribuye de forma separada como agente local
opcional para colaboradores. Sus forwarders entregan capturas directamente a la
API central autenticada.

El acceso del frontend al receiver se conserva únicamente detrás de
`VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true`, destinado a desarrollo y diagnóstico.
La flag es `false` por defecto y debe permanecer desactivada en builds públicos.

## Consecuencias positivas

- los usuarios normales solo abren la web;
- el receiver puede evolucionar y distribuirse sin condicionar el frontend;
- las capturas de pocos colaboradores benefician a todos;
- producción no realiza peticiones inesperadas a localhost;
- el contrato público queda concentrado en la API central;
- la caché permite una degradación clara sin simular disponibilidad de red.

## Costes y riesgos

- la disponibilidad pública depende de la API central y PostgreSQL;
- el despliegue debe mantener HTTPS, CORS, rate limiting, secretos y backups;
- un colaborador necesita instalar y operar Albion Data Client y el receiver;
- la caché puede contener datos antiguos, por lo que la UI debe mostrar frescura.

## Alternativas descartadas

### Frontend servido junto al receiver para cada usuario

Descartado porque obliga a instalar software local para usar la calculadora y no
corresponde a una aplicación web pública.

### Fallback automático a localhost en producción

Descartado por ser innecesario para usuarios normales, introducir ruido de red y
depender de políticas de navegador, CORS y acceso a redes privadas.

### Eliminar completamente el fallback local

Descartado porque sigue siendo útil para pruebas end-to-end y diagnóstico de
colaboradores, siempre que exista opt-in explícito.
