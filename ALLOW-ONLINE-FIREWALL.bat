@echo off
REM Opens Windows Firewall for Catan Duel online play, LOCKED DOWN to Radmin VPN only:
REM   - ports 5173 (game) and 1999 (relay)
REM   - Private profile only (NOT public/untrusted networks)
REM   - only accepts connections FROM Radmin VPN addresses (26.0.0.0/8)
REM Double-click this file and accept the "Do you want to allow changes?" (UAC) prompt.
REM When you're done playing, run CLOSE-ONLINE-FIREWALL.bat to remove these rules.

net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting administrator permission...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

echo Adding Radmin-only firewall rules...
netsh advfirewall firewall delete rule name="Catan Duel game 5173" >nul 2>&1
netsh advfirewall firewall delete rule name="Catan Duel relay 1999" >nul 2>&1
netsh advfirewall firewall add rule name="Catan Duel game 5173" dir=in action=allow protocol=TCP localport=5173 profile=private remoteip=26.0.0.0/8
netsh advfirewall firewall add rule name="Catan Duel relay 1999" dir=in action=allow protocol=TCP localport=1999 profile=private remoteip=26.0.0.0/8
echo.
echo Done. Only Radmin VPN peers (26.x.x.x) can reach you, on the Private network only.
echo Your friend opens  http://26.75.124.139:5173
echo You can close this window.
pause
