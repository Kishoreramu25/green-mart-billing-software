@echo off
cd /d "%~dp0"
echo Starting Billing POS web server...
start "" "http://localhost:3000"
node server.js
