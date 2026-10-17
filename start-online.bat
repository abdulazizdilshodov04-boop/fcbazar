@echo off
title FC BAZAR - Server va Telegram Bot (Online 24/7)
color 0A
echo =====================================================
echo   ⚽ FC BAZAR - FC MOBILE AKKAUNTLAR SAVDOSI VA BOT
echo =====================================================
echo.
echo [1/2] Server va Telegram Bot ishga tushirilmoqda...
start /b cmd /c "node server.js"
timeout /t 4 /nobreak >nul
echo.
echo [2/2] Dunyo bo'ylab HTTPS Tunneli ulanmoqda...
node run-tunnel.js
pause
