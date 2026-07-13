import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Albion Production Calculator',
  description: 'Documentación funcional y técnica de la calculadora de producción de Albion Online.',
  lang: 'es-CL',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Primeros pasos', link: '/getting-started' },
      { text: 'Arquitectura', link: '/architecture/overview' },
      { text: 'Cuentas', link: '/accounts-access' },
    ],
    sidebar: [
      {
        text: 'Guías',
        items: [
          { text: 'Primeros pasos', link: '/getting-started' },
          { text: 'Cuentas y acceso', link: '/accounts-access' },
        ],
      },
      {
        text: 'Arquitectura',
        items: [
          { text: 'Visión general', link: '/architecture/overview' },
          { text: 'Distribución', link: '/architecture/distribution-model' },
          { text: 'Datos de mercado', link: '/architecture/market-data' },
          {
            text: 'Autenticación y entitlements',
            link: '/architecture/accounts-access',
          },
        ],
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/nachodev-ui/albion-production-calculator',
      },
    ],
    search: { provider: 'local' },
    footer: {
      message: 'Proyecto independiente para análisis de producción en Albion Online.',
      copyright: 'Albion Online es una marca de Sandbox Interactive GmbH.',
    },
  },
})
