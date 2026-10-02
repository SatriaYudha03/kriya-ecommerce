<#
  dev.ps1 - jalankan FE + BE + n8n sekaligus untuk pengembangan lokal.

  Layanan (KRIYA-MASTER.md Bagian 4):
    FE   web        (Next.js)    -> http://localhost:3000   (apps/web)
    BE   api        (Go/Gin)     -> http://localhost:8080   (services/api)
    n8n  chatbot    (Docker)     -> http://localhost:5678   (docker-compose.yml)
         llm-proxy  (Docker)     -> memaksa stream:false untuk 9router (:20128 di host)

  Cara pakai:
    ./dev.ps1              # FE + BE di window terpisah, n8n + llm-proxy lewat Docker
    ./dev.ps1 -Install     # npm install dulu lalu jalan

  Catatan:
    - .env di root dimuat ke environment lalu diwariskan ke FE/BE dan docker compose.
    - Chatbot butuh Docker Desktop berjalan dan 9router aktif di localhost:20128.
    - Hentikan n8n: docker compose stop n8n llm-proxy
    - Tutup tiap window FE/BE (Ctrl+C) untuk menghentikan service masing-masing.
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

# --- 2) Setup dependency (opsional / otomatis bila belum ada) ---
if ($Install -or -not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Step "FE: npm install ..."
    Push-Location $webDir; npm install; Pop-Location
}

# --- 3) n8n + llm-proxy (Docker) ---
$n8nUp = $false
if (-not $env:N8N_ENCRYPTION_KEY) {
    Write-Note "N8N_ENCRYPTION_KEY kosong di .env - n8n dilewati (lihat .env.example)"
} elseif (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Note "docker tidak ditemukan - n8n dilewati"
} else {
    Write-Step "n8n: docker compose up -d n8n llm-proxy ..."
    Push-Location $root
    docker compose up -d n8n llm-proxy
    $n8nUp = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $n8nUp) { Write-Note "n8n gagal start - pastikan Docker Desktop berjalan" }
}

# --- 4) Perintah tiap service (dijalankan di window PowerShell terpisah) ---
$feCmd = "`$Host.UI.RawUI.WindowTitle='KRIYA FE :3000'; pnpm dev"
$beCmd = "`$Host.UI.RawUI.WindowTitle='KRIYA BE :8080'; go run ./cmd/api"

Write-Step "Menjalankan FE dan BE di window terpisah ..."
Start-Process powershell -ArgumentList '-NoExit', '-Command', $beCmd -WorkingDirectory $apiDir
Start-Process powershell -ArgumentList '-NoExit', '-Command', $feCmd -WorkingDirectory $webDir

Write-Ok "Service dijalankan:"
Write-Host "      FE  -> http://localhost:3000"
Write-Host "      BE  -> http://localhost:8080/healthz"
if ($n8nUp) {
    Write-Host "      n8n -> http://localhost:5678  (webhook: /webhook/kriya-chat)"
}
Write-Host "[dev] Tutup window FE/BE (Ctrl+C) untuk berhenti; n8n: docker compose stop n8n llm-proxy." -ForegroundColor DarkGray
