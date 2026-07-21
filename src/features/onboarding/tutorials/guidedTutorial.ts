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
  | 'preset-open'
  | 'preset-name'
  | 'preset-save'
  | 'station-panel'
  | 'station-cost'
  | 'specialization-panel'
  | 'focus-efficiency'
  | 'available-focus'
  | 'quality-increase'
  | 'projection-panel'
  | 'projection-current-level'
  | 'projection-progress'
  | 'projection-target'
  | 'projection-required-fame'
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
      text: 'Escribe 5 o usa el botón asistido. La receta, los materiales y los costos se multiplicarán automáticamente.',
      event: 'input',
      expected: '5',
      focus: true,
    },
    {
      target: 'craft-sale-city',
      title: 'Elige dónde venderás',
      text: 'Cambia la ciudad o deja que el tutorial seleccione otra. El precio de venta y el resultado económico se actualizarán con ese mercado.',
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
      text: 'La receta ya está abierta. Aprenderás retorno, puesto, especialización, foco, presets y proyección usando los controles reales.',
    },
    {
      target: 'craft-quantity',
      title: 'Define el tamaño del lote',
      text: 'Escribe 10 o usa el botón asistido para comparar el ahorro total y el ahorro por cada arma.',
      event: 'input',
      expected: '10',
      focus: true,
    },
    {
      target: 'craft-focus',
      title: 'Activa el foco',
      text: 'Presiona el control resaltado o actívalo desde el panel. El foco aumenta el retorno, pero consume puntos del personaje.',
      event: 'change',
      expected: true,
    },
    {
      target: 'station-panel',
      title: 'Identifica el puesto correcto',
      text: 'Esta sección indica el tipo de puesto necesario para el objeto. Dentro del juego abre ese puesto, selecciona el mismo objeto y la misma cantidad.',
    },
    {
      target: 'station-cost',
      title: 'Copia el Total Cost de Albion',
      text: 'Antes de confirmar la fabricación, Albion muestra Total Cost. Copia ese monto aquí. Debe corresponder al lote actual; no es el precio de los materiales ni la tarifa por 100 de nutrición.',
    },
    {
      target: 'specialization-panel',
      title: 'Abre el Destiny Board con B',
      text: 'En Albion presiona B y busca la familia del objeto. Primero abre el nodo general: sus bonos se aplican a todas las armas o armaduras de esa familia.',
    },
    {
      target: 'focus-efficiency',
      title: 'Suma nodo general y nodo específico',
      text: 'Después abre el nodo especialista del objeto concreto. Suma ambos valores de Bonus to Focus Cost Efficiency y escribe aquí el total. No introduzcas el nivel de los nodos.',
    },
    {
      target: 'available-focus',
      title: 'Indica cuánto foco puedes gastar',
      text: 'Copia tu foco disponible actual. La calculadora mostrará el foco efectivo por tirada, el requerido para el lote y cuántos objetos puedes fabricar.',
    },
    {
      target: 'quality-increase',
      title: 'Suma también Increase in Quality',
      text: 'Suma Increase in Quality del nodo general y del especialista. Este valor alimenta la estimación de calidades del Black Market; no garantiza una calidad concreta en la calculadora general.',
    },
    {
      target: 'craft-return',
      title: 'Lee el ahorro real por retorno',
      text: 'Costo bruto es el gasto sin recuperación. Ahorro por RRR es el valor que vuelve. El costo neto descuenta ese retorno y añade el costo del puesto.',
    },
    {
      target: 'preset-open',
      title: 'Guarda esta configuración como preset',
      text: 'Presiona Guardar actual. El preset conserva ciudad, foco, Premium, retorno, tarifas y especialización; no guarda el objeto, la cantidad ni los precios.',
      event: 'click',
    },
    {
      target: 'preset-name',
      title: 'Ponle un nombre reconocible',
      text: 'Usa un nombre que describa el escenario, por ejemplo Bridgewatch con foco. Puedes escribirlo o usar el nombre de ejemplo.',
      event: 'input',
      expected: 'Bridgewatch con foco',
      focus: true,
    },
    {
      target: 'preset-save',
      title: 'Confirma el preset',
      text: 'Presiona Guardar. Después podrás aplicarlo a cualquier receta y marcarlo como configuración predeterminada.',
      event: 'click',
    },
    {
      target: 'projection-panel',
      title: 'Ahora proyecta tu especialización',
      text: 'Esta sección estima cuánto avanzará el nodo especialista con la fama de fabricar y, cuando corresponda, estudiar los objetos del lote.',
    },
    {
      target: 'projection-current-level',
      title: 'Copia el nivel actual',
      text: 'En el encabezado del nodo especialista verás tu nivel actual. Escribe solo el número del nivel, no el nivel del nodo general.',
    },
    {
      target: 'projection-progress',
      title: 'Copia el progreso dentro del nivel',
      text: 'La barra muestra fama actual / fama requerida para subir. Introduce aquí la fama que ya llevas acumulada dentro del nivel actual.',
    },
    {
      target: 'projection-target',
      title: 'Elige el nivel que quieres alcanzar',
      text: 'Nivel objetivo es tu meta de simulación. La aplicación calculará la fama restante y cuántos lotes iguales necesitarías.',
    },
    {
      target: 'projection-required-fame',
      title: 'Verifica la curva de fama',
      text: 'Fama requerida 0 → 1 define la curva completa. La calculadora detecta el valor normal, pero queda editable por si Albion modifica el Destiny Board.',
    },
    {
      target: 'craft-roi',
      title: 'Termina leyendo la rentabilidad',
      text: 'Distingue rentabilidad en plata de rentabilidad económica total. La segunda también cuenta el valor de los materiales recuperados.',
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
      text: 'Presiona Buscar oportunidades o usa el botón del tutorial. La API comparará ciudades, órdenes, impuesto, transporte y fabricación. Si debes iniciar sesión, el recorrido se reanudará al volver.',
      event: 'click',
    },
    {
      target: 'black-market-result',
      title: 'Abre el primer resultado',
      text: 'La fila resume beneficio, ROI, riesgo y mejor estrategia. Presiona Ver detalle o ábrelo desde este panel.',
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

function fieldByLabel(text: string): HTMLElement | null {
  return exact('span', text)?.closest('label') ?? null
}

function findTarget(id: TargetId): HTMLElement | null {
  if (id === 'craft-quantity') {
    return document.querySelector('[aria-label="Cantidad a craftear"]')
  }
  if (id === 'craft-focus') return fieldByLabel('Usar foco')
  if (id === 'craft-sale-city') return fieldByLabel('Vender en')
  if (id === 'craft-materials') {
    return exact('h3', 'Materiales de la receta')?.closest('section') ?? null
  }
  if (id === 'craft-return') {
    return exact('h3', 'Costo de producción')?.closest('section') ?? null
  }
  if (id === 'craft-roi') {
    return exact('h3', 'Resumen de ganancia')?.closest('section') ?? null
  }
  if (id === 'preset-open') return exact('button', 'Guardar actual')
  if (id === 'preset-name') return document.querySelector('#craft-preset-name')
  if (id === 'preset-save') return exact('button', 'Guardar')
  if (id === 'station-panel') {
    return exact('h4', 'Puesto y costo de fabricación')?.closest('.rounded-lg') ?? null
  }
  if (id === 'station-cost') {
    return document.querySelector('[aria-label="Costo total mostrado por Albion"]')
  }
  if (id === 'specialization-panel') {
    return document.querySelector('[data-tutorial="craft-specialization"]')
  }
  if (id === 'focus-efficiency') {
    return document.querySelector('[data-tutorial="focus-cost-efficiency"]')
  }
  if (id === 'available-focus') {
    return document.querySelector('[data-tutorial="available-focus"]')
  }
  if (id === 'quality-increase') {
    return document.querySelector('[data-tutorial="quality-increase"]')
  }
  if (id === 'projection-panel') {
    return exact('h4', 'Proyección de especialización')?.closest('article') ?? null
  }
  if (id === 'projection-current-level') return fieldByLabel('Nivel actual')
  if (id === 'projection-progress') return fieldByLabel('Progreso dentro del nivel')
  if (id === 'projection-target') return fieldByLabel('Nivel objetivo')
  if (id === 'projection-required-fame') return fieldByLabel('Fama requerida 0 → 1')
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
    shade.className = 'fixed inset-0 z-[60] bg-bg/50 backdrop-blur-[1px]'
    shade.style.pointerEvents = 'none'
    document.body.append(shade)
  }
  if (!panel) {
    panel = document.createElement('aside')
    panel.className =
      'fixed bottom-4 left-4 right-4 z-[9999] max-h-[45vh] overflow-y-auto rounded-2xl border border-accent-border bg-surface p-5 shadow-2xl sm:left-auto sm:w-[27rem]'
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

function nestedInput(element: HTMLElement): HTMLInputElement | null {
  return element instanceof HTMLInputElement
    ? element
    : element.querySelector<HTMLInputElement>('input')
}

function valid(step: Step, element: HTMLElement): boolean {
  if (step.expected === undefined) return true
  const input = nestedInput(element)
  if (!input) return false
  return typeof step.expected === 'boolean'
    ? input.checked === step.expected
    : input.value === step.expected
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    'value',
  )?.set
  setter?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

function actionLabel(step: Step): string {
  if (step.target === 'craft-quantity') {
    return `Usar ${String(step.expected)} y continuar`
  }
  if (step.target === 'craft-focus') return 'Activar foco y continuar'
  if (step.target === 'craft-sale-city') return 'Cambiar ciudad y continuar'
  if (step.target === 'preset-open') return 'Crear preset'
  if (step.target === 'preset-name') return 'Usar nombre de ejemplo'
  if (step.target === 'preset-save') return 'Guardar preset'
  if (step.target === 'black-market-search') return 'Buscar oportunidades'
  if (step.target === 'black-market-result') return 'Abrir detalle'
  return 'Realizar acción'
}

function performStepAction(step: Step, element: HTMLElement) {
  if (!session) return
  const stepNumber = session.step

  if (step.target === 'black-market-search') {
    element.click()
    waitForBlackMarketRows(stepNumber)
    return
  }
  if (step.target === 'black-market-result') {
    element.click()
    window.setTimeout(() => {
      if (session?.step === stepNumber) go(stepNumber + 1)
    }, 180)
    return
  }

  const input = nestedInput(element)
  if (typeof step.expected === 'boolean' && input) {
    if (input.checked === step.expected) go(stepNumber + 1)
    else input.click()
    return
  }
  if (typeof step.expected === 'string' && input) {
    setInputValue(input, step.expected)
    window.setTimeout(() => {
      if (session?.step === stepNumber && valid(step, input)) {
        go(stepNumber + 1)
      }
    }, 180)
    return
  }

  const select =
    element instanceof HTMLSelectElement
      ? element
      : element.querySelector<HTMLSelectElement>('select')
  if (select) {
    const alternative = [...select.options].find(
      (option) => !option.disabled && option.value !== select.value,
    )
    if (alternative) setSelectValue(select, alternative.value)
    else go(stepNumber + 1)
    return
  }

  element.click()
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

  const input = nestedInput(element)
  if (step.focus && input) {
    window.setTimeout(() => {
      input.focus()
      input.select()
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
      window.setTimeout(() => {
        if (session?.step === stepNumber) go(stepNumber + 1)
      }, 120)
    }
    element.addEventListener(step.event, handler)
    removeEvent = () => element.removeEventListener(step.event!, handler)
  }
}

function draw(step: Step, found: boolean, element: HTMLElement | null) {
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
  next.disabled = !found || !element
  next.textContent = step.event
    ? actionLabel(step)
    : session.step === steps.length - 1
      ? 'Terminar tutorial'
      : 'Siguiente'
  next.addEventListener('click', () => {
    if (!element) return
    if (step.event) performStepAction(step, element)
    else go(session!.step + 1)
  })

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
  draw(step, Boolean(element), element)
  if (element) highlight(step, element)
  else clearHighlight()

  observer?.disconnect()
  observer = new MutationObserver(() => {
    const target = findTarget(step.target)
    if (!target) return
    observer?.disconnect()
    draw(step, true, target)
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
