# RADMIN-ONLINE.ps1 — one-click setup for playing Catan Duel online over Radmin VPN.
#
# It bridges the dev servers (which run inside WSL) out to your Windows Radmin IP, and
# opens the firewall ONLY to Radmin peers (26.x.x.x). Fully reversed by RADMIN-OFFLINE.ps1.
#
# HOW TO RUN: right-click this file in the repo folder -> "Run with PowerShell"
# (it will ask for admin; that's needed to add the port bridge + firewall rules).

# --- self-elevate to admin ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
  exit
}

$ErrorActionPreference = 'SilentlyContinue'
Write-Host "`n=== Catan Duel — Radmin online setup ===`n" -ForegroundColor Cyan

# --- find the WSL IP (where npm run dev / npm run party actually listen) ---
$wsl = (wsl.exe hostname -I).Trim().Split(' ')[0]
if (-not $wsl) { Write-Host "Could not find the WSL IP. Is WSL running?" -ForegroundColor Red; pause; exit 1 }
Write-Host "WSL IP (servers run here): $wsl"

# --- find your Radmin VPN address (the 26.x your friend connects to) ---
$radmin = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '26.*' } | Select-Object -First 1).IPAddress
if (-not $radmin) { Write-Host "No Radmin (26.x) address found. Start Radmin VPN first, then re-run." -ForegroundColor Red; pause; exit 1 }
Write-Host "Your Radmin IP (friend connects here): $radmin`n"

# --- bridge Windows -> WSL for both ports (5173 game, 1999 relay) ---
foreach ($port in 5173, 1999) {
  netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
  netsh interface portproxy add    v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wsl | Out-Null
}
Write-Host "Port bridge added (5173, 1999 -> WSL)." -ForegroundColor Green

# --- firewall: allow those ports ONLY from Radmin peers (26.0.0.0/8) ---
Remove-NetFirewallRule -DisplayName "Catan Duel 5173 (Radmin)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Catan Duel 1999 (Radmin)" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Catan Duel 5173 (Radmin)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress 26.0.0.0/8 | Out-Null
New-NetFirewallRule -DisplayName "Catan Duel 1999 (Radmin)" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1999 -RemoteAddress 26.0.0.0/8 | Out-Null
Write-Host "Firewall opened to Radmin peers only (26.x)." -ForegroundColor Green

# --- point the app at your relay (written into the repo, gitignored) ---
$envPath = Join-Path $PSScriptRoot ".env.development.local"
"VITE_PARTYKIT_HOST=$radmin`:1999" | Set-Content -Encoding ascii $envPath
Write-Host "Wrote $envPath  (VITE_PARTYKIT_HOST=$radmin`:1999)`n" -ForegroundColor Green

Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host " NEXT:" -ForegroundColor Yellow
Write-Host "  1. In WSL, (re)start both servers:  npm run party   and   npm run dev"
Write-Host "     (restart needed so it picks up the new VITE_PARTYKIT_HOST)"
Write-Host "  2. You open:        http://localhost:5173   -> Online -> make a room"
Write-Host "  3. Friend opens:    http://$radmin`:5173      -> Online -> same room code"
Write-Host "  4. When finished, run RADMIN-OFFLINE.ps1 to close everything."
Write-Host "----------------------------------------------------------------`n" -ForegroundColor Yellow
pause
