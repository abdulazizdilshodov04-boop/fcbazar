@echo off
title FC BAZAR - Kodni GitHub ga yuklash
color 0A
echo ===================================================
echo   FC BAZAR - KODNI GITHUB GA YUKLASH (1 TA KLIK)
echo ===================================================
echo Kodlar tayyorlanmoqda...
git add .
git commit -m "Fix telegram bot speed, support window, and keep-alive"
echo.
echo GitHub ga yuklanmoqda...
git push -u origin main
echo.
echo ===================================================
echo   MUVAFFAQIYATLI YUKLANDI! Render avtomatik yangilanadi.
echo ===================================================
pause
