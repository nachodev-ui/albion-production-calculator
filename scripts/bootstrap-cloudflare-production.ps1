[CmdletBinding()]
param(
    [string]$ProjectName = "albion-production-calculator",
    [string]$AccountIdFile = ".\secrets\deployment\cloudflare-account-id.secret",
    [string]$ApiTokenFile = ".\secrets\deployment\cloudflare-api-token.secret",
    [switch]$SkipProjectCreate
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-Command {
    param([Parameter(Mandatory)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontró '$Name' en PATH."
    }
}

function Read-RequiredFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Falta $Label en: $Path"
    }

    $value = (Get-Content -LiteralPath $Path -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "$Label está vacío: $Path"
    }

    return $value
}

Assert-Command -Name "pnpm"

$accountId = Read-RequiredFile -Path $AccountIdFile -Label "Cloudflare Account ID"
$apiToken = Read-RequiredFile -Path $ApiTokenFile -Label "Cloudflare API token"

$previousAccountId = $env:CLOUDFLARE_ACCOUNT_ID
$previousApiToken = $env:CLOUDFLARE_API_TOKEN
$previousCentralApiUrl = $env:VITE_CENTRAL_MARKET_API_URL
$previousLocalFallback = $env:VITE_ENABLE_LOCAL_RECEIVER_FALLBACK
$previousTimeout = $env:VITE_MARKET_REQUEST_TIMEOUT_MS

try {
    $env:CLOUDFLARE_ACCOUNT_ID = $accountId
    $env:CLOUDFLARE_API_TOKEN = $apiToken
    $env:VITE_CENTRAL_MARKET_API_URL = "https://albion-market-api.onrender.com/api/v1"
    $env:VITE_ENABLE_LOCAL_RECEIVER_FALLBACK = "false"
    $env:VITE_MARKET_REQUEST_TIMEOUT_MS = "7000"

    if (-not $SkipProjectCreate) {
        Write-Host "Creando proyecto Cloudflare Pages '$ProjectName'..."
        & pnpm dlx wrangler@latest pages project create $ProjectName --production-branch main
        if ($LASTEXITCODE -ne 0) {
            throw "No fue posible crear el proyecto. Si ya existe, repite con -SkipProjectCreate."
        }
    }

    Write-Host "Instalando dependencias y validando el frontend..."
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "Falló pnpm install." }

    & pnpm contracts:check
    if ($LASTEXITCODE -ne 0) { throw "Falló contracts:check." }

    & pnpm security:check
    if ($LASTEXITCODE -ne 0) { throw "Falló security:check." }

    & pnpm test
    if ($LASTEXITCODE -ne 0) { throw "Fallaron las pruebas." }

    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Falló el build de producción." }

    Write-Host "Desplegando en Cloudflare Pages..."
    & pnpm dlx wrangler@latest pages deploy dist --project-name $ProjectName --branch main --commit-dirty=false
    if ($LASTEXITCODE -ne 0) {
        throw "Falló el despliegue de Cloudflare Pages."
    }

    $frontendUrl = "https://$ProjectName.pages.dev"
    Write-Host "Verificando $frontendUrl..."
    $response = Invoke-WebRequest -UseBasicParsing -Uri $frontendUrl -Method Get
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch '<div id="root"></div>') {
        throw "La verificación del frontend no devolvió la aplicación esperada."
    }

    Invoke-RestMethod -Method Get -Uri "https://albion-market-api.onrender.com/readyz" | Out-Host
    Write-Host "Frontend desplegado correctamente en $frontendUrl"
}
finally {
    $env:CLOUDFLARE_ACCOUNT_ID = $previousAccountId
    $env:CLOUDFLARE_API_TOKEN = $previousApiToken
    $env:VITE_CENTRAL_MARKET_API_URL = $previousCentralApiUrl
    $env:VITE_ENABLE_LOCAL_RECEIVER_FALLBACK = $previousLocalFallback
    $env:VITE_MARKET_REQUEST_TIMEOUT_MS = $previousTimeout

    $accountId = $null
    $apiToken = $null
}
