# RADMIN-OFFLINE.ps1 — undo everything RADMIN-ONLINE.ps1 set up. Run it when you're done
# playing: it removes the Windows->WSL port bridge and the firewall openings, so nothing
# is exposed anymore. Safe to run anytime (no-ops if already removed).
#
# Run NORMALLY (right-click -> "Run with PowerShell"); it elevates only the netsh/firewall
# step (one UAC prompt). Do not pre-elevate from the \\wsl path.

$ErrorActionPreference = 'SilentlyContinue'
Write-Host "`n=== Catan Duel — closing Radmin online access ===`n" -ForegroundColor Cyan

$cmds = @(
  "netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0",
  "netsh interface portproxy delete v4tov4 listenport=1999 listenaddress=0.0.0.0",
  "Remove-NetFirewallRule -DisplayName 'Catan Duel 5173 (Radmin)' -EA SilentlyContinue",
  "Remove-NetFirewallRule -DisplayName 'Catan Duel 1999 (Radmin)' -EA SilentlyContinue",
  "netsh advfirewall firewall delete rule name='Catan Duel game 5173'",
  "netsh advfirewall firewall delete rule name='Catan Duel relay 1999'"
) -join '; '
Write-Host "Opening an elevated window to remove the bridge + firewall (click YES on the UAC prompt)..." -ForegroundColor Yellow
Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmds -Wait

Write-Host "`nClosed. Nothing is exposed now." -ForegroundColor Green
Write-Host "For full safety you can also right-click the Radmin VPN tray icon -> Disconnect / Stop.`n"
pause
