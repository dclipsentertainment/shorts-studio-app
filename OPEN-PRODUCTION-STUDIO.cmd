@echo off
setlocal
cd /d "%~dp0"
echo Starting Shorts Studio local production engine...
echo No administrator access or GitHub account needed.
where py >nul 2>&1
if not errorlevel 1 (
  py -3 --version >nul 2>&1
  if not errorlevel 1 (
    py -3 "scripts\local_studio.py" --open
    goto :end
  )
)
where python >nul 2>&1
if not errorlevel 1 (
  python --version >nul 2>&1
  if not errorlevel 1 (
    python "scripts\local_studio.py" --open
    goto :end
  )
)
echo.
echo Python was not found. Opening browser-only mode instead.
echo For the local MP4 renderer you need Python 3.10+ and FFmpeg (ffprobe included).
start "" "%~dp0index.html"
:end
pause
