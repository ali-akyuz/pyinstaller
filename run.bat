@echo off
title PyBuilder GUI
echo ============================================
echo  PyBuilder GUI - Python'dan EXE'ye Donustur
echo ============================================
echo.

REM Flask'ı yükle
echo [1/2] Flask kontrol ediliyor...
python -m pip install flask -q

echo [2/2] Uygulama baslatiliyor...
echo.
echo  Tarayicinizda acin: http://127.0.0.1:5000
echo  Kapatmak icin: CTRL+C
echo.
start "" http://127.0.0.1:5000
python app.py
pause
