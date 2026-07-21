import type { BaseItemId } from '@core/domain/entities/Item'
import { useCraftTreeStore } from '@features/craft-calculator/store/craftTreeStore'
import { updateCraftWorkspace } from '@features/craft-calculator/store/craftWorkspaceStorage'

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

type StyleSnapshot = readonly [string, string, string, string, string]

interface Session {
  readonly id: GuidedTutorialId
  readonly step: number
  readonly itemId?: BaseItemId
  readonly itemName?: string
}

interface Step {
  readonly target: TargetId
  readonly title: string
  readonly text: string
  readonly event?: 'click' | 'change' | 'input'
  readonly expected?: string | boolean
  readonly focus?: boolean
}

const KEY = 'apc:active-tutorial:v1'
const EMPTY_STYLE: StyleSnapshot = ['', '', '', '', '']
const TUTORIALS: Readonly<Record<GuidedTutorialId, readonly Step[]>> = {
  bag: [
    {
      target: 'craft-item',
      title: 'Esta es la receta que vas a estudiar',
      text: 'El encabezado identifica el objeto, su tier y el costo neto calculado con los precios disponibles.',
    },
    {
      target: 'craft-quantity',
      title: 'Prueba cómo cambia un lote',
      text: 'Escribe 5. La receta, los materiales y los costos se multiplicarán automáticamente.',
      event: 'input',
      expected: '5',
      focus: true,
    },
    {
      target: 'craft-sale-city',
      title: 'Elige dónde venderás',
      text: 'Cambia la ciudad. El precio de venta y el resultado económico se actualizarán con ese mercado.',
      event: 'change',
    },
    {
      target: 'craft-materials',
      title: 'La app resuelve los materiales',
      text: 'Aquí ves qué recursos necesita la receta, qué precios encontró y dónde conviene comprar cada uno.',
    },
    {
      target: 'craft-roi',
      title: 'Termina leyendo la rentabilidad',
      text: 'El ROI compara el resultado con la plata invertida. Si faltan precios verás el cálculo pendiente; revisa también volumen y frescura antes de decidir.',
    },
  ],
  return: [
    {
      target: 'craft-item',
      title: 'Empezamos con un arma real',
      text: 'La receta ya está abierta, pero todavía no activamos el retorno con foco. Tú harás los cambios importantes.',
    },
    {
      target: 'craft-quantity',
      title: 'Define el tamaño del lote',
      text: 'Escribe 10 para comparar el ahorro total y el ahorro por cada arma.',
      event: 'input',
      expected: '10',
      focus: true,
    },
    {
      target: 'craft-focus',
      title: 'Activa el foco',
      text: 'Presiona el control resaltado. El foco aumenta el retorno, pero consume puntos del personaje.',
      event: 'change',
      expected: true,
    },
    {
      target: 'craft-return',
      title: 'Este es el ahorro por retorno',
      text: 'Costo bruto es el gasto sin recuperación. Ahorro por RRR es el valor que vuelve. El costo neto descuenta ese retorno.',
    },
    {
      target: 'craft-roi',
      title: 'Distingue plata y valor recuperado',
      text: 'La rentabilidad en plata usa dinero líquido. La económica también cuenta los materiales que podrás reutilizar.',
    },
  ],
  'black-market': [
    {
      target: 'black-market-intro',
      title: 'Usaremos filtros simples',
      text: 'El tutorial dejó Tier 4, calidad normal y límites amplios para encontrar una oportunidad real.',
    },
    {
      target: 'black-market-search',
      title: 'Busca oportunidades reales',
      text: 'Presiona Buscar oportunidades. La API comparará ciudades, órdenes, impuesto, transporte y fabricación. Si debes iniciar sesión, el tutorial se reanudará al volver.',
      event: 'click',
    },
    {
      target: 'black-market-result',
      title: 'Abre el primer resultado',
      text: 'La fila resume beneficio, ROI, riesgo y mejor estrategia. Presiona Ver detalle.',
      event: 'click',
    },
    {
      target: 'black-market-detail',
      title: 'Lee la comparación completa',
      text: 'El detalle separa compra, orden, impuesto, transporte, beneficio, ROI, confianza y riesgo. Confirma la orden dentro del juego.',
    },
  ],
}

let session: Session | null = null
let highlighted: HTMLElement | null = null
let oldStyle: StyleSnapshot = EMPTY_STYLE
let removeEvent: (() => void) | null = null
let observer: MutationObserver | null = null
let panel: HTMLElement | null = null
let shade: HTMLElement | null = null

function exact(selector: string, text: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(selector)].find(
      (element) => element.textContent?.trim() === text,
    ) ?? null
  )
}

function findTarget(id: TargetId): HTMLElement | null {
  if (id === 'craft-quantity') {
    return document.querySelector('[aria-label="Cantidad a craftear"]')
  }
  if (id === 'craft-focus') {
    return exact('span', 'Usar foco')?.closest('label') ?? null
  }
  if (id === 'craft-sale-city') {
    return exact('span', 'Vender en')?.closest('label') ?? null
  }
  if (id === 'craft-materials') {
    return exact('h3', 'Materiales de la receta')?.closest('section') ?? null
  }
  if (id === 'craft-return') {
    return exact('h3', 'Costo de producción')?.closest('section') ?? null
  }
  if (id === 'craft-roi') {
    return exact('h3', 'Resumen de ganancia')?.closest('section') ?? null
  }
  if (id === 'black-market-intro') {
    return exact('h2', 'Oportunidades ciudad → Black Market')?.closest(
      'section',
    ) ?? null
  }
  if (id === 'black-market-search') return exact('button', 'Buscar oportunidades')
  if (id === 'black-market-result') return exact('button', 'Ver detalle')
  if (id === 'black-market-detail') return document.querySelector('[role="dialog"]')
  return session?.itemName
    ? exact('p', session.itemName)?.closest('.mb-4') ?? null
    : null
}

function store(value: Session | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value))
    else sessionStorage.removeItem(KEY)
  } catch {
    // El recorrido continúa aunque sessionStorage esté bloqueado.
  }
}

function load(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Session | null
    return value && TUTORIALS[value.id] && Number.isInteger(value.step)
      ? value
      : null
  } catch {
    return null
  }
}

function clearHighlight() {
  removeEvent?.()
  removeEvent = null
  if (highlighted) {
    ;[
      highlighted.style.position,
      highlighted.style.zIndex,
      highlighted.style.outline,
      highlighted.style.outlineOffset,
      highlighted.style.boxShadow,
    ] = oldStyle
  }
  highlighted = null
  oldStyle = EMPTY_STYLE
}

function close() {
  clearHighlight()
  observer?.disconnect()
  panel?.remove()
  shade?.remove()
  observer = null
  panel = null
  shade = null
  session = null
  store(null)
}

function chrome() {
  if (!shade) {
    shade = document.createElement('div')
    shade.className = 'fixed inset-0 z-[60] bg-bg/65 backdrop-blur-[1px]'
    shade.style.pointerEvents = 'none'
    document.body.append(shade)
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

function go(next: number) {
  if (!session) return
  const steps = TUTORIALS[session.id]
  if (next >= steps.length) {
    close()
    return
  }
  session = { ...session, step: Math.max(0, next) }
  store(session)
  render()
}

function valid(step: Step, element: HTMLElement): boolean {
  if (step.expected === undefined) return true
  if (!(element instanceof HTMLInputElement)) return false
  return typeof step.expected === 'boolean'
    ? element.checked === step.expected
    : element.value === step.expected
}

function waitForBlackMarketRows(stepNumber: number) {
  observer?.disconnect()
  observer = new MutationObserver(() => {
    if (session?.step !== stepNumber || !findTarget('black-market-result')) return
    observer?.disconnect()
    go(stepNumber + 1)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function highlight(step: Step, element: HTMLElement) {
  if (highlighted === element) return
  clearHighlight()
  highlighted = element
  oldStyle = [
    element.style.position,
    element.style.zIndex,
    element.style.outline,
    element.style.outlineOffset,
    element.style.boxShadow,
  ]
  if (getComputedStyle(element).position === 'static') element.style.position = 'relative'
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
    const stepNumber = session!.step
    const handler = () => {
      if (!valid(step, element)) return
      if (step.target === 'black-market-search') {
        waitForBlackMarketRows(stepNumber)
        return
      }
      window.setTimeout(() => go(stepNumber + 1), 120)
    }
    element.addEventListener(step.event, handler)
    removeEvent = () => element.removeEventListener(step.event!, handler)
  }
}

function draw(step: Step, found: boolean) {
  if (!panel || !session) return
  const steps = TUTORIALS[session.id]
  panel.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <span data-progress class="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent"></span>
      <button data-close type="button" class="text-xs font-medium text-text-faint hover:text-text">Salir</button>
    </div>
    <h2 data-title class="mt-3 font-display text-xl text-text"></h2>
    <p data-text class="mt-2 text-sm leading-relaxed text-text-muted"></p>
    <div class="mt-4 flex items-center justify-between gap-3">
      <button data-back type="button" class="text-xs font-semibold text-text-faint hover:text-text"></button>
      <button data-next type="button" class="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg disabled:cursor-wait disabled:opacity-55"></button>
    </div>
    <button data-skip type="button" class="mt-3 hidden w-full text-center text-xs text-text-faint underline">Omitir este paso</button>`

  const get = (name: string) => panel!.querySelector<HTMLElement>(`[data-${name}]`)!
  get('progress').textContent = `Tutorial · ${session.step + 1} de ${steps.length}`
  get('title').textContent = step.title
  get('text').textContent = found
    ? step.text
    : `${step.text} Esperando que esta parte de la interfaz esté disponible.`
  get('close').addEventListener('click', close)
  get('back').textContent = session.step === 0 ? 'Cerrar' : 'Anterior'
  get('back').addEventListener('click', () =>
    session?.step === 0 ? close() : go(session!.step - 1),
  )

  const next = get('next') as HTMLButtonElement
  next.disabled = Boolean(step.event) || !found
  next.textContent = step.event
    ? 'Haz la acción resaltada'
    : session.step === steps.length - 1
      ? 'Terminar tutorial'
      : 'Siguiente'
  next.addEventListener('click', () => go(session!.step + 1))

  if (step.event) {
    const skip = get('skip')
    skip.classList.remove('hidden')
    skip.addEventListener('click', () => go(session!.step + 1))
  }
}

function render() {
  if (!session) return
  chrome()
  const step = TUTORIALS[session.id][session.step]
  if (!step) return close()
  const element = findTarget(step.target)
  draw(step, Boolean(element))
  if (element) highlight(step, element)
  else clearHighlight()

  observer?.disconnect()
  observer = new MutationObserver(() => {
    const target = findTarget(step.target)
    if (!target) return
    observer?.disconnect()
    draw(step, true)
    highlight(step, target)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function resetReturnExample(itemId: BaseItemId) {
  const state = useCraftTreeStore.getState()
  state.setProductionConfig({ ...state.productionConfig, useFocus: false })
  updateCraftWorkspace((workspace) => {
    const quantitiesByRoot = new Map(workspace.quantitiesByRoot)
    quantitiesByRoot.set(`${itemId}@0`, 1)
    return { ...workspace, selectedItemId: itemId, quantitiesByRoot }
  })
}

export function startGuidedTutorial(
  id: GuidedTutorialId,
  item?: { readonly id: BaseItemId; readonly name: string },
) {
  if (id === 'return' && item) resetReturnExample(item.id)
  session = { id, step: 0, itemId: item?.id, itemName: item?.name }
  store(session)
  window.setTimeout(render, 0)
}

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    session = load()
    if (session) render()
  }, 0)
}
