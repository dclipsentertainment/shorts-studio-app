# Run once after you publish the first release in a PUBLIC GitHub app-code repository.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Write-Host 'Shorts Studio - enable code updates from a public GitHub repository.'
Write-Host 'Example: your-github-name/shorts-studio-app'
Write-Host 'Never enter passwords or API tokens here.'
$repo = (Read-Host 'Enter OWNER/REPOSITORY').Trim()
if ($repo -notmatch '^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})/[a-zA-Z0-9_.-]{1,100}$') {
  throw 'Invalid format. Enter a repository like owner/shorts-studio-app.'
}
$folder = Join-Path $root 'user-data'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$file = Join-Path $folder 'update-source.txt'
[System.IO.File]::WriteAllText($file, $repo, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Configured: $repo"
Write-Host 'From now on OPEN-DASHBOARD.cmd checks for new published stable releases.'
Write-Host 'Code updates only. Videos, jobs and browser data are not changed.'
