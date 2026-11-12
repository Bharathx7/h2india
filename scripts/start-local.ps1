# Starts H2 India on this Windows computer: http://localhost:3000
# Double-click start-local.cmd in the project folder. From a terminal you can add options:
#   start-local.cmd -ComingSoon     visitors see the pre-launch page (open it in a private window, signed out)
#   start-local.cmd -SkipInstall    skip "pnpm install" (faster when nothing changed)
#   start-local.cmd -SkipSeed       skip adding the sample data
# It never changes an existing .env.local. Sample content is switched on for this run only (F9: never in production).
# Runbook: docs/runbooks/run-locally.md
param(
  [switch]$ComingSoon,
  [switch]$SkipInstall,
  [switch]$SkipSeed
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$rootQuoted = $root -replace "'", "''"
$host.UI.RawUI.WindowTitle = 'H2 India - starting'

function Step($text) {
  Write-Host ''
  Write-Host "==> $text" -ForegroundColor Cyan
}

function Stop-Here($text) {
  Write-Host ''
  Write-Host "STOPPED: $text" -ForegroundColor Red
  Write-Host ''
  Read-Host 'Press Enter to close'
  exit 1
}

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-DockerRunning {
  docker info --format '{{.ServerVersion}}' *> $null
  return ($LASTEXITCODE -eq 0)
}

# Opens a new PowerShell window that keeps running a command (the website or the worker).
function Start-Window($title, $command) {
  $script = "`$host.UI.RawUI.WindowTitle = '$title'; Set-Location -LiteralPath '$rootQuoted'; $command"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
  Start-Process powershell -ArgumentList "-NoExit -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded" -WorkingDirectory $root
}

Write-Host 'H2 India - local start' -ForegroundColor Green
Write-Host "Folder: $root"

# 1. Tools ------------------------------------------------------------------------------------------------------------
Step 'Checking the tools'
if (-not (Test-Command 'node')) {
  Stop-Here 'Node.js is not installed. Install it with: winget install OpenJS.NodeJS.LTS  then open a new window and run this again.'
}
$nodeText = (node -v).Trim()
$nodeVersion = [version]($nodeText.TrimStart('v'))
if ($nodeVersion -lt [version]'22.23.4') {
  Stop-Here "Node.js $nodeText is too old. Payload needs 22.23.4 or newer (24 LTS recommended): winget install OpenJS.NodeJS.LTS"
}
Write-Host "Node.js $nodeText"

if (-not (Test-Command 'pnpm')) {
  Write-Host 'pnpm is missing: installing it with npm'
  npm install -g pnpm
  if (-not (Test-Command 'pnpm')) { Stop-Here 'Could not install pnpm. Run: npm install -g pnpm  then run this again.' }
}
Write-Host "pnpm $((pnpm -v).Trim())"

if (-not (Test-Command 'docker')) {
  Stop-Here 'Docker Desktop is not installed. Install it with: winget install Docker.DockerDesktop  (it needs WSL 2), restart the computer, then run this again.'
}
if (-not (Test-DockerRunning)) {
  # Docker Desktop installs for all users (Program Files) or for one user (AppData\Local\Programs).
  $dockerApp = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe')
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($dockerApp) {
    Write-Host 'Docker Desktop is not running: starting it (this can take a minute)'
    Start-Process -FilePath $dockerApp
    $deadline = (Get-Date).AddMinutes(3)
    while (-not (Test-DockerRunning) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 5 }
  }
  if (-not (Test-DockerRunning)) { Stop-Here 'Docker Desktop is not running. Start it from the Start menu, wait until it says "Engine running", then run this again.' }
}
Write-Host 'Docker is running'

# 2. Settings ---------------------------------------------------------------------------------------------------------
Step 'Checking the settings file (.env.local)'
$envFile = Join-Path $root '.env.local'
$exampleFile = Join-Path $root '.env.example'
if (-not (Test-Path -LiteralPath $envFile)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  $text = [IO.File]::ReadAllText($exampleFile) -replace '(?m)^AUTH_SECRET=.*$', "AUTH_SECRET=$secret"
  [IO.File]::WriteAllText($envFile, $text)
  Write-Host 'Created .env.local from .env.example with a new random AUTH_SECRET (local passwords stay "change-me").'
} else {
  # Names only: values may be secrets and are never printed.
  $keyPattern = '^\s*([A-Z0-9_]+)\s*='
  $have = @{}
  foreach ($line in [IO.File]::ReadAllLines($envFile)) { if ($line -match $keyPattern) { $have[$Matches[1]] = $true } }
  $missing = @()
  foreach ($line in [IO.File]::ReadAllLines($exampleFile)) {
    if ($line -match $keyPattern -and -not $have.ContainsKey($Matches[1])) { $missing += $Matches[1] }
  }
  Write-Host 'Using your .env.local (not changed).'
  if ($missing.Count -gt 0) {
    Write-Host ("Settings in .env.example that your .env.local does not have (their defaults are used): " + ($missing -join ', ')) -ForegroundColor Yellow
  }
}

# For this run only: the design's sample data shows, and the home page (or Coming soon) is chosen here.
$env:FLAG_SAMPLE_CONTENT = 'true'
if ($ComingSoon) { $env:FLAG_COMING_SOON = 'true' } else { $env:FLAG_COMING_SOON = 'false' }

# 3. Port 3000 must be free -------------------------------------------------------------------------------------------
$busy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($busy) {
  $owner = Get-Process -Id $busy.OwningProcess -ErrorAction SilentlyContinue
  Stop-Here "Port 3000 is already in use by $($owner.ProcessName) (process $($busy.OwningProcess)). An older H2 India window may still be open: close it, then run this again."
}

# 4. Local services ---------------------------------------------------------------------------------------------------
Step 'Starting the database, Redis, search, file storage and the mail catcher (Docker)'
docker compose --env-file .env.local up -d --wait postgres redis meilisearch minio mailpit
if ($LASTEXITCODE -ne 0) { Stop-Here 'Docker could not start the local services (see the messages above).' }
docker compose --env-file .env.local run --rm minio-init
if ($LASTEXITCODE -ne 0) { Stop-Here 'Could not create the file storage buckets (see the messages above).' }
# The virus scanner is only needed for uploads; its first start downloads signatures, so it is not waited for.
docker compose --env-file .env.local up -d clamav | Out-Null

# 5. Packages, database, sample data ----------------------------------------------------------------------------------
if (-not $SkipInstall) {
  Step 'Installing packages (pnpm install)'
  pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { Stop-Here 'pnpm install failed (see the messages above).' }
}

Step 'Updating the database (migrations)'
pnpm db:migrate
if ($LASTEXITCODE -ne 0) { Stop-Here 'The database update failed (see the messages above).' }

if (-not $SkipSeed) {
  Step 'Adding the sample data from the design (safe to run again)'
  pnpm db:seed
  if ($LASTEXITCODE -ne 0) { Stop-Here 'Adding the sample data failed (see the messages above).' }
}

# 6. Worker and website in their own windows --------------------------------------------------------------------------
Step 'Starting the background worker (sends the sign-in codes) in a new window'
Start-Window 'H2 India - worker' 'pnpm dev:worker'

Step 'Starting the website in a new window'
Start-Window 'H2 India - website (localhost:3000)' 'pnpm dev'

Step 'Waiting for the website (the first page compiles once, usually under a minute)'
$deadline = (Get-Date).AddMinutes(5)
$ready = $false
while (-not $ready -and (Get-Date) -lt $deadline) {
  try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/' -UseBasicParsing -TimeoutSec 180
    if ($response.StatusCode -eq 200) { $ready = $true }
  } catch {
    Start-Sleep -Seconds 3
  }
}
if (-not $ready) {
  Stop-Here 'The website did not answer within 5 minutes. Look at the "H2 India - website" window for the error.'
}

Start-Process 'http://localhost:3000'

Write-Host ''
Write-Host 'H2 India is running.' -ForegroundColor Green
if ($ComingSoon) {
  Write-Host '  Coming soon is ON: visitors see the pre-launch page. Open http://localhost:3000 in a private window.'
} else {
  Write-Host '  Website:       http://localhost:3000   (opened in your browser)'
}
Write-Host '  Sign-in codes: http://localhost:8025   (Mailpit catches every email; nothing reaches a real inbox)'
Write-Host '  CMS:           http://localhost:3000/cms'
Write-Host '  Sample data from the design is shown, marked sample. It never shows in production.'
Write-Host ''
Write-Host 'To stop: close the two "H2 India" windows. To stop the database and the other services too: pnpm dev:down'
Write-Host ''
Read-Host 'Press Enter to close this window (the website keeps running)'
