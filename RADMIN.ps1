# RADMIN.ps1 - Catan Duel online control panel (Radmin VPN).
# Right-click this file -> "Run with PowerShell". It shows live status (Radmin, FIREWALL,
# bridge, servers, friend) and lets you Open (host a game) or Close (make safe) in one key.
# Run it NON-elevated; it elevates only the firewall/bridge step (one UAC each way).
# The desktop panel calls it directly with -Open (host now) or -Close (make safe + stop).
param([switch]$Open, [switch]$Close)

$ErrorActionPreference = 'SilentlyContinue'
$Host.UI.RawUI.WindowTitle = 'Catan Duel - Online'

# the repo path inside WSL (derived from where this script sits, with a sensible fallback)
$WslRepo = $PSScriptRoot -replace '^\\\\wsl(\.localhost|\$)\\[^\\]+', '' -replace '\\', '/'
if ($WslRepo -notmatch '^/') { $WslRepo = '~/projects/catan-duel' }

function Get-Status {
  $radmin = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '26.*' } | Select-Object -First 1).IPAddress
  $wsl    = (wsl.exe hostname -I).Trim().Split(' ')[0]
  $fw     = (Get-NetFirewallRule -DisplayName 'Catan Duel*' -ErrorAction SilentlyContinue | Measure-Object).Count
  $pp     = (netsh interface portproxy show all | Out-String)
  $game   = (Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue)
  $relay  = (Test-NetConnection -ComputerName 127.0.0.1 -Port 1999 -InformationLevel Quiet -WarningAction SilentlyContinue)
  $peers  = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -like '26.*' -and $_.IPAddress -notmatch '\.(0|1|255)$' -and $_.State -ne 'Unreachable' }).Count
  [pscustomobject]@{ Radmin=$radmin; Wsl=$wsl; FwOpen=($fw -gt 0); Bridge=($pp -match '5173'); Game=$game; Relay=$relay; Peers=$peers }
}

function Show-Status {
  param($s)
  function Line($label, $ok, $okText, $noText) {
    Write-Host ("  {0,-22}" -f $label) -NoNewline
    if ($ok) { Write-Host $okText -ForegroundColor Green } else { Write-Host $noText -ForegroundColor DarkGray }
  }
  Clear-Host
  Write-Host "`n  CATAN DUEL - ONLINE (Radmin)`n  ----------------------------------------" -ForegroundColor Cyan
  Line "Radmin VPN"      ([bool]$s.Radmin) ("CONNECTED  (you: {0})" -f $s.Radmin) "NOT CONNECTED - start Radmin VPN"
  if ($s.FwOpen) { Write-Host ("  {0,-22}" -f "Firewall") -NoNewline; Write-Host "OPEN (to Radmin peers only)" -ForegroundColor Yellow }
  else           { Write-Host ("  {0,-22}" -f "Firewall") -NoNewline; Write-Host "CLOSED (safe - not exposed)" -ForegroundColor Green }
  Line "Port bridge"     $s.Bridge "up (5173, 1999 -> WSL)" "none"
  Line "Game server 5173" $s.Game  "running" "not running"
  Line "Relay 1999"       $s.Relay "running" "not running"
  Line "Friend connected" ($s.Peers -gt 0) ("yes ({0} peer)" -f $s.Peers) "no"
  if ($s.Radmin -and $s.FwOpen -and $s.Game) {
    Write-Host "`n  Friend opens:  " -NoNewline; Write-Host ("http://{0}:5173" -f $s.Radmin) -ForegroundColor Cyan
  }
  Write-Host "`n  [1] Open & host    [2] Close / make safe    [3] Friend's link    [R] Refresh    [Q] Quit`n"
}

function Invoke-Firewall($open, $wsl) {
  if ($open) {
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
  } else {
    $cmds = @(
      "netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0",
      "netsh interface portproxy delete v4tov4 listenport=1999 listenaddress=0.0.0.0",
      "Remove-NetFirewallRule -DisplayName 'Catan Duel 5173 (Radmin)' -EA SilentlyContinue",
      "Remove-NetFirewallRule -DisplayName 'Catan Duel 1999 (Radmin)' -EA SilentlyContinue"
    ) -join '; '
  }
  Write-Host "  (a UAC prompt will appear - click YES)" -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmds -Wait
}

function Open-Host {
  $s = Get-Status
  if (-not $s.Radmin) { Write-Host "`n  Start Radmin VPN first (and join/create a network), then try again.`n" -ForegroundColor Red; Pause; return }
  # point the app at the relay (written through WSL)
  wsl.exe bash -c "printf 'VITE_PARTYKIT_HOST=%s:1999\n' '$($s.Radmin)' > $WslRepo/.env.development.local"
  # start the servers in WSL, each in its OWN window so they stay alive (a detached
  # background server gets reaped when WSL shuts the distro down). Unquoted ~ expands.
  if (-not $s.Relay) { Start-Process -FilePath 'wsl.exe' -ArgumentList "bash -lc `"cd $WslRepo && npm run party`"" -WindowStyle Minimized }
  if (-not $s.Game)  { Start-Process -FilePath 'wsl.exe' -ArgumentList "bash -lc `"cd $WslRepo && npm run dev`""   -WindowStyle Minimized }
  Invoke-Firewall $true $s.Wsl
  Start-Sleep -Seconds 4
  $s = Get-Status
  if (-not $s.Game) { Write-Host "`n  Servers didn't start automatically - open a WSL terminal and run:  npm run party   and   npm run dev" -ForegroundColor Yellow; Pause }
}

function Close-Host {
  $s = Get-Status
  if ($s.FwOpen -or $s.Bridge) { Invoke-Firewall $false $null }   # only prompt UAC if something is actually open
  wsl.exe bash -lc "pkill -f vite; pkill -f workerd; pkill -f partykit" 2>$null
  Write-Host "`n  Closed. Nothing is exposed. (You can also Disconnect Radmin from its tray icon.)" -ForegroundColor Green
  Start-Sleep -Seconds 2
}

# Direct modes for the desktop panel (no menu): -Open hosts now, -Close makes safe + stops.
if ($Close) { Close-Host; exit }
if ($Open)  { Open-Host;  exit }

# ---- menu loop ----
while ($true) {
  Show-Status (Get-Status)
  $k = (Read-Host "  Choose").Trim().ToUpper()
  switch ($k) {
    '1' { Open-Host }
    '2' { Close-Host }
    '3' { $s = Get-Status; if ($s.Radmin) { $u = "http://$($s.Radmin):5173"; Set-Clipboard $u; Write-Host "`n  Friend's link (copied to clipboard):  $u`n" -ForegroundColor Cyan; Pause } else { Write-Host "`n  Radmin not connected.`n" -ForegroundColor Red; Pause } }
    'R' { }
    'Q' { break }
    default { }
  }
}
