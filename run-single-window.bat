@echo off
title Event Calendar - Full Stack Server
color 0B

cd /d "%~dp0"

echo ========================================================
echo   EVENT CALENDAR - CONCURRENT RUNNER (SINGLE WINDOW)
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [*] Installing dependencies...
    call npm.cmd install
)

echo [*] Launching browser in 3 seconds...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [*] Starting Backend and Frontend concurrently...
echo Press Ctrl + C to stop all servers.
echo.
call npm.cmd run dev
pause
