$ErrorActionPreference = 'Stop'
$taskRuleName = 'Elevate phone access (TCP 3000, local subnet)'
$taskResult = Join-Path $PSScriptRoot 'phone-access-result.txt'
try {
    $taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $taskPrincipal = [Security.Principal.WindowsPrincipal]::new($taskIdentity)
    if (-not $taskPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"')) -Wait
        exit
    }
    $taskExisting = Get-NetFirewallRule -DisplayName $taskRuleName -ErrorAction SilentlyContinue
    if (-not $taskExisting) {
        New-NetFirewallRule -DisplayName $taskRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -RemoteAddress LocalSubnet -Profile Any | Out-Null
    } else {
        $taskExisting | Set-NetFirewallRule -Enabled True -Action Allow
    }
    'Enabled phone access: TCP 3000, local subnet only.' | Set-Content -LiteralPath $taskResult
} catch {
    ('Phone access setup failed: ' + $_.Exception.Message) | Set-Content -LiteralPath $taskResult
    throw
}
