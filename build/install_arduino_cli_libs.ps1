param($packagesPath)

$arduino15Path = "$env:LOCALAPPDATA\Arduino15\packages"

if (!(Test-Path $arduino15Path)) {
    New-Item -ItemType Directory -Path $arduino15Path
}
Get-ChildItem -LiteralPath $packagesPath -Force |
    Copy-Item `
        -Destination $arduino15Path `
        -Recurse `
        -Force