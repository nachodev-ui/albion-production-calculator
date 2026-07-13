# Personalización de Auth0 Universal Login

## Objetivo

Alinear la pantalla alojada por Auth0 con la estética oscura de Albion Production Calculator sin introducir secretos en el frontend ni reemplazar Universal Login por un formulario propio.

La hoja de estilos de la aplicación no controla esta pantalla porque el login se renderiza en el dominio de Auth0. La personalización se aplica desde el tenant de Auth0.

## Recursos preparados

Después de desplegar esta rama en Cloudflare Pages, el logo quedará disponible en:

```text
https://albion-production-calculator.pages.dev/brand/auth0-login-logo.svg
```

Valores visuales recomendados:

| Propiedad | Valor |
| --- | --- |
| Logo | URL anterior |
| Color principal | `#38BDF8` |
| Fondo de página | `#0B1220` |
| Fondo de tarjeta | `#111C2E` |
| Texto principal | `#F8FAFC` |
| Texto secundario | `#94A3B8` |
| Bordes | `#334155` |
| Radio de controles | 12–16 px |

## Configuración en Auth0 Dashboard

1. Abrir el tenant `albion-production-calculator`.
2. Ir a **Branding → Universal Login**.
3. Mantener **New Universal Login** como experiencia activa.
4. En la sección de branding o theme:
   - establecer el logo con la URL pública indicada;
   - usar `#38BDF8` como color primario;
   - usar `#0B1220` como fondo de página;
   - elegir una tarjeta oscura, bordes discretos y botones con esquinas redondeadas;
   - conservar contraste suficiente para errores, enlaces y estados de foco.
5. Guardar y previsualizar los prompts de login, registro, recuperación de contraseña y consentimiento.

## Textos recomendados

Nombre de la aplicación:

```text
Albion Production Calculator
```

Descripción breve:

```text
Inicia sesión para sincronizar tu cuenta, permisos y configuraciones.
```

Botón principal:

```text
Continuar
```

Enlace de registro:

```text
Crear una cuenta
```

No se debe prometer que Auth0 habilita precios más recientes ni asociar el login con la frescura de mercado.

## URLs que deben permanecer configuradas

Para la aplicación SPA de producción:

```text
Allowed Callback URLs:
https://albion-production-calculator.pages.dev

Allowed Logout URLs:
https://albion-production-calculator.pages.dev

Allowed Web Origins:
https://albion-production-calculator.pages.dev
```

Para desarrollo local se pueden conservar además:

```text
http://localhost:5173
http://127.0.0.1:5173
```

No agregar comodines a producción.

## Alcance de esta etapa

Esta etapa usa las opciones visuales administradas por Universal Login. Una plantilla HTML avanzada, un dominio de autenticación personalizado o cambios profundos por prompt deben evaluarse en el Hito 4, junto con el dominio definitivo y las políticas legales.

## Validación

Comprobar el siguiente recorrido en una ventana privada:

1. Abrir `/account`.
2. Presionar **Iniciar sesión**.
3. Confirmar que se visualizan el logo, fondo oscuro, color de acción y textos correctos.
4. Iniciar sesión.
5. Confirmar el retorno a la ruta original.
6. Cerrar sesión y confirmar el retorno a la aplicación.
7. Probar recuperación de contraseña y registro para verificar que todos los prompts mantienen la misma identidad visual.

## Rollback

Si el logo no carga o el contraste resulta insuficiente:

1. restaurar temporalmente el branding predeterminado de Auth0;
2. verificar que el recurso de Cloudflare responde con `200` y `Content-Type: image/svg+xml`;
3. corregir el asset o los colores;
4. volver a aplicar el theme una vez validado.
