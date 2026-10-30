@echo off
setlocal
cd /d "%~dp0"
REM Direct launches also check for updates. The main launcher passes --skip-update.
if /I not "%~1"=="--skip-update" (
  echo Checking GitHub for DClips updates...
  powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1"
  if errorlevel 1 echo Using the installed DClips version.
)
echo Opening DClips Shorts Studio...
where py >nul 2>&1
if not errorlevel 1 (
  py -3 --version >nul 2>&1
  if not errorlevel 1 (
    py -3 "%~dp0scripts\local_studio.py" --open
    goto :end
  )
)
where python >nul 2>&1
if not errorlevel 1 (
  python --version >nul 2>&1
  if not errorlevel 1 (
    python "%~dp0scripts\local_studio.py" --open
    goto :end
  )
)
echo.
echo Python was not found. Opening DClips in browser-only mode.
echo Planning, project management and GitHub usage monitoring work without Python.
echo Local MP4 rendering additionally requires Python and FFmpeg.
start "" "%~dp0index.html"
:end
pause
