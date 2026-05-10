$rootPath = Get-Location
$mainEnv = Join-Path $rootPath ".env"

if (-not (Test-Path $mainEnv)) {
    Write-Error "Could not find .env at $mainEnv"
    exit
}

# Directories to search for services
$parentDirs = @("server/services", "server/gateway", "server/websocket", "server/workers", "server/jobs", "customer-app", "delivery-app", "admin-app")

foreach ($parent in $parentDirs) {
    $parentPath = Join-Path $rootPath $parent
    if (Test-Path $parentPath) {
        if ($parent -match "services") {
            # Multiple services in this folder
            Get-ChildItem -Path $parentPath -Directory | ForEach-Object {
                $target = Join-Path $_.FullName ".env"
                if (Test-Path $target) { Remove-Item $target -Force }
                New-Item -ItemType HardLink -Path $target -Value $mainEnv -Force
                Write-Host "Linked to $($_.Name) -> $target"
            }
        } else {
            # This folder IS the service
            $target = Join-Path $parentPath ".env"
            if (Test-Path $target) { Remove-Item $target -Force }
            New-Item -ItemType HardLink -Path $target -Value $mainEnv -Force
            Write-Host "Linked to $parent -> $target"
        }
    }
}
