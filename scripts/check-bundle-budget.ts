import { gzipSync } from 'node:zlib'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

interface BundleBudgets {
  readonly totalRawBytes: number
  readonly totalGzipBytes: number
  readonly javascriptRawBytes: number
  readonly javascriptGzipBytes: number
  readonly cssRawBytes: number
  readonly cssGzipBytes: number
  readonly largestFileRawBytes: number
  readonly largestFileGzipBytes: number
}

interface BundleBudgetConfig {
  readonly schemaVersion: 1
  readonly distDir: string
  readonly reportPath: string
  readonly budgets: BundleBudgets
}

type AssetKind = 'javascript' | 'css' | 'html' | 'media' | 'other'

interface AssetEntry {
  readonly file: string
  readonly kind: AssetKind
  readonly rawBytes: number
  readonly gzipBytes: number
}

interface BundleMetric {
  readonly rawBytes: number
  readonly gzipBytes: number
}

interface BundleReport {
  readonly generatedAt: string
  readonly distDir: string
  readonly budgets: BundleBudgets
  readonly totals: BundleMetric
  readonly javascript: BundleMetric
  readonly css: BundleMetric
  readonly largestFile: AssetEntry | null
  readonly assets: readonly AssetEntry[]
}

interface CliOptions {
  readonly configPath: string
  readonly writeReport: boolean
}

const DEFAULT_CONFIG_PATH = 'quality/bundle-budget.json'

function parseCliOptions(argv: readonly string[]): CliOptions {
  let configPath = DEFAULT_CONFIG_PATH
  let writeReport = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--write-report') {
      writeReport = true
      continue
    }

    if (arg === '--config') {
      const next = argv[index + 1]
      if (!next) throw new Error('Falta valor para --config')
      configPath = next
      index += 1
      continue
    }

    throw new Error(`Argumento no soportado: ${arg}`)
  }

  return { configPath, writeReport }
}

function asPositiveNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Presupuesto inválido: ${name}`)
  }

  return value
}

function parseConfig(value: unknown): BundleBudgetConfig {
  if (!value || typeof value !== 'object') {
    throw new Error('La configuración de bundle budget debe ser un objeto')
  }

  const candidate = value as Record<string, unknown>
  const budgets = candidate['budgets']

  if (!budgets || typeof budgets !== 'object') {
    throw new Error('La configuración debe incluir budgets')
  }

  const budgetMap = budgets as Record<string, unknown>

  return {
    schemaVersion: 1,
    distDir:
      typeof candidate['distDir'] === 'string' && candidate['distDir'].length > 0
        ? candidate['distDir']
        : 'dist',
    reportPath:
      typeof candidate['reportPath'] === 'string' &&
      candidate['reportPath'].length > 0
        ? candidate['reportPath']
        : 'artifacts/performance/bundle-report.json',
    budgets: {
      totalRawBytes: asPositiveNumber(
        budgetMap['totalRawBytes'],
        'totalRawBytes',
      ),
      totalGzipBytes: asPositiveNumber(
        budgetMap['totalGzipBytes'],
        'totalGzipBytes',
      ),
      javascriptRawBytes: asPositiveNumber(
        budgetMap['javascriptRawBytes'],
        'javascriptRawBytes',
      ),
      javascriptGzipBytes: asPositiveNumber(
        budgetMap['javascriptGzipBytes'],
        'javascriptGzipBytes',
      ),
      cssRawBytes: asPositiveNumber(budgetMap['cssRawBytes'], 'cssRawBytes'),
      cssGzipBytes: asPositiveNumber(
        budgetMap['cssGzipBytes'],
        'cssGzipBytes',
      ),
      largestFileRawBytes: asPositiveNumber(
        budgetMap['largestFileRawBytes'],
        'largestFileRawBytes',
      ),
      largestFileGzipBytes: asPositiveNumber(
        budgetMap['largestFileGzipBytes'],
        'largestFileGzipBytes',
      ),
    },
  }
}

async function loadConfig(configPath: string): Promise<BundleBudgetConfig> {
  const content = await readFile(configPath, 'utf8')
  return parseConfig(JSON.parse(content))
}

function getAssetKind(filePath: string): AssetKind {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.js' || extension === '.mjs') return 'javascript'
  if (extension === '.css') return 'css'
  if (extension === '.html') return 'html'
  if (
    ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp', '.woff2'].includes(
      extension,
    )
  ) {
    return 'media'
  }

  return 'other'
}

async function collectFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, absolutePath)))
      continue
    }

    if (!entry.isFile()) continue
    if (entry.name.endsWith('.map')) continue

    files.push(path.relative(rootDir, absolutePath).replaceAll(path.sep, '/'))
  }

  return files.sort((left, right) => left.localeCompare(right))
}

async function analyzeAsset(distDir: string, file: string): Promise<AssetEntry> {
  const absolutePath = path.join(distDir, file)
  const [metadata, content] = await Promise.all([
    stat(absolutePath),
    readFile(absolutePath),
  ])

  return {
    file,
    kind: getAssetKind(file),
    rawBytes: metadata.size,
    gzipBytes: gzipSync(content).byteLength,
  }
}

function sumAssets(
  assets: readonly AssetEntry[],
  predicate: (asset: AssetEntry) => boolean,
): BundleMetric {
  return assets.reduce<BundleMetric>(
    (total, asset) =>
      predicate(asset)
        ? {
            rawBytes: total.rawBytes + asset.rawBytes,
            gzipBytes: total.gzipBytes + asset.gzipBytes,
          }
        : total,
    { rawBytes: 0, gzipBytes: 0 },
  )
}

function findLargestAsset(assets: readonly AssetEntry[]): AssetEntry | null {
  return assets.reduce<AssetEntry | null>((largest, asset) => {
    if (!largest) return asset
    return asset.rawBytes > largest.rawBytes ? asset : largest
  }, null)
}

async function buildReport(config: BundleBudgetConfig): Promise<BundleReport> {
  const files = await collectFiles(config.distDir)
  const assets = await Promise.all(
    files.map((file) => analyzeAsset(config.distDir, file)),
  )
  const sortedAssets = assets.toSorted(
    (left, right) => right.rawBytes - left.rawBytes,
  )

  return {
    generatedAt: new Date().toISOString(),
    distDir: config.distDir,
    budgets: config.budgets,
    totals: sumAssets(sortedAssets, () => true),
    javascript: sumAssets(
      sortedAssets,
      (asset) => asset.kind === 'javascript',
    ),
    css: sumAssets(sortedAssets, (asset) => asset.kind === 'css'),
    largestFile: findLargestAsset(sortedAssets),
    assets: sortedAssets,
  }
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

function formatMetric(metric: BundleMetric): string {
  return `${formatBytes(metric.rawBytes)} raw / ${formatBytes(metric.gzipBytes)} gzip`
}

function checkBudget(
  label: string,
  actual: number,
  budget: number,
): string | null {
  if (actual <= budget) return null
  return `${label}: ${formatBytes(actual)} supera presupuesto ${formatBytes(budget)}`
}

function collectBudgetViolations(report: BundleReport): string[] {
  const largestFile = report.largestFile

  return [
    checkBudget(
      'Total raw',
      report.totals.rawBytes,
      report.budgets.totalRawBytes,
    ),
    checkBudget(
      'Total gzip',
      report.totals.gzipBytes,
      report.budgets.totalGzipBytes,
    ),
    checkBudget(
      'JavaScript raw',
      report.javascript.rawBytes,
      report.budgets.javascriptRawBytes,
    ),
    checkBudget(
      'JavaScript gzip',
      report.javascript.gzipBytes,
      report.budgets.javascriptGzipBytes,
    ),
    checkBudget('CSS raw', report.css.rawBytes, report.budgets.cssRawBytes),
    checkBudget('CSS gzip', report.css.gzipBytes, report.budgets.cssGzipBytes),
    largestFile
      ? checkBudget(
          `Archivo más grande (${largestFile.file}) raw`,
          largestFile.rawBytes,
          report.budgets.largestFileRawBytes,
        )
      : null,
    largestFile
      ? checkBudget(
          `Archivo más grande (${largestFile.file}) gzip`,
          largestFile.gzipBytes,
          report.budgets.largestFileGzipBytes,
        )
      : null,
  ].filter((violation): violation is string => violation !== null)
}

function printReport(report: BundleReport): void {
  console.log('Bundle budget report')
  console.log(`Dist: ${report.distDir}`)
  console.log(`Total: ${formatMetric(report.totals)}`)
  console.log(`JavaScript: ${formatMetric(report.javascript)}`)
  console.log(`CSS: ${formatMetric(report.css)}`)

  if (report.largestFile) {
    console.log(
      `Largest file: ${report.largestFile.file} (${formatMetric(report.largestFile)})`,
    )
  }

  console.log('Largest assets:')
  for (const asset of report.assets.slice(0, 8)) {
    console.log(
      `- ${asset.file} [${asset.kind}]: ${formatMetric(asset)}`,
    )
  }
}

async function writeReport(report: BundleReport, reportPath: string): Promise<void> {
  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Bundle report written to ${reportPath}`)
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2))
  const config = await loadConfig(options.configPath)
  const report = await buildReport(config)
  const violations = collectBudgetViolations(report)

  printReport(report)

  if (options.writeReport) {
    await writeReport(report, config.reportPath)
  }

  if (violations.length > 0) {
    console.error('Bundle budget exceeded:')
    for (const violation of violations) console.error(`- ${violation}`)
    process.exitCode = 1
    return
  }

  console.log('Bundle budget OK')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
