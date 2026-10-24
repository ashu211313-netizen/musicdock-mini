$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$version = (Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$zipName = "musicdock-mini-$version.zip"
$packagePath = Join-Path $projectRoot "dist/$zipName"
Compress-Archive -Path (Join-Path $projectRoot 'dist/extension/*') -DestinationPath $packagePath -Force
Copy-Item -LiteralPath $packagePath -Destination (Join-Path $projectRoot "dist/website/$zipName") -Force
$hashStream = [System.IO.File]::OpenRead($packagePath)
$hashProvider = [System.Security.Cryptography.SHA256]::Create()
try { $hash = [System.BitConverter]::ToString($hashProvider.ComputeHash($hashStream)).Replace('-', '').ToLower() }
finally { $hashStream.Dispose(); $hashProvider.Dispose() }
Set-Content -LiteralPath (Join-Path $projectRoot 'dist/SHA256SUMS.txt') -Value "$hash  $zipName" -Encoding ascii
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist/SHA256SUMS.txt') -Destination (Join-Path $projectRoot 'dist/website/SHA256SUMS.txt') -Force
Write-Output "Package SHA256: $hash"
