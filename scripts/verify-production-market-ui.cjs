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
const ARTIFACT_DIRECTORY = path.resolve(
  process.env.ARTIFACT_DIRECTORY ||
    '.e2e/artifacts/production-market-ui',
)
const DATASET_PATH = path.resolve('src/data/datasets/items.json')
const SCREENSHOT_PATH = path.join(ARTIFACT_DIRECTORY, 'frontend.png')
const SUMMARY_PATH = path.join(ARTIFACT_DIRECTORY, 'summary.json')
const CONSOLE_PATH = path.join(ARTIFACT_DIRECTORY, 'browser-console.json')

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

  if (!item) {
    throw new Error(`No se encontró ${ITEM_ID} en ${DATASET_PATH}.`)
  }
  if (!item.recipe || !Array.isArray(item.recipe.tiers) || item.recipe.tiers.length === 0) {
    throw new Error(`${ITEM_ID} no posee una receta navegable en el frontend.`)
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
      entries: [
        {
          itemIdentifier: ITEM_ID,
          quality: QUALITY,
        },
      ],
    }),
  })

  const responseText = await response.text()
  let payload = null
  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(
      `Render devolvió una respuesta no JSON para el precio: HTTP ${response.status}.`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `Render rechazó la consulta de precio: HTTP ${response.status} ${responseText}`,
    )
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
      `Render no devolvió un sellPriceMin válido para ${ITEM_ID}, ${MARKET_KEY}, calidad ${QUALITY}.`,
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
  const searchInput = page.getByPlaceholder('Buscar ítem…')
  await searchInput.waitFor({ state: 'visible', timeout: 120_000 })
  await searchInput.fill(item.name)

  const matchingButtons = page.locator('button').filter({ hasText: item.name })
  await matchingButtons.first().waitFor({ state: 'visible', timeout: 60_000 })

  const candidateCount = await matchingButtons.count()
  let selected = false
  for (let index = 0; index < candidateCount; index += 1) {
    const button = matchingButtons.nth(index)
    const text = (await button.innerText()).replace(/\s+/g, ' ').trim()
    if (text.includes(`T${item.tier}`)) {
      await button.click()
      selected = true
      break
    }
  }

  if (!selected) {
    await matchingButtons.first().click()
  }
}

async function waitForAutomaticPrice({ page, summarySection, observedRows }) {
  const deadline = Date.now() + 150_000
  const priceInput = summarySection.locator('#unit-sell-price')

  while (Date.now() < deadline) {
    const row = observedRows.find(
      (candidate) =>
        candidate.marketKey === MARKET_KEY &&
        candidate.itemIdentifier === ITEM_ID &&
        Number(candidate.quality) === QUALITY &&
        normalizeInteger(candidate.sellPriceMin) !== null,
    )
    const expectedPrice = normalizeInteger(row?.sellPriceMin)
    const inputValue = await priceInput.inputValue().catch(() => '')
    const visibleText = await page.locator('body').innerText().catch(() => '')
    const sourceVisible =
      visibleText.includes('API central conectada') ||
      visibleText.includes('API central: en uso')
    const automaticVisible = visibleText.includes('Precio automático')
    const cityVisible = visibleText.includes(
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
  const visibleText = await page.locator('body').innerText().catch(() => '')
  throw new Error(
    [
      'El frontend no mostró el precio automático esperado dentro del timeout.',
      `input=${inputValue || '<vacío>'}`,
      `filas observadas=${observedRows.length}`,
      `API central visible=${visibleText.includes('API central')}`,
      `texto de Thetford visible=${visibleText.includes('Thetford')}`,
    ].join(' '),
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
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
    })
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

  let verification = null
  try {
    await page.goto(
      `${FRONTEND_URL}/?production-market-validation=${Date.now()}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      },
    )

    await selectCatalogItem(page, item)

    const summaryHeading = page.getByRole('heading', {
      name: 'Resumen de ganancia',
    })
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
  } finally {
    fs.writeFileSync(
      CONSOLE_PATH,
      `${JSON.stringify(consoleMessages, null, 2)}\n`,
      'utf8',
    )
    await browser.close()
  }

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
    screenshot: SCREENSHOT_PATH,
  }

  if (summary.browserPrice !== apiPreflight.sellPriceMin) {
    summary.priceChangedDuringValidation = true
  } else {
    summary.priceChangedDuringValidation = false
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
    error: error instanceof Error ? error.stack || error.message : String(error),
  }
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(failure, null, 2)}\n`, 'utf8')
  console.error(failure.error)
  process.exitCode = 1
})
