@echo off
cd /d "%~dp0"
echo ========================================================
echo Pushing Green Mart Billing POS to GitHub...
echo ========================================================
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo Successfully pushed to https://github.com/Kishoreramu25/green-mart-billing-software
) else (
    echo Push failed. Please verify your GitHub login or token.
)
pause
