<#
  dev.ps1 - jalankan FE + BE + AI sekaligus untuk pengembangan lokal.

  Layanan (KRIYA-MASTER.md Bagian 4):
    FE  web  (Next.js)  -> http://localhost:3000   (apps/web)
    BE  api  (Go/Gin)   -> http://localhost:8080   (services/api)
    AI  ai   (FastAPI)  -> http://localhost:8000   (services/ai)

  Cara pakai:
    ./dev.ps1              # buka 3 window terpisah, satu per service
    ./dev.ps1 -Install     # setup dependency dulu (npm/pip install) lalu jalan

  Catatan:
    - .env di root dimuat ke environment lalu diwariskan ke ketiga service.
    - Tutup tiap window (Ctrl+C) untuk menghentikan service masing-masing.
#>
[CmdletBinding()]
param(
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Write-Step($msg) { Write-Host "[dev] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[dev] $msg" -ForegroundColor Green }
function Write-Note($msg) { Write-Host "[dev] $msg" -ForegroundColor Yellow }

# --- 1) Muat .env root ke environment proses ini (diwariskan ke window anak) ---
$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
    $dq = [char]34
    $sq = [char]39
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $idx = $line.IndexOf('=')
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim().Trim($dq).Trim($sq)
            Set-Item -Path "Env:$key" -Value $val
        }
    }
    Write-Ok ".env dimuat"
} else {
    Write-Note ".env tidak ditemukan - service jalan dengan nilai default"
}

# --- Path service ---
$webDir = Join-Path $root 'apps\web'
$apiDir = Join-Path $root 'services\api'
$aiDir  = Join-Path $root 'services\ai'
$venvPy = Join-Path $aiDir '.venv\Scripts\python.exe'

# --- 2) Setup dependency (opsional / otomatis bila belum ada) ---
if ($Install -or -not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Step "FE: npm install ..."
    Push-Location $webDir; npm install; Pop-Location
}

if (-not (Test-Path $venvPy)) {
    Write-Step "AI: membuat virtualenv .venv ..."
    Push-Location $aiDir; python -m venv .venv; Pop-Location
}
if ($Install) {
    Write-Step "AI: pip install -r requirements.txt ..."
    Push-Location $aiDir; & $venvPy -m pip install -r requirements.txt; Pop-Location
}

# --- 3) Perintah tiap service (dijalankan di window PowerShell terpisah) ---
$feCmd = "`$Host.UI.RawUI.WindowTitle='KRIYA FE :3000'; pnpm dev"
$beCmd = "`$Host.UI.RawUI.WindowTitle='KRIYA BE :8080'; go run ./cmd/api"
$aiCmd = "`$Host.UI.RawUI.WindowTitle='KRIYA AI :8000'; & '$venvPy' -m uvicorn app.main:app --reload --port 8000"

Write-Step "Menjalankan FE, BE, AI di window terpisah ..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', $beCmd -WorkingDirectory $apiDir
Start-Process powershell -ArgumentList '-NoExit', '-Command', $aiCmd -WorkingDirectory $aiDir
Start-Process powershell -ArgumentList '-NoExit', '-Command', $feCmd -WorkingDirectory $webDir

Write-Ok "Ketiga service dijalankan:"
Write-Host "      FE  -> http://localhost:3000"
Write-Host "      BE  -> http://localhost:8080/healthz"
Write-Host "      AI  -> http://localhost:8000/healthz"
Write-Host "[dev] Tutup masing-masing window (Ctrl+C) untuk berhenti." -ForegroundColor DarkGray
