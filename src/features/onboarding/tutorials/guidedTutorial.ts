import type { BaseItemId } from '@core/domain/entities/Item'
import { useCraftTreeStore } from '@features/craft-calculator/store/craftTreeStore'
import {
  loadCraftWorkspace,
  updateCraftWorkspace,
} from '@features/craft-calculator/store/craftWorkspaceStorage'

export type GuidedTutorialId = 'bag' | 'return' | 'black-market'

type TargetId =
  | 'craft-item'
  | 'craft-quantity'
  | 'craft-sale-city'
  | 'craft-materials'
  | 'craft-focus'
  | 'craft-return'
  | 'craft-roi'
  | 'black-market-intro'
  | 'black-market-search'
  | 'black-market-result'
  | 'black-market-detail'

interface TutorialSession {
  readonly id: GuidedTutorialId
  readonly step: number
  readonly itemId?: BaseItemId
  readonly itemName?: string
}

interface TutorialStep {
  readonly target: TargetId
  readonly title: string
  readonly text: string
  readonly event?: 'click' | 'change' | 'input'
  readonly expected?: string | boolean
  readonly focus?: boolean
}

const STORAGE_KEY = 'apc:active-tutorial:v1'

const TUTORIALS: Readonly<Record<GuidedTutorialId, readonly TutorialStep[]>> = {
  bag: [
    {
      target: 'craft-item',
      title: 'Esta es la receta que vas a estudiar',
      text: 'El encabezado identifica el objeto, su tier y el costo neto que la app puede calcular con los precios disponibles.',
    },
    {
      target: 'craft-quantity',
      title: 'Prueba cómo cambia un lote',
      text: 'Escribe 5 en el campo resaltado. La receta, los materiales y los costos se multiplicarán automáticamente.',
      event: 'input',
      expected: '5',
      focus: true,
    },
    {
      target: 'craft-sale-city',
      title: 'Elige dónde venderás',
      text: 'Abre este selector y cambia la ciudad. El precio de venta y el resultado económico se actualizarán con ese mercado.',
      event: 'change',
    },
    {
      target: 'craft-materials',
      title: 'La app resuelve los materiales',
      text: 'Aquí ves qué recursos necesita la receta, qué precios encontró y en qué ciudad conviene comprar cada uno.',
    },
    {
      target: 'craft-roi',
      title: 'Termina leyendo la rentabilidad',
      text: 'El ROI compara el resultado con la plata invertida. Un valor positivo no garantiza la venta: revisa también precio, volumen y frescura.',
    },
  ],
  return: [
    {
      target: 'craft-item',
      title: 'Empezamos con un arma real',
      text: 'La receta ya está abierta, pero todavía no activamos el retorno con foco. Tú harás los dos cambios importantes.',
    },
    {
      target: 'craft-quantity',
      title: 'Define el tamaño del lote',
      text: 'Escribe 10. Esto permite comparar el ahorro total y el ahorro por cada arma fabricada.',
      event: 'input',
      expected: '10',
      focus: true,
    },
    {
      target: 'craft-focus',
      title: 'Activa el foco',
      text: 'Presiona el control resaltado. El foco aumenta el retorno de materiales, pero consume puntos de foco del personaje.',
      event: 'change',
      expected: true,
    },
    {
      target: 'craft-return',
      title: 'Este es el ahorro producido por el retorno',
      text: 'Costo bruto es lo que gastarías sin recuperar materiales. Ahorro por RRR es el valor que vuelve a tu inventario. El costo neto descuenta ese retorno.',
    },
    {
      target: 'craft-roi',
      title: 'Distingue plata y valor recuperado',
      text: 'La rentabilidad en plata usa solo dinero líquido. La rentabilidad económica total también considera los materiales recuperados que podrás reutilizar.',
    },
  ],
  'black-market': [
    {
      target: 'black-market-intro',
      title: 'Usaremos el escáner con filtros simples',
      text: 'El tutorial dejó Tier 4, calidad normal y límites amplios para encontrar una oportunidad real con pocos pasos.',
    },
    {
      target: 'black-market-search',
      title: 'Busca oportunidades reales',
      text: 'Presiona Buscar oportunidades. La API comparará ciudades, órdenes del Black Market, impuestos, transporte y estrategias de fabricación.',
      event: 'click',
    },
    {
      target: 'black-market-result',
      title: 'Abre el primer resultado',
      text: 'Cada fila ya resume beneficio, ROI, riesgo y la mejor estrategia. Presiona Ver detalle en la primera oportunidad disponible.',
      event: 'click',
    },
    {
      target: 'black-market-detail',
      title: 'Lee la comparación completa',
      text: 'El detalle separa precio de compra, orden del Black Market, impuesto, transporte, beneficio, ROI, confianza de los datos y riesgo. Verifica siempre la orden dentro del juego antes de mover plata o mercancía.',
    },
  ],
}

let current: TutorialSession | null = null
let highlighted: HTMLElement | null = null
let previousStyle: Partial<CSSStyleDeclaration> | null = null
let observer: MutationObserver | null = null
let eventCleanup: (() => void) | null = null
let panel: HTMLElement | null = null
let backdrop: HTMLElement | null = null

function byExactText(selector: string, text: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(selector)].find(
      (element) => element.textContent?.trim() === text,
    ) ?? null
  )
}

function targetElement(target: TargetId): HTMLElement | null {
  if (target === 'craft-quantity') {
    return document.querySelector<HTMLElement>(
      '[aria-label="Cantidad a craftear"]',
    )
  }
  if (target === 'craft-focus') {
    return byExactText('span', 'Usar foco')?.closest<HTMLElement>('label') ?? null
  }
  if (target === 'craft-sale-city') {
    return byExactText('span', 'Vender en')?.closest<HTMLElement>('label') ?? null
  }
  if (target === 'craft-materials') {
    return byExactText('h3', 'Materiales de la receta')?.closest<HTMLElement>(
      'section',
    ) ?? null
  }
  if (target === 'craft-return') {
    return byExactText('h3', 'Costo de producción')?.closest<HTMLElement>(
      'section',
    ) ?? null
  }
  if (target === 'craft-roi') {
    return (
      byExactText('span', 'Rentabilidad económica total')?.parentElement
        ?.parentElement ?? null
    )
  }
  if (target === 'black-market-intro') {
    return byExactText('h2', 'Oportunidades ciudad → Black Market')?.closest<HTMLElement>(
      'section',
    ) ?? null
  }
  if (target === 'black-market-search') {
    return byExactText('button', 'Buscar oportunidades')
  }
  if (target === 'black-market-result') {
    return byExactText('button', 'Ver detalle')
  }
  if (target === 'black-market-detail') {
    return document.querySelector<HTMLElement>('[role="dialog"]')
  }

  const itemName = current?.itemName
  if (!itemName) return null
  return byExactText('p', itemName)?.closest<HTMLElement>('.mb-4') ?? null
}

function saveSession(session: TutorialSession | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // El tutorial sigue disponible aunque sessionStorage esté bloqueado.
  }
}

function loadSession(): TutorialSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<TutorialSession>
    if (!value.id || !TUTORIALS[value.id] || typeof value.step !== 'number') {
      return null
    }
    return value as TutorialSession
  } catch {
    return null
  }
}

function clearHighlight() {
  eventCleanup?.()
  eventCleanup = null
  if (highlighted && previousStyle) {
    highlighted.style.position = previousStyle.position ?? ''
    highlighted.style.zIndex = previousStyle.zIndex ?? ''
    highlighted.style.outline = previousStyle.outline ?? ''
    highlighted.style.outlineOffset = previousStyle.outlineOffset ?? ''
    highlighted.style.boxShadow = previousStyle.boxShadow ?? ''
  }
  highlighted = null
  previousStyle = null
}

function ensureChrome() {
  if (!backdrop) {
    backdrop = document.createElement('div')
    backdrop.className = 'fixed inset-0 z-[60] bg-bg/65 backdrop-blur-[1px]'
    backdrop.style.pointerEvents = 'none'
    document.body.append(backdrop)
  }
  if (!panel) {
    panel = document.createElement('aside')
    panel.className =
      'fixed bottom-4 left-4 right-4 z-[9999] rounded-2xl border border-accent-border bg-surface p-5 shadow-2xl sm:left-auto sm:w-[25rem]'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-live', 'polite')
    document.body.append(panel)
  }
}

function closeTutorial() {
  clearHighlight()
  observer?.disconnect()
  observer = null
  panel?.remove()
  backdrop?.remove()
  panel = null
  backdrop = null
  current = null
  saveSession(null)
}

function setStep(step: number) {
  if (!current) return
  const steps = TUTORIALS[current.id]
  if (step >= steps.length) {
    closeTutorial()
    return
  }
  current = { ...current, step: Math.max(0, step) }
  saveSession(current)
  render()
}

function renderPanel(step: TutorialStep, found: boolean) {
  if (!panel || !current) return
  const steps = TUTORIALS[current.id]
  panel.replaceChildren()

  const top = document.createElement('div')
  top.className = 'flex items-center justify-between gap-3'
  const progress = document.createElement('span')
  progress.className =
    'text-[10px] font-semibold uppercase tracking-[0.16em] text-accent'
  progress.textContent = `Tutorial · ${current.step + 1} de ${steps.length}`
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'text-xs font-medium text-text-faint hover:text-text'
  close.textContent = 'Salir'
  close.addEventListener('click', closeTutorial)
  top.append(progress, close)

  const title = document.createElement('h2')
  title.className = 'mt-3 font-display text-xl text-text'
  title.textContent = step.title
  const text = document.createElement('p')
  text.className = 'mt-2 text-sm leading-relaxed text-text-muted'
  text.textContent = found
    ? step.text
    : `${step.text} Estamos esperando que esta parte de la interfaz esté disponible.`

  const actions = document.createElement('div')
  actions.className = 'mt-4 flex items-center justify-between gap-3'
  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'text-xs font-semibold text-text-faint hover:text-text'
  back.textContent = current.step === 0 ? 'Cerrar' : 'Anterior'
  back.addEventListener('click', () =>
    current?.step === 0 ? closeTutorial() : setStep(current.step - 1),
  )
  const next = document.createElement('button')
  next.type = 'button'
  next.className =
    'rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg disabled:cursor-wait disabled:opacity-55'
  next.disabled = Boolean(step.event) || !found
  next.textContent = step.event
    ? 'Haz la acción resaltada'
    : current.step === steps.length - 1
      ? 'Terminar tutorial'
      : 'Siguiente'
  next.addEventListener('click', () => setStep(current!.step + 1))
  actions.append(back, next)

  if (step.event) {
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'mt-3 w-full text-center text-xs text-text-faint underline'
    skip.textContent = 'Omitir este paso'
    skip.addEventListener('click', () => setStep(current!.step + 1))
    panel.append(top, title, text, actions, skip)
  } else {
    panel.append(top, title, text, actions)
  }
}

function validEvent(step: TutorialStep, element: HTMLElement): boolean {
  if (step.expected === undefined) return true
  if (typeof step.expected === 'boolean') {
    return element instanceof HTMLInputElement && element.checked === step.expected
  }
  return element instanceof HTMLInputElement && element.value === step.expected
}

function highlight(step: TutorialStep, element: HTMLElement) {
  if (highlighted === element) return
  clearHighlight()
  highlighted = element
  previousStyle = {
    position: element.style.position,
    zIndex: element.style.zIndex,
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset,
    boxShadow: element.style.boxShadow,
  }
  const position = getComputedStyle(element).position
  if (position === 'static') element.style.position = 'relative'
  element.style.zIndex = '80'
  element.style.outline = '3px solid var(--color-accent, #d8b45b)'
  element.style.outlineOffset = '5px'
  element.style.boxShadow = '0 0 0 9px rgb(216 180 91 / 0.22)'
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })

  if (step.focus && element instanceof HTMLInputElement) {
    window.setTimeout(() => {
      element.focus()
      element.select()
    }, 350)
  }

  if (step.event) {
    const handler = () => {
      if (validEvent(step, element)) window.setTimeout(() => setStep(current!.step + 1), 120)
    }
    element.addEventListener(step.event, handler)
    eventCleanup = () => element.removeEventListener(step.event!, handler)
  }
}

function render() {
  if (!current) return
  ensureChrome()
  const step = TUTORIALS[current.id][current.step]
  if (!step) {
    closeTutorial()
    return
  }
  const element = targetElement(step.target)
  renderPanel(step, Boolean(element))
  if (element) highlight(step, element)
  else clearHighlight()

  observer?.disconnect()
  observer = new MutationObserver(() => {
    const next = targetElement(step.target)
    if (!next) return
    observer?.disconnect()
    renderPanel(step, true)
    highlight(step, next)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function prepareReturnTutorial(itemId: BaseItemId) {
  const store = useCraftTreeStore.getState()
  store.setProductionConfig({ ...store.productionConfig, useFocus: false })
  updateCraftWorkspace((workspace) => {
    const quantitiesByRoot = new Map(workspace.quantitiesByRoot)
    quantitiesByRoot.set(`${itemId}@0`, 1)
    return {
      ...workspace,
      selectedItemId: itemId,
      quantitiesByRoot,
      productionConfig: { ...(workspace.productionConfig ?? store.productionConfig), useFocus: false },
    }
  })
}

export function startGuidedTutorial(
  id: GuidedTutorialId,
  item?: { readonly id: BaseItemId; readonly name: string },
) {
  if (id === 'return' && item) prepareReturnTutorial(item.id)
  current = {
    id,
    step: 0,
    itemId: item?.id,
    itemName: item?.name,
  }
  saveSession(current)
  window.setTimeout(render, 0)
}

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    const stored = loadSession()
    if (!stored) return
    current = stored
    render()
  }, 0)
}
