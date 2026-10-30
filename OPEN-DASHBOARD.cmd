@echo off
setlocal
cd /d "%~dp0"
REM Checks the pinned public GitHub release on every launch. No Git or admin rights.
echo Checking GitHub for DClips updates...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1"
if errorlevel 1 echo Using the installed DClips version.
call "%~dp0OPEN-PRODUCTION-STUDIO.cmd" --skip-update
