# RADMIN-OFFLINE.ps1 — undo everything RADMIN-ONLINE.ps1 set up. Run this when you're
# done playing. It removes the WSL port bridge and the firewall openings, so nothing is
# exposed anymore. Safe to run any time (no-ops if already removed).
#
# HOW TO RUN: right-click -> "Run with PowerShell" (asks for admin).

# --- self-elevate to admin ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
  exit
}

$ErrorActionPreference = 'SilentlyContinue'
Write-Host "`n=== Catan Duel — closing Radmin online access ===`n" -ForegroundColor Cyan

# --- remove the Windows -> WSL port bridge ---
foreach ($port in 5173, 1999) {
  netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
}
Write-Host "Port bridge removed." -ForegroundColor Green

# --- remove the firewall rules (both the .ps1 rules and the older .bat rules) ---
Remove-NetFirewallRule -DisplayName "Catan Duel 5173 (Radmin)" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Catan Duel 1999 (Radmin)" -ErrorAction SilentlyContinue
netsh advfirewall firewall delete rule name="Catan Duel game 5173" | Out-Null
netsh advfirewall firewall delete rule name="Catan Duel relay 1999" | Out-Null
Write-Host "Firewall openings removed." -ForegroundColor Green

Write-Host "`nClosed. Nothing is exposed now." -ForegroundColor Green
Write-Host "For full safety you can also right-click the Radmin VPN tray icon -> Disconnect / Stop.`n"
pause
