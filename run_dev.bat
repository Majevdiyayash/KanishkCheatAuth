@echo off
title INNOVATOR KEYAUTH Web Platform
echo ===================================================
echo  Starting INNOVATOR KEYAUTH Web Server & Frontend...
echo ===================================================
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
npm run dev
pause
