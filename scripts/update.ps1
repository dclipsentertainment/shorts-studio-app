param([switch]$CheckOnly, [switch]$Silent)
# Unauthenticated, digest-verified updates from a PUBLIC GitHub releases repo.
# Never handles user credentials. Never applies files from a source other than the chosen repo.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $root 'user-data\update-source.txt'
function Log([string]$s) { if (-not $Silent) { Write-Host $s } }
function SafePath([string]$name) {
    if ($name -in @('index.html','app.js','styles.css','VERSION.json','README-FIRST.md','README-CHATGPT-WORKFLOW.md','README-RELEASES.md','OPEN-DASHBOARD.cmd','CHECK-FOR-UPDATES.cmd','SETUP-UPDATES.cmd','.gitignore')) { return $true }
    return ($name -match '^scripts/[a-zA-Z0-9_-]+\.(py|ps1)$' -or $name -eq '.github/workflows/release-app.yml')
}
try {
    if (-not (Test-Path -LiteralPath $sourceFile)) { Log 'Updates not configured. Run SETUP-UPDATES.cmd after creating a release.'; exit 0 }
    $repo = [System.IO.File]::ReadAllText($sourceFile).Trim()
    if ($repo -notmatch '^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})/[a-zA-Z0-9_.-]{1,100}$') { throw 'Invalid update repository configuration.' }
    $current = '0.0.0'
    $versionFile = Join-Path $root 'VERSION.json'
    if (Test-Path -LiteralPath $versionFile) { $current = (Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json).version }
    [version]$currentVersion = [version]$current
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{'User-Agent'='Shorts-Studio-Updater'; 'Accept'='application/vnd.github+json'}
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers -TimeoutSec 18
    if ($release.draft -or $release.prerelease) { throw 'Latest release is not a stable version tag.' }
    $tagMatch = [regex]::Match([string]$release.tag_name, '^v?(\d+\.\d+\.\d+)$')
    if (-not $tagMatch.Success) { throw 'Latest release is not a stable version tag.' }
    [version]$latest = [version]$tagMatch.Groups[1].Value
    if ($latest -le $currentVersion) { Log "Shorts Studio is up to date (v$current)."; exit 0 }
    Log "New version: v$latest (installed: v$current)."
    if ($CheckOnly) { Log "Open the dashboard launcher again to update from $repo."; exit 0 }
    $asset = @($release.assets | Where-Object { $_.name -eq 'shorts-studio-app.zip' }) | Select-Object -First 1
    if (-not $asset) { throw 'Release is missing shorts-studio-app.zip.' }
    $digestMatch = [regex]::Match([string]$asset.digest, '^sha256:([0-9a-fA-F]{64})$')
    if (-not $digestMatch.Success) { throw 'Release asset has no verifiable SHA-256 digest; refusing to install.' }
    $digest = $digestMatch.Groups[1].Value.ToLowerInvariant()
    if (-not $asset.browser_download_url.StartsWith("https://github.com/$repo/releases/download/", [StringComparison]::OrdinalIgnoreCase)) { throw 'Release asset URL is not from configured repository.' }
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('shorts-studio-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        $download = Join-Path $tmp 'release.zip'
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $download -UseBasicParsing -TimeoutSec 90
        $actual = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $digest) { throw 'Update ZIP SHA-256 mismatch. Update cancelled.' }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $archive = [System.IO.Compression.ZipFile]::OpenRead($download)
        $staging = Join-Path $tmp 'staged'
        New-Item -ItemType Directory -Path $staging | Out-Null
        try {
            $seen = @{}
            foreach ($entry in $archive.Entries) {
                if ($entry.FullName.EndsWith('/')) { continue }
                $name = $entry.FullName.Replace('\','/')
                if (-not (SafePath $name) -or $seen.ContainsKey($name)) { throw "Unexpected or duplicated archive path: $name" }
                $seen[$name] = $true
                $destination = Join-Path $staging ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination)
            }
        } finally { $archive.Dispose() }
        foreach($essential in @('VERSION.json','index.html','styles.css','app.js','scripts/update.ps1')) {
            if (-not $seen.ContainsKey($essential)) { throw "Missing required application file: $essential" }
        }
        $packedVersion = (Get-Content -LiteralPath (Join-Path $staging 'VERSION.json') -Raw | ConvertFrom-Json).version
        if ([version]$packedVersion -ne $latest) { throw "Release tag does not match embedded version ($packedVersion)." }
        # Commit is a file-by-file replacement with a local rollback backup.
        $backup = Join-Path $tmp 'backup'
        New-Item -ItemType Directory -Path $backup | Out-Null
        $newFiles = New-Object 'System.Collections.Generic.List[string]'
        $replaced = New-Object 'System.Collections.Generic.List[string]'
        try {
            foreach($name in @($seen.Keys | Sort-Object)) {
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
            foreach($name in $newFiles) { $target = Join-Path $root ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar)); if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force } }
            foreach($name in $replaced) { Copy-Item -LiteralPath (Join-Path $backup ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Destination (Join-Path $root ($name.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force }
            throw
        }
        Log "Updated to v$latest. Existing jobs, videos, reports and browser data were not touched."
    } finally { if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue } }
} catch {
    Write-Warning "Update not installed: $($_.Exception.Message). You can still open your current dashboard."
    exit 1
}
