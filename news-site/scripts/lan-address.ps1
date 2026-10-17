<#
  Prints this laptop's address on the local network — the one a phone on the same
  Wi-Fi can open. Prints nothing when there is none.

  connect.bat and build-apk.bat both call this. It lives in a file (rather than a
  one-line `powershell -Command` inside the .bat) because cmd does not strip the
  `^|` escape inside double quotes, so the pipeline reached PowerShell literally
  and the address lookup silently returned nothing.

  Order of preference:
    1. the IPv4 address of the adapter that carries the default route — the one
       the internet actually uses, which is the Wi-Fi/Ethernet the phone shares
    2. any private address, skipping adapters a phone can never reach
       (VMware, VirtualBox, Hyper-V/WSL, Tailscale, loopback, link-local)
    3. ipconfig, for machines where the Windows management service is unavailable
#>
$ErrorActionPreference = 'SilentlyContinue'

function Test-PrivateIp([string] $ip) {
  if ($ip -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$') { return $false }
  $parts = $ip.Split('.') | ForEach-Object { [int] $_ }
  if ($parts[0] -eq 10) { return $true }
  if ($parts[0] -eq 192 -and $parts[1] -eq 168) { return $true }
  if ($parts[0] -eq 172 -and $parts[1] -ge 16 -and $parts[1] -le 31) { return $true }
  return $false
}

# 1. The adapter that carries the default route.
$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
  Sort-Object RouteMetric | Select-Object -First 1
if ($route) {
  $address = (Get-NetIPAddress -InterfaceIndex $route.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Select-Object -First 1).IPAddress
  if (Test-PrivateIp $address) { Write-Output $address; exit 0 }
}

# 2. Any private address on an adapter that is not virtual.
$skip = 'VMware|VirtualBox|Hyper-V|WSL|vEthernet|Tailscale|Loopback|Bluetooth|Npcap|TAP-|Cisco|OpenVPN'
$addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { (Test-PrivateIp $_.IPAddress) -and $_.InterfaceAlias -notmatch $skip -and -not $_.SkipAsSource }
if ($addresses) {
  $choice = $addresses | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN|Ethernet' } | Select-Object -First 1
  if (-not $choice) { $choice = $addresses | Select-Object -First 1 }
  Write-Output $choice.IPAddress
  exit 0
}

# 3. Last resort: read ipconfig, which needs no Windows management service.
foreach ($line in (ipconfig)) {
  if ($line -match 'IPv4 Address[^:]*:\s*([0-9.]+)') {
    $candidate = $Matches[1]
    if (Test-PrivateIp $candidate) { Write-Output $candidate; exit 0 }
  }
}
