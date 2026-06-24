param(
    [string]$ServiceUrl = "http://127.0.0.1:8787"
)

$ErrorActionPreference = "Stop"

try {
    $status = Invoke-RestMethod "$ServiceUrl/api/v1/status"
    Write-Host "Servicio local conectado:" $status.status
    if ($status.repository) {
        Write-Host "Historiales persistidos:" $status.repository.historySnapshots
        Write-Host "Órdenes persistidas:" $status.repository.orderSnapshots
    }
} catch {
    Write-Error "No se pudo conectar a $ServiceUrl. Inicia primero scripts/receiver.ps1 en albion-market-data-platform."
    exit 1
}

corepack pnpm dev
