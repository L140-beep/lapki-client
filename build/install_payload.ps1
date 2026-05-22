param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    [Parameter(Mandatory = $true)]
    [string]$SetupDataDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [ValidateSet("Leaf", "Container")]
        [string]$Type
    )

    $exists = Test-Path -LiteralPath $Path -PathType $Type
    if (-not $exists) {
        throw "Required $Type not found: $Path"
    }
}

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Copy-PayloadTree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    Assert-PathExists -Path $Source -Type Container
    Ensure-Directory -Path $Destination
    Get-ChildItem -LiteralPath $Source -Force | Copy-Item -Destination $Destination -Recurse -Force
}

$requiredItems = @(
    @{ Path = "gcc-arm-none-eabi"; Type = "Container" }
    @{ Path = "irpcb\bin"; Type = "Container" }
    @{ Path = "lapki-compiler\library"; Type = "Container" }
    @{ Path = "lapki-compiler\platforms"; Type = "Container" }
    @{ Path = "lapki-compiler\fullgraphmlparser\templates"; Type = "Container" }
)

$missing = @()
foreach ($item in $requiredItems) {
    $fullPath = Join-Path $SetupDataDir $item.Path
    if (-not (Test-Path -LiteralPath $fullPath -PathType $item.Type)) {
        $missing += $fullPath
    }
}

if ($missing.Count -gt 0) {
    $message = "Missing setup_data items:`n - " + ($missing -join "`n - ")
    Write-Error $message
    exit 2
}

$compilerRoot = Join-Path $InstallDir "resources\app.asar.unpacked\resources\modules\win32\lapki-compiler"
$copyPlan = @(
    @{
        Source = (Join-Path $SetupDataDir "gcc-arm-none-eabi")
        Destination = (Join-Path $InstallDir "gcc-arm-none-eabi")
    }
    @{
        Source = (Join-Path $SetupDataDir "irpcb\bin")
        Destination = (Join-Path $InstallDir "irpcb\bin")
    }
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\library")
        Destination = (Join-Path $compilerRoot "library")
    }
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\platforms")
        Destination = (Join-Path $compilerRoot "platforms")
    }
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\fullgraphmlparser\templates")
        Destination = (Join-Path $compilerRoot "fullgraphmlparser\templates")
    }
)

foreach ($step in $copyPlan) {
    Copy-PayloadTree -Source $step.Source -Destination $step.Destination
}

$installCompilerDepsScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "install_compiler_deps.ps1"
Assert-PathExists -Path $installCompilerDepsScript -Type Leaf

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installCompilerDepsScript $InstallDir
if ($LASTEXITCODE -ne 0) {
    throw "install_compiler_deps.ps1 failed with exit code $LASTEXITCODE"
}

$arduinoCliPath = Join-Path $InstallDir "resources\app.asar.unpacked\resources\modules\win32\arduino-cli\arduino-cli.exe"
Assert-PathExists -Path $arduinoCliPath -Type Leaf

& $arduinoCliPath core install arduino:avr
if ($LASTEXITCODE -ne 0) {
    throw "arduino-cli core install arduino:avr failed with exit code $LASTEXITCODE"
}
