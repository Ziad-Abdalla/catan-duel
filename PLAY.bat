@echo off
title Catan Duel
echo.
echo  Starting Catan Duel...  (first run installs everything, please wait)
echo.
wsl.exe bash -lc "cd ~/projects/catan-duel && { test -d node_modules || npm install; }"
wsl.exe bash -lc "cd ~/projects/catan-duel && pkill -f vite >/dev/null 2>&1; setsid nohup npm run dev >/tmp/catan-dev.log 2>&1 < /dev/null & sleep 4"
start "" "http://localhost:5173"
echo.
echo  Catan Duel is running:  http://localhost:5173
echo  Play both sides on the Hotseat tab. For online with Ziad, run PLAY-ONLINE.bat.
echo  When you are done, run STOP.bat (or just close the game tab).
echo.
pause
