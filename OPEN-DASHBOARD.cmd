@echo off
setlocal
REM Uses built-in Windows PowerShell; no admin rights or Git installation required.
REM Updates are opt-in: no network request until SETUP-UPDATES.cmd is completed.
if exist "%~dp0user-data\update-source.txt" (
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1" -Silent
)
call "%~dp0OPEN-PRODUCTION-STUDIO.cmd"
