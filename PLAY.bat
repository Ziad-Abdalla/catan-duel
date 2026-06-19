@echo off
title Catan Duel
echo.
echo  Starting Catan Duel...  (first run installs everything, please wait)
echo.
wsl.exe bash -lc "cd ~/projects/catan-duel && { test -d node_modules || npm install; }"
rem  Run the game server in its OWN window. WSL keeps the server alive only while
rem  a session stays attached; a detached background server gets shut down with the
rem  distro moments after this launcher exits (that's the "connection refused").
start "Catan Duel server  -  keep this open while you play" wsl.exe bash -lc "cd ~/projects/catan-duel && npm run dev"
rem  Wait until the server actually answers (up to ~40s), then open the browser.
echo  Waiting for the game to come up...
powershell -NoProfile -Command "$u='http://localhost:5173'; for($i=0;$i -lt 40;$i++){try{$null=Invoke-WebRequest $u -TimeoutSec 1 -UseBasicParsing; break}catch{Start-Sleep 1}}; Start-Process $u"
echo.
echo  Catan Duel is running:  http://localhost:5173
echo  KEEP the "Catan Duel server" window open while you play (closing it stops the game).
echo  When you're done: run STOP.bat, or just close that server window.
echo.
pause
