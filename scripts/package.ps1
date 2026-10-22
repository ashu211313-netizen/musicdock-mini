$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$packagePath = Join-Path $projectRoot 'dist/musicdock-mini-1.1.0.zip'
Compress-Archive -Path (Join-Path $projectRoot 'dist/extension/*') -DestinationPath $packagePath -Force
Copy-Item -LiteralPath $packagePath -Destination (Join-Path $projectRoot 'dist/website/musicdock-mini-1.1.0.zip') -Force
$hashStream = [System.IO.File]::OpenRead($packagePath)
$hashProvider = [System.Security.Cryptography.SHA256]::Create()
try { $hash = [System.BitConverter]::ToString($hashProvider.ComputeHash($hashStream)).Replace('-', '').ToLower() }
finally { $hashStream.Dispose(); $hashProvider.Dispose() }
Set-Content -LiteralPath (Join-Path $projectRoot 'dist/SHA256SUMS.txt') -Value "$hash  musicdock-mini-1.1.0.zip" -Encoding ascii
Copy-Item -LiteralPath (Join-Path $projectRoot 'dist/SHA256SUMS.txt') -Destination (Join-Path $projectRoot 'dist/website/SHA256SUMS.txt') -Force
Write-Output "Package SHA256: $hash"
