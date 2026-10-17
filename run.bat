@echo off
title Event Calendar - Starting Services
color 0A

:: Set script directory
cd /d "%~dp0"

echo ========================================================
echo         EVENT CALENDAR & MANAGEMENT SYSTEM
echo ========================================================
echo.

:: 1. Check Node.js installation
echo [*] Checking Node.js environment...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Check if node_modules exists
if not exist "node_modules\" (
    echo [*] 'node_modules' not found. Installing dependencies...
    call npm.cmd install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b 1
    )
)

echo.
echo ========================================================
echo  Starting Backend and Frontend Servers...
echo  - Backend API : http://localhost:5000
echo  - Frontend App: http://localhost:3000
echo ========================================================
echo.

:: Start Backend and Frontend in separate dedicated windows with persistent logs
start "Event Calendar - Backend API (Port 5000)" cmd /k "npm.cmd run server"
timeout /t 2 /nobreak >nul

start "Event Calendar - Frontend Client (Port 3000)" cmd /k "npm.cmd run client"
timeout /t 3 /nobreak >nul

:: Open browser automatically
echo [*] Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo [SUCCESS] Both servers are running in separate windows!
echo To stop the servers, simply close the respective command windows.
echo.
pause
