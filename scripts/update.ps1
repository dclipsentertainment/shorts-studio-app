param([switch]$CheckOnly, [switch]$Silent)
# DClips Shorts Studio. Always update from the OWNER-PINNED PUBLIC GitHub repository.
# No Git, token, admin permissions, prompts or external executables required.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repo = 'dclipsentertainment/shorts-studio-app'
function Log([string]$s) { if (-not $Silent) { Write-Host $s } }
function SafePath([string]$name) {
    if ($name -in @('index.html','VERSION.json','styles.css','app.js','github-usage.js',
        'OPEN-DASHBOARD.cmd','OPEN-PRODUCTION-STUDIO.cmd','CHECK-FOR-UPDATES.cmd',
        'SETUP-UPDATES.cmd','.gitignore','requirements-visuals.txt')) { return $true }
    if ($name -match '^README(?:-[a-zA-Z0-9_-]+)?\.md$') { return $true }
    return ($name -match '^scripts/[a-zA-Z0-9_-]+\.(py|ps1|js)$' -or
        $name -eq '.github/workflows/release-app.yml')
}
try {
    $current = '0.0.0'
    $versionFile = Join-Path $root 'VERSION.json'
    if (Test-Path -LiteralPath $versionFile) {
        $current = [string](Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json).version
    }
    [version]$currentVersion = [version]$current
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{'User-Agent'='DClips-Shorts-Studio-Updater'; 'Accept'='application/vnd.github+json'}
    # This is a read-only check against one pinned, public release source. No user inputs needed.
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers -TimeoutSec 12
    if ($release.draft -or $release.prerelease) { throw 'Latest release is not stable.' }
    $tagMatch = [regex]::Match([string]$release.tag_name, '^v(\d+\.\d+\.\d+)$')
    if (-not $tagMatch.Success) { throw 'Unexpected latest release tag.' }
    [version]$latest = [version]$tagMatch.Groups[1].Value
    if ($latest -le $currentVersion) { Log "DClips is up to date (v$current)."; exit 0 }
    Log "DClips update available: v$latest (current: v$current)."
    if ($CheckOnly) { Log 'Open DClips with OPEN-DASHBOARD.cmd to install this update.'; exit 0 }

    $asset = @($release.assets | Where-Object { $_.name -eq 'shorts-studio-app.zip' }) | Select-Object -First 1
    if (-not $asset) { throw 'Release does not contain the expected app ZIP.' }
    $digestMatch = [regex]::Match([string]$asset.digest, '^sha256:([0-9a-fA-F]{64})$')
    if (-not $digestMatch.Success) { throw 'The release ZIP has no verifiable SHA-256 digest.' }
    $digest = $digestMatch.Groups[1].Value.ToLowerInvariant()
    if (-not ([string]$asset.browser_download_url).StartsWith("https://github.com/$repo/releases/download/", [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Release ZIP is not hosted by the pinned DClips repository.'
    }
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('dclips-update-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        $download = Join-Path $tmp 'release.zip'
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $download -UseBasicParsing -TimeoutSec 120
        $actual = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $digest) { throw 'Release ZIP failed SHA-256 verification; no files changed.' }

        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead($download)
        $staging = Join-Path $tmp 'staged'
        New-Item -ItemType Directory -Path $staging | Out-Null
        $seen = @{}
        try {
            foreach ($entry in $archive.Entries) {
                if ($entry.FullName.EndsWith('/')) { continue }
                $name = $entry.FullName.Replace('\','/')
                if (-not (SafePath $name) -or $seen.ContainsKey($name)) {
                    throw "Refusing unsafe or duplicate update path: $name"
                }
                $seen[$name] = $true
                $destination = Join-Path $staging ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination)
            }
        } finally { $archive.Dispose() }
        foreach ($essential in @('VERSION.json','index.html','styles.css','app.js','github-usage.js',
            'OPEN-DASHBOARD.cmd','scripts/update.ps1','scripts/local_studio.py')) {
            if (-not $seen.ContainsKey($essential)) { throw "Update lacks required file: $essential" }
        }
        $packedVersion = [string](Get-Content -LiteralPath (Join-Path $staging 'VERSION.json') -Raw | ConvertFrom-Json).version
        if ([version]$packedVersion -ne $latest) { throw "ZIP version $packedVersion does not match GitHub release v$latest." }

        # Updates can only touch allowlisted application files. Personal data and rendered media
        # are excluded, backed up code is restored on write failure, and old versions can open offline.
        $backup = Join-Path $tmp 'backup'
        New-Item -ItemType Directory -Path $backup | Out-Null
        $newFiles = New-Object 'System.Collections.Generic.List[string]'
        $replaced = New-Object 'System.Collections.Generic.List[string]'
        try {
            # Install VERSION.json last so interrupted updates are reattempted next launch.
            $names = @($seen.Keys | Where-Object { $_ -ne 'VERSION.json' } | Sort-Object) + @('VERSION.json')
            foreach ($name in $names) {
                $relative = $name.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
                $dest = Join-Path $root $relative
                $src = Join-Path $staging $relative
                if (Test-Path -LiteralPath $dest) {
                    $old = Join-Path $backup $relative
                    New-Item -ItemType Directory -Path (Split-Path -Parent $old) -Force | Out-Null
                    Copy-Item -LiteralPath $dest -Destination $old -Force
                    $replaced.Add($name)
                } else { $newFiles.Add($name) }
                New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
                Copy-Item -LiteralPath $src -Destination $dest -Force
            }
        } catch {
            foreach ($name in $newFiles) {
                $target = Join-Path $root ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
            }
            foreach ($name in $replaced) {
                $relative = $name.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
                Copy-Item -LiteralPath (Join-Path $backup $relative) -Destination (Join-Path $root $relative) -Force
            }
            throw
        }
        Log "DClips updated to v$latest. Personal projects and user-data were preserved."
    } finally {
        if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    }
} catch {
    Write-Warning "DClips update not installed: $($_.Exception.Message). Opening the current version instead."
    exit 1
}
