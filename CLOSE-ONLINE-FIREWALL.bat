@echo off
REM Removes the Catan Duel firewall rules added by ALLOW-ONLINE-FIREWALL.bat.
REM Double-click and accept the UAC prompt when you're done playing.

net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting administrator permission...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="Catan Duel game 5173" >nul 2>&1
netsh advfirewall firewall delete rule name="Catan Duel relay 1999" >nul 2>&1
echo Closed. The Catan Duel ports are no longer open in the firewall.
pause
