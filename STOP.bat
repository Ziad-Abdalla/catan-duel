@echo off
wsl.exe bash -lc "pkill -f vite; pkill -f workerd; pkill -f partykit" >nul 2>&1
echo  Catan Duel stopped.
timeout /t 2 >nul
