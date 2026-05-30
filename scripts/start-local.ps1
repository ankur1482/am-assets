param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($listener) {
  Write-Host "Already running: http://localhost:$Port (PID $($listener.OwningProcess))"
  exit 0
}

$out = Join-Path $root "dev.out.log"
$err = Join-Path $root "dev.err.log"

$process = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "-p", "$Port") `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err `
  -PassThru

Start-Sleep -Seconds 3

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) {
  Write-Error "Started npm process $($process.Id), but nothing is listening on port $Port. Check dev.err.log."
}

Write-Host "Started: http://localhost:$Port (launcher PID $($process.Id))"
