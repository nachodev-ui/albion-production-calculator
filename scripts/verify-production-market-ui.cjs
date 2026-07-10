'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  'https://albion-production-calculator.pages.dev'
).replace(/\/$/, '')
const API_BASE_URL = (
  process.env.API_BASE_URL ||
  'https://albion-market-api.onrender.com/api/v1'
).replace(/\/$/, '')
const ITEM_ID = process.env.ITEM_ID || 'T4_MAIN_CURSEDSTAFF_CRYSTAL'
const MARKET_KEY = process.env.MARKET_KEY || 'thetford'
const SERVER = process.env.ALBION_SERVER || 'west'
const QUALITY = Number(process.env.MARKET_QUALITY || '1')
const EXPECT_CSP_CLEAN = process.env.EXPECT_CSP_CLEAN === 'true'
const ARTIFACT_DIRECTORY = path.resolve(
  process.env.ARTIFACT_DIRECTORY || '.e2e/artifacts/production-market-ui',
)
const DATASET_PATH = path.resolve('src/data/datasets/items.json')
const SCREENSHOT_PATH = path.join(ARTIFACT_DIRECTORY, 'frontend.png')
const SUMMARY_PATH = path.join(ARTIFACT_DIRECTORY, 'summary.json')
const CONSOLE_PATH = path.join(ARTIFACT_DIRECTORY, 'browser-console.json')

const CATEGORY_LABELS = {
  weapon: 'Armas',
  armor: 'Armaduras',
  offhand: 'Offhands',
  accessory: 'Accesorios',
  resource: 'Recursos',
  refined_resource: 'Refinados',
  food: 'Comida',
  potion: 'Pociones',
  other: 'Otros',
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function normalizeInteger(value) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function readValidationItem() {
  const items = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
  const item = items.find((candidate) => candidate.id === ITEM_ID)

  if (!item) throw new Error(`No se encontró ${ITEM_ID} en el dataset.`)
  if (!item.recipe || !Array.isArray(item.recipe.tiers) || item.recipe.tiers.length === 0) {
    throw new Error(`${ITEM_ID} no posee una receta navegable.`)
  }
  if (!CATEGORY_LABELS[item.category]) {
    throw new Error(`Categoría no soportada para ${ITEM_ID}: ${item.category}.`)
  }

  return item
}

async function queryProductionPrice() {
  const response = await fetch(`${API_BASE_URL}/prices/query`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      server: SERVER,
      marketKeys: [MARKET_KEY],
      entries: [{ itemIdentifier: ITEM_ID, quality: QUALITY }],
    }),
  })
  const text = await response.text()
  let payload

  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`Render devolvió contenido no JSON: HTTP ${response.status}.`)
  }

  if (!response.ok) {
    throw new Error(`Render rechazó la consulta: HTTP ${response.status} ${text}`)
  }

  const row = Array.isArray(payload.data)
    ? payload.data.find(
        (candidate) =>
          candidate.marketKey === MARKET_KEY &&
          candidate.itemIdentifier === ITEM_ID &&
          Number(candidate.quality) === QUALITY,
      )
    : null
  const sellPriceMin = normalizeInteger(row?.sellPriceMin)

  if (!row || sellPriceMin === null) {
    throw new Error(
      `Render no devolvió sellPriceMin para ${ITEM_ID}, ${MARKET_KEY}, calidad ${QUALITY}.`,
    )
  }

  return {
    row,
    sellPriceMin,
    requestedAt: payload.requestedAt ?? null,
    count: payload.count ?? null,
  }
}

async function selectCatalogItem(page, item) {
  const categoryLabel = CATEGORY_LABELS[item.category]
  const categoryButton = page.locator('button[aria-haspopup="listbox"]').first()
  await categoryButton.waitFor({ state: 'visible', timeout: 120_000 })

  const currentCategory = (await categoryButton.innerText()).replace(/\s+/g, ' ')
  if (!currentCategory.includes(categoryLabel)) {
    await categoryButton.click()
    const categoryOption = page
      .getByRole('option')
      .filter({ hasText: categoryLabel })
      .first()
    await categoryOption.waitFor({ state: 'visible', timeout: 30_000 })
    await categoryOption.click()
  }

  const searchInput = page.getByPlaceholder('Buscar ítem…')
  await searchInput.waitFor({ state: 'visible', timeout: 120_000 })
  await searchInput.fill(item.name)

  const buttons = page.locator('button').filter({ hasText: item.name })
  await buttons.first().waitFor({ state: 'visible', timeout: 60_000 })

  const count = await buttons.count()
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index)
    const text = (await button.innerText()).replace(/\s+/g, ' ').trim()
    if (text.includes(`T${item.tier}`)) {
      await button.click()
      return
    }
  }

  await buttons.first().click()
}

function findObservedPrice(rows) {
  return rows.find(
    (candidate) =>
      candidate.marketKey === MARKET_KEY &&
      candidate.itemIdentifier === ITEM_ID &&
      Number(candidate.quality) === QUALITY &&
      normalizeInteger(candidate.sellPriceMin) !== null,
  )
}

async function waitForAutomaticPrice({ page, summarySection, observedRows }) {
  const deadline = Date.now() + 150_000
  const priceInput = summarySection.locator('#unit-sell-price')

  while (Date.now() < deadline) {
    const row = findObservedPrice(observedRows)
    const expectedPrice = normalizeInteger(row?.sellPriceMin)
    const inputValue = await priceInput.inputValue().catch(() => '')
    const text = await page.locator('body').innerText().catch(() => '')
    const sourceVisible =
      text.includes('API central conectada') || text.includes('API central: en uso')
    const automaticVisible = text.includes('Precio automático')
    const cityVisible = text.includes(
      'Precio aplicado desde Thetford · Vender mediante orden · Normal.',
    )

    if (
      expectedPrice !== null &&
      inputValue === String(expectedPrice) &&
      sourceVisible &&
      automaticVisible &&
      cityVisible
    ) {
      return {
        row,
        expectedPrice,
        inputValue,
        sourceVisible,
        automaticVisible,
        cityVisible,
      }
    }

    await sleep(1_000)
  }

  const inputValue = await priceInput.inputValue().catch(() => '')
  const text = await page.locator('body').innerText().catch(() => '')
  throw new Error(
    [
      'El frontend no mostró el precio automático esperado.',
      `input=${inputValue || '<vacío>'}`,
      `filas=${observedRows.length}`,
      `API central=${text.includes('API central')}`,
      `Thetford=${text.includes('Thetford')}`,
    ].join(' '),
  )
}

function getCspViolations(messages) {
  return messages.filter((entry) =>
    entry.text.toLowerCase().includes('content security policy'),
  )
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIRECTORY, { recursive: true })

  const item = readValidationItem()
  const apiPreflight = await queryProductionPrice()
  const consoleMessages = []
  const observedPriceRows = []
  const observedRequests = []
  const startedAt = new Date().toISOString()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    locale: 'es-CL',
    viewport: { width: 1440, height: 1000 },
  })

  await context.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  const page = await context.newPage()
  page.on('console', (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() })
  })
  page.on('pageerror', (error) => {
    consoleMessages.push({
      type: 'pageerror',
      text: error instanceof Error ? error.message : String(error),
    })
  })
  page.on('response', (response) => {
    const url = response.url()
    if (!url.startsWith(API_BASE_URL)) return

    observedRequests.push({
      url,
      method: response.request().method(),
      status: response.status(),
    })

    if (!url.endsWith('/prices/query') || response.status() !== 200) return
    void response
      .json()
      .then((payload) => {
        for (const row of Array.isArray(payload?.data) ? payload.data : []) {
          observedPriceRows.push(row)
        }
      })
      .catch((error) => {
        consoleMessages.push({
          type: 'response-parse-error',
          text: error instanceof Error ? error.message : String(error),
        })
      })
  })

  let verification
  try {
    await page.goto(`${FRONTEND_URL}/?production-market-validation=${Date.now()}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    })

    await selectCatalogItem(page, item)

    const summaryHeading = page.getByRole('heading', { name: 'Resumen de ganancia' })
    await summaryHeading.waitFor({ state: 'visible', timeout: 120_000 })
    const summarySection = summaryHeading.locator('xpath=ancestor::section')
    const saleCity = summarySection.getByLabel('Vender en')
    const saleStrategy = summarySection.getByLabel('Método de venta')
    const quality = summarySection.getByLabel('Calidad')

    await saleCity.waitFor({ state: 'visible', timeout: 60_000 })
    await saleCity.selectOption(MARKET_KEY)
    await saleStrategy.selectOption('sell-order')
    await quality.selectOption(String(QUALITY))

    const refreshButton = page.getByRole('button', {
      name: /Actualizar todos los precios|Reintentar ahora/,
    })
    await refreshButton.waitFor({ state: 'visible', timeout: 120_000 })
    await refreshButton.click({ timeout: 120_000 })

    verification = await waitForAutomaticPrice({
      page,
      summarySection,
      observedRows: observedPriceRows,
    })

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })

    const cspViolations = getCspViolations(consoleMessages)
    if (EXPECT_CSP_CLEAN && cspViolations.length > 0) {
      throw new Error(
        `La producción generó ${cspViolations.length} violación(es) CSP: ${cspViolations
          .map((entry) => entry.text)
          .join(' | ')}`,
      )
    }
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => undefined)
    throw error
  } finally {
    fs.writeFileSync(
      CONSOLE_PATH,
      `${JSON.stringify(consoleMessages, null, 2)}\n`,
      'utf8',
    )
    await browser.close()
  }

  const cspViolations = getCspViolations(consoleMessages)
  const summary = {
    success: true,
    startedAt,
    completedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    apiBaseUrl: API_BASE_URL,
    item: {
      id: ITEM_ID,
      name: item.name,
      tier: item.tier,
      category: item.category,
    },
    marketKey: MARKET_KEY,
    server: SERVER,
    quality: QUALITY,
    apiPreflight,
    browserPrice: verification.expectedPrice,
    displayedInputValue: verification.inputValue,
    sourceVisible: verification.sourceVisible,
    automaticPriceVisible: verification.automaticVisible,
    thetfordConfigurationVisible: verification.cityVisible,
    observedApiRequests: observedRequests,
    observedPriceRows: observedPriceRows.length,
    cspCleanExpected: EXPECT_CSP_CLEAN,
    cspViolationCount: cspViolations.length,
    screenshot: SCREENSHOT_PATH,
    priceChangedDuringValidation:
      verification.expectedPrice !== apiPreflight.sellPriceMin,
  }

  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

main().catch((error) => {
  fs.mkdirSync(ARTIFACT_DIRECTORY, { recursive: true })
  const failure = {
    success: false,
    completedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    apiBaseUrl: API_BASE_URL,
    itemId: ITEM_ID,
    marketKey: MARKET_KEY,
    quality: QUALITY,
    cspCleanExpected: EXPECT_CSP_CLEAN,
    error: error instanceof Error ? error.stack || error.message : String(error),
  }
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(failure, null, 2)}\n`, 'utf8')
  console.error(failure.error)
  process.exitCode = 1
})
