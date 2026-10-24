@echo off
title FC BAZAR - Kodni GitHub ga yuklash
color 0A
cd /d "%~dp0"
echo ===================================================
echo   FC BAZAR - KODNI GITHUB GA YUKLASH (1 TA KLIK)
echo ===================================================
echo Kodlar tayyorlanmoqda...
git add .
git commit -m "Auto-reconnect tunnel and reliable 24/7 startup"
echo.
echo GitHub ga yuklanmoqda...
git push origin main
echo.
echo ===================================================
echo   MUVAFFAQIYATLI YUKLANDI!
echo   Render.com avtomatik yangilanadi.
echo ===================================================
pause
