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

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

function positiveInteger(value) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function readItem() {
  const items = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
  const item = items.find((candidate) => candidate.id === ITEM_ID)

  if (!item) throw new Error(`No se encontró ${ITEM_ID} en el dataset.`)
  if (!item.recipe?.tiers?.length) {
    throw new Error(`${ITEM_ID} no posee una receta navegable.`)
  }
  if (!CATEGORY_LABELS[item.category]) {
    throw new Error(`Categoría no soportada: ${item.category}.`)
  }

  return item
}

async function queryPrice() {
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
  const sellPriceMin = positiveInteger(row?.sellPriceMin)

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

async function selectItem(page, item) {
  const categoryLabel = CATEGORY_LABELS[item.category]
  const categoryButton = page.locator('button[aria-haspopup="listbox"]').first()
  await categoryButton.waitFor({ state: 'visible', timeout: 120_000 })

  if (!(await categoryButton.innerText()).includes(categoryLabel)) {
    await categoryButton.click()
    const option = page.getByRole('option').filter({ hasText: categoryLabel }).first()
    await option.waitFor({ state: 'visible', timeout: 30_000 })
    await option.click()
  }

  const search = page.getByPlaceholder('Buscar ítem…')
  await search.fill(item.name)

  const exactTierButton = page.getByTitle(item.name, { exact: true })
  if ((await exactTierButton.count()) > 0) {
    await exactTierButton.first().waitFor({ state: 'visible', timeout: 60_000 })
    await exactTierButton.first().click()
    return
  }

  const directButton = page.locator('button').filter({ hasText: item.name }).first()
  await directButton.waitFor({ state: 'visible', timeout: 60_000 })
  await directButton.click()
}

function matchingObservedRow(rows) {
  return rows.find(
    (row) =>
      row.marketKey === MARKET_KEY &&
      row.itemIdentifier === ITEM_ID &&
      Number(row.quality) === QUALITY &&
      positiveInteger(row.sellPriceMin) !== null,
  )
}

async function waitForVisiblePrice(page, section, rows) {
  const deadline = Date.now() + 150_000
  const input = section.locator('#unit-sell-price')

  while (Date.now() < deadline) {
    const row = matchingObservedRow(rows)
    const expected = positiveInteger(row?.sellPriceMin)
    const value = await input.inputValue().catch(() => '')
    const body = await page.locator('body').innerText().catch(() => '')
    const sourceVisible =
      body.includes('API central conectada') || body.includes('API central: en uso')
    const automaticVisible = body.includes('Precio automático')
    const configurationVisible = body.includes(
      'Precio aplicado desde Thetford · Vender mediante orden · Normal.',
    )

    if (
      expected !== null &&
      value === String(expected) &&
      sourceVisible &&
      automaticVisible &&
      configurationVisible
    ) {
      return {
        row,
        expected,
        value,
        sourceVisible,
        automaticVisible,
        configurationVisible,
      }
    }

    await delay(1_000)
  }

  throw new Error(
    `El frontend no mostró el precio esperado. input=${
      (await input.inputValue().catch(() => '')) || '<vacío>'
    }; filas=${rows.length}`,
  )
}

function cspViolations(messages) {
  return messages.filter((entry) =>
    entry.text.toLowerCase().includes('content security policy'),
  )
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIRECTORY, { recursive: true })
  const item = readItem()
  const apiPreflight = await queryPrice()
  const startedAt = new Date().toISOString()
  const consoleMessages = []
  const observedRequests = []
  const observedRows = []
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
        observedRows.push(...(Array.isArray(payload?.data) ? payload.data : []))
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
    await selectItem(page, item)

    const heading = page.getByRole('heading', { name: 'Resumen de ganancia' })
    await heading.waitFor({ state: 'visible', timeout: 120_000 })
    const section = heading.locator('xpath=ancestor::section')
    const saleCity = section.getByLabel('Vender en')
    const saleStrategy = section.getByLabel('Método de venta')
    const quality = section.getByLabel('Calidad')

    await saleCity.waitFor({ state: 'visible', timeout: 60_000 })
    await saleCity.selectOption(MARKET_KEY)
    await saleStrategy.selectOption('sell-order')
    await quality.selectOption(String(QUALITY))

    const refresh = page.getByRole('button', {
      name: /Actualizar todos los precios|Reintentar ahora/,
    })
    await refresh.waitFor({ state: 'visible', timeout: 120_000 })
    await refresh.click({ timeout: 120_000 })

    verification = await waitForVisiblePrice(page, section, observedRows)
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })

    const violations = cspViolations(consoleMessages)
    if (EXPECT_CSP_CLEAN && violations.length > 0) {
      throw new Error(
        `Producción generó ${violations.length} violación(es) CSP: ${violations
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

  const violations = cspViolations(consoleMessages)
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
    browserPrice: verification.expected,
    displayedInputValue: verification.value,
    sourceVisible: verification.sourceVisible,
    automaticPriceVisible: verification.automaticVisible,
    thetfordConfigurationVisible: verification.configurationVisible,
    observedApiRequests: observedRequests,
    observedPriceRows: observedRows.length,
    cspCleanExpected: EXPECT_CSP_CLEAN,
    cspViolationCount: violations.length,
    screenshot: SCREENSHOT_PATH,
    priceChangedDuringValidation:
      verification.expected !== apiPreflight.sellPriceMin,
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
