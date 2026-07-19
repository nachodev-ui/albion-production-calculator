# Cloudflare edge checklist

Las redirecciones entre dominios requieren acceso a la zona de Cloudflare y no pueden representarse en `_redirects` de Pages.

- `www.albioncalculator.app/*` → `https://albioncalculator.app/${path}` con 301.
- `albion-production-calculator.pages.dev/*` → `https://albioncalculator.app/${path}` con 301.
- Conservar query string en ambas reglas.
- Confirmar Always Use HTTPS.
