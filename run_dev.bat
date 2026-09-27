@echo off
title KANISHK CHEAT AUTH Web Platform
echo ===================================================
echo  Starting KANISHK CHEAT AUTH Web Server & Frontend...
echo ===================================================
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
npm run dev
pause
