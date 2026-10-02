@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js from https://nodejs.org first, then run this again. & pause & exit /b)
if not exist node_modules call npm install
call npm start
