@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dist
echo Installer is in the dist folder.
pause
