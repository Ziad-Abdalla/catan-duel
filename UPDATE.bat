@echo off
title Catan Duel - Update
echo.
echo  Getting the latest version from GitHub...
echo.
wsl.exe bash -lc "cd ~/projects/catan-duel && git pull --rebase && npm install"
echo.
echo  Refreshing the launcher panel...
rem  Copy the latest launchers/panel next to this file (so the desktop panel stays current).
rem  UPDATE.bat itself is skipped on purpose — a batch file can't safely overwrite itself while running.
wsl.exe bash -lc "cd ~/projects/catan-duel && DEST=$(wslpath '%~dp0') && for f in RADMIN.ps1 PLAY.bat PLAY-ONLINE.bat STOP.bat START-HERE.html Catan-Duel.hta PLAY-ONLINE.html; do cp -f \"$f\" \"$DEST\" 2>/dev/null; done"
echo.
echo  Done. Run PLAY.bat to play.
echo.
pause
