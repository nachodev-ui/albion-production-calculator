param(
    [string]$CentralApiUrl = "http://127.0.0.1:8080",
    [string]$ReceiverUrl = "http://127.0.0.1:8787"
)

$ErrorActionPreference = "Continue"

function Test-MarketService {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url
    )

    try {
        $status = Invoke-RestMethod "$Url/api/v1/status" -TimeoutSec 3
        Write-Host "[OK] $Name conectado en $Url (estado: $($status.status))" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Warning "$Name no disponible en $Url"
        return $false
    }
}

$centralAvailable = Test-MarketService -Name "API central" -Url $CentralApiUrl
$receiverAvailable = Test-MarketService -Name "Receiver local" -Url $ReceiverUrl

if (-not $centralAvailable -and -not $receiverAvailable) {
    Write-Warning "No hay fuentes en línea. La aplicación podrá usar caché del navegador o precios manuales."
}
elseif (-not $centralAvailable -and $receiverAvailable) {
    Write-Host "Se utilizará el receiver local como fallback." -ForegroundColor Yellow
}

corepack pnpm dev
