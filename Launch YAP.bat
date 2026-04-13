@echo off
setlocal
echo =========================================
echo  YAP - Automated Launch and Setup
echo =========================================

:: Ensure we are in the project directory
cd /d "%~dp0"

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install it from https://nodejs.org/
    pause
    exit /b
)

:: First time setup check
if not exist "node_modules" (
    echo [!] node_modules not found. Installing Vite...
    call npm install
)

echo.
echo =========================================
echo  YAP IS STARTING...
echo =========================================
echo [!] MOBILE LINK: http://192.168.100.65:5173
echo =========================================
echo.

:: Start the server
call npx vite --host --port 5173

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Vite. 
    echo If port 5173 is busy, trying port 5174...
    call npx vite --host --port 5174
)

pause
