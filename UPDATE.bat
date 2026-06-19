@echo off
title Catan Duel - Update
echo.
echo  Getting the latest version from GitHub...
echo.
wsl.exe bash -lc "cd ~/projects/catan-duel && git pull --rebase && npm install"
echo.
echo  Done. Run PLAY.bat to play.
echo.
pause
