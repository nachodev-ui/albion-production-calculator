import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'es-CL',
  title: 'Albion Production Calculator',
  description:
    'Documentación técnica y funcional de la calculadora de producción y su integración de mercado.',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Distribución', link: '/architecture/distribution-model' },
      { text: 'Arquitectura', link: '/architecture/overview' },
      { text: 'Mercado', link: '/architecture/market-data' },
      { text: 'Despliegue', link: '/operations/production-deployment' },
    ],
    sidebar: [
      {
        text: 'Introducción',
        items: [
          { text: 'Visión general', link: '/' },
          { text: 'Primeros pasos', link: '/getting-started' },
        ],
      },
      {
        text: 'Arquitectura',
        items: [
          {
            text: 'Modelo de distribución',
            link: '/architecture/distribution-model',
          },
          { text: 'Aplicación', link: '/architecture/overview' },
          { text: 'Datos de mercado', link: '/architecture/market-data' },
        ],
      },
      {
        text: 'Funcionalidades',
        items: [
          { text: 'Cálculo de producción', link: '/features/calculation' },
          { text: 'Análisis de mercado', link: '/features/market-analysis' },
        ],
      },
      {
        text: 'Operación',
        items: [
          {
            text: 'Desarrollo local',
            link: '/operations/local-development',
          },
          {
            text: 'Despliegue público',
            link: '/operations/production-deployment',
          },
          { text: 'Pruebas y calidad', link: '/operations/testing' },
          {
            text: 'Rendimiento y calidad',
            link: '/operations/performance-quality',
          },
          {
            text: 'Política de documentación',
            link: '/operations/documentation',
          },
        ],
      },
      {
        text: 'Decisiones',
        items: [
          {
            text: 'ADR-001: marketKey y fallback',
            link: '/decisions/0001-market-keys-and-fallback',
          },
          {
            text: 'ADR-002: distribución hosted-first',
            link: '/decisions/0002-hosted-first-distribution',
          },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: 'En esta página',
    },
    docFooter: {
      prev: 'Página anterior',
      next: 'Página siguiente',
    },
    lastUpdated: {
      text: 'Última actualización',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },
  },
})
