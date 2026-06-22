import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CalculationPrintPage } from '@features/craft-calculator/components/summary/CalculationPrintPage'
import './index.css'
import App from './App.tsx'

const printToken = new URLSearchParams(window.location.search).get('printSummary')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {printToken ? <CalculationPrintPage token={printToken} /> : <App />}
  </StrictMode>,
)
