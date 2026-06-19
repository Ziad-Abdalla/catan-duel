# RADMIN-ONLINE.ps1 — one-click setup to HOST an online Catan Duel game over Radmin VPN.
#
# Run it NORMALLY (right-click -> "Run with PowerShell") from the repo folder. It:
#   1. finds your WSL server IP + your Radmin (26.x) address,
#   2. writes the relay host into the repo's .env.development.local (via WSL, so it works
#      even though the repo lives on the WSL filesystem),
#   3. opens ONE elevated (UAC) window to add the Windows->WSL port bridge + a firewall
#      rule scoped to Radmin peers (26.x) only.
# Reverse it all afterwards with RADMIN-OFFLINE.ps1.
#
# NOTE: do NOT pre-elevate this script — elevated Windows processes can't reach the
# \\wsl.localhost share, so it must start non-elevated and elevate only the netsh/firewall
# step (which needs no filesystem access).

$ErrorActionPreference = 'SilentlyContinue'
Write-Host "`n=== Catan Duel — Radmin online setup ===`n" -ForegroundColor Cyan

# --- WSL server IP (where npm run dev / npm run party listen) ---
$wsl = (wsl.exe hostname -I).Trim().Split(' ')[0]
if (-not $wsl) { Write-Host "Could not find the WSL IP. Start WSL (open a WSL terminal), then re-run." -ForegroundColor Red; pause; exit 1 }
Write-Host "WSL IP (servers run here): $wsl"

# --- your Radmin VPN address (what your friend connects to) ---
$radmin = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '26.*' } | Select-Object -First 1).IPAddress
if (-not $radmin) { Write-Host "No Radmin (26.x) address found. Start Radmin VPN + join/create a network, then re-run." -ForegroundColor Red; pause; exit 1 }
Write-Host "Your Radmin IP (friend connects here): $radmin`n"

# --- point the app at your relay: write .env.development.local through WSL (robust) ---
$wslRepo = $PSScriptRoot -replace '^\\\\wsl(\.localhost|\$)\\[^\\]+', '' -replace '\\', '/'
if ($wslRepo -notmatch '^/') { $wslRepo = '~/projects/catan-duel' } # fallback if not run from the \\wsl path
wsl.exe bash -c "printf 'VITE_PARTYKIT_HOST=%s:1999\n' '$radmin' > '$wslRepo/.env.development.local'"
Write-Host "Wrote $wslRepo/.env.development.local  (VITE_PARTYKIT_HOST=$radmin`:1999)" -ForegroundColor Green

# --- elevate ONCE for the port bridge + firewall (inline, no file access needed) ---
$cmds = @(
  "netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0",
  "netsh interface portproxy add    v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl",
  "netsh interface portproxy delete v4tov4 listenport=1999 listenaddress=0.0.0.0",
  "netsh interface portproxy add    v4tov4 listenport=1999 listenaddress=0.0.0.0 connectport=1999 connectaddress=$wsl",
  "Remove-NetFirewallRule -DisplayName 'Catan Duel 5173 (Radmin)' -EA SilentlyContinue",
  "Remove-NetFirewallRule -DisplayName 'Catan Duel 1999 (Radmin)' -EA SilentlyContinue",
  "New-NetFirewallRule -DisplayName 'Catan Duel 5173 (Radmin)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress 26.0.0.0/8 | Out-Null",
  "New-NetFirewallRule -DisplayName 'Catan Duel 1999 (Radmin)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1999 -RemoteAddress 26.0.0.0/8 | Out-Null"
) -join '; '
Write-Host "Opening an elevated window to add the bridge + firewall (click YES on the UAC prompt)..." -ForegroundColor Yellow
Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmds -Wait

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host " NEXT:" -ForegroundColor Yellow
Write-Host "  1. In WSL, (re)start both servers:  npm run party   and   npm run dev"
Write-Host "     (restart so dev picks up the new VITE_PARTYKIT_HOST)"
Write-Host "  2. You open:        http://localhost:5173   -> Online -> make a room"
Write-Host "  3. Friend opens:    http://$radmin`:5173      -> Online -> same room code"
Write-Host "  4. When finished, run RADMIN-OFFLINE.ps1 to close everything."
Write-Host "----------------------------------------------------------------`n" -ForegroundColor Yellow
pause
