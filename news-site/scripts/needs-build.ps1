# Tells start.bat whether the built site is older than the source.
# Prints exactly "yes" or "no" so batch can read it.
$ErrorActionPreference = "SilentlyContinue"

$marker = Get-Item ".next\BUILD_ID"
if (-not $marker) { Write-Output "yes"; exit 0 }

$sources = @()
$sources += Get-ChildItem -Path "src" -Recurse -File
$sources += Get-Item "package.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json"

$newest = $sources | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($newest -and $newest.LastWriteTime -gt $marker.LastWriteTime) {
  Write-Output "yes"
} else {
  Write-Output "no"
}
