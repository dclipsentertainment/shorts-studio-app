#!/usr/bin/env bash
# Reproducible, bounded media setup with HTTPS mirrors and reusable package downloads.
set -euo pipefail
packages=("$@")
((${#packages[@]})) || packages=(ffmpeg espeak-ng fonts-dejavu-core)
for package in "${packages[@]}"; do
  [[ "$package" =~ ^[a-z0-9][a-z0-9.+-]*$ ]] || { echo 'Invalid package name' >&2; exit 2; }
done
missing=()
for package in "${packages[@]}"; do
  [[ "$(dpkg-query -W -f='${Status}' "$package" 2>/dev/null || true)" == 'install ok installed' ]] || missing+=("$package")
done
if ((${#missing[@]}==0)); then echo 'Media packages already installed.'; exit 0; fi
cache_dir="${RUNNER_TEMP:-/tmp}/dclips-apt-cache"
mkdir -p "$cache_dir/partial"
# HTTPS avoids runner-specific HTTP proxy stalls. Keep distro signature verification enabled.
sudo python3 - <<'PY'
from pathlib import Path
paths=[Path('/etc/apt/sources.list'),*Path('/etc/apt/sources.list.d').glob('*.sources'),*Path('/etc/apt/sources.list.d').glob('*.list')]
for p in paths:
    if p.is_file():
        s=p.read_text()
        for host in ['azure.archive.ubuntu.com','archive.ubuntu.com','security.ubuntu.com']:
            s=s.replace('http://'+host,'https://'+host)
        p.write_text(s)
PY
opts=(-o Acquire::ForceIPv4=true -o Acquire::Retries=1 -o Acquire::http::Timeout=15 -o Acquire::https::Timeout=15 -o "Dir::Cache::archives=$cache_dir" -o Binary::apt::APT::Keep-Downloaded-Packages=true)
for attempt in 1 2; do
  echo "Installing missing media packages (attempt $attempt): ${missing[*]}"
  sudo timeout 90s apt-get "${opts[@]}" update -qq || echo 'Index refresh incomplete; trying signed existing indexes.'
  if sudo env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a timeout 240s apt-get "${opts[@]}" install --no-install-recommends --no-upgrade -y "${missing[@]}"; then
    for package in "${packages[@]}"; do [[ "$(dpkg-query -W -f='${Status}' "$package")" == 'install ok installed' ]]; done
    echo 'Media dependency installation verified.'; exit 0
  fi
  # Retry an alternate official mirror, retaining signed apt package verification.
  sudo python3 - <<'PY'
from pathlib import Path
for p in [Path('/etc/apt/sources.list'),*Path('/etc/apt/sources.list.d').glob('*.sources'),*Path('/etc/apt/sources.list.d').glob('*.list')]:
    if p.is_file():p.write_text(p.read_text().replace('https://azure.archive.ubuntu.com','https://archive.ubuntu.com'))
PY
done
echo 'Unable to install media dependencies from either official Ubuntu mirror.' >&2
exit 1
